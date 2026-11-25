"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, Plus, ShoppingBag, ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { IconButton } from "./glass";
import { ProductVisual } from "./ProductVisual";
import { fmt, type ColorOption, type Product } from "@/lib/data";
import { useCatalog } from "@/lib/catalog";
import { useStore } from "@/lib/store";

export function ColorSelector({ colors, value, onChange }: { colors: ColorOption[]; value: string; onChange: (name: string) => void }) {
  return (
    <div className="dots" role="radiogroup" aria-label="Цвет">
      {colors.map((c) => (
        <button
          key={c.name}
          role="radio"
          aria-checked={value === c.name}
          aria-label={c.name}
          title={c.name}
          className="dot"
          style={{ background: c.hex }}
          onClick={() => onChange(c.name)}
        />
      ))}
    </div>
  );
}

export function SizeSelector({ sizes, value, onChange }: { sizes: string[]; value: string; onChange: (s: string) => void }) {
  return (
    <div className="sizes" role="radiogroup" aria-label="Размер">
      {sizes.map((s) => (
        <button key={s} role="radio" aria-checked={value === s} className="size" onClick={() => onChange(s)}>
          {s}
        </button>
      ))}
    </div>
  );
}

export function ProductCard({ product: p }: { product: Product }) {
  const { wishlist, toggleWish, addToCart } = useStore();
  const liked = wishlist.includes(p.slug);
  const out = p.stock === "out";
  const discount = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
  return (
    <motion.article
      className="card glass-light"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="card__media">
        <Link href={`/product/${p.slug}`} aria-label={p.name} style={{ position: "absolute", inset: 0 }}>
          <div className="art"><ProductVisual product={p} color={p.colors[0].hex} label={p.name} fit="cover" /></div>
        </Link>
        {out ? <span className="card__badge card__badge--out">Нет в наличии</span> : discount > 0 && <span className="card__badge">−{discount}%</span>}
        <IconButton className="card__fav" tone="light" label={liked ? "Убрать из избранного" : "В избранное"} active={liked} aria-pressed={liked} onClick={() => toggleWish(p.slug)}>
          <Heart size={20} strokeWidth={1.75} />
        </IconButton>
      </div>
      <div className="card__body">
        <span className="card__cat">{p.category}</span>
        <Link href={`/product/${p.slug}`} className="card__name">{p.name}</Link>
        <div className="dots" style={{ gap: 6, marginTop: 4 }} aria-label={`Цвета: ${p.colors.map((c) => c.name).join(", ")}`}>
          {p.colors.map((c) => <span key={c.name} className="dot dot--static" style={{ background: c.hex }} />)}
        </div>
        <div className="card__foot">
          <div>
            <span className="price">{fmt(p.price)}</span>
            {p.oldPrice && <span className="old-price">{fmt(p.oldPrice)}</span>}
          </div>
          <IconButton tone="solid" label={out ? "Нет в наличии" : "Быстро добавить в корзину"} disabled={out} onClick={() => addToCart(p.slug)}>
            <Plus size={20} strokeWidth={1.75} />
          </IconButton>
        </div>
      </div>
    </motion.article>
  );
}

/** Точка на изображении. Позиция хранится в процентах относительно сцены. */
export function ProductHotspot({ slug, x, y }: { slug: string; x: number; y: number }) {
  const p = useCatalog().get(slug);
  const { addToCart } = useStore();
  const [open, setOpen] = useState(false);
  if (!p) return null;
  const align = x < 32 ? "hotspot__pop--left" : x > 68 ? "hotspot__pop--right" : "";
  return (
    <div
      className="hotspot"
      style={{ left: `${x}%`, top: `${y}%` }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}
    >
      <button className="hotspot__dot" aria-label={`${p.name}, ${fmt(p.price)}`} aria-expanded={open} onClick={() => setOpen((o) => !o)} />
      <AnimatePresence>
        {open && (
          <motion.div
            className={`hotspot__pop glass-light ${align}`}
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="hotspot__thumb"><ProductVisual product={p} color={p.colors[0].hex} /></div>
            <div>
              <div className="name">{p.name}</div>
              <div className="price" style={{ fontSize: 16 }}>{fmt(p.price)}</div>
            </div>
            <div className="hotspot__actions">
              <Link href={`/product/${p.slug}`} className="btn btn--glass"><ArrowUpRight size={16} /> Открыть</Link>
              <button className="btn btn--primary" onClick={() => addToCart(p.slug)}><ShoppingBag size={16} /> В корзину</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FeaturedProduct({ slug }: { slug?: string }) {
  const { products, get } = useCatalog();
  const p = (slug && get(slug)) || products.find((x) => x.stock !== "out");
  if (!p) return null;
  return <FeaturedCard p={p} key={p.slug} />;
}

function FeaturedCard({ p }: { p: Product }) {
  const { addToCart } = useStore();
  const [color, setColor] = useState(p.colors[0].name);
  const [size, setSize] = useState(p.sizes[0]);
  const hex = p.colors.find((c) => c.name === color)?.hex ?? p.colors[0].hex;
  const discount = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
  return (
    <article className="featured glass-dark">
      <div className="featured__top">
        <div className="featured__label">Товар недели</div>
        <Link href={`/product/${p.slug}`} className="featured__art" aria-label={p.name}>
          <ProductVisual product={p} color={hex} label={p.name} />
        </Link>
        {discount > 0 && <span className="tag">−{discount}% на неделе</span>}
        <button className="fab featured__fab" aria-label="Добавить в корзину" onClick={() => addToCart(p.slug, { color, size })}>
          <Plus size={22} strokeWidth={1.75} />
        </button>
      </div>
      <div className="featured__bottom">
        <h3 className="featured__name">{p.name}</h3>
        <p className="featured__desc">{p.description.slice(0, 74)}…</p>
        <SizeSelector sizes={p.sizes} value={size} onChange={setSize} />
        <div className="featured__foot">
          <ColorSelector colors={p.colors} value={color} onChange={setColor} />
          <span className="price">{fmt(p.price)}</span>
        </div>
      </div>
    </article>
  );
}

export function CollectionHero({ title, items }: { title: string; items: { slug: string; x: number; y: number; w: number }[] }) {
  const { addToCart, notify } = useStore();
  const { get } = useCatalog();
  const list = items.flatMap((i) => { const p = get(i.slug); return p ? [{ ...i, p }] : []; });
  if (list.length < 3) return null;
  const total = list.reduce((n, i) => n + i.p.price, 0);
  const buyAll = () => {
    list.forEach((i) => addToCart(i.slug, { silent: true }));
    notify("Вся коллекция в корзине");
  };
  const labelPos: Record<string, React.CSSProperties> = {
    [list[0].slug]: { left: "2%", top: "34%" },
    [list[1].slug]: { right: "2%", top: "36%", textAlign: "right" },
    [list[2].slug]: { left: "50%", top: "2%", transform: "translateX(-50%)", textAlign: "center" },
  };
  return (
    <section className="hero-card glass-light" aria-labelledby="hero-title">
      <div className="hero-card__head">
        <div>
          <h1 id="hero-title" className="hero-card__title">
            Соберите кухню<br />в коллекции «{title}»
          </h1>
          <Link href="/catalog" className="back-link">Перейти в каталог</Link>
        </div>
        <IconButton label="Поделиться" tone="light" onClick={() => notify("Ссылка скопирована")} style={{ width: 40, height: 40 }}>
          <ArrowUpRight size={18} strokeWidth={1.75} />
        </IconButton>
      </div>

      <div className="stage">
        <div className="stage__circle stage__circle--1" />
        <div className="stage__circle stage__circle--2" />
        <div className="stage__floor" />
        {list.map((i) => (
          <div key={i.slug} className="stage__item" style={{ left: `${i.x}%`, top: `${i.y}%`, width: `${i.w}%` }}>
            <ProductVisual product={i.p} color={i.p.colors[0].hex} label={i.p.name} />
          </div>
        ))}
        {list.map((i) => (
          <div key={`l${i.slug}`} className="stage__label" style={labelPos[i.slug]}>
            {i.p.name.split(",")[0]}
            <b>{fmt(i.p.price)}</b>
          </div>
        ))}
        {list.map((i) => <ProductHotspot key={`h${i.slug}`} slug={i.slug} x={i.x} y={i.y - 2} />)}
      </div>

      <dl className="hero-card__details">
        <div>
          <dt>Коллекция</dt>
          <dd>{title}</dd>
          <dt>Итого</dt>
          <dd style={{ fontSize: 22 }}>{fmt(total)}</dd>
        </div>
        <p>Три предмета, которые работают вместе: чугунный казан для плова, эмалированный чайник и сковорода-гриль. Доставка по Бишкеку от 1 дня, оплата в рассрочку через MBank.</p>
      </dl>

      <button className="btn btn--primary hero-card__cta" onClick={buyAll}>
        <ShoppingBag size={18} strokeWidth={1.75} /> Купить коллекцию
      </button>
    </section>
  );
}

export function UserProfilePanel({ expanded }: { expanded?: boolean }) {
  return (
    <section className="panel glass-dark" aria-label="Профиль">
      <div className="panel__title">Мой профиль</div>
      <div className="avatars">
        <div className="avatar" aria-hidden>АТ</div>
        <div>
          <div style={{ fontWeight: 600 }}>Айдана Т.</div>
          <div className="small muted">+996 700 000 000</div>
        </div>
      </div>
      <ul className="menu-list">
        <li><Link href="/profile">Профиль</Link></li>
        <li><Link href="/profile#orders">История заказов</Link></li>
        <li><Link href="/order-status">Статус заказа</Link></li>
        <li><Link href="/catalog">Персональные рекомендации</Link></li>
        {expanded && <li><Link href="/wishlist">Избранное</Link></li>}
      </ul>
    </section>
  );
}

export function WishlistPanel({ limit }: { limit?: number }) {
  const { wishlist, toggleWish, addToCart } = useStore();
  const { get } = useCatalog();
  const items = wishlist.map(get).filter(Boolean).slice(0, limit) as Product[];
  return (
    <section className="panel glass-dark" aria-label="Избранное">
      <div className="panel__title">Избранное</div>
      {items.length === 0 ? (
        <p className="empty">Здесь появятся товары, отмеченные сердечком.</p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {items.map((p) => (
            <li key={p.slug} className="line">
              <Link href={`/product/${p.slug}`} className="line__thumb" aria-label={p.name}><ProductVisual product={p} color={p.colors[0].hex} /></Link>
              <div>
                <Link href={`/product/${p.slug}`} className="line__name">{p.name}</Link>
                <div className="line__meta">{p.colors[0].name.toUpperCase()} · {p.sizes[0]}</div>
                <button className="line__remove" onClick={() => toggleWish(p.slug)}>Удалить</button>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="line__price">{fmt(p.price)}</div>
                <IconButton label="В корзину" style={{ width: 36, height: 36, marginTop: 4 }} disabled={p.stock === "out"} onClick={() => addToCart(p.slug)}>
                  <ShoppingBag size={16} strokeWidth={1.75} />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}
      {limit && wishlist.length > limit && <Link href="/wishlist" className="small" style={{ display: "inline-block", marginTop: 8, textDecoration: "underline" }}>Смотреть все ({wishlist.length})</Link>}
    </section>
  );
}
