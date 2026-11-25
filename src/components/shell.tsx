"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, Home, LayoutGrid, Search, ShoppingBag, Trash2, User, Check, Minus, Plus } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { GlassButton, GlassDrawer, IconButton } from "./glass";
import { ProductVisual } from "./ProductVisual";
import { fmt } from "@/lib/data";
import { useCatalog } from "@/lib/catalog";
import { useStore } from "@/lib/store";

/** Фон-интерьер. Для фото: положите файл в public/bg и передайте src (cover/center). */
export function BackgroundScene({ variant = "home", src }: { variant?: "home" | "catalog" | "checkout"; src?: string }) {
  return (
    <div className={`scene scene--${variant}`} style={src ? { backgroundImage: `url(${src})` } : undefined} aria-hidden>
      {!src && (
        <>
          <div className="scene__wall" />
          <div className="scene__window" />
          <div className="scene__lamp" />
          <div className="scene__plinth" />
        </>
      )}
      <div className="scene__veil" />
    </div>
  );
}

const sceneFor = (p: string) => (p.startsWith("/checkout") ? "checkout" : p === "/" ? "home" : "catalog");

export function FloatingNavbar() {
  const path = usePathname();
  const router = useRouter();
  const { count, wishlist, setCartOpen } = useStore();
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    router.push(q.trim() ? `/catalog?q=${encodeURIComponent(q.trim())}` : "/catalog");
    setSearching(false);
  };
  const cur = (href: string) => (href === "/" ? path === "/" : path.startsWith(href)) ? "page" : undefined;

  return (
    <nav className="navbar" aria-label="Основная навигация">
      <Link href="/" className="navbar__logo" aria-label="Очаг — на главную">
        Очаг<span>.</span>
      </Link>
      <div className="navbar__links">
        <Link className="navbar__link" href="/" aria-current={cur("/")}>Главная</Link>
        <Link className="navbar__link" href="/catalog" aria-current={cur("/catalog")}>Каталог</Link>
        <Link className="navbar__link" href="/catalog?c=Казаны">Коллекции</Link>
      </div>
      <div className="navbar__actions">
        <form className="navbar__search" onSubmit={submit} role="search">
          <AnimatePresence initial={false}>
            {searching && (
              <motion.input
                key="s"
                autoFocus
                aria-label="Поиск по каталогу"
                placeholder="Поиск посуды"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onBlur={() => !q && setSearching(false)}
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 190, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              />
            )}
          </AnimatePresence>
          <IconButton label="Поиск" type={searching ? "submit" : "button"} onClick={() => !searching && setSearching(true)}>
            <Search size={20} strokeWidth={1.75} />
          </IconButton>
        </form>
        <Link href="/wishlist" className="icon-btn hide-mobile" aria-label="Избранное">
          <Heart size={20} strokeWidth={1.75} />
          {wishlist.length > 0 && <span className="badge">{wishlist.length}</span>}
        </Link>
        <IconButton label="Корзина" badge={count} onClick={() => setCartOpen(true)}>
          <ShoppingBag size={20} strokeWidth={1.75} />
        </IconButton>
        <Link href="/profile" className="icon-btn hide-mobile" aria-label="Профиль">
          <User size={20} strokeWidth={1.75} />
        </Link>
      </div>
    </nav>
  );
}

export function FloatingBottomNavigation() {
  const path = usePathname();
  const { count, wishlist, setCartOpen } = useStore();
  const items = [
    { href: "/", label: "Главная", icon: Home },
    { href: "/catalog", label: "Каталог", icon: LayoutGrid },
    { href: "/wishlist", label: "Избранное", icon: Heart, badge: wishlist.length },
    { href: "/profile", label: "Профиль", icon: User },
  ];
  const cur = (href: string) => ((href === "/" ? path === "/" : path.startsWith(href)) ? "page" : undefined);
  return (
    <nav className="bottom-nav" aria-label="Мобильная навигация">
      {items.slice(0, 3).map(({ href, label, icon: I, badge }) => (
        <Link key={href} href={href} className="bottom-nav__item" aria-current={cur(href)}>
          <I size={22} strokeWidth={1.6} />
          {label}
          {badge ? <span className="badge">{badge}</span> : null}
        </Link>
      ))}
      <button className="bottom-nav__item" onClick={() => setCartOpen(true)}>
        <ShoppingBag size={22} strokeWidth={1.6} />
        Корзина
        {count > 0 && <span className="badge">{count}</span>}
      </button>
      <Link href="/profile" className="bottom-nav__item" aria-current={cur("/profile")}>
        <User size={22} strokeWidth={1.6} />
        Профиль
      </Link>
    </nav>
  );
}

export function CartDrawer() {
  const { cart, cartOpen, setCartOpen, changeQty, removeLine, total } = useStore();
  const { get: getProduct } = useCatalog();
  const [promo, setPromo] = useState("");
  const close = () => setCartOpen(false);
  const discount = promo.trim().toUpperCase() === "OCHAG10" ? Math.round(total * 0.1) : 0;

  return (
    <GlassDrawer
      open={cartOpen}
      onClose={close}
      title="Корзина"
      footer={
        cart.length > 0 && (
          <>
            <form className="promo" onSubmit={(e) => e.preventDefault()}>
              <input aria-label="Промокод" placeholder="Промокод" value={promo} onChange={(e) => setPromo(e.target.value)} />
              <GlassButton variant="glass" type="submit" style={{ minHeight: 48, padding: "0 18px" }}>
                {discount ? <Check size={18} /> : "OK"}
              </GlassButton>
            </form>
            {discount > 0 && <div className="sum-row"><span>Скидка 10%</span><span>−{fmt(discount)}</span></div>}
            <div className="sum-row sum-row--total" style={{ borderColor: "rgba(255,255,255,0.25)" }}>
              <span>Итого</span>
              <span>{fmt(total - discount)}</span>
            </div>
            <Link href="/checkout" onClick={close} className="btn btn--primary btn--block">
              Оформить заказ
            </Link>
          </>
        )
      }
    >
      {cart.length === 0 ? (
        <p className="empty">Корзина пока пуста. Загляните в каталог — там много тёплых вещей для кухни.</p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {cart.map((l, i) => {
            const p = getProduct(l.slug);
            if (!p) return null;
            const hex = p.colors.find((c) => c.name === l.color)?.hex ?? p.colors[0].hex;
            return (
              <li key={`${l.slug}-${l.color}-${l.size}`} className="line">
                <div className="line__thumb"><ProductVisual product={p} color={hex} /></div>
                <div>
                  <div className="line__name">{p.name}</div>
                  <div className="line__meta">{l.color} · {l.size}</div>
                  <div className="qty-mini">
                    <button aria-label="Уменьшить" onClick={() => changeQty(i, -1)}><Minus size={14} /></button>
                    <span aria-live="polite">{l.qty}</span>
                    <button aria-label="Увеличить" onClick={() => changeQty(i, 1)}><Plus size={14} /></button>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="line__price">{fmt(p.price * l.qty)}</div>
                  <IconButton label="Удалить" onClick={() => removeLine(i)} style={{ width: 36, height: 36, marginTop: 4 }}>
                    <Trash2 size={16} strokeWidth={1.75} />
                  </IconButton>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </GlassDrawer>
  );
}

export function ToastNotification() {
  const { toast } = useStore();
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast}
          role="status"
          className="toast"
          initial={{ opacity: 0, y: 16, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: 8, x: "-50%" }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <Check size={18} strokeWidth={1.75} /> {toast}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  if (path.startsWith("/admin"))
    return (
      <>
        <BackgroundScene variant="catalog" />
        <main id="main">{children}</main>
        <ToastNotification />
      </>
    );
  return (
    <>
      <BackgroundScene variant={sceneFor(path)} />
      <FloatingNavbar />
      <main id="main">{children}</main>
      <FloatingBottomNavigation />
      <CartDrawer />
      <ToastNotification />
    </>
  );
}
