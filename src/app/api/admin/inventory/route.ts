import { z } from "zod";
import { handle } from "@/server/http";
import { requireUser } from "@/server/auth";
import { applyInventory } from "@/server/stock";

const schema = z.object({ counts: z.array(z.object({ productId: z.number().int(), actual: z.number().int().min(0) })).min(1) });

export const POST = handle(async (req: Request) => {
  const u = await requireUser("owner", "admin");
  return applyInventory(u, schema.parse(await req.json()).counts);
});
