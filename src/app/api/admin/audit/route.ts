import { db } from "@/server/db";
import { handle } from "@/server/http";
import { requireUser } from "@/server/auth";

export const GET = handle(async () => {
  await requireUser("owner");
  const rows = await db.auditLog.findMany({ orderBy: { id: "desc" }, take: 200 });
  const users = await db.user.findMany();
  const names = new Map(users.map((u) => [u.id, u.name]));
  return { log: rows.map((r) => ({ ...r, user: r.userId ? names.get(r.userId) ?? `#${r.userId}` : "система" })) };
});
