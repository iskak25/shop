import { Reveal } from "@/components/glass";
import { CollectionHero, FeaturedProduct, UserProfilePanel, WishlistPanel, ProductCard } from "@/components/product";
import { heroCollection } from "@/lib/data";
import { getPublicProducts } from "@/server/catalog";

export const dynamic = "force-dynamic";

export default async function Home() {
  const products = await getPublicProducts();
  return (
    <div className="page">
      <div className="spatial">
        <div className="spatial__grid">
          <Reveal className="spatial__left" delay={0.1}>
            <FeaturedProduct slug="kastryulya-seramika-3l" />
          </Reveal>
          <Reveal className="spatial__center">
            <CollectionHero title={heroCollection.title} items={heroCollection.items} />
          </Reveal>
          <Reveal className="spatial__right" delay={0.2}>
            <UserProfilePanel />
            <WishlistPanel limit={3} />
          </Reveal>
        </div>
      </div>

      <div className="section-head" style={{ marginTop: 96 }}>
        <h2 className="display h2">Хиты продаж</h2>
      </div>
      <div className="carousel">
        {products.filter((p) => p.stock !== "out").slice(0, 6).map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>
    </div>
  );
}
