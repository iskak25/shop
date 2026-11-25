"use client";

import { useState } from "react";
import { GlassButton } from "@/components/glass";
import { api, dt, useLoad } from "@/lib/api";
import { fmt } from "@/lib/data";
import { useStore } from "@/lib/store";
import { useMe } from "@/lib/me";

interface S {
  id: number; sku: string; name: string; category: string; stock: number; reserved: number; available: number; min: number; status: string;
  salePrice: number | null; retailSum: number | null; cost?: number; costSum?: number;
}
const TYPE_RU: Record<string, string> = { receipt: "Приход", sale: "Продажа", return: "Возврат", write_off: "Списание", adjustment: "Корректировка" };

export default function StockPage() {
  const me = useMe();
  const owner = me.role === "owner";
  const canCount = me.role !== "seller";
  const { data, reload, error } = useLoad<{ stock: S[] }>("/api/admin/stock");
  const { notify } = useStore();
  const [low, setLow] = useState(false);
  const [counts, setCounts] = useState<Record<number, string>>({});
  const [err, setErr] = useState("");
  const [mv, setMv] = useState<{ name: string; rows: { id: number; type: string; qty: number; note: string | null; createdAt: string; unitCost?: number }[] } | null>(null);

  const list = (data?.stock ?? []).filter((s) => !low || (s.min > 0 && s.available < s.min));
  const costTotal = list.reduce((n, s) => n + (s.costSum ?? 0), 0);
  const retailTotal = list.reduce((n, s) => n + (s.retailSum ?? 0), 0);

  const applyInventory = async () => {
    const arr = Object.entries(counts).filter(([, v]) => v !== "").map(([id, v]) => ({ productId: Number(id), actual: Number(v) }));
    try {
      const r = await api<{ diffs: { name: string; diff: number }[] }>("/api/admin/inventory", { body: { counts: arr } });
      notify(r.diffs.length ? `Расхождения: ${r.diffs.map((d) => `${d.name} ${d.diff > 0 ? "+" : ""}${d.diff}`).join("; ")}` : "Расхождений нет");
      setCounts({}); setErr(""); reload();
    } catch (e) { setErr((e as Error).message); }
  };
  const showMv = async (s: S) => setMv({ name: s.name, rows: (await api<{ movements: never[] }>(`/api/admin/stock?movements=${s.id}`)).movements });

  return (
    <>
      <div className="row-gap" style={{ justifyContent: "space-between" }}>
        <h1 className="display">Остатки</h1>
        <div className="row-gap">
          <label className="row-gap small"><input type="checkbox" checked={low} onChange={(e) => setLow(e.target.checked)} /> Ниже минимума</label>
          <a className="btn btn--glass btn-sm" style={{ borderColor: "rgba(64,56,48,0.25)" }} href="/api/admin/export?report=stock">Excel</a>
          {canCount && Object.values(counts).some((v) => v !== "") && <GlassButton className="btn-sm" onClick={applyInventory}>Применить инвентаризацию</GlassButton>}
        </div>
      </div>
      {(error || err) && <p className="alert" role="alert">{error || err}</p>}
      <div className="glass-light card-pad table-wrap">
        <table className="tbl">
          <thead>
            <tr><th>Товар</th><th className="num">Факт</th><th className="num">Резерв</th><th className="num">Доступно</th><th className="num">Мин.</th>{owner && <th className="num">Себест.</th>}<th className="num">Цена</th>{owner && <th className="num">Сумма (себест.)</th>}<th className="num">Сумма (розница)</th>{canCount && <th>Факт (инвент.)</th>}</tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id}>
                <td><button style={{ textAlign: "left" }} onClick={() => showMv(s)}><b>{s.name}</b></button><div className="small muted">{s.sku} · {s.category}</div></td>
                <td className="num">{s.stock}</td><td className="num">{s.reserved}</td>
                <td className="num"><span className={`pill-tag ${s.min > 0 && s.available < s.min ? "pill-tag--warn" : ""}`}>{s.available}</span></td>
                <td className="num">{s.min}</td>
                {owner && <td className="num">{fmt(s.cost ?? 0)}</td>}
                <td className="num">{s.salePrice ? fmt(s.salePrice) : <span className="pill-tag pill-tag--warn">Ждёт цену</span>}</td>
                {owner && <td className="num">{fmt(s.costSum ?? 0)}</td>}
                <td className="num">{s.retailSum != null ? fmt(s.retailSum) : "—"}</td>
                {canCount && <td><input className="input" type="number" min={0} aria-label={`Фактический остаток: ${s.name}`} value={counts[s.id] ?? ""} onChange={(e) => setCounts((c) => ({ ...c, [s.id]: e.target.value }))} /></td>}
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td><b>Итого</b></td><td colSpan={owner ? 6 : 4} />{owner && <td className="num"><b>{fmt(costTotal)}</b></td>}<td className="num"><b>{fmt(retailTotal)}</b></td>{canCount && <td />}</tr></tfoot>
        </table>
      </div>

      {mv && (
        <div className="glass-light card-pad">
          <div className="row-gap" style={{ justifyContent: "space-between" }}><h2 className="display h3">Движения: {mv.name}</h2><button className="small" onClick={() => setMv(null)}>Закрыть</button></div>
          <ul className="list-plain">
            {mv.rows.map((m) => <li key={m.id}><span>{dt(m.createdAt)} · {TYPE_RU[m.type] ?? m.type}{m.note && ` (${m.note})`}</span><b>{m.qty > 0 ? "+" : ""}{m.qty}{m.unitCost != null && <span className="muted"> · {fmt(m.unitCost)}</span>}</b></li>)}
          </ul>
        </div>
      )}
    </>
  );
}
