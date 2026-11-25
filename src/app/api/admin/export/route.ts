import { handle, bad } from "@/server/http";
import { requireUser } from "@/server/auth";
import { profitByProduct, stockList, toXlsx, type Period } from "@/server/reports";

/** Выгрузка в Excel: report = stock | profit. */
export const GET = handle(async (req: Request) => {
  const u = await requireUser();
  const sp = new URL(req.url).searchParams;
  const report = sp.get("report");
  let rows: Record<string, unknown>[];
  if (report === "stock") {
    rows = (await stockList(u)).map((r) => ({
      Артикул: r.sku, Товар: r.name, Категория: r.category, Факт: r.stock, Резерв: r.reserved, Доступно: r.available, "Мин. остаток": r.min,
      "Цена продажи": r.salePrice ?? "", "Сумма по рознице": r.retailSum ?? "",
      ...("cost" in r ? { Себестоимость: r.cost, "Сумма по себестоимости": r.costSum } : {}),
    }));
  } else if (report === "profit") {
    await requireUser("owner");
    const p = (["today", "week", "month"].includes(sp.get("period") ?? "") ? sp.get("period") : "month") as Period;
    rows = (await profitByProduct(p)).map((r) => ({ Товар: r.name, Шт: r.qty, Выручка: r.revenue, Себестоимость: Math.round(r.cost), Прибыль: Math.round(r.profit), "Маржа %": r.margin }));
  } else throw bad("Неизвестный отчёт");
  const buf = await toXlsx(report, rows);
  return new Response(new Uint8Array(buf), {
    headers: { "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "content-disposition": `attachment; filename="${report}.xlsx"` },
  });
});
