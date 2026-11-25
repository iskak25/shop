import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { db } from "./db";
import { HttpError } from "./http";

export type Role = "owner" | "admin" | "seller";
export interface SessionUser { id: number; name: string; email: string; role: Role }

const COOKIE = "ochag_session";
const secret = () => {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET должен быть задан (32+ символов)");
  return new TextEncoder().encode(s);
};

export const hashPassword = (p: string) => bcrypt.hash(p, 10);

export async function login(email: string, password: string, ip: string) {
  const key = `${ip}|${email.toLowerCase()}`;
  await throttle(key);
  const u = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  const ok = u && u.isActive && (await bcrypt.compare(password, u.passwordHash));
  if (!ok) { await fail(key); throw new HttpError(401, "Неверный email или пароль"); }
  await db.loginAttempt.deleteMany({ where: { key } });
  const token = await new SignJWT({ role: u.role }).setProtectedHeader({ alg: "HS256" }).setSubject(String(u.id)).setExpirationTime("7d").sign(secret());
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 7 * 86400 });
  return { id: u.id, name: u.name, email: u.email, role: u.role as Role };
}

export async function logout() {
  (await cookies()).delete(COOKIE);
}

export async function getUser(): Promise<SessionUser | null> {
  const t = (await cookies()).get(COOKIE)?.value;
  if (!t) return null;
  try {
    const { payload } = await jwtVerify(t, secret());
    const u = await db.user.findUnique({ where: { id: Number(payload.sub) } });
    if (!u || !u.isActive) return null;
    return { id: u.id, name: u.name, email: u.email, role: u.role as Role };
  } catch {
    return null;
  }
}

/** Проверка роли: без аргументов — любой сотрудник. */
export async function requireUser(...roles: Role[]) {
  const u = await getUser();
  if (!u) throw new HttpError(401, "Требуется вход");
  if (roles.length && !roles.includes(u.role)) throw new HttpError(403, "Недостаточно прав");
  return u;
}

// ограничение попыток входа: 5 неудач за 15 минут на пару IP+email; счётчик в БД, чтобы работало на нескольких экземплярах (Vercel)
const WINDOW_MS = 15 * 60_000;
async function throttle(key: string) {
  const a = await db.loginAttempt.findUnique({ where: { key } });
  if (a && Date.now() - a.firstAt.getTime() < WINDOW_MS && a.count >= 5) throw new HttpError(429, "Слишком много попыток. Попробуйте через 15 минут");
}
async function fail(key: string) {
  const a = await db.loginAttempt.findUnique({ where: { key } });
  if (a && Date.now() - a.firstAt.getTime() < WINDOW_MS) await db.loginAttempt.update({ where: { key }, data: { count: { increment: 1 } } });
  else await db.loginAttempt.upsert({ where: { key }, create: { key, count: 1, firstAt: new Date() }, update: { count: 1, firstAt: new Date() } });
}
