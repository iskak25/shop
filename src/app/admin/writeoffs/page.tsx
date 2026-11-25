"use client";

import { useState } from "react";
import { GlassButton } from "@/components/glass";
import { api, dt, useLoad } from "@/lib/api";
import { fmt } from "@/lib/data";
import { useMe } from "@/lib/me";
import { useStore } from "@/lib/store";

interface W { id: number; date: string; reason: string; status: string; items: { name: string; qty: number }[]; loss?: number }
interface Prod { id: number; name: string; available: number }
const ST: Record<string, [string, string]> = { pending: ["Ждёт подтверждения", "pill-tag--warn"], approved: ["Подтверждено", "pill-tag--ok"], rejected: ["Отклонено", "pill-tag--bad"] };

export default function WriteoffsPage() {
  const me = useMe();
  const { data, reload, error } = useLoad<{ writeoffs: W[] }>("/api/admin/writeoffs");
  const { data: pr } = useLoad<{ products: Prod[] }>("/api/admin/products");
  const { notify } = useStore();
  const [err, setErr] = useState("");
  const [f, setF] = useState({ productId: "", qty: "1", reason: "Бой" });

  const create = async () => {
    try {
      await api("/api/admin/writeoffs", { body: { reason: f.reason, items: [{ productId: Number(f.productId), qty: Number(f.qty) }] } });
      notify(me.role === "owner" ? "Списание проведено" : "Заявка отправлена владельцу"); setErr(""); setF({ ...f, productId: "", qty: "1" }); reload();
    } catch (e) { setErr((e as Error).message); }
  };
  const decide = async (id: number, action: "approve" | "reject") => {
    try { await api(`/api/admin/writeoffs/${id}`, { body: { action } }); notify(action === "approve" ? "Списание подтверждено" : "Отклонено"); setErr(""); reload(); }
    catch (e) { setErr((e as Error).message); }
  };

  return (
    <>
      <h1 className="display">Списания: бой, брак</h1>
      {(error || err) && <p className="alert" role="alert">{error || err}</p>}
      <div className="glass-light card-pad stack">
        <div className="form-grid">
          <div className="field"><label htmlFor="wp">Товар</label><select id="wp" className="input" value={f.productId} onChange={(e) => setF({ ...f, productId: e.target.value })}><option value="">Выберите…</option>{pr?.products.filter((p) => p.available > 0).map((p) => <option key={p.id} value={p.id}>{p.name} (доступно {p.available})</option>)}</select></div>
          <div className="field"><label htmlFor="wq">Количество</label><input id="wq" type="number" min={1} className="input" value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} /></div>
          <div className="field"><label htmlFor="wr">Причина</label><input id="wr" className="input" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></div>
        </div>
        <GlassButton disabled={!f.productId} onClick={create}>{me.role === "owner" ? "Списать" : "Отправить на подтверждение"}</GlassButton>
      </div>
      {data?.writeoffs.map((w) => (
        <div key={w.id} className="glass-light card-pad row-gap" style={{ justifyContent: "space-between" }}>
          <div>
            <b>{w.items.map((i) => `${i.name} × ${i.qty}`).join(", ")}</b> <span className={`pill-tag ${ST[w.status]?.[1]}`}>{ST[w.status]?.[0]}</span>
            <div className="small muted">{dt(w.date)} · {w.reason}{w.loss != null && ` · потери ${fmt(w.loss)}`}</div>
          </div>
          {me.role === "owner" && w.status === "pending" && (
            <div className="row-gap">
              <GlassButton className="btn-sm" onClick={() => decide(w.id, "approve")}>Подтвердить</GlassButton>
              <GlassButton variant="glass" className="btn-sm" style={{ borderColor: "rgba(64,56,48,0.25)" }} onClick={() => decide(w.id, "reject")}>Отклонить</GlassButton>
            </div>
          )}
        </div>
      ))}
    </>
  );
}
