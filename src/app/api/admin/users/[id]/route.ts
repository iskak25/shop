import { z } from "zod";
import { db } from "@/server/db";
import { conflict, handle, notFound } from "@/server/http";
import { hashPassword, requireUser } from "@/server/auth";
import { audit } from "@/server/support";

const schema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(["owner", "admin", "seller"]).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8, "Пароль не короче 8 символов").optional(),
});

export const PATCH = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const me = await requireUser("owner");
  const id = Number((await params).id);
  const { password, ...rest } = schema.parse(await req.json());
  const before = await db.user.findUnique({ where: { id } });
  if (!before) throw notFound();
  if (id === me.id && (rest.isActive === false || (rest.role && rest.role !== "owner"))) throw conflict("Нельзя лишить прав самого себя");
  await db.user.update({ where: { id }, data: { ...rest, ...(password ? { passwordHash: await hashPassword(password) } : {}) } });
  await audit(db, me.id, "user.update", "user", id, { role: before.role, isActive: before.isActive }, { ...rest, passwordChanged: !!password });
  return { ok: true };
});
