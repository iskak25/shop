import bcrypt from "bcryptjs";
import { db } from "../src/server/db";
import { createReceipt, postReceipt, setPrice } from "../src/server/stock";
import { createOrder, setOrderStatus } from "../src/server/orders";
import { seedProducts } from "../src/lib/data";
import type { SessionUser } from "../src/server/auth";

const PASSWORD = process.env.SEED_PASSWORD ?? "Ochag#2026";

async function main() {
  if ((await db.user.count()) > 0) {
    console.log("База уже заполнена. Для чистого seed: npx prisma migrate reset");
    return;
  }
  const hash = await bcrypt.hash(PASSWORD, 10);
  const [owner, admin, seller] = await Promise.all(
    [
      { name: "Искакбек", email: "owner@ochag.kg", role: "owner" },
      { name: "Администратор склада", email: "admin@ochag.kg", role: "admin" },
      { name: "Продавец", email: "seller@ochag.kg", role: "seller" },
    ].map((u) => db.user.create({ data: { ...u, passwordHash: hash } })),
  );
  const asUser = (u: typeof owner): SessionUser => ({ id: u.id, name: u.name, email: u.email, role: u.role as SessionUser["role"] });

  const cats: Record<string, number> = {};
  for (const [i, name] of ["Кастрюли", "Сковородки", "Чайники", "Казаны", "Сервизы"].entries()) {
    const c = await db.category.create({ data: { nameRu: name, slug: ["pots", "pans", "kettles", "kazans", "sets"][i], sort: i } });
    cats[name] = c.id;
  }

  // товары заводятся без цены, цена и публикация — шаг владельца
  const created: { id: number; slug: string; price: number; oldPrice?: number; installment: boolean; qty: number; cost: number }[] = [];
  const qty: Record<string, number> = { "chaynik-emal-2l": 3, "chaynyy-servis-6": 2, "kastryulya-nabor-3": 0 };
  for (const [i, p] of seedProducts.entries()) {
    const row = await db.product.create({
      data: {
        categoryId: cats[p.category], sku: `OC-${String(i + 1).padStart(4, "0")}`, nameRu: p.name, slug: p.slug, description: p.description, minQty: 3,
        attributes: { kind: p.kind, colors: p.colors, sizes: p.sizes, specs: p.specs } as never,
      },
    });
    created.push({ id: row.id, slug: p.slug, price: p.price, oldPrice: p.oldPrice, installment: p.installment, qty: qty[p.slug] ?? 8 + (i % 5), cost: Math.round(p.price * 0.58) });
  }

  // демо-товар, который «ждёт цену»
  const crepe = await db.product.create({
    data: {
      categoryId: cats["Сковородки"], sku: "OC-0100", nameRu: "Блинная сковорода, 24 см", slug: "blinnaya-skovoroda-24", minQty: 3,
      description: "Низкие борта и ровное дно для тонких блинов.",
      attributes: { kind: "pan", colors: [{ name: "Графит", hex: "#5a5148" }], sizes: ["24 см"], specs: [] } as never,
    },
  });

  const rc = await createReceipt(asUser(admin), {
    supplier: "ИП Азиз", invoiceNo: "НП-117", extraCosts: 4500,
    items: [
      ...created.filter((c) => c.qty > 0).map((c) => ({ productId: c.id, qty: c.qty, purchasePrice: c.cost })),
      { productId: crepe.id, qty: 6, purchasePrice: 1300 },
    ],
  });
  await postReceipt(asUser(admin), rc.id);

  for (const c of created) await setPrice(asUser(owner), c.id, { salePrice: c.price, oldPrice: c.oldPrice ?? null, isPublished: true, installmentAllowed: c.installment });

  // несколько продаж в точке, чтобы дашборд не был пустым
  const [казан, чайник, салатник] = ["kazan-chugun-5l", "chaynik-emal-2l", "salatnik-keramika"].map((s) => created.find((c) => c.slug === s)!.id);
  for (const items of [[{ productId: казан, qty: 1, discount: 0 }], [{ productId: чайник, qty: 1, discount: 100 }, { productId: салатник, qty: 2, discount: 0 }]]) {
    const o = await createOrder({ source: "store", deliveryType: "pickup", paymentMethod: "cash", items }, asUser(seller));
    await setOrderStatus(o.id, "delivered", asUser(seller));
  }

  console.log(`Готово. Вход (пароль у всех: ${PASSWORD}): owner@ochag.kg, admin@ochag.kg, seller@ochag.kg`);
}

main().finally(() => db.$disconnect());
