import { z } from "zod";
import { handle } from "@/server/http";
import { registerCustomer } from "@/server/account";

const schema = z.object({
  name: z.string().trim().min(1, "Укажите имя").max(80),
  email: z.string().trim().email("Введите корректный email").max(120),
  password: z.string().min(8, "Пароль не короче 8 символов").max(100),
  password2: z.string(),
}).refine((b) => b.password === b.password2, { message: "Пароли не совпадают", path: ["password2"] });

export const POST = handle(async (req: Request) => {
  const b = schema.parse(await req.json());
  const c = await registerCustomer(b.name, b.email, b.password);
  return { customer: { name: c.name, email: c.email, phone: c.phone, address: c.address } };
});
