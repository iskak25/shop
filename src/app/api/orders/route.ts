import { z } from "zod";
import { HttpError, handle } from "@/server/http";
import { createOrder } from "@/server/orders";

const schema = z.object({
  customer: z.object({ name: z.string().trim().min(1, "Укажите имя"), phone: z.string().trim().min(9, "Укажите телефон"), address: z.string().optional() }),
  deliveryType: z.enum(["delivery", "pickup"]),
  address: z.string().optional(),
  paymentMethod: z.enum(["cash", "qr", "installment"]),
  items: z.array(z.object({ slug: z.string(), qty: z.number().int().min(1).max(50), meta: z.string().optional() })).min(1, "Корзина пуста"),
});

export const POST = handle(async (req: Request) => {
  const b = schema.parse(await req.json());
  if (b.deliveryType === "delivery" && !b.address?.trim()) throw new HttpError(400, "Укажите адрес доставки");
  return createOrder({ ...b, source: "site" }, null);
});
