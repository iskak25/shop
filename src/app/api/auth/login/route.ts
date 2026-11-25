import { z } from "zod";
import { handle } from "@/server/http";
import { login } from "@/server/auth";

const schema = z.object({ email: z.string().email("Введите email"), password: z.string().min(1, "Введите пароль") });

export const POST = handle(async (req: Request) => {
  const b = schema.parse(await req.json());
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  return { user: await login(b.email, b.password, ip) };
});
