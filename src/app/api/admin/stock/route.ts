import { db } from "@/server/db";
import { handle } from "@/server/http";
import { requireUser } from "@/server/auth";
import { stockList } from "@/server/reports";

export const GET = handle(async (req: Request) => {
  const u = await requireUser();
  const pid = Number(new URL(req.url).searchParams.get("movements"));
  if (pid) {
    const rows = await db.stockMovement.findMany({ where: { productId: pid }, orderBy: { id: "desc" }, take: 100 });
    return { movements: rows.map((m) => ({ id: m.id, type: m.type, qty: m.qty, note: m.note, createdAt: m.createdAt, ...(u.role === "owner" ? { unitCost: m.unitCost } : {}) })) };
  }
  return { stock: await stockList(u) };
});
