"use client";

import { useEffect, useState } from "react";
import { GlassButton } from "@/components/glass";
import { api, useLoad } from "@/lib/api";
import { useStore } from "@/lib/store";

export default function SettingsPage() {
  const { data, error } = useLoad<{ settings: Record<string, string> }>("/api/admin/settings");
  const { notify } = useStore();
  const [s, setS] = useState<Record<string, string>>({});
  const [err, setErr] = useState("");
  useEffect(() => { if (data) setS(data.settings); }, [data]);
  const set = (k: string, v: string) => setS((x) => ({ ...x, [k]: v }));

  const save = async () => {
    try { await api("/api/admin/settings", { method: "PUT", body: s }); notify("Настройки сохранены"); setErr(""); }
    catch (e) { setErr((e as Error).message); }
  };

  return (
    <>
      <h1 className="display">Настройки</h1>
      {(error || err) && <p className="alert" role="alert">{error || err}</p>}
      <div className="glass-light card-pad stack">
        <h2 className="display h3">Рассрочка MBank / М-Бизнес (вариант Б)</h2>
        <label className="row-gap"><input type="checkbox" checked={s.installment_enabled === "1"} onChange={(e) => set("installment_enabled", e.target.checked ? "1" : "0")} /> Рассрочка включена</label>
        <div className="form-grid">
          <div className="field"><label htmlFor="a">Минимальная сумма заказа, сом</label><input id="a" type="number" className="input" value={s.installment_min_amount ?? ""} onChange={(e) => set("installment_min_amount", e.target.value)} /></div>
          <div className="field"><label htmlFor="b">Резерв товара, часов</label><input id="b" type="number" className="input" value={s.installment_reserve_hours ?? ""} onChange={(e) => set("installment_reserve_hours", e.target.value)} /></div>
        </div>
        <div className="field"><label htmlFor="c">Условия на сайте</label><textarea id="c" className="input" value={s.installment_terms ?? ""} onChange={(e) => set("installment_terms", e.target.value)} /></div>
        <h2 className="display h3">Продавцы</h2>
        <div className="field" style={{ maxWidth: 280 }}><label htmlFor="d">Лимит скидки, % от позиции</label><input id="d" type="number" min={0} max={100} className="input" value={s.seller_discount_limit_pct ?? ""} onChange={(e) => set("seller_discount_limit_pct", e.target.value)} /></div>
        <GlassButton onClick={save}>Сохранить</GlassButton>
      </div>
    </>
  );
}
