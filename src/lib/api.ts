"use client";

import { useCallback, useEffect, useState } from "react";

export async function api<T = unknown>(url: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(url, {
    method: opts.method ?? (opts.body ? "POST" : "GET"),
    headers: opts.body ? { "content-type": "application/json" } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Ошибка ${res.status}`);
  return data as T;
}

/** Загрузка данных админки с перезагрузкой после действий. */
export function useLoad<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    try { setData(await api<T>(url)); setError(""); } catch (e) { setError((e as Error).message); }
  }, [url]);
  useEffect(() => { reload(); }, [reload]);
  return { data, error, reload };
}

export const dt = (s: string | Date) => new Date(s).toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
