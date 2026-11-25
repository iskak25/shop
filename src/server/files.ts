import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, put } from "@vercel/blob";
import sharp from "sharp";
import { bad } from "./http";

/** Папка с загруженными фото (если не задан BLOB_READ_WRITE_TOKEN). На VPS вынесите на постоянный том (UPLOAD_DIR) и включите в бэкап. */
export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

/** На Vercel фото лежат в Vercel Blob: диск там не сохраняется. */
const BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;
/** Публичный адрес хранилища: https://<storeId>.public.blob.vercel-storage.com (storeId зашит в токен). */
export const blobBase = () => process.env.BLOB_PUBLIC_BASE ?? `https://${process.env.BLOB_READ_WRITE_TOKEN?.split("_")[3]?.toLowerCase()}.public.blob.vercel-storage.com`;
export const usesBlob = () => BLOB;

const MAX_BYTES = 10 * 1024 * 1024;
const FORMATS = new Set(["jpeg", "png", "webp", "avif"]);
export const FILE_RE = /^[0-9a-f-]{36}(-sm)?\.webp$/;

/** Сохраняет фото в WebP: основное (до 1600 px) и миниатюра (480 px). Прозрачность PNG сохраняется. */
export async function saveImage(file: File): Promise<string> {
  if (file.size > MAX_BYTES) throw bad(`«${file.name}»: файл больше 10 МБ`);
  const input = Buffer.from(await file.arrayBuffer());
  let format: string | undefined;
  try {
    format = (await sharp(input).metadata()).format;
  } catch {
    throw bad(`«${file.name}»: это не изображение`);
  }
  if (!format || !FORMATS.has(format)) throw bad(`«${file.name}»: допустимы JPG, PNG, WebP, AVIF`);

  const id = randomUUID();
  const base = sharp(input).rotate(); // учитываем поворот из EXIF; метаданные (GPS и т.п.) не копируются
  const [full, thumb] = await Promise.all([
    base.clone().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer(),
    base.clone().resize({ width: 480, height: 480, fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }).toBuffer(),
  ]);
  if (BLOB) {
    const opts = { access: "public", addRandomSuffix: false, contentType: "image/webp", cacheControlMaxAge: 31536000 } as const;
    await Promise.all([put(`${id}.webp`, full, opts), put(`${id}-sm.webp`, thumb, opts)]);
    return id;
  }
  await mkdir(UPLOAD_DIR, { recursive: true });
  await Promise.all([writeFile(path.join(UPLOAD_DIR, `${id}.webp`), full), writeFile(path.join(UPLOAD_DIR, `${id}-sm.webp`), thumb)]);
  return id;
}

export async function deleteImage(id: string) {
  if (BLOB) {
    await del([`${id}.webp`, `${id}-sm.webp`].map((f) => `${blobBase()}/${f}`)).catch(() => {});
    return;
  }
  await Promise.all([`${id}.webp`, `${id}-sm.webp`].map((f) => unlink(path.join(UPLOAD_DIR, f)).catch(() => {})));
}

export async function readUpload(name: string) {
  if (!FILE_RE.test(name)) return null;
  try {
    return await readFile(path.join(UPLOAD_DIR, name));
  } catch {
    return null;
  }
}
