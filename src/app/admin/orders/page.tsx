"use client";

import { useState } from "react";
import { GlassButton } from "@/components/glass";
import { api, dt, useLoad } from "@/lib/api";
import { fmt } from "@/lib/data";
import { useStore } from "@/lib/store";
import { useMe } from "@/lib/me";

interface O {
  id: number; number: string; source: string; status: string; statusLabel: string; paymentMethod: string; paymentStatus: string; deliveryType: string; address: string | null;
  total: number; discount: number; reserveUntil: string | null; createdAt: string; customer: { name: string; phone: string } | null;
  items: { name: string; qty: number; price: number; discount: number; meta: string | null }[];
}
interface Prod { id: number; name: string; salePrice: number | null; available: number }

const NEXT: Record<string, [string, string][]> = {
  new: [["confirmed", "Подтвердить"], ["shipping", "В доставку"], ["delivered", "Выдан"], ["cancelled", "Отменить"]],
  confirmed: [["paid", "Оплачен"], ["shipping", "В доставку"], ["delivered", "Выдан"], ["cancelled", "Отменить"]],
  awaiting_payment: [["paid", "Рассрочка одобрена"], ["cancelled", "Отказ / отмена"]],
  paid: [["shipping", "В доставку"], ["delivered", "Выдан"], ["cancelled", "Отменить"]],
  shipping: [["delivered", "Доставлен"], ["cancelled", "Отменить"]],
  delivered: [["returned", "Оформить возврат"]],
};
const SRC: Record<string, string> = { site: "Сайт", instagram: "Instagram", whatsapp: "WhatsApp", store: "Магазин" };
const PAY: Record<string, string> = { cash: "Наличные", qr: "Перевод / QR", installment: "Рассрочка" };

export default function OrdersPage() {
  const me = useMe();
  const [filter, setFilter] = useState("");
  const { data, reload, error } = useLoad<{ orders: O[] }>(`/api/admin/orders${filter ? `?status=${filter}` : ""}`);
  const { data: pr } = useLoad<{ products: Prod[] }>("/api/admin/products");
  const { notify } = useStore();
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ source: "instagram", name: "", phone: "", delivery: "pickup", address: "", pay: "cash", productId: "", qty: "1" });

  const move = async (id: number, status: string) => {
    if (status === "returned" && me.role !== "owner") return setErr("Возврат оформляет владелец");
    if (status === "returned" && !confirm("Вернуть товар на склад? «Отмена» — товар повреждён и уйдёт в списание")) {
      return act(id, status, false);
    }
    return act(id, status, true);
  };
  const act = async (id: number, status: string, returnToStock: boolean) => {
    try { await api(`/api/admin/orders/${id}`, { body: { status, returnToStock } }); notify("Статус обновлён"); setErr(""); reload(); }
    catch (e) { setErr((e as Error).message); }
  };
  const create = async () => {
    try {
      await api("/api/admin/orders", {
        body: {
          source: f.source, customer: { name: f.name, phone: f.phone, address: f.address }, deliveryType: f.delivery, address: f.address, paymentMethod: f.pay,
          items: [{ productId: Number(f.productId), qty: Number(f.qty), discount: 0 }],
        },
      });
      notify("Заказ создан, товар в резерве"); setOpen(false); setErr(""); reload();
    } catch (e) { setErr((e as Error).message); }
  };

  const selectable = pr?.products.filter((p) => p.salePrice && p.available > 0) ?? [];
  return (
    <>
      <div className="row-gap" style={{ justifyContent: "space-between" }}>
        <h1 className="display">Заказы</h1>
        <div className="row-gap">
          <select className="input" style={{ width: 220, minHeight: 44 }} aria-label="Фильтр по статусу" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">Все статусы</option>
            {[["new", "Новые"], ["awaiting_payment", "Ждут рассрочку / оплату"], ["confirmed", "Подтверждены"], ["paid", "Оплачены"], ["shipping", "В доставке"], ["delivered", "Выданы"], ["cancelled", "Отменены"], ["returned", "Возвраты"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <GlassButton className="btn-sm" onClick={() => setOpen((o) => !o)}>{open ? "Закрыть" : "Заказ из Instagram / WhatsApp"}</GlassButton>
        </div>
      </div>
      {(error || err) && <p className="alert" role="alert">{error || err}</p>}

      {open && (
        <div className="glass-light card-pad stack">
          <div className="form-grid">
            <div className="field"><label htmlFor="so">Источник</label><select id="so" className="input" value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })}><option value="instagram">Instagram</option><option value="whatsapp">WhatsApp</option></select></div>
            <div className="field"><label htmlFor="pm">Оплата</label><select id="pm" className="input" value={f.pay} onChange={(e) => setF({ ...f, pay: e.target.value })}><option value="cash">Наличные</option><option value="qr">Перевод / QR</option><option value="installment">Рассрочка</option></select></div>
            <div className="field"><label htmlFor="cn">Имя клиента</label><input id="cn" className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
            <div className="field"><label htmlFor="cp">Телефон</label><input id="cp" className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
            <div className="field"><label htmlFor="dl">Получение</label><select id="dl" className="input" value={f.delivery} onChange={(e) => setF({ ...f, delivery: e.target.value })}><option value="pickup">Самовывоз</option><option value="delivery">Доставка</option></select></div>
            <div className="field"><label htmlFor="ad">Адрес</label><input id="ad" className="input" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
            <div className="field"><label htmlFor="pr">Товар</label><select id="pr" className="input" value={f.productId} onChange={(e) => setF({ ...f, productId: e.target.value })}><option value="">Выберите…</option>{selectable.map((p) => <option key={p.id} value={p.id}>{p.name} · {fmt(p.salePrice!)} · {p.available} шт.</option>)}</select></div>
            <div className="field"><label htmlFor="qt">Количество</label><input id="qt" type="number" min={1} className="input" value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} /></div>
          </div>
          <GlassButton onClick={create} disabled={!f.productId || !f.name || !f.phone}>Создать заказ</GlassButton>
        </div>
      )}

      {data?.orders.map((o) => (
        <article key={o.id} className="glass-light card-pad">
          <div className="row-gap" style={{ justifyContent: "space-between" }}>
            <div>
              <b>№ {o.number}</b> <span className="pill-tag">{SRC[o.source]}</span>{" "}
              <span className={`pill-tag ${o.status === "delivered" ? "pill-tag--ok" : o.status === "cancelled" || o.status === "returned" ? "pill-tag--bad" : "pill-tag--warn"}`}>{o.statusLabel}</span>
              <div className="small muted">{dt(o.createdAt)} · {PAY[o.paymentMethod]} · {o.deliveryType === "delivery" ? `доставка${o.address ? `: ${o.address}` : ""}` : "самовывоз"}</div>
              {o.customer && <div className="small">{o.customer.name}, <a href={`tel:${o.customer.phone}`}>{o.customer.phone}</a></div>}
              {o.reserveUntil && <div className="small" style={{ color: "var(--accent-text)" }}>Резерв до {dt(o.reserveUntil)}</div>}
            </div>
            <b style={{ fontSize: 18 }}>{fmt(o.total)}</b>
          </div>
          <ul className="list-plain" style={{ margin: "8px 0" }}>
            {o.items.map((i, k) => <li key={k}><span>{i.name} × {i.qty}{i.meta && <span className="muted"> · {i.meta}</span>}</span><span>{fmt(i.price * i.qty - i.discount)}</span></li>)}
          </ul>
          <div className="row-gap">
            {(NEXT[o.status] ?? []).map(([s, l]) => (
              <GlassButton key={s} variant={s === "cancelled" ? "glass" : "primary"} className="btn-sm" style={s === "cancelled" ? { borderColor: "rgba(64,56,48,0.25)" } : undefined} onClick={() => move(o.id, s)}>{l}</GlassButton>
            ))}
          </div>
        </article>
      ))}
      {data && !data.orders.length && <div className="glass-light card-pad muted">Заказов нет.</div>}
    </>
  );
}
