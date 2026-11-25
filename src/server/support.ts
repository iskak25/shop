import type { Prisma } from "@prisma/client";
import { db, type Tx } from "./db";

/** Журнал: кто, что, когда, старое и новое значение. */
export function audit(tx: Tx | typeof db, userId: number | null, action: string, entity: string, entityId: number | null, before?: unknown, after?: unknown) {
  return tx.auditLog.create({
    data: { userId, action, entity, entityId, before: (before ?? undefined) as Prisma.InputJsonValue | undefined, after: (after ?? undefined) as Prisma.InputJsonValue | undefined },
  });
}

/** Уведомление владельцу/продавцам в Telegram; без токена пишет в консоль. */
export function notify(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) { console.log(`[notify] ${text}`); return; }
  fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text }),
  }).catch((e) => console.error("telegram", e));
}

const defaults: Record<string, string> = {
  installment_enabled: "1",
  installment_min_amount: "3000",
  installment_reserve_hours: "24",
  installment_terms: "Рассрочка через MBank / М-Бизнес. Менеджер свяжется с вами для оформления.",
  seller_discount_limit_pct: "10",
};
export async function getSetting(key: string) {
  const s = await db.setting.findUnique({ where: { key } });
  return s?.value ?? defaults[key] ?? "";
}
export async function allSettings() {
  const rows = await db.setting.findMany();
  return { ...defaults, ...Object.fromEntries(rows.map((r) => [r.key, r.value])) };
}
