import { z } from "zod";
import { db } from "@/server/db";
import { handle } from "@/server/http";
import { requireUser } from "@/server/auth";
import { setPrice } from "@/server/stock";

const schema = z.object({ percent: z.number().min(0).max(500), ids: z.array(z.number().int()).optional(), publish: z.boolean().default(true) });

/** «Себестоимость + наценка %» сразу для всех товаров, ждущих цену (или для выбранных). */
export const POST = handle(async (req: Request) => {
  const u = await requireUser("owner");
  const b = schema.parse(await req.json());
  const rows = await db.product.findMany({ where: b.ids ? { id: { in: b.ids } } : { status: "awaiting_price" } });
  for (const p of rows) {
    const price = Math.max(10, Math.round((p.costPrice * (1 + b.percent / 100)) / 10) * 10);
    await setPrice(u, p.id, { salePrice: price, isPublished: b.publish });
  }
  return { updated: rows.length };
});
