import { z } from "zod";
import { db } from "@/server/db";
import { handle } from "@/server/http";
import { requireUser } from "@/server/auth";
import { STATUS_RU, createOrder, expireReservations, setOrderStatus } from "@/server/orders";

export const GET = handle(async (req: Request) => {
  const u = await requireUser();
  await expireReservations();
  const status = new URL(req.url).searchParams.get("status");
  const rows = await db.order.findMany({
    where: { ...(status ? { status } : {}), ...(u.role === "seller" ? { OR: [{ sellerId: u.id }, { source: { not: "store" } }] } : {}) },
    include: { customer: true, items: { include: { product: true } } },
    orderBy: { id: "desc" },
    take: 100,
  });
  return {
    orders: rows.map((o) => ({
      id: o.id, number: o.number, source: o.source, status: o.status, statusLabel: STATUS_RU[o.status], paymentMethod: o.paymentMethod, paymentStatus: o.paymentStatus,
      deliveryType: o.deliveryType, address: o.address, total: o.total, discount: o.discount, reserveUntil: o.reserveUntil, createdAt: o.createdAt,
      customer: o.customer ? { name: o.customer.name, phone: o.contactPhone ?? o.customer.phone ?? "" } : null,
      items: o.items.map((i) => ({ name: i.product.nameRu, qty: i.qty, price: i.price, discount: i.discount, meta: i.meta })),
    })),
  };
});

const schema = z.object({
  source: z.enum(["instagram", "whatsapp", "store"]),
  customer: z.object({ name: z.string().trim().min(1), phone: z.string().trim().min(5), address: z.string().optional() }).optional(),
  deliveryType: z.enum(["delivery", "pickup"]).default("pickup"),
  address: z.string().optional(),
  paymentMethod: z.enum(["cash", "qr", "installment"]).default("cash"),
  items: z.array(z.object({ productId: z.number().int(), qty: z.number().int().min(1), discount: z.number().int().min(0).default(0) })).min(1, "Добавьте товары"),
  completeNow: z.boolean().default(false), // касса: продажа сразу выдаётся
});

export const POST = handle(async (req: Request) => {
  const u = await requireUser();
  const { completeNow, ...b } = schema.parse(await req.json());
  const order = await createOrder(b, u);
  if (completeNow) await setOrderStatus(order.id, "delivered", u);
  return order;
});
