import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicProducts } from "@/server/catalog";
import { ProductView } from "./ProductView";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = (await getPublicProducts()).find((x) => x.slug === slug);
  return p ? { title: `${p.name} — Очаг`, description: p.description, openGraph: { title: p.name, description: p.description } } : {};
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = (await getPublicProducts()).find((x) => x.slug === slug);
  if (!p) notFound();
  return <ProductView product={p} />;
}
