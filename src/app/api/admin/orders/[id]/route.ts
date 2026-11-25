import { z } from "zod";
import { handle } from "@/server/http";
import { requireUser } from "@/server/auth";
import { setOrderStatus } from "@/server/orders";

const schema = z.object({ status: z.enum(["confirmed", "awaiting_payment", "paid", "shipping", "delivered", "cancelled", "returned"]), returnToStock: z.boolean().optional() });

export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const u = await requireUser();
  const b = schema.parse(await req.json());
  return setOrderStatus(Number((await params).id), b.status, u, { returnToStock: b.returnToStock });
});
