import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "./db";
import { HttpError } from "./http";
import { sendMail } from "./mail";

const COOKIE = "ochag_customer";
const CODE_TTL_MS = 10 * 60_000;
const MAX_ATTEMPTS = 5;

const secret = () => {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET должен быть задан (32+ символов)");
  return new TextEncoder().encode(s);
};
const hash = (email: string, code: string) => createHash("sha256").update(`${email}|${code}|${process.env.AUTH_SECRET}`).digest("hex");

/** Присылает 6-значный код. Ограничения: 1 письмо в минуту на адрес, 5 в час на адрес, 20 в час с одного IP. */
export async function requestCode(rawEmail: string, ip: string) {
  const email = rawEmail.trim().toLowerCase();
  const now = Date.now();
  const [last, perEmail, perIp] = await Promise.all([
    db.emailCode.findFirst({ where: { email }, orderBy: { createdAt: "desc" } }),
    db.emailCode.count({ where: { email, createdAt: { gt: new Date(now - 3600_000) } } }),
    db.emailCode.count({ where: { ip, createdAt: { gt: new Date(now - 3600_000) } } }),
  ]);
  if (last && now - last.createdAt.getTime() < 60_000) throw new HttpError(429, "Код уже отправлен. Повторить можно через минуту");
  if (perEmail >= 5 || perIp >= 20) throw new HttpError(429, "Слишком много запросов. Попробуйте позже");

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const row = await db.emailCode.create({ data: { email, ip, codeHash: hash(email, code), expiresAt: new Date(now + CODE_TTL_MS) } });
  const sent = await sendMail(email, "Код для входа в «Очаг»", `Ваш код: ${code}\n\nОн действует 10 минут. Если вы не запрашивали вход, просто проигнорируйте письмо.`);
  if (!sent) {
    await db.emailCode.delete({ where: { id: row.id } });
    throw new HttpError(503, "Не удалось отправить письмо. Попробуйте позже");
  }
  db.emailCode.deleteMany({ where: { createdAt: { lt: new Date(now - 86400_000) } } }).catch(() => {}); // чистим старые
}

/** Проверяет код и открывает сессию покупателя; для нового email создаёт аккаунт. */
export async function verifyCode(rawEmail: string, code: string) {
  const email = rawEmail.trim().toLowerCase();
  const row = await db.emailCode.findFirst({ where: { email }, orderBy: { createdAt: "desc" } });
  if (!row || row.expiresAt.getTime() < Date.now()) throw new HttpError(400, "Код истёк. Запросите новый");
  if (row.attempts >= MAX_ATTEMPTS) throw new HttpError(429, "Слишком много неверных попыток. Запросите новый код");
  const a = Buffer.from(hash(email, code)), b = Buffer.from(row.codeHash);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    await db.emailCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    throw new HttpError(400, "Неверный код");
  }
  await db.emailCode.deleteMany({ where: { email } });
  const customer = await db.customer.upsert({ where: { email }, update: {}, create: { email, name: "" } });
  const token = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setAudience("customer").setSubject(String(customer.id)).setExpirationTime("30d").sign(secret());
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 30 * 86400 });
  return customer;
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
