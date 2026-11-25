import { z } from "zod";
import { db } from "@/server/db";
import { HttpError, handle, notFound } from "@/server/http";
import { requireUser } from "@/server/auth";
import { setPrice } from "@/server/stock";
import { audit } from "@/server/support";

const schema = z.object({
  nameRu: z.string().min(2).optional(),
  description: z.string().optional(),
  categoryId: z.number().int().optional(),
  minQty: z.number().int().min(0).optional(),
  barcode: z.string().nullable().optional(),
  archive: z.boolean().optional(),
  // только владелец:
  salePrice: z.number().int().min(1).nullable().optional(),
  oldPrice: z.number().int().min(1).nullable().optional(),
  isPublished: z.boolean().optional(),
  installmentAllowed: z.boolean().optional(),
});

export const PATCH = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const u = await requireUser("owner", "admin");
  const id = Number((await params).id);
  const b = schema.parse(await req.json());
  const { salePrice, oldPrice, isPublished, installmentAllowed, archive, ...info } = b;
  const priceTouched = [salePrice, oldPrice, isPublished, installmentAllowed].some((v) => v !== undefined);
  if (priceTouched && u.role !== "owner") throw new HttpError(403, "Цену и публикацию задаёт только владелец");
  const before = await db.product.findUnique({ where: { id } });
  if (!before) throw notFound();
  if (Object.keys(info).length || archive !== undefined) {
    await db.product.update({ where: { id }, data: { ...info, ...(archive ? { status: "archived", isPublished: false } : {}) } });
    await audit(db, u.id, "product.update", "product", id, before, { ...info, archive });
  }
  if (priceTouched) await setPrice(u, id, { salePrice, oldPrice, isPublished, installmentAllowed });
  return { ok: true };
});
