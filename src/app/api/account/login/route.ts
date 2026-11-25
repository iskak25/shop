import { z } from "zod";
import { handle } from "@/server/http";
import { loginCustomer } from "@/server/account";

const schema = z.object({ email: z.string().trim().email("Введите корректный email"), password: z.string().min(1, "Введите пароль") });

export const POST = handle(async (req: Request) => {
  const b = schema.parse(await req.json());
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const c = await loginCustomer(b.email, b.password, ip);
  return { customer: { name: c.name, email: c.email, phone: c.phone, address: c.address } };
});
