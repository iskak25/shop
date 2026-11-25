"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Reveal, GlassButton, GlassInput } from "@/components/glass";
import { UserProfilePanel } from "@/components/product";
import { api } from "@/lib/api";
import { fmt } from "@/lib/data";
import { useAccount, type Account } from "@/lib/account";
import { useStore } from "@/lib/store";

interface OrderRow { number: string; createdAt: string; statusLabel: string; total: number; items: string[] }

/** Вход по одноразовому коду из письма: email → код. Новый email регистрируется автоматически. */
function LoginForm() {
  const { setAccount } = useAccount();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const send = async (e?: FormEvent) => {
    e?.preventDefault();
    setBusy(true); setErr("");
    try { await api("/api/account/request-code", { body: { email } }); setStep("code"); setCode(""); }
    catch (x) { setErr((x as Error).message); }
    finally { setBusy(false); }
  };
  const verify = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try { setAccount((await api<{ customer: Account }>("/api/account/verify", { body: { email, code } })).customer); }
    catch (x) { setErr((x as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <section className="glass-light panel" style={{ padding: 28 }}>
      <h1 className="display h2" style={{ marginBottom: 8 }}>Вход или регистрация</h1>
      {step === "email" ? (
        <form onSubmit={send} className="stack" noValidate>
          <p className="muted small">Введите email: пришлём одноразовый код. Пароль не нужен, а новый адрес зарегистрируется сам.</p>
          <GlassInput id="acc-email" type="email" label="Email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} error={err} />
          <GlassButton type="submit" disabled={busy || !email.includes("@")}>{busy ? "Отправляем…" : "Получить код"}</GlassButton>
        </form>
      ) : (
        <form onSubmit={verify} className="stack" noValidate>
          <p className="muted small">Код отправлен на <b>{email}</b>. Он действует 10 минут. Проверьте папку «Спам».</p>
          <GlassInput id="acc-code" label="Код из письма" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} error={err} autoFocus />
          <GlassButton type="submit" disabled={busy || code.length !== 6}>{busy ? "Проверяем…" : "Войти"}</GlassButton>
          <div style={{ display: "flex", gap: 16 }}>
            <button type="button" className="linklike" onClick={() => { setStep("email"); setErr(""); }}>Изменить email</button>
            <button type="button" className="linklike" disabled={busy} onClick={() => send()}>Отправить код ещё раз</button>
          </div>
        </form>
      )}
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
          {account === undefined ? <p className="muted">Загружаем…</p> : account === null ? <LoginForm /> : (<><Details account={account} /><Orders /></>)}
        </div>
      </Reveal>
    </div>
  );
}
