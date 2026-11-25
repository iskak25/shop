import { handle } from "@/server/http";
import { requireUser } from "@/server/auth";

export const GET = handle(async () => ({ user: await requireUser() }));
