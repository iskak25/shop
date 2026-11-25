import { handle } from "@/server/http";
import { getPublicProducts } from "@/server/catalog";

export const dynamic = "force-dynamic";
export const GET = handle(async () => ({ products: await getPublicProducts() }));
