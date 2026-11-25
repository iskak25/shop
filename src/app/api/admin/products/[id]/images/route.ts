import { z } from "zod";
import { db } from "@/server/db";
import { bad, handle, notFound } from "@/server/http";
import { requireUser } from "@/server/auth";
import { deleteImage, saveImage } from "@/server/files";
import { audit } from "@/server/support";

const MAX_PER_PRODUCT = 10;
type Ctx = { params: Promise<{ id: string }> };

const view = (i: { id: number; path: string; sort: number }) => ({ id: i.id, src: `/api/files/${i.path}.webp`, thumb: `/api/files/${i.path}-sm.webp`, sort: i.sort });

export const GET = handle(async (_: Request, { params }: Ctx) => {
  await requireUser("owner", "admin");
  const rows = await db.productImage.findMany({ where: { productId: Number((await params).id) }, orderBy: { sort: "asc" } });
  return { images: rows.map(view) };
});

/** Загрузка одного или нескольких файлов (multipart, поле «files»). */
export const POST = handle(async (req: Request, { params }: Ctx) => {
  const u = await requireUser("owner", "admin");
  const productId = Number((await params).id);
  if (!(await db.product.findUnique({ where: { id: productId } }))) throw notFound();
  const files = (await req.formData()).getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) throw bad("Выберите файлы");
  const existing = await db.productImage.findMany({ where: { productId }, orderBy: { sort: "desc" } });
  if (existing.length + files.length > MAX_PER_PRODUCT) throw bad(`Не более ${MAX_PER_PRODUCT} фото на товар`);

  let sort = (existing[0]?.sort ?? -1) + 1;
  const saved: string[] = [];
  try {
    for (const f of files) saved.push(await saveImage(f));
  } catch (e) {
    await Promise.all(saved.map(deleteImage)); // не оставляем часть загрузки
    throw e;
  }
  await db.productImage.createMany({ data: saved.map((path) => ({ productId, path, sort: sort++ })) });
  await audit(db, u.id, "product.images.add", "product", productId, null, { count: saved.length });
  return { added: saved.length };
});

const patch = z.object({ imageId: z.number().int(), makeMain: z.literal(true) });

/** Сделать фото главным (первым). */
export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  const u = await requireUser("owner", "admin");
  const productId = Number((await params).id);
  const b = patch.parse(await req.json());
  const rows = await db.productImage.findMany({ where: { productId }, orderBy: { sort: "asc" } });
  if (!rows.some((r) => r.id === b.imageId)) throw notFound();
  const order = [b.imageId, ...rows.filter((r) => r.id !== b.imageId).map((r) => r.id)];
  await db.$transaction(order.map((id, sort) => db.productImage.update({ where: { id }, data: { sort } })));
  await audit(db, u.id, "product.images.main", "product", productId, null, { imageId: b.imageId });
  return { ok: true };
});

export const DELETE = handle(async (req: Request, { params }: Ctx) => {
  const u = await requireUser("owner", "admin");
  const productId = Number((await params).id);
  const imageId = Number(new URL(req.url).searchParams.get("imageId"));
  const img = await db.productImage.findFirst({ where: { id: imageId, productId } });
  if (!img) throw notFound();
  await db.productImage.delete({ where: { id: imageId } });
  await deleteImage(img.path);
  await audit(db, u.id, "product.images.delete", "product", productId, { imageId }, null);
  return { ok: true };
});
