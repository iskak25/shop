"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Product } from "./data";

interface Catalog {
  products: Product[];
  categories: string[];
  get: (slug: string) => Product | undefined;
}

const Ctx = createContext<Catalog | null>(null);

export function CatalogProvider({ products, categories, children }: { products: Product[]; categories: string[]; children: ReactNode }) {
  const value = useMemo<Catalog>(() => ({ products, categories: ["Все", ...categories], get: (s) => products.find((p) => p.slug === s) }), [products, categories]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCatalog() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCatalog must be used inside CatalogProvider");
  return c;
}
