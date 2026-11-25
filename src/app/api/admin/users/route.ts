import { z } from "zod";
import { db } from "@/server/db";
import { conflict, handle } from "@/server/http";
import { hashPassword, requireUser } from "@/server/auth";
import { audit } from "@/server/support";

export const GET = handle(async () => {
  await requireUser("owner");
  const rows = await db.user.findMany({ orderBy: { id: "asc" } });
  return { users: rows.map((u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, isActive: u.isActive })) };
});

const schema = z.object({
  name: z.string().trim().min(2, "Укажите имя"),
  email: z.string().email("Неверный email"),
  phone: z.string().optional(),
  password: z.string().min(8, "Пароль не короче 8 символов"),
  role: z.enum(["owner", "admin", "seller"]),
});

export const POST = handle(async (req: Request) => {
  const me = await requireUser("owner");
  const b = schema.parse(await req.json());
  if (await db.user.findUnique({ where: { email: b.email.toLowerCase() } })) throw conflict("Пользователь с таким email уже есть");
  const u = await db.user.create({ data: { name: b.name, email: b.email.toLowerCase(), phone: b.phone, role: b.role, passwordHash: await hashPassword(b.password) } });
  await audit(db, me.id, "user.create", "user", u.id, null, { email: u.email, role: u.role });
  return { id: u.id };
});
