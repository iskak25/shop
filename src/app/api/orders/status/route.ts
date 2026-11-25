import { db } from "@/server/db";
import { handle, notFound } from "@/server/http";
import { STATUS_RU } from "@/server/orders";

const digits = (s: string) => s.replace(/\D/g, "");

/** Статус заказа по номеру и телефону. */
export const GET = handle(async (req: Request) => {
  const u = new URL(req.url);
  const number = digits(u.searchParams.get("number") ?? "");
  const phone = digits(u.searchParams.get("phone") ?? "");
  const o = await db.order.findUnique({ where: { number }, include: { customer: true, items: { include: { product: true } } } });
  if (!o || !o.customer || phone.length < 9 || digits(o.customer.phone).slice(-9) !== phone.slice(-9)) throw notFound("Заказ не найден. Проверьте номер и телефон");
  return {
    number: o.number, status: o.status, statusLabel: STATUS_RU[o.status], total: o.total, createdAt: o.createdAt,
    items: o.items.map((i) => ({ name: i.product.nameRu, qty: i.qty, price: i.price })),
  };
});
