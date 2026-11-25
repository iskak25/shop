import { db } from "@/server/db";
import { handle } from "@/server/http";
import { requireCustomer } from "@/server/account";
import { STATUS_RU } from "@/server/orders";

export const GET = handle(async () => {
  const c = await requireCustomer();
  const rows = await db.order.findMany({ where: { customerId: c.id }, orderBy: { createdAt: "desc" }, include: { items: { include: { product: true } } } });
  return {
    orders: rows.map((o) => ({
      number: o.number, createdAt: o.createdAt, status: o.status, statusLabel: STATUS_RU[o.status] ?? o.status, total: o.total,
      items: o.items.map((i) => `${i.product.nameRu} × ${i.qty}`),
    })),
  };
});
