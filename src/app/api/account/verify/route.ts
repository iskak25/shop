import { z } from "zod";
import { handle } from "@/server/http";
import { verifyCode } from "@/server/account";

const schema = z.object({ email: z.string().trim().email(), code: z.string().regex(/^\d{6}$/, "Введите 6 цифр") });

export const POST = handle(async (req: Request) => {
  const b = schema.parse(await req.json());
  const c = await verifyCode(b.email, b.code);
  return { customer: { name: c.name, email: c.email, phone: c.phone, address: c.address } };
});
