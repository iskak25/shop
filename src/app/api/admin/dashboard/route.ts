import { handle } from "@/server/http";
import { requireUser } from "@/server/auth";
import { expireReservations } from "@/server/orders";
import { dashboard, type Period } from "@/server/reports";

export const GET = handle(async (req: Request) => {
  const u = await requireUser();
  await expireReservations();
  const p = new URL(req.url).searchParams.get("period");
  return dashboard(u, (["today", "week", "month"].includes(p ?? "") ? p : "today") as Period);
});
