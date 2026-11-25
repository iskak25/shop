"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/product";
import { ProductSkeleton, Reveal } from "@/components/glass";
import { useCatalog } from "@/lib/catalog";

function Catalog() {
  const { products, categories } = useCatalog();
  const params = useSearchParams();
  const q = (params.get("q") ?? "").toLowerCase();
  const [cat, setCat] = useState(params.get("c") ?? "Все");
  const [sort, setSort] = useState("pop");

  const list = useMemo(() => {
    let r = products.filter((p) => (cat === "Все" || p.category === cat) && (!q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)));
    if (sort === "asc") r = [...r].sort((a, b) => a.price - b.price);
    if (sort === "desc") r = [...r].sort((a, b) => b.price - a.price);
    return r;
  }, [products, cat, sort, q]);

  return (
    <div className="page">
      <Reveal>
        <h1 className="display h1" style={{ marginBottom: 20 }}>Каталог{q && <span className="muted"> · «{q}»</span>}</h1>
        <div className="toolbar glass-dark">
          <div className="pills" role="group" aria-label="Категории">
            {categories.map((c) => (
              <button key={c} className="pill" aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>
            ))}
          </div>
          <label className="sr-only" htmlFor="sort">Сортировка</label>
          <select id="sort" className="select" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="pop">Сначала популярные</option>
            <option value="asc">Сначала дешевле</option>
            <option value="desc">Сначала дороже</option>
          </select>
        </div>
      </Reveal>
      {list.length === 0 ? (
        <div className="glass-light panel" style={{ textAlign: "center", padding: 48 }}>Ничего не найдено. Попробуйте другую категорию или запрос.</div>
      ) : (
        <div className="grid">{list.map((p) => <ProductCard key={p.slug} product={p} />)}</div>
      )}
    </div>
  );
}

export default function CatalogPage() {
  return (
    <Suspense
      fallback={
        <div className="page"><div className="grid">{Array.from({ length: 4 }, (_, i) => <ProductSkeleton key={i} />)}</div></div>
      }
    >
      <Catalog />
    </Suspense>
  );
}
