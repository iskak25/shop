"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ChevronRight, Heart, Maximize2, Minus, Plus, ShoppingBag, MessageCircle, Truck } from "lucide-react";
import { GlassButton, GlassModal, IconButton, Reveal } from "@/components/glass";
import { ProductVisual } from "@/components/ProductVisual";
import { ColorSelector, ProductCard, SizeSelector } from "@/components/product";
import { fmt, stockLabel, type Product } from "@/lib/data";
import { useCatalog } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import { useRouter } from "next/navigation";

function Accordion({ title, children, open }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details className="acc" open={open}>
      <summary>{title}<ChevronDown size={20} strokeWidth={1.75} /></summary>
      <div className="acc__body">{children}</div>
    </details>
  );
}

export function ProductView({ product: p }: { product: Product }) {
  const router = useRouter();
  const { products } = useCatalog();
  const { wishlist, toggleWish, addToCart, setCartOpen, notify } = useStore();
  const [color, setColor] = useState(p.colors[0].name);
  const [size, setSize] = useState(p.sizes[0]);
  const [qty, setQty] = useState(1);
  const [view, setView] = useState(0);
  const [zoom, setZoom] = useState(false);
  const liked = wishlist.includes(p.slug);
  const out = p.stock === "out";
  const hex = p.colors.find((c) => c.name === color)!.hex;
  const related = products.filter((x) => x.slug !== p.slug && x.category === p.category).concat(products.filter((x) => x.category !== p.category)).slice(0, 4);

  // с фото — галерея из загруженных снимков; без фото — «ракурсы» иллюстрации
  const photos = p.images.length > 0;
  const views = photos ? p.images.map(() => ({ s: 1, r: 0 })) : [{ s: 1, r: 0 }, { s: 1.18, r: -6 }, { s: 0.86, r: 5 }];
  const v = views[view];
  const wa = `https://wa.me/996700000000?text=${encodeURIComponent(`Здравствуйте! Хочу заказать: ${p.name}, ${color}, ${size}`)}`;

  const buyNow = () => { addToCart(p.slug, { color, size, qty, silent: true }); router.push("/checkout"); };

  return (
    <div className="page">
      <nav className="crumbs" aria-label="Хлебные крошки">
        <Link href="/catalog">Каталог</Link><ChevronRight size={14} />
        <Link href={`/catalog?c=${p.category}`}>{p.category}</Link>
      </nav>

      <Reveal className="product glass-light">
        <div>
          <div className="gallery__main">
            <div className="art" style={{ transform: `scale(${v.s}) rotate(${v.r}deg)` }}>
              <ProductVisual product={p} color={hex} label={`${p.name}, ${color}`} index={view} fit="cover" />
            </div>
            <IconButton className="gallery__zoom" tone="light" label="Увеличить фото" onClick={() => setZoom(true)}>
              <Maximize2 size={18} strokeWidth={1.75} />
            </IconButton>
          </div>
          <div className="gallery__thumbs" role="group" aria-label="Галерея">
            {(views.length > 1 ? views : []).map((t, i) => (
              <button key={i} className="thumb" aria-pressed={view === i} aria-label={`Фото ${i + 1}`} onClick={() => setView(i)}>
                <div style={{ transform: `scale(${t.s > 1 ? 1.1 : t.s < 1 ? 0.9 : 1}) rotate(${t.r}deg)` }}><ProductVisual product={p} color={hex} index={i} /></div>
              </button>
            ))}
          </div>
        </div>

        <div className="product__info">
          <div>
            <div className="small muted">{p.category}</div>
            <h1 className="display h1" style={{ marginTop: 4 }}>{p.name}</h1>
          </div>
          <div>
            <span className="price" style={{ fontSize: 28 }}>{fmt(p.price)}</span>
            {p.oldPrice && <span className="old-price" style={{ fontSize: 16 }}>{fmt(p.oldPrice)}</span>}
            <div style={{ marginTop: 6 }}><span className={`status ${p.stock === "few" ? "status--few" : out ? "status--out" : ""}`}>{stockLabel(p.stock)}</span></div>
          </div>
          <p className="muted">{p.description}</p>

          <div><div className="field-label">Цвет · {color}</div><ColorSelector colors={p.colors} value={color} onChange={setColor} /></div>
          <div><div className="field-label">Размер</div><SizeSelector sizes={p.sizes} value={size} onChange={setSize} /></div>
          <div>
            <div className="field-label">Количество</div>
            <div className="qty">
              <button aria-label="Меньше" onClick={() => setQty((q) => Math.max(1, q - 1))}><Minus size={18} /></button>
              <span aria-live="polite">{qty}</span>
              <button aria-label="Больше" onClick={() => setQty((q) => Math.min(20, q + 1))}><Plus size={18} /></button>
            </div>
          </div>

          <div className="row">
            <GlassButton disabled={out} onClick={() => { addToCart(p.slug, { color, size, qty }); setCartOpen(true); }} style={{ flex: 1 }}>
              <ShoppingBag size={18} strokeWidth={1.75} /> В корзину
            </GlassButton>
            <IconButton label={liked ? "Убрать из избранного" : "В избранное"} tone="light" active={liked} aria-pressed={liked} onClick={() => toggleWish(p.slug)} style={{ width: 52, height: 52, borderColor: "rgba(64,56,48,0.2)" }}>
              <Heart size={22} strokeWidth={1.75} />
            </IconButton>
          </div>
          <div className="row">
            <GlassButton variant="glass" disabled={out} onClick={buyNow} style={{ flex: 1, borderColor: "rgba(64,56,48,0.25)" }}>Купить сейчас</GlassButton>
            {p.installment && <GlassButton variant="glass" disabled={out} onClick={() => notify("Заявка на рассрочку: менеджер свяжется с вами")} style={{ flex: 1, borderColor: "rgba(64,56,48,0.25)" }}>В рассрочку</GlassButton>}
            <a className="btn btn--glass" href={wa} target="_blank" rel="noopener noreferrer" style={{ flex: "1 1 100%", borderColor: "rgba(64,56,48,0.25)" }}>
              <MessageCircle size={18} strokeWidth={1.75} /> Заказать через WhatsApp
            </a>
          </div>

          <div style={{ marginTop: 4 }}>
            <Accordion title="Характеристики" open>
              <dl className="specs">{p.specs.map((s) => (<><dt key={`t${s.label}`}>{s.label}</dt><dd key={`d${s.label}`}>{s.value}</dd></>))}</dl>
            </Accordion>
            <Accordion title="Доставка и оплата">
              <p style={{ display: "flex", gap: 10 }}><Truck size={18} strokeWidth={1.75} style={{ flexShrink: 0, marginTop: 2 }} />Доставка по Бишкеку от 1 дня, самовывоз бесплатно. Оплата наличными, переводом по QR или в рассрочку через MBank.</p>
            </Accordion>
            <Accordion title="Уход за посудой">
              <p>Мойте мягкой губкой, не используйте абразивы. Перед первым использованием промойте тёплой водой.</p>
            </Accordion>
          </div>
        </div>
      </Reveal>

      <div className="section-head"><h2 className="display h2">Вам может понравиться</h2></div>
      <div className="grid">{related.map((r) => <ProductCard key={r.slug} product={r} />)}</div>

      <GlassModal open={zoom} onClose={() => setZoom(false)} label="Увеличенное фото">
        <div style={{ aspectRatio: "1", maxWidth: 560, margin: "0 auto", padding: 24 }}><ProductVisual product={p} color={hex} label={`${p.name}, ${color}`} index={view} /></div>
      </GlassModal>
    </div>
  );
}
