import { FILE_RE, blobBase, readUpload, usesBlob } from "@/server/files";

// имена — случайные UUID, содержимое не меняется, поэтому кэшируем надолго
const CACHE = "public, max-age=31536000, immutable";

export async function GET(_: Request, { params }: { params: Promise<{ name: string }> }) {
  const name = (await params).name;
  if (usesBlob()) {
    if (!FILE_RE.test(name)) return new Response("Not found", { status: 404 });
    return new Response(null, { status: 308, headers: { location: `${blobBase()}/${name}`, "cache-control": CACHE } });
  }
  const buf = await readUpload(name);
  if (!buf) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(buf), { headers: { "content-type": "image/webp", "cache-control": CACHE } });
}
