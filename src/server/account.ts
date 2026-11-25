import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { db } from "./db";
import { HttpError } from "./http";
import { fail, hashPassword, throttle } from "./auth";

const COOKIE = "ochag_customer";

const secret = () => {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET должен быть задан (32+ символов)");
  return new TextEncoder().encode(s);
};

async function openSession(customerId: number) {
  const token = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setAudience("customer").setSubject(String(customerId)).setExpirationTime("30d").sign(secret());
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 30 * 86400 });
}

/** Регистрация по email и паролю. Сразу открывает сессию. */
export async function registerCustomer(name: string, rawEmail: string, password: string) {
  const email = rawEmail.trim().toLowerCase();
  if (await db.customer.findUnique({ where: { email } })) throw new HttpError(409, "Этот email уже зарегистрирован. Войдите с паролем");
  const c = await db.customer.create({ data: { name: name.trim(), email, passwordHash: await hashPassword(password) } });
  await openSession(c.id);
  return c;
}

const DUMMY = bcrypt.hashSync("dummy-password", 10); // чтобы время ответа не выдавало, есть ли такой email

/** Вход по email и паролю; 5 неудач за 15 минут блокируют пару IP+email. */
export async function loginCustomer(rawEmail: string, password: string, ip: string) {
  const email = rawEmail.trim().toLowerCase();
  const key = `c|${ip}|${email}`;
  await throttle(key);
  const c = await db.customer.findUnique({ where: { email } });
  const ok = await bcrypt.compare(password, c?.passwordHash ?? DUMMY);
  if (!c || !c.passwordHash || !ok) { await fail(key); throw new HttpError(401, "Неверный email или пароль"); }
  await db.loginAttempt.deleteMany({ where: { key } });
  await openSession(c.id);
  return c;
}

export async function logoutCustomer() {
  (await cookies()).delete(COOKIE);
}

/** Текущий покупатель или null. Токен сотрудника сюда не подходит (другая кука и aud). */
export async function getCustomer() {
  const t = (await cookies()).get(COOKIE)?.value;
  if (!t) return null;
  try {
    const { payload } = await jwtVerify(t, secret(), { audience: "customer" });
    return await db.customer.findUnique({ where: { id: Number(payload.sub) } });
  } catch {
    return null;
  }
}

export async function requireCustomer() {
  const c = await getCustomer();
  if (!c) throw new HttpError(401, "Требуется вход");
  return c;
}
