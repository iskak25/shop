"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "./api";

export interface Account { name: string; email: string | null; phone: string | null; address: string | null }

interface Ctx {
  /** undefined — ещё грузится, null — не вошёл */
  account: Account | null | undefined;
  setAccount: (a: Account | null) => void;
  logout: () => Promise<void>;
}

const AccountCtx = createContext<Ctx | null>(null);

/** Сессия покупателя (вход по коду из email). */
export function AccountProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null | undefined>(undefined);
  useEffect(() => {
    api<{ customer: Account | null }>("/api/account/me").then((d) => setAccount(d.customer)).catch(() => setAccount(null));
  }, []);
  const logout = useCallback(async () => {
    await api("/api/account/logout", { method: "POST", body: {} }).catch(() => {});
    setAccount(null);
  }, []);
  const value = useMemo(() => ({ account, setAccount, logout }), [account, logout]);
  return <AccountCtx.Provider value={value}>{children}</AccountCtx.Provider>;
}

export function useAccount() {
  const c = useContext(AccountCtx);
  if (!c) throw new Error("useAccount вне AccountProvider");
  return c;
}

export const initials = (a: Account) => (a.name.trim() || a.email || "?").split(/[\s@]+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
