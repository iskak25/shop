"use client";

import { useState, type FormEvent } from "react";
import { GlassButton, GlassInput, Reveal } from "@/components/glass";
import { api } from "@/lib/api";
import { fmt } from "@/lib/data";

interface Result { number: string; statusLabel: string; total: number; items: { name: string; qty: number; price: number }[] }

export default function OrderStatusPage() {
  const [res, setRes] = useState<Result | null>(null);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setError(""); setRes(null);
    try {
      setRes(await api<Result>(`/api/orders/status?number=${encodeURIComponent(String(f.get("number")))}&phone=${encodeURIComponent(String(f.get("phone")))}`));
    } catch (x) { setError((x as Error).message); }
  };

  return (
    <div className="page">
      <Reveal className="success glass-light" style={{ textAlign: "left" }}>
        <h1 className="display h2" style={{ marginBottom: 16 }}>Статус заказа</h1>
        <form className="stack" onSubmit={submit}>
          <GlassInput id="number" name="number" label="Номер заказа" inputMode="numeric" required />
          <GlassInput id="phone" name="phone" label="Телефон, указанный при заказе" type="tel" required />
          {error && <p className="field__err" role="alert">{error}</p>}
          <GlassButton type="submit">Проверить</GlassButton>
        </form>
        {res && (
          <div style={{ marginTop: 24 }} aria-live="polite">
            <h2 className="display h3">Заказ № {res.number}: {res.statusLabel}</h2>
            <ul className="list-plain" style={{ marginTop: 8 }}>{res.items.map((i, k) => <li key={k}><span>{i.name} × {i.qty}</span><span>{fmt(i.price * i.qty)}</span></li>)}</ul>
            <div className="sum-row sum-row--total"><span>Итого</span><span>{fmt(res.total)}</span></div>
          </div>
        )}
      </Reveal>
    </div>
  );
}
