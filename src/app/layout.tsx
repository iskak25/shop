import type { Metadata, Viewport } from "next";
import { Manrope, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { AccountProvider } from "@/lib/account";
import { CatalogProvider } from "@/lib/catalog";
import { AppShell } from "@/components/shell";
import { getPublicCategories, getPublicProducts } from "@/server/catalog";

const manrope = Manrope({ subsets: ["latin", "cyrillic"], variable: "--font-manrope", display: "swap" });
const cormorant = Cormorant_Garamond({ subsets: ["latin", "cyrillic"], weight: ["400", "500", "600"], variable: "--font-cormorant", display: "swap" });

export const metadata: Metadata = {
  title: "Очаг — посуда для тёплого дома",
  description: "Кастрюли, сковородки, казаны, чайники и сервизы. Рассрочка через MBank, доставка по Бишкеку.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#ede8e0" };

// цены и остатки меняются в админке и сразу попадают на сайт
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [products, categories] = await Promise.all([getPublicProducts(), getPublicCategories()]);
  return (
    <html lang="ru" className={`${manrope.variable} ${cormorant.variable}`}>
      <body>
        <a href="#main" className="sr-only">К основному содержимому</a>
        <CatalogProvider products={products} categories={categories}>
          <StoreProvider>
            <AccountProvider>
              <AppShell>{children}</AppShell>
            </AccountProvider>
          </StoreProvider>
        </CatalogProvider>
      </body>
    </html>
  );
}
