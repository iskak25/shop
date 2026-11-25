"use client";

import { dt, useLoad } from "@/lib/api";

interface L { id: number; user: string; action: string; entity: string; entityId: number | null; before: unknown; after: unknown; createdAt: string }

const short = (v: unknown) => (v == null ? "" : JSON.stringify(v).slice(0, 120));

export default function AuditPage() {
  const { data, error } = useLoad<{ log: L[] }>("/api/admin/audit");
  return (
    <>
      <h1 className="display">Журнал действий</h1>
      {error && <p className="alert">{error}</p>}
      <div className="glass-light card-pad table-wrap">
        <table className="tbl">
          <thead><tr><th>Когда</th><th>Кто</th><th>Действие</th><th>Было</th><th>Стало</th></tr></thead>
          <tbody>
            {data?.log.map((l) => (
              <tr key={l.id}>
                <td className="num">{dt(l.createdAt)}</td><td>{l.user}</td><td>{l.action}{l.entityId != null && ` #${l.entityId}`}</td>
                <td className="small muted">{short(l.before)}</td><td className="small">{short(l.after)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
