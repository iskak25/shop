import { db } from "./db";
import type { Kind, Product } from "@/lib/data";

/** Публичный каталог: только опубликованные товары с ценой; точный остаток и закупка не передаются. */
export async function getPublicProducts(): Promise<Product[]> {
  const rows = await db.product.findMany({
    where: { isPublished: true, salePrice: { not: null }, status: "active", category: { isVisible: true } },
    include: { category: true, images: { orderBy: { sort: "asc" } } },
    orderBy: { id: "asc" },
  });
  return rows.map((p) => {
    const a = (p.attributes ?? {}) as { kind?: Kind; colors?: { name: string; hex: string }[]; sizes?: string[]; specs?: { label: string; value: string }[] };
    const available = p.stockQty - p.reservedQty;
    return {
      id: p.id,
      slug: p.slug,
      name: p.nameRu,
      category: p.category.nameRu,
      kind: a.kind ?? "pot",
      price: p.salePrice!,
      oldPrice: p.oldPrice ?? undefined,
      colors: a.colors?.length ? a.colors : [{ name: "Классический", hex: "#c9b8a0" }],
      sizes: a.sizes?.length ? a.sizes : [p.unit],
      description: p.description,
      specs: a.specs ?? [],
      stock: available <= 0 ? "out" : available <= Math.max(3, p.minQty) ? "few" : "many",
      installment: p.installmentAllowed,
      images: p.images.map((i) => ({ src: `/api/files/${i.path}.webp`, thumb: `/api/files/${i.path}-sm.webp` })),
    };
  });
}

export async function getPublicCategories() {
  const rows = await db.category.findMany({ where: { isVisible: true }, orderBy: { sort: "asc" } });
  return rows.map((c) => c.nameRu);
}
