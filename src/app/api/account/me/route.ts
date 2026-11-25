import { z } from "zod";
import { db } from "@/server/db";
import { HttpError, handle } from "@/server/http";
import { getCustomer, requireCustomer } from "@/server/account";

const view = (c: { name: string; email: string | null; phone: string | null; address: string | null }) => ({ name: c.name, email: c.email, phone: c.phone, address: c.address });

export const GET = handle(async () => {
  const c = await getCustomer();
  return { customer: c ? view(c) : null };
});

const patch = z.object({
  name: z.string().trim().min(1, "Укажите имя").max(80),
  phone: z.string().trim().max(30).optional(),
  address: z.string().trim().max(200).optional(),
});

export const PATCH = handle(async (req: Request) => {
  const c = await requireCustomer();
  const b = patch.parse(await req.json());
  const phone = b.phone || null;
  if (phone && phone !== c.phone && (await db.customer.findUnique({ where: { phone } }))) throw new HttpError(409, "Этот телефон уже привязан к другому профилю");
  return { customer: view(await db.customer.update({ where: { id: c.id }, data: { name: b.name, phone, address: b.address || null } })) };
});
