"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { GlassButton, GlassInput } from "@/components/glass";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setError("");
    try {
      await api("/api/auth/login", { body: { email: f.get("email"), password: f.get("password") } });
      router.replace("/admin");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="login glass-light stack" onSubmit={submit}>
      <h1 className="display h2">Вход в админ-панель</h1>
      <GlassInput id="email" name="email" type="email" label="Email" autoComplete="username" required />
      <GlassInput id="password" name="password" type="password" label="Пароль" autoComplete="current-password" required />
      {error && <p className="alert" role="alert">{error}</p>}
      <GlassButton type="submit" block disabled={busy}>{busy ? "Входим…" : "Войти"}</GlassButton>
    </form>
  );
}
