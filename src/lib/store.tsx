"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useCatalog } from "./catalog";

export interface CartLine {
  slug: string;
  color: string;
  size: string;
  qty: number;
}

interface Store {
  cart: CartLine[];
  wishlist: string[];
  cartOpen: boolean;
  toast: string | null;
  count: number;
  total: number;
  setCartOpen: (v: boolean) => void;
  addToCart: (slug: string, opts?: { color?: string; size?: string; qty?: number; silent?: boolean }) => void;
  changeQty: (index: number, delta: number) => void;
  removeLine: (index: number) => void;
  clearCart: () => void;
  toggleWish: (slug: string) => void;
  notify: (msg: string) => void;
}

const Ctx = createContext<Store | null>(null);
const KEY = "ochag-store-v1";
const SEED_WISH = ["kazan-chugun-5l", "chaynik-emal-2l", "salatnik-keramika"];

export function StoreProvider({ children }: { children: ReactNode }) {
  const { get: getProduct } = useCatalog();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [wishlist, setWishlist] = useState<string[]>(SEED_WISH);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (Array.isArray(s.cart)) setCart(s.cart);
        if (Array.isArray(s.wishlist)) setWishlist(s.wishlist);
      }
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ cart, wishlist }));
    } catch {}
  }, [cart, wishlist, ready]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const notify = useCallback((m: string) => setToast(m), []);

  const addToCart: Store["addToCart"] = useCallback((slug, opts = {}) => {
    const p = getProduct(slug);
    if (!p || p.stock === "out") return;
    const color = opts.color ?? p.colors[0].name;
    const size = opts.size ?? p.sizes[0];
    const qty = opts.qty ?? 1;
    setCart((c) => {
      const i = c.findIndex((l) => l.slug === slug && l.color === color && l.size === size);
      if (i >= 0) return c.map((l, j) => (j === i ? { ...l, qty: l.qty + qty } : l));
      return [...c, { slug, color, size, qty }];
    });
    if (!opts.silent) setToast(`«${p.name}» добавлен в корзину`);
  }, [getProduct]);

  const changeQty = useCallback(
    (i: number, d: number) =>
      setCart((c) => c.map((l, j) => (j === i ? { ...l, qty: Math.max(1, Math.min(20, l.qty + d)) } : l))),
    [],
  );
  const removeLine = useCallback((i: number) => setCart((c) => c.filter((_, j) => j !== i)), []);
  const clearCart = useCallback(() => setCart([]), []);
  const toggleWish = useCallback((slug: string) => {
    setWishlist((w) => {
      const has = w.includes(slug);
      setToast(has ? "Убрано из избранного" : "Добавлено в избранное");
      return has ? w.filter((s) => s !== slug) : [...w, slug];
    });
  }, []);

  const value = useMemo<Store>(() => {
    const count = cart.reduce((n, l) => n + l.qty, 0);
    const total = cart.reduce((n, l) => n + l.qty * (getProduct(l.slug)?.price ?? 0), 0);
    return { cart, wishlist, cartOpen, toast, count, total, setCartOpen, addToCart, changeQty, removeLine, clearCart, toggleWish, notify };
  }, [cart, wishlist, cartOpen, toast, getProduct, addToCart, changeQty, removeLine, clearCart, toggleWish, notify]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used inside StoreProvider");
  return s;
}
