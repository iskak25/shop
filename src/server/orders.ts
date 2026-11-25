import { db, type Tx } from "./db";
import { HttpError, bad, conflict, notFound } from "./http";
import { audit, getSetting, notify } from "./support";
import type { SessionUser } from "./auth";

export interface OrderInput {
  source: "site" | "instagram" | "whatsapp" | "store";
  customer?: { name: string; phone: string; address?: string };
  /** id покупателя с активной сессией: заказ попадёт в его историю */
  accountId?: number;
  deliveryType: "delivery" | "pickup";
  address?: string;
  paymentMethod: "cash" | "qr" | "installment";
  items: { productId?: number; slug?: string; qty: number; discount?: number; meta?: string }[];
}

const FLOW: Record<string, string[]> = {
  new: ["confirmed", "awaiting_payment", "paid", "shipping", "delivered", "cancelled"],
  confirmed: ["awaiting_payment", "paid", "shipping", "delivered", "cancelled"],
  awaiting_payment: ["confirmed", "paid", "cancelled"],
  paid: ["shipping", "delivered", "cancelled"],
  shipping: ["delivered", "cancelled"],
  delivered: ["returned"],
};
export const STATUS_RU: Record<string, string> = {
  new: "Новый", confirmed: "Подтверждён", awaiting_payment: "Ожидает рассрочку / оплату", paid: "Оплачен",
  shipping: "Передан в доставку", delivered: "Выдан / доставлен", cancelled: "Отменён", returned: "Возврат",
};

/** Создание заказа: цены берутся из БД, товар резервируется атомарно. actor = null для сайта. */
export async function createOrder(input: OrderInput, actor: SessionUser | null) {
  if (!input.items.length) throw bad("Корзина пуста");
  if (input.source !== "site" && !actor) throw new HttpError(401, "Требуется вход");
  if (input.source === "store" && actor?.role === "admin") throw new HttpError(403, "Офлайн-продажу оформляют владелец и продавец");
  if (input.source === "site" && !input.customer) throw bad("Укажите имя и телефон");
  const limitPct = actor?.role === "owner" ? 100 : Number(await getSetting("seller_discount_limit_pct"));
  const hours = Number(await getSetting("installment_reserve_hours"));

  const created = await db.$transaction(async (tx) => {
    let customer = null;
    if (input.accountId && input.customer) {
      const acc = await tx.customer.findUnique({ where: { id: input.accountId } });
      if (acc) {
        const phoneTaken = acc.phone == null && (await tx.customer.findUnique({ where: { phone: input.customer.phone } }));
        customer = await tx.customer.update({
          where: { id: acc.id },
          data: {
            ...(acc.name.trim() ? {} : { name: input.customer.name }),
            ...(acc.phone == null && !phoneTaken ? { phone: input.customer.phone } : {}),
            ...(acc.address ? {} : { address: input.customer.address }),
          },
        });
      }
    }
    if (!customer && input.customer)
      customer = await tx.customer.upsert({
        where: { phone: input.customer.phone },
        update: { name: input.customer.name, address: input.customer.address },
        create: { name: input.customer.name, phone: input.customer.phone, address: input.customer.address },
      });
    let total = 0, discountSum = 0;
    const lines: { productId: number; qty: number; price: number; discount: number; meta?: string; name: string }[] = [];
    for (const it of input.items) {
      if (!Number.isInteger(it.qty) || it.qty < 1) throw bad("Неверное количество");
      const p = await tx.product.findFirst({ where: it.productId ? { id: it.productId } : { slug: it.slug } });
      if (!p || p.salePrice == null || p.status === "archived") throw bad("Товар недоступен");
      if (input.source === "site" && !p.isPublished) throw bad(`«${p.nameRu}» недоступен для заказа`);
      if (input.paymentMethod === "installment" && !p.installmentAllowed) throw bad(`«${p.nameRu}»: рассрочка недоступна`);
      const gross = p.salePrice * it.qty;
      const discount = Math.max(0, Math.min(it.discount ?? 0, gross));
      if (discount > (gross * limitPct) / 100) throw new HttpError(403, `Скидка превышает лимит ${limitPct}%`);
      const n = await tx.$executeRaw`UPDATE "Product" SET "reservedQty" = "reservedQty" + ${it.qty} WHERE "id" = ${p.id} AND "stockQty" - "reservedQty" >= ${it.qty}`;
      if (n !== 1) throw conflict(`«${p.nameRu}»: нет в наличии в нужном количестве`);
      lines.push({ productId: p.id, qty: it.qty, price: p.salePrice, discount, meta: it.meta, name: p.nameRu });
      total += gross - discount;
      discountSum += discount;
    }
    const installment = input.paymentMethod === "installment";
    if (installment) {
      if ((await getSetting("installment_enabled")) !== "1") throw bad("Рассрочка отключена");
      const min = Number(await getSetting("installment_min_amount"));
      if (total < min) throw bad(`Минимальная сумма для рассрочки — ${min} сом`);
    }
    const order = await tx.order.create({
      data: {
        number: `tmp-${Date.now()}-${Math.random()}`,
        customerId: customer?.id, source: input.source, status: installment ? "awaiting_payment" : "new",
        paymentMethod: input.paymentMethod, deliveryType: input.deliveryType, address: input.address || null,
        total, discount: discountSum, sellerId: actor?.id,
        reserveUntil: installment ? new Date(Date.now() + hours * 3600_000) : null,
        items: { create: lines.map((l) => ({ productId: l.productId, qty: l.qty, price: l.price, discount: l.discount, meta: l.meta })) },
      },
    });
    const number = String(1000 + order.id);
    await tx.order.update({ where: { id: order.id }, data: { number } });
    await audit(tx, actor?.id ?? null, "order.create", "order", order.id, null, { number, total, source: input.source });
    return { id: order.id, number, total, lines, installment };
  });

  notify(`Новый заказ №${created.number} (${input.source}) на ${created.total} сом${created.installment ? " — РАССРОЧКА, оформить через М-Бизнес" : ""}: ${created.lines.map((l) => `${l.name}×${l.qty}`).join(", ")}`);
  return { id: created.id, number: created.number, total: created.total };
}

async function release(tx: Tx, orderId: number) {
  const items = await tx.orderItem.findMany({ where: { orderId } });
  for (const i of items) await tx.$executeRaw`UPDATE "Product" SET "reservedQty" = CASE WHEN "reservedQty" > ${i.qty} THEN "reservedQty" - ${i.qty} ELSE 0 END WHERE "id" = ${i.productId}`;
}

/** Смена статуса. Остаток списывается при выдаче, себестоимость фиксируется в строке заказа. */
export async function setOrderStatus(id: number, status: string, actor: SessionUser | null, opts: { returnToStock?: boolean } = {}) {
  return db.$transaction(async (tx) => {
    const o = await tx.order.findUnique({ where: { id }, include: { items: true } });
    if (!o) throw notFound();
    if (!FLOW[o.status]?.includes(status)) throw conflict(`Нельзя перейти из «${STATUS_RU[o.status]}» в «${STATUS_RU[status] ?? status}»`);
    if (status === "returned" && actor?.role !== "owner") throw new HttpError(403, "Возврат оформляет владелец");
    const data: Record<string, unknown> = { status };

    if (status === "delivered") {
      for (const it of o.items) {
        const p = await tx.product.findUniqueOrThrow({ where: { id: it.productId } });
        const n = await tx.$executeRaw`UPDATE "Product" SET "stockQty" = "stockQty" - ${it.qty}, "reservedQty" = CASE WHEN "reservedQty" > ${it.qty} THEN "reservedQty" - ${it.qty} ELSE 0 END WHERE "id" = ${p.id} AND "stockQty" >= ${it.qty}`;
        if (n !== 1) throw conflict(`«${p.nameRu}»: на складе меньше, чем в заказе`);
        await tx.orderItem.update({ where: { id: it.id }, data: { costAtSale: p.costPrice } });
        await tx.stockMovement.create({ data: { productId: p.id, type: "sale", qty: -it.qty, unitCost: p.costPrice, documentType: "order", documentId: id, userId: actor?.id } });
      }
      data.shippedAt = new Date();
      data.paymentStatus = "paid";
      data.reserveUntil = null;
    } else if (status === "cancelled") {
      await release(tx, id);
      data.reserveUntil = null;
    } else if (status === "returned") {
      const back = opts.returnToStock !== false;
      for (const it of o.items) {
        await tx.stockMovement.create({ data: { productId: it.productId, type: "return", qty: it.qty, unitCost: it.costAtSale, documentType: "order", documentId: id, userId: actor?.id } });
        if (back) await tx.product.update({ where: { id: it.productId }, data: { stockQty: { increment: it.qty } } });
        else await tx.stockMovement.create({ data: { productId: it.productId, type: "write_off", qty: -it.qty, unitCost: it.costAtSale, documentType: "order", documentId: id, userId: actor?.id, note: "Возврат с повреждением" } });
      }
      data.paymentStatus = "refunded";
    } else if (status === "paid") {
      data.paymentStatus = "paid";
      data.reserveUntil = null;
      await tx.payment.create({ data: { orderId: id, provider: o.paymentMethod === "installment" ? "mbank" : o.paymentMethod, amount: o.total, status: "paid" } });
    } else if (status === "confirmed") {
      data.reserveUntil = null;
    }
    await tx.order.update({ where: { id }, data });
    await audit(tx, actor?.id ?? null, "order.status", "order", id, { status: o.status }, { status });
    return { ok: true };
  });
}

/** Снимает резерв у заявок на рассрочку, которые не оформили за отведённое время. */
export async function expireReservations() {
  const due = await db.order.findMany({ where: { status: { in: ["new", "awaiting_payment"] }, reserveUntil: { lt: new Date() } }, select: { id: true } });
  for (const o of due) await setOrderStatus(o.id, "cancelled", null).catch(() => {});
  return due.length;
}
