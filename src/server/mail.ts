/** Отправка писем через Resend (RESEND_API_KEY, MAIL_FROM). Без ключа вне продакшена код пишется в консоль. */
export async function sendMail(to: string, subject: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "production") return false;
    console.log(`[mail] ${to}: ${subject}\n${text}`);
    return true;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from: process.env.MAIL_FROM ?? "Очаг <onboarding@resend.dev>", to, subject, text }),
  });
  if (!res.ok) console.error("[mail] Resend:", res.status, await res.text().catch(() => ""));
  return res.ok;
}
