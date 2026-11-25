"use client";

import { ProductCard } from "@/components/product";
import { Reveal } from "@/components/glass";
import { useCatalog } from "@/lib/catalog";
import type { Product } from "@/lib/data";
import { useStore } from "@/lib/store";

export default function WishlistPage() {
  const { wishlist } = useStore();
  const { get } = useCatalog();
  const items = wishlist.map(get).filter(Boolean) as Product[];
  return (
    <div className="page">
      <Reveal>
        <h1 className="display h1" style={{ marginBottom: 24 }}>Избранное</h1>
      </Reveal>
      {items.length === 0 ? (
        <div className="glass-light panel" style={{ textAlign: "center", padding: 48 }}>Пока ничего не выбрано. Нажмите сердечко на понравившейся карточке.</div>
      ) : (
        <div className="grid">{items.map((p) => <ProductCard key={p.slug} product={p} />)}</div>
      )}
    </div>
  );
}
