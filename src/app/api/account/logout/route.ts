import { handle } from "@/server/http";
import { logoutCustomer } from "@/server/account";

export const POST = handle(async () => {
  await logoutCustomer();
  return { ok: true };
});
