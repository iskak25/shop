import { z } from "zod";
import { db } from "@/server/db";
import { handle } from "@/server/http";
import { requireUser } from "@/server/auth";
import { createReceipt } from "@/server/stock";

export const GET = handle(async () => {
  const u = await requireUser("owner", "admin");
  const rows = await db.receipt.findMany({
    where: u.role === "owner" ? {} : { createdById: u.id },
    include: { supplier: true, items: { include: { product: true } } },
    orderBy: { id: "desc" },
    take: 100,
  });
  return {
    receipts: rows.map((r) => ({
      id: r.id, number: r.number, date: r.date, status: r.status, supplier: r.supplier?.name ?? null, invoiceNo: r.invoiceNo, extraCosts: r.extraCosts,
      total: Math.round(r.items.reduce((n, i) => n + i.qty * i.purchasePrice, 0) + r.extraCosts),
      items: r.items.map((i) => ({ name: i.product.nameRu, qty: i.qty, purchasePrice: i.purchasePrice, landedCost: i.landedCost })),
    })),
  };
});

const schema = z.object({
  supplier: z.string().optional(),
  invoiceNo: z.string().optional(),
  extraCosts: z.number().min(0).default(0),
  items: z.array(z.object({ productId: z.number().int(), qty: z.number().int().min(1), purchasePrice: z.number().min(0) })).min(1, "Добавьте позиции"),
});

export const POST = handle(async (req: Request) => {
  const u = await requireUser("owner", "admin");
  return createReceipt(u, schema.parse(await req.json()));
});
