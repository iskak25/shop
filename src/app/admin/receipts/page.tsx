"use client";

import { useState } from "react";
import { GlassButton } from "@/components/glass";
import { api, dt, useLoad } from "@/lib/api";
import { fmt } from "@/lib/data";
import { useStore } from "@/lib/store";

interface Prod { id: number; name: string; sku: string }
interface Receipt {
  id: number; number: string; date: string; status: string; supplier: string | null; invoiceNo: string | null; extraCosts: number; total: number;
  items: { name: string; qty: number; purchasePrice: number; landedCost: number }[];
}
const ST: Record<string, [string, string]> = { draft: ["Черновик", "pill-tag--warn"], posted: ["Проведён", "pill-tag--ok"], cancelled: ["Отменён", "pill-tag--bad"] };

export default function ReceiptsPage() {
  const { data, reload, error } = useLoad<{ receipts: Receipt[] }>("/api/admin/receipts");
  const { data: pr } = useLoad<{ products: Prod[] }>("/api/admin/products");
  const { notify } = useStore();
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([{ productId: "", qty: "1", price: "" }]);
  const [supplier, setSupplier] = useState("");
  const [invoice, setInvoice] = useState("");
  const [extra, setExtra] = useState("0");

  const upd = (i: number, k: string, v: string) => setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const sum = rows.reduce((n, r) => n + (Number(r.qty) || 0) * (Number(r.price) || 0), 0);

  const create = async () => {
    try {
      const items = rows.filter((r) => r.productId).map((r) => ({ productId: Number(r.productId), qty: Number(r.qty), purchasePrice: Number(r.price) }));
      await api("/api/admin/receipts", { body: { supplier, invoiceNo: invoice, extraCosts: Number(extra) || 0, items } });
      notify("Приход сохранён как черновик"); setOpen(false); setRows([{ productId: "", qty: "1", price: "" }]); setErr(""); reload();
    } catch (e) { setErr((e as Error).message); }
  };
  const act = async (id: number, action: "post" | "cancel") => {
    try { await api(`/api/admin/receipts/${id}`, { body: { action } }); notify(action === "post" ? "Приход проведён, остатки обновлены" : "Приход отменён"); setErr(""); reload(); }
    catch (e) { setErr((e as Error).message); }
  };

  return (
    <>
      <div className="row-gap" style={{ justifyContent: "space-between" }}>
        <h1 className="display">Приход товара</h1>
        <GlassButton className="btn-sm" onClick={() => setOpen((o) => !o)}>{open ? "Закрыть" : "Новый приход"}</GlassButton>
      </div>
      {(error || err) && <p className="alert" role="alert">{error || err}</p>}

      {open && (
        <div className="glass-light card-pad stack">
          <div className="form-grid">
            <div className="field"><label htmlFor="s">Поставщик</label><input id="s" className="input" value={supplier} onChange={(e) => setSupplier(e.target.value)} /></div>
            <div className="field"><label htmlFor="i">Номер накладной</label><input id="i" className="input" value={invoice} onChange={(e) => setInvoice(e.target.value)} /></div>
            <div className="field"><label htmlFor="e">Доп. расходы (доставка, таможня), сом</label><input id="e" type="number" min={0} className="input" value={extra} onChange={(e) => setExtra(e.target.value)} /></div>
          </div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Товар</th><th>Кол-во</th><th>Закупочная цена</th><th /></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td><select className="input" aria-label="Товар" value={r.productId} onChange={(e) => upd(i, "productId", e.target.value)}><option value="">Выберите…</option>{pr?.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></td>
                    <td><input className="input" type="number" min={1} aria-label="Количество" value={r.qty} onChange={(e) => upd(i, "qty", e.target.value)} /></td>
                    <td><input className="input" type="number" min={0} aria-label="Закупочная цена" value={r.price} onChange={(e) => upd(i, "price", e.target.value)} /></td>
                    <td>{rows.length > 1 && <button className="small" onClick={() => setRows((x) => x.filter((_, j) => j !== i))}>Убрать</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="row-gap" style={{ justifyContent: "space-between" }}>
            <GlassButton variant="glass" className="btn-sm" onClick={() => setRows((r) => [...r, { productId: "", qty: "1", price: "" }])} style={{ borderColor: "rgba(64,56,48,0.25)" }}>Добавить позицию</GlassButton>
            <b>Итого: {fmt(sum + (Number(extra) || 0))}</b>
          </div>
          <GlassButton onClick={create}>Сохранить черновик</GlassButton>
        </div>
      )}

      {data?.receipts.map((r) => (
        <div key={r.id} className="glass-light card-pad">
          <div className="row-gap" style={{ justifyContent: "space-between" }}>
            <div><b>{r.number}</b> <span className={`pill-tag ${ST[r.status]?.[1]}`}>{ST[r.status]?.[0]}</span><div className="small muted">{dt(r.date)} · {r.supplier ?? "без поставщика"}{r.invoiceNo && ` · накл. ${r.invoiceNo}`}</div></div>
            <div className="row-gap"><b>{fmt(r.total)}</b>
              {r.status === "draft" && <GlassButton className="btn-sm" onClick={() => act(r.id, "post")}>Провести</GlassButton>}
              {r.status !== "cancelled" && <GlassButton variant="glass" className="btn-sm" style={{ borderColor: "rgba(64,56,48,0.25)" }} onClick={() => act(r.id, "cancel")}>Отменить</GlassButton>}
            </div>
          </div>
          <ul className="list-plain" style={{ marginTop: 8 }}>
            {r.items.map((i, k) => <li key={k}><span>{i.name} × {i.qty}</span><span className="muted">{fmt(i.purchasePrice)}{i.landedCost ? ` → с расходами ${fmt(i.landedCost)}` : ""}</span></li>)}
          </ul>
        </div>
      ))}
    </>
  );
}
