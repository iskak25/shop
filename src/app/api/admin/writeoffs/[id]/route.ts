import { z } from "zod";
import { handle } from "@/server/http";
import { requireUser } from "@/server/auth";
import { decideWriteOff } from "@/server/stock";

export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const u = await requireUser("owner");
  const { action } = z.object({ action: z.enum(["approve", "reject"]) }).parse(await req.json());
  return decideWriteOff(u, Number((await params).id), action === "approve");
});
