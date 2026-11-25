import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
export const bad = (m: string) => new HttpError(400, m);
export const conflict = (m: string) => new HttpError(409, m);
export const notFound = (m = "Не найдено") => new HttpError(404, m);

/** Единая обработка ошибок для route handlers. */
export function handle<A extends unknown[]>(fn: (...a: A) => Promise<unknown>) {
  return async (...a: A) => {
    try {
      const r = await fn(...a);
      return r instanceof Response ? r : NextResponse.json(r ?? { ok: true });
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError) return NextResponse.json({ error: e.issues[0]?.message ?? "Неверные данные", issues: e.issues }, { status: 400 });
      console.error(e);
      return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
    }
  };
}
