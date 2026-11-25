import { z } from "zod";
import { handle } from "@/server/http";
import { requestCode } from "@/server/account";

const schema = z.object({ email: z.string().trim().email("Введите корректный email").max(120) });

export const POST = handle(async (req: Request) => {
  const { email } = schema.parse(await req.json());
  await requestCode(email, req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local");
  return { ok: true };
});
