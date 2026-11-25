"use client";

import { useMemo, useState } from "react";
import { GlassButton } from "@/components/glass";
import { api, useLoad } from "@/lib/api";
import { fmt } from "@/lib/data";
import { useStore } from "@/lib/store";
import { useMe } from "@/lib/me";

interface P { id: number; sku: string; barcode: string | null; name: string; salePrice: number | null; available: number }
interface Line { p: P; qty: number; discount: number }

/** Касса: поиск или штрихкод (сканер вводит код и Enter), скидка в пределах лимита роли. */
export default function PosPage() {
  const me = useMe();
  const { data, reload } = useLoad<{ products: P[] }>("/api/admin/products");
  const { data: st } = useLoad<{ settings: Record<string, string> }>(me.role === "owner" ? "/api/admin/settings" : "/api/auth/me");
  const { notify } = useStore();
  const [q, setQ] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [pay, setPay] = useState("cash");
  const [err, setErr] = useState("");
  const [receipt, setReceipt] = useState<{ number: string; total: number; lines: Line[]; pay: string } | null>(null);
  const limit = me.role === "owner" ? 100 : Number(st?.settings?.seller_discount_limit_pct ?? 10);

  const items = useMemo(() => (data?.products ?? []).filter((p) => p.salePrice && (!q || p.name.toLowerCase().includes(q.toLowerCase()) || p.sku.toLowerCase() === q.toLowerCase() || p.barcode === q)), [data, q]);
  const total = lines.reduce((n, l) => n + l.p.salePrice! * l.qty - l.discount, 0);

  const add = (p: P) => setLines((ls) => {
    const i = ls.findIndex((l) => l.p.id === p.id);
    if (i >= 0) return ls.map((l, j) => (j === i ? { ...l, qty: Math.min(l.qty + 1, p.available) } : l));
    return [...ls, { p, qty: 1, discount: 0 }];
  });
  const onScan = (code: string) => {
    const hit = data?.products.find((p) => p.barcode === code || p.sku.toLowerCase() === code.toLowerCase());
    if (hit && hit.salePrice && hit.available > 0) { add(hit); setQ(""); }
  };

  const sell = async () => {
    try {
      const r = await api<{ number: string; total: number }>("/api/admin/orders", { body: { source: "store", paymentMethod: pay, deliveryType: "pickup", completeNow: true, items: lines.map((l) => ({ productId: l.p.id, qty: l.qty, discount: l.discount })) } });
      setReceipt({ number: r.number, total: r.total, lines, pay }); setLines([]); setErr(""); reload(); notify(`Продажа №${r.number} проведена`);
    } catch (e) { setErr((e as Error).message); }
  };

  if (receipt)
    return (
      <div className="glass-light card-pad stack" style={{ maxWidth: 480 }}>
        <h1 className="display h2">Чек № {receipt.number}</h1>
        <ul className="list-plain">{receipt.lines.map((l) => <li key={l.p.id}><span>{l.p.name} × {l.qty}</span><span>{fmt(l.p.salePrice! * l.qty - l.discount)}</span></li>)}</ul>
        <div className="sum-row sum-row--total"><span>Итого</span><span>{fmt(receipt.total)}</span></div>
        <div className="row-gap no-print"><GlassButton onClick={() => window.print()}>Печать чека</GlassButton><GlassButton variant="glass" style={{ borderColor: "rgba(64,56,48,0.25)" }} onClick={() => setReceipt(null)}>Новая продажа</GlassButton></div>
      </div>
    );

  return (
    <>
      <h1 className="display">Касса</h1>
      <div className="pos">
        <div className="glass-light card-pad stack">
          <input className="input" autoFocus placeholder="Поиск по названию или штрихкод + Enter" aria-label="Поиск товара" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onScan(q.trim())} />
          <div className="pos__grid">
            {items.map((p) => (
              <button key={p.id} className="pos__item" disabled={p.available <= 0} onClick={() => add(p)}>
                <b>{p.name}</b><span>{fmt(p.salePrice!)} · {p.available > 0 ? `${p.available} шт.` : "нет"}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="glass-light card-pad stack" style={{ alignSelf: "start" }}>
          <h2 className="display h3">Чек</h2>
          {!lines.length && <p className="muted">Добавьте товары из списка.</p>}
          {lines.map((l, i) => (
            <div key={l.p.id} style={{ borderTop: i ? "1px solid rgba(64,56,48,0.1)" : 0, paddingTop: i ? 12 : 0 }}>
              <div className="row-gap" style={{ justifyContent: "space-between" }}><b>{l.p.name}</b><button className="small" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>Убрать</button></div>
              <div className="row-gap" style={{ marginTop: 6 }}>
                <input className="input" style={{ width: 80, minHeight: 40 }} type="number" min={1} max={l.p.available} aria-label="Количество" value={l.qty} onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, qty: Math.max(1, Math.min(l.p.available, Number(e.target.value) || 1)) } : x)))} />
                <input className="input" style={{ width: 110, minHeight: 40 }} type="number" min={0} aria-label="Скидка, сом" placeholder="Скидка" value={l.discount || ""} onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, discount: Number(e.target.value) || 0 } : x)))} />
                <span style={{ marginLeft: "auto" }}>{fmt(l.p.salePrice! * l.qty - l.discount)}</span>
              </div>
            </div>
          ))}
          <p className="small muted">Скидка на позицию — до {limit}% для вашей роли.</p>
          <div className="field"><label htmlFor="pay">Оплата</label><select id="pay" className="input" value={pay} onChange={(e) => setPay(e.target.value)}><option value="cash">Наличные</option><option value="qr">Перевод / QR</option></select></div>
          <div className="sum-row sum-row--total"><span>К оплате</span><span>{fmt(total)}</span></div>
          {err && <p className="alert" role="alert">{err}</p>}
          <GlassButton block disabled={!lines.length} onClick={sell}>Провести продажу</GlassButton>
        </div>
      </div>
    </>
  );
}
