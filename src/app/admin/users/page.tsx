"use client";

import { useState, type FormEvent } from "react";
import { GlassButton } from "@/components/glass";
import { api, useLoad } from "@/lib/api";
import { useStore } from "@/lib/store";

interface U { id: number; name: string; email: string; phone: string | null; role: string; isActive: boolean }

export default function UsersPage() {
  const { data, reload, error } = useLoad<{ users: U[] }>("/api/admin/users");
  const { notify } = useStore();
  const [err, setErr] = useState("");

  const patch = async (id: number, body: Record<string, unknown>) => {
    try { await api(`/api/admin/users/${id}`, { method: "PATCH", body }); notify("Сохранено"); setErr(""); reload(); }
    catch (e) { setErr((e as Error).message); }
  };
  const create = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    try {
      await api("/api/admin/users", { body: { name: f.get("name"), email: f.get("email"), phone: f.get("phone") || undefined, password: f.get("password"), role: f.get("role") } });
      notify("Пользователь создан"); setErr(""); form.reset(); reload();
    } catch (x) { setErr((x as Error).message); }
  };

  return (
    <>
      <h1 className="display">Пользователи</h1>
      {(error || err) && <p className="alert" role="alert">{error || err}</p>}
      <form className="glass-light card-pad stack" onSubmit={create}>
        <div className="form-grid">
          <div className="field"><label htmlFor="un">Имя</label><input id="un" name="name" className="input" required /></div>
          <div className="field"><label htmlFor="ue">Email</label><input id="ue" name="email" type="email" className="input" required /></div>
          <div className="field"><label htmlFor="up">Телефон</label><input id="up" name="phone" className="input" /></div>
          <div className="field"><label htmlFor="uw">Пароль (от 8 символов)</label><input id="uw" name="password" type="password" minLength={8} className="input" required autoComplete="new-password" /></div>
          <div className="field"><label htmlFor="ur">Роль</label><select id="ur" name="role" className="input" defaultValue="seller"><option value="seller">Продавец</option><option value="admin">Администратор (склад)</option><option value="owner">Владелец</option></select></div>
        </div>
        <GlassButton type="submit">Создать</GlassButton>
      </form>
      <div className="glass-light card-pad table-wrap">
        <table className="tbl">
          <thead><tr><th>Имя</th><th>Email</th><th>Роль</th><th>Статус</th></tr></thead>
          <tbody>
            {data?.users.map((u) => (
              <tr key={u.id}>
                <td><b>{u.name}</b></td><td>{u.email}</td>
                <td><select className="input" aria-label={`Роль: ${u.name}`} value={u.role} onChange={(e) => patch(u.id, { role: e.target.value })}><option value="owner">Владелец</option><option value="admin">Администратор</option><option value="seller">Продавец</option></select></td>
                <td><label className="row-gap small"><input type="checkbox" checked={u.isActive} onChange={(e) => patch(u.id, { isActive: e.target.checked })} /> Активен</label></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
