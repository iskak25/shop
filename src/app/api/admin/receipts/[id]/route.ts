import { z } from "zod";
import { handle } from "@/server/http";
import { requireUser } from "@/server/auth";
import { cancelReceipt, postReceipt } from "@/server/stock";

export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const u = await requireUser("owner", "admin");
  const id = Number((await params).id);
  const { action } = z.object({ action: z.enum(["post", "cancel"]) }).parse(await req.json());
  return action === "post" ? postReceipt(u, id) : cancelReceipt(u, id);
});
