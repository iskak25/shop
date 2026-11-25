import { z } from "zod";
import { db } from "@/server/db";
import { handle, conflict } from "@/server/http";
import { requireUser } from "@/server/auth";
import { audit } from "@/server/support";
import { slugify } from "@/server/slug";

export const GET = handle(async () => {
  const u = await requireUser();
  const rows = await db.product.findMany({ where: { status: { not: "archived" } }, include: { category: true, brand: true, images: { orderBy: { sort: "asc" } } }, orderBy: { id: "asc" } });
  return {
    products: rows.map((p) => ({
      id: p.id, sku: p.sku, barcode: p.barcode, name: p.nameRu, description: p.description, category: p.category.nameRu, categoryId: p.categoryId, brand: p.brand?.name ?? null,
      unit: p.unit, salePrice: p.salePrice, oldPrice: p.oldPrice, stock: p.stockQty, reserved: p.reservedQty, available: p.stockQty - p.reservedQty,
      thumb: p.images[0] ? `/api/files/${p.images[0].path}-sm.webp` : null, photos: p.images.length,
      minQty: p.minQty, isPublished: p.isPublished, installmentAllowed: p.installmentAllowed, status: p.status,
      ...(u.role === "owner" ? { costPrice: p.costPrice } : {}),
    })),
  };
});

const attrs = z.object({
  kind: z.enum(["pot", "pan", "kettle", "kazan", "bowl", "cup"]).default("pot"),
  colors: z.array(z.object({ name: z.string(), hex: z.string() })).default([]),
  sizes: z.array(z.string()).default([]),
  specs: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
});
const schema = z.object({
  nameRu: z.string().trim().min(2, "Укажите название"),
  nameKy: z.string().optional(),
  sku: z.string().trim().optional(),
  barcode: z.string().trim().optional(),
  categoryId: z.number().int(),
  brand: z.string().trim().optional(),
  description: z.string().default(""),
  unit: z.string().default("шт."),
  minQty: z.number().int().min(0).default(0),
  attributes: attrs.default({ kind: "pot", colors: [], sizes: [], specs: [] }),
});

export const POST = handle(async (req: Request) => {
  const u = await requireUser("owner", "admin");
  const b = schema.parse(await req.json());
  let slug = slugify(b.nameRu);
  if (await db.product.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;
  const count = await db.product.count();
  const sku = b.sku || `OC-${String(count + 1).padStart(4, "0")}`;
  if (await db.product.findUnique({ where: { sku } })) throw conflict("Артикул уже используется");
  const brand = b.brand ? await db.brand.upsert({ where: { name: b.brand }, update: {}, create: { name: b.brand } }) : null;
  const p = await db.product.create({
    data: { nameRu: b.nameRu, nameKy: b.nameKy, slug, sku, barcode: b.barcode || null, categoryId: b.categoryId, brandId: brand?.id, description: b.description, unit: b.unit, minQty: b.minQty, attributes: b.attributes },
  });
  await audit(db, u.id, "product.create", "product", p.id, null, { name: b.nameRu, sku });
  return { id: p.id };
});
