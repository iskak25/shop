"use client";

import Link from "next/link";
import { useState } from "react";
import { useLoad } from "@/lib/api";
import { fmt } from "@/lib/data";
import { useMe } from "@/lib/me";

interface Dash {
  revenue: number; units: number; orders: number; avgCheck: number; cost?: number; profit?: number; margin?: number; stockValue?: number;
  series: { date: string; revenue: number; profit?: number }[];
  newOrders?: number; installmentRequests?: number;
  awaitingPrice?: { id: number; name: string; qty: number }[];
  lowStock?: { id: number; name: string; available: number; min: number }[];
}

function Chart({ series }: { series: Dash["series"] }) {
  const max = Math.max(1, ...series.map((s) => s.revenue));
  const slots = Math.max(series.length, 7);
  const w = 100 / slots;
  const off = (slots - series.length) * w;
  return (
    <svg className="chart" viewBox="0 0 100 50" preserveAspectRatio="none" role="img" aria-label="Выручка и прибыль по дням">
      {series.map((s, i) => (
        <g key={s.date}>
          <rect x={off + i * w + w * 0.15} y={50 - (s.revenue / max) * 46} width={w * 0.7} height={(s.revenue / max) * 46} rx="0.8" fill="var(--peach)" />
          {s.profit != null && <rect x={off + i * w + w * 0.3} y={50 - (Math.max(s.profit, 0) / max) * 46} width={w * 0.4} height={(Math.max(s.profit, 0) / max) * 46} rx="0.6" fill="var(--accent)" />}
          <title>{`${s.date}: выручка ${s.revenue}${s.profit != null ? `, прибыль ${s.profit}` : ""}`}</title>
        </g>
      ))}
    </svg>
  );
}

export default function Dashboard() {
  const me = useMe();
  const [period, setPeriod] = useState("today");
  const { data: d, error } = useLoad<Dash>(`/api/admin/dashboard?period=${period}`);
  const owner = me.role === "owner";

  return (
    <>
      <div className="row-gap" style={{ justifyContent: "space-between" }}>
        <h1 className="display">{me.role === "seller" ? "Мои продажи" : "Сегодня в магазине"}</h1>
        <div className="seg" role="group" aria-label="Период">
          {[["today", "Сегодня"], ["week", "Неделя"], ["month", "Месяц"]].map(([k, l]) => (
            <button key={k} aria-pressed={period === k} onClick={() => setPeriod(k)}>{l}</button>
          ))}
        </div>
      </div>
      {error && <p className="alert">{error}</p>}
      {d && (
        <>
          <div className="glass-light card-pad">
            <div className="tiles">
              <div className="tile"><small>Выручка</small><b>{fmt(d.revenue)}</b></div>
              {owner && <div className="tile tile--accent"><small>Валовая прибыль</small><b>{fmt(d.profit ?? 0)}</b></div>}
              {owner && <div className="tile"><small>Маржа</small><b>{d.margin} %</b></div>}
              <div className="tile"><small>Заказов</small><b>{d.orders}</b></div>
              <div className="tile"><small>Продано, шт.</small><b>{d.units}</b></div>
              <div className="tile"><small>Средний чек</small><b>{fmt(d.avgCheck)}</b></div>
              {owner && <div className="tile"><small>Склад по себестоимости</small><b>{fmt(d.stockValue ?? 0)}</b></div>}
            </div>
          </div>
          <div className="glass-light card-pad">
            <h2 className="display h3" style={{ marginBottom: 12 }}>Выручка{owner && " и прибыль"} по дням</h2>
            <Chart series={d.series} />
          </div>
          {me.role !== "seller" && (
            <div className="split">
              <div className="glass-light card-pad">
                <h2 className="display h3" style={{ marginBottom: 8 }}>Требуют внимания</h2>
                <ul className="list-plain">
                  <li><Link href="/admin/orders">Новые заказы</Link><b>{d.newOrders}</b></li>
                  <li><Link href="/admin/orders?status=awaiting_payment">Заявки на рассрочку</Link><b>{d.installmentRequests}</b></li>
                </ul>
                <h3 style={{ margin: "16px 0 4px", fontSize: 15 }}>Ждут цену ({d.awaitingPrice?.length})</h3>
                <ul className="list-plain">
                  {d.awaitingPrice?.map((p) => <li key={p.id}><Link href="/admin/products">{p.name}</Link><span className="muted">{p.qty} шт.</span></li>)}
                  {!d.awaitingPrice?.length && <li className="muted">Все товары с ценой</li>}
                </ul>
              </div>
              <div className="glass-light card-pad">
                <h2 className="display h3" style={{ marginBottom: 8 }}>Заканчивается</h2>
                <ul className="list-plain">
                  {d.lowStock?.map((p) => <li key={p.id}><span>{p.name}</span><span className="pill-tag pill-tag--warn">{p.available} из {p.min}</span></li>)}
                  {!d.lowStock?.length && <li className="muted">Всё в норме</li>}
                </ul>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
