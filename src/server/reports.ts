import ExcelJS from "exceljs";
import { db } from "./db";
import type { SessionUser } from "./auth";

export type Period = "today" | "week" | "month";

const startOf = (p: Period) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (p === "week") d.setDate(d.getDate() - 6);
  if (p === "month") d.setDate(d.getDate() - 29);
  return d;
};
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

/** Дашборд. Себестоимость и прибыль — только владельцу; продавец видит только свои продажи. */
export async function dashboard(user: SessionUser, period: Period) {
  const from = startOf(period);
  const owner = user.role === "owner";
  const sales = await db.order.findMany({
    where: { status: "delivered", shippedAt: { gte: from }, ...(user.role === "seller" ? { sellerId: user.id } : {}) },
    include: { items: true },
  });

  let revenue = 0, cost = 0, units = 0;
  const byDay = new Map<string, { revenue: number; profit: number }>();
  for (let i = 0; ; i++) {
    const d = new Date(from.getTime() + i * 86400_000);
    if (d > new Date()) break;
    byDay.set(dayKey(d), { revenue: 0, profit: 0 });
  }
  for (const o of sales) {
    const rev = o.items.reduce((n, i) => n + i.price * i.qty - i.discount, 0);
    const c = o.items.reduce((n, i) => n + i.costAtSale * i.qty, 0);
    revenue += rev; cost += c; units += o.items.reduce((n, i) => n + i.qty, 0);
    const k = dayKey(o.shippedAt!);
    const row = byDay.get(k) ?? { revenue: 0, profit: 0 };
    row.revenue += rev; row.profit += rev - c;
    byDay.set(k, row);
  }

  const out: Record<string, unknown> = {
    period, revenue: Math.round(revenue), units, orders: sales.length,
    avgCheck: sales.length ? Math.round(revenue / sales.length) : 0,
    series: [...byDay.entries()].sort().map(([date, v]) => ({ date, revenue: Math.round(v.revenue), ...(owner ? { profit: Math.round(v.profit) } : {}) })),
  };
  if (owner) {
    out.cost = Math.round(cost);
    out.profit = Math.round(revenue - cost);
    out.margin = revenue ? Math.round(((revenue - cost) / revenue) * 1000) / 10 : 0;
  }

  if (user.role !== "seller") {
    const products = await db.product.findMany({ where: { status: { not: "archived" } } });
    out.newOrders = await db.order.count({ where: { status: "new" } });
    out.installmentRequests = await db.order.count({ where: { status: "awaiting_payment", paymentMethod: "installment" } });
    out.awaitingPrice = products.filter((p) => p.salePrice == null && p.stockQty > 0).map((p) => ({ id: p.id, name: p.nameRu, qty: p.stockQty }));
    out.lowStock = products.filter((p) => p.minQty > 0 && p.stockQty - p.reservedQty < p.minQty).map((p) => ({ id: p.id, name: p.nameRu, available: p.stockQty - p.reservedQty, min: p.minQty }));
    if (owner) out.stockValue = Math.round(products.reduce((n, p) => n + p.stockQty * p.costPrice, 0));
  }
  return out;
}

export async function stockList(user: SessionUser) {
  const owner = user.role === "owner";
  const rows = await db.product.findMany({ where: { status: { not: "archived" } }, include: { category: true }, orderBy: { nameRu: "asc" } });
  return rows.map((p) => ({
    id: p.id, sku: p.sku, name: p.nameRu, category: p.category.nameRu, stock: p.stockQty, reserved: p.reservedQty,
    available: p.stockQty - p.reservedQty, min: p.minQty, status: p.status, salePrice: p.salePrice,
    retailSum: p.salePrice != null ? p.salePrice * p.stockQty : null,
    ...(owner ? { cost: p.costPrice, costSum: Math.round(p.costPrice * p.stockQty) } : {}),
  }));
}

/** Продажи и прибыль по товарам за период (владелец). */
export async function profitByProduct(period: Period) {
  const items = await db.orderItem.findMany({
    where: { order: { status: "delivered", shippedAt: { gte: startOf(period) } } },
    include: { product: true },
  });
  const map = new Map<number, { name: string; qty: number; revenue: number; cost: number }>();
  for (const i of items) {
    const r = map.get(i.productId) ?? { name: i.product.nameRu, qty: 0, revenue: 0, cost: 0 };
    r.qty += i.qty; r.revenue += i.price * i.qty - i.discount; r.cost += i.costAtSale * i.qty;
    map.set(i.productId, r);
  }
  return [...map.values()].map((r) => ({ ...r, profit: r.revenue - r.cost, margin: r.revenue ? Math.round(((r.revenue - r.cost) / r.revenue) * 1000) / 10 : 0 })).sort((a, b) => b.profit - a.profit);
}

export async function toXlsx(sheet: string, rows: Record<string, unknown>[]) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheet);
  const cols = rows.length ? Object.keys(rows[0]) : ["Нет данных"];
  ws.columns = cols.map((c) => ({ header: c, key: c, width: Math.max(14, c.length + 4) }));
  rows.forEach((r) => ws.addRow(r));
  ws.getRow(1).font = { bold: true };
  return Buffer.from(await wb.xlsx.writeBuffer());
}
