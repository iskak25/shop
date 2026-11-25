import { db } from "@/server/db";
import { handle } from "@/server/http";
import { requireUser } from "@/server/auth";

export const GET = handle(async () => {
  await requireUser();
  const [categories, brands, suppliers] = await Promise.all([db.category.findMany({ orderBy: { sort: "asc" } }), db.brand.findMany(), db.supplier.findMany()]);
  return { categories, brands, suppliers };
});
