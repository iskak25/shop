import { db, type Tx } from "./db";
import { bad, conflict, notFound } from "./http";
import { audit, notify } from "./support";
import type { SessionUser } from "./auth";

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Атомарное уменьшение физического остатка: не уйдёт в минус и не заденет резерв. */
export async function takeStock(tx: Tx, productId: number, qty: number) {
  const n = await tx.$executeRaw`UPDATE "Product" SET "stockQty" = "stockQty" - ${qty} WHERE "id" = ${productId} AND "stockQty" - "reservedQty" >= ${qty}`;
  if (n !== 1) throw conflict("Недостаточно свободного остатка");
}

export interface ReceiptInput {
  supplier?: string;
  invoiceNo?: string;
  extraCosts?: number;
  items: { productId: number; qty: number; purchasePrice: number }[];
}

export async function createReceipt(user: SessionUser, input: ReceiptInput) {
  if (!input.items.length) throw bad("Добавьте хотя бы одну позицию");
  return db.$transaction(async (tx) => {
    const name = input.supplier?.trim();
    const supplier = name ? await tx.supplier.upsert({ where: { name }, update: {}, create: { name } }) : null;
    const rc = await tx.receipt.create({
      data: {
        number: `tmp-${Date.now()}-${Math.random()}`,
        supplierId: supplier?.id, invoiceNo: input.invoiceNo || null, extraCosts: input.extraCosts ?? 0, createdById: user.id,
        items: { create: input.items.map((i) => ({ productId: i.productId, qty: i.qty, purchasePrice: i.purchasePrice })) },
      },
    });
    const number = `ПР-${String(rc.id).padStart(5, "0")}`;
    await tx.receipt.update({ where: { id: rc.id }, data: { number } });
    await audit(tx, user.id, "receipt.create", "receipt", rc.id, null, { number, items: input.items.length });
    return { id: rc.id, number };
  });
}

/**
 * Проведение прихода. Доп. расходы распределяются пропорционально сумме позиции,
 * себестоимость пересчитывается средневзвешенно: C = (Qold*Cold + Qin*Cin) / (Qold+Qin).
 */
export async function postReceipt(user: SessionUser, id: number) {
  const awaiting: string[] = [];
  const result = await db.$transaction(async (tx) => {
    const rc = await tx.receipt.findUnique({ where: { id }, include: { items: true } });
    if (!rc) throw notFound();
    if (rc.status !== "draft") throw conflict("Документ уже проведён или отменён");
    if (user.role !== "owner" && rc.createdById !== user.id) throw bad("Можно проводить только свои приходы");
    const sum = rc.items.reduce((n, i) => n + i.qty * i.purchasePrice, 0);
    const k = sum > 0 ? 1 + rc.extraCosts / sum : 1;
    for (const it of rc.items) {
      const landed = r2(it.purchasePrice * k);
      const p = await tx.product.findUniqueOrThrow({ where: { id: it.productId } });
      const newQty = p.stockQty + it.qty;
      const cost = r2((p.stockQty * p.costPrice + it.qty * landed) / newQty);
      const noPrice = p.salePrice == null;
      await tx.product.update({
        where: { id: p.id },
        data: { stockQty: { increment: it.qty }, costPrice: cost, ...(noPrice ? { status: "awaiting_price", isPublished: false } : {}) },
      });
      await tx.receiptItem.update({ where: { id: it.id }, data: { landedCost: landed } });
      await tx.stockMovement.create({ data: { productId: p.id, type: "receipt", qty: it.qty, unitCost: landed, documentType: "receipt", documentId: rc.id, userId: user.id } });
      if (noPrice) awaiting.push(`${p.nameRu} ×${it.qty}`);
    }
    await tx.receipt.update({ where: { id }, data: { status: "posted", postedAt: new Date() } });
    await audit(tx, user.id, "receipt.post", "receipt", id, { status: "draft" }, { status: "posted" });
    return { number: rc.number };
  });
  notify(`Пришёл товар (${result.number}). ${awaiting.length ? "Ждёт цену: " + awaiting.join(", ") : "Все позиции с ценой"}`);
  return result;
}

/** Отмена проведённого прихода возможна, только если товар ещё на складе и не в резерве. */
export async function cancelReceipt(user: SessionUser, id: number) {
  return db.$transaction(async (tx) => {
    const rc = await tx.receipt.findUnique({ where: { id }, include: { items: true } });
    if (!rc) throw notFound();
    if (rc.status === "cancelled") throw conflict("Уже отменён");
    if (user.role !== "owner" && rc.createdById !== user.id) throw bad("Можно отменять только свои приходы");
    if (rc.status === "draft") {
      await tx.receipt.update({ where: { id }, data: { status: "cancelled" } });
      await audit(tx, user.id, "receipt.cancel", "receipt", id, { status: "draft" }, { status: "cancelled" });
      return { ok: true };
    }
    for (const it of rc.items) {
      const p = await tx.product.findUniqueOrThrow({ where: { id: it.productId } });
      await takeStock(tx, p.id, it.qty).catch(() => {
        throw conflict(`«${p.nameRu}»: часть товара уже продана или зарезервирована, отмена невозможна`);
      });
      const left = p.stockQty - it.qty;
      const cost = left > 0 ? Math.max(0, r2((p.stockQty * p.costPrice - it.qty * it.landedCost) / left)) : p.costPrice;
      await tx.product.update({ where: { id: p.id }, data: { costPrice: cost } });
      await tx.stockMovement.create({ data: { productId: p.id, type: "receipt", qty: -it.qty, unitCost: it.landedCost, documentType: "receipt", documentId: id, userId: user.id, note: "Отмена прихода" } });
    }
    await tx.receipt.update({ where: { id }, data: { status: "cancelled" } });
    await audit(tx, user.id, "receipt.cancel", "receipt", id, { status: "posted" }, { status: "cancelled" });
    return { ok: true };
  });
}

async function applyWriteOff(tx: Tx, id: number, approverId: number) {
  const wo = await tx.writeOff.findUniqueOrThrow({ where: { id }, include: { items: true } });
  for (const it of wo.items) {
    const p = await tx.product.findUniqueOrThrow({ where: { id: it.productId } });
    await takeStock(tx, p.id, it.qty).catch(() => {
      throw conflict(`«${p.nameRu}»: недостаточно свободного остатка для списания`);
    });
    await tx.stockMovement.create({ data: { productId: p.id, type: "write_off", qty: -it.qty, unitCost: p.costPrice, documentType: "write_off", documentId: id, userId: approverId, note: wo.reason } });
  }
  await tx.writeOff.update({ where: { id }, data: { status: "approved", approvedById: approverId } });
}

/** Админ создаёт заявку, владелец подтверждает; запись владельца проводится сразу. */
export async function createWriteOff(user: SessionUser, reason: string, items: { productId: number; qty: number }[]) {
  if (!items.length) throw bad("Добавьте позиции");
  return db.$transaction(async (tx) => {
    const wo = await tx.writeOff.create({ data: { reason, createdById: user.id, items: { create: items } } });
    await audit(tx, user.id, "writeoff.create", "write_off", wo.id, null, { reason, items });
    if (user.role === "owner") await applyWriteOff(tx, wo.id, user.id);
    return { id: wo.id };
  });
}

export async function decideWriteOff(user: SessionUser, id: number, approve: boolean) {
  return db.$transaction(async (tx) => {
    const wo = await tx.writeOff.findUnique({ where: { id } });
    if (!wo) throw notFound();
    if (wo.status !== "pending") throw conflict("Заявка уже обработана");
    if (approve) await applyWriteOff(tx, id, user.id);
    else await tx.writeOff.update({ where: { id }, data: { status: "rejected", approvedById: user.id } });
    await audit(tx, user.id, approve ? "writeoff.approve" : "writeoff.reject", "write_off", id, { status: "pending" }, { status: approve ? "approved" : "rejected" });
    return { ok: true };
  });
}

/** Инвентаризация: фактические остатки → корректировки с записью в журнал движений. */
export async function applyInventory(user: SessionUser, counts: { productId: number; actual: number }[]) {
  return db.$transaction(async (tx) => {
    const diffs: { productId: number; name: string; diff: number }[] = [];
    for (const c of counts) {
      const p = await tx.product.findUniqueOrThrow({ where: { id: c.productId } });
      if (c.actual < p.reservedQty) throw conflict(`«${p.nameRu}»: факт ${c.actual} меньше резерва ${p.reservedQty}`);
      const diff = c.actual - p.stockQty;
      if (!diff) continue;
      await tx.product.update({ where: { id: p.id }, data: { stockQty: c.actual } });
      await tx.stockMovement.create({ data: { productId: p.id, type: "adjustment", qty: diff, unitCost: p.costPrice, documentType: "inventory", userId: user.id, note: "Инвентаризация" } });
      await audit(tx, user.id, "stock.adjust", "product", p.id, { stockQty: p.stockQty }, { stockQty: c.actual });
      diffs.push({ productId: p.id, name: p.nameRu, diff });
    }
    return { diffs };
  });
}

/** Владелец задаёт цену / публикацию. Товар становится активным только с ценой. */
export async function setPrice(
  user: SessionUser,
  productId: number,
  d: { salePrice?: number | null; oldPrice?: number | null; isPublished?: boolean; installmentAllowed?: boolean },
) {
  return db.$transaction(async (tx) => {
    const p = await tx.product.findUnique({ where: { id: productId } });
    if (!p) throw notFound();
    const salePrice = d.salePrice === undefined ? p.salePrice : d.salePrice;
    const isPublished = (d.isPublished ?? p.isPublished) && salePrice != null;
    const status = p.status === "archived" ? "archived" : salePrice == null ? (p.stockQty > 0 ? "awaiting_price" : "draft") : "active";
    const next = await tx.product.update({
      where: { id: productId },
      data: { salePrice, oldPrice: d.oldPrice === undefined ? p.oldPrice : d.oldPrice, isPublished, installmentAllowed: d.installmentAllowed ?? p.installmentAllowed, status },
    });
    if (salePrice !== p.salePrice) await tx.priceHistory.create({ data: { productId, oldPrice: p.salePrice, newPrice: salePrice, userId: user.id } });
    await audit(tx, user.id, "product.price", "product", productId,
      { salePrice: p.salePrice, oldPrice: p.oldPrice, isPublished: p.isPublished },
      { salePrice: next.salePrice, oldPrice: next.oldPrice, isPublished: next.isPublished });
    return next;
  });
}
