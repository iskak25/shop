"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Reveal, GlassButton, GlassInput } from "@/components/glass";
import { UserProfilePanel } from "@/components/product";
import { api } from "@/lib/api";
import { fmt } from "@/lib/data";
import { useAccount, type Account } from "@/lib/account";
import { useStore } from "@/lib/store";

interface OrderRow { number: string; createdAt: string; statusLabel: string; total: number; items: string[] }

/** Вход (email + пароль) и регистрация (имя, email, пароль и его повтор). */
function AuthForm() {
  const { setAccount } = useAccount();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [f, setF] = useState({ name: "", email: "", password: "", password2: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: keyof typeof f) => (e: ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const body = mode === "login" ? { email: f.email, password: f.password } : f;
      setAccount((await api<{ customer: Account }>(`/api/account/${mode}`, { body })).customer);
    } catch (x) { setErr((x as Error).message); }
    finally { setBusy(false); }
  };
  const ready = f.email.includes("@") && f.password.length > 0 && (mode === "login" || (f.name.trim() && f.password2));

  return (
    <section className="glass-light panel" style={{ padding: 28 }}>
      <h1 className="display h2" style={{ marginBottom: 12 }}>{mode === "login" ? "Вход" : "Регистрация"}</h1>
      <form onSubmit={submit} className="stack" noValidate>
        {mode === "register" && <GlassInput id="a-name" label="Имя" autoComplete="name" value={f.name} onChange={set("name")} />}
        <GlassInput id="a-email" type="email" label="Email" autoComplete="email" inputMode="email" value={f.email} onChange={set("email")} />
        <GlassInput id="a-pass" type="password" label={mode === "register" ? "Пароль (не короче 8 символов)" : "Пароль"} autoComplete={mode === "login" ? "current-password" : "new-password"} value={f.password} onChange={set("password")} />
        {mode === "register" && <GlassInput id="a-pass2" type="password" label="Повторите пароль" autoComplete="new-password" value={f.password2} onChange={set("password2")} />}
        {err && <p className="field__err" role="alert">{err}</p>}
        <GlassButton type="submit" disabled={busy || !ready}>{busy ? "Подождите…" : mode === "login" ? "Войти" : "Зарегистрироваться"}</GlassButton>
        <button type="button" className="linklike" onClick={() => { setMode(mode === "login" ? "register" : "login"); setErr(""); }}>
          {mode === "login" ? "Нет аккаунта? Зарегистрироваться" : "Уже есть аккаунт? Войти"}
        </button>
      </form>
    </section>
  );
}

function Orders() {
  const [rows, setRows] = useState<OrderRow[] | null>(null);
  useEffect(() => { api<{ orders: OrderRow[] }>("/api/account/orders").then((d) => setRows(d.orders)).catch(() => setRows([])); }, []);
  return (
    <section id="orders" className="glass-light panel" style={{ padding: 28 }}>
      <h2 className="display h2" style={{ marginBottom: 12 }}>История заказов</h2>
      {rows === null ? <p className="muted small">Загружаем…</p> : rows.length === 0 ? (
        <p className="muted">Заказов пока нет. Оформленные после входа заказы появятся здесь.</p>
      ) : rows.map((o) => (
        <div key={o.number} className="order-row">
          <div>
            <b>№ {o.number}</b>
            <div className="small muted">{new Date(o.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}</div>
            <div className="small muted">{o.items.join(", ")}</div>
          </div>
          <div className="small muted" style={{ alignSelf: "center" }}>{o.statusLabel}</div>
          <b style={{ alignSelf: "center" }}>{fmt(o.total)}</b>
        </div>
      ))}
    </section>
  );
}

function Details({ account }: { account: Account }) {
  const { setAccount } = useAccount();
  const { notify } = useStore();
  const [f, setF] = useState({ name: account.name, phone: account.phone ?? "", address: account.address ?? "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try { setAccount((await api<{ customer: Account }>("/api/account/me", { method: "PATCH", body: f })).customer); notify("Профиль сохранён"); }
    catch (x) { setErr((x as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <section id="details" className="glass-light panel" style={{ padding: 28 }}>
      <h2 className="display h2" style={{ marginBottom: 12 }}>Мои данные</h2>
      <form onSubmit={save} className="stack" noValidate>
        <p className="small muted">Email: {account.email}</p>
        <GlassInput id="p-name" label="Имя" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <GlassInput id="p-phone" label="Телефон" type="tel" inputMode="tel" autoComplete="tel" placeholder="+996" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        <GlassInput id="p-addr" label="Адрес доставки" autoComplete="street-address" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} error={err} />
        <GlassButton type="submit" disabled={busy || !f.name.trim()}>{busy ? "Сохраняем…" : "Сохранить"}</GlassButton>
      </form>
    </section>
  );
}

export default function ProfilePage() {
  const { account } = useAccount();
  return (
    <div className="page">
      <Reveal className="profile">
        <UserProfilePanel expanded />
        <div className="stack">
          {account === undefined ? <p className="muted">Загружаем…</p> : account === null ? <AuthForm /> : (<><Details account={account} /><Orders /></>)}
        </div>
      </Reveal>
    </div>
  );
}
