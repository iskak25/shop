import type { Product } from "@/lib/data";
import { ProductArt } from "./ProductArt";

/** Реальное фото товара; если фото ещё не загружено, показывается иллюстрация. Без label — миниатюра. */
export function ProductVisual({ product, color, label, index = 0, fit = "contain" }: { product: Pick<Product, "kind" | "images" | "colors">; color?: string; label?: string; index?: number; fit?: "contain" | "cover" }) {
  const img = product.images[index] ?? product.images[0];
  if (!img) return <ProductArt kind={product.kind} color={color ?? product.colors[0].hex} label={label} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className={`photo ${fit === "cover" ? "photo--cover" : ""}`} src={label ? img.src : img.thumb} alt={label ?? ""} loading="lazy" decoding="async" />
  );
}
