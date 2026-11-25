import { z } from "zod";
import { db } from "@/server/db";
import { handle } from "@/server/http";
import { requireUser } from "@/server/auth";
import { allSettings, audit } from "@/server/support";

export const GET = handle(async () => {
  await requireUser("owner");
  return { settings: await allSettings() };
});

export const PUT = handle(async (req: Request) => {
  const u = await requireUser("owner");
  const b = z.record(z.string(), z.string()).parse(await req.json());
  const before = await allSettings();
  for (const [key, value] of Object.entries(b)) if (key in before) await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  await audit(db, u.id, "settings.update", "settings", null, before, b);
  return { ok: true };
});
