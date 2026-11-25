import { z } from "zod";
import { db } from "@/server/db";
import { handle } from "@/server/http";
import { requireUser } from "@/server/auth";
import { createWriteOff } from "@/server/stock";

export const GET = handle(async () => {
  const u = await requireUser("owner", "admin");
  const rows = await db.writeOff.findMany({ where: u.role === "owner" ? {} : { createdById: u.id }, include: { items: true }, orderBy: { id: "desc" }, take: 100 });
  const products = await db.product.findMany({ where: { id: { in: rows.flatMap((r) => r.items.map((i) => i.productId)) } } });
  const byId = new Map(products.map((p) => [p.id, p]));
  return {
    writeoffs: rows.map((w) => ({
      id: w.id, date: w.date, reason: w.reason, status: w.status,
      items: w.items.map((i) => ({ name: byId.get(i.productId)?.nameRu ?? "—", qty: i.qty })),
      ...(u.role === "owner" ? { loss: Math.round(w.items.reduce((n, i) => n + i.qty * (byId.get(i.productId)?.costPrice ?? 0), 0)) } : {}),
    })),
  };
});

const schema = z.object({ reason: z.string().trim().min(2, "Укажите причину"), items: z.array(z.object({ productId: z.number().int(), qty: z.number().int().min(1) })).min(1, "Добавьте позиции") });

export const POST = handle(async (req: Request) => {
  const u = await requireUser("owner", "admin");
  const b = schema.parse(await req.json());
  return createWriteOff(u, b.reason, b.items);
});
