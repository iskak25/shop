"use client";

import { Star, Trash2, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { api, useLoad } from "@/lib/api";
import { useStore } from "@/lib/store";

interface Img { id: number; src: string; thumb: string }

const SAFE_BYTES = 3.5 * 1024 * 1024; // лимит тела запроса на Vercel — 4,5 МБ

/** Крупные фото уменьшаем в браузере (WebP сохраняет прозрачность), чтобы запрос прошёл в лимит хостинга. */
async function shrink(f: File): Promise<File> {
  if (f.size <= SAFE_BYTES) return f;
  try {
    const bmp = await createImageBitmap(f);
    const k = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/webp", 0.85));
    return blob && blob.size < f.size ? new File([blob], f.name.replace(/\.\w+$/, ".webp"), { type: "image/webp" }) : f;
  } catch { return f; }
}

/** Загрузка, удаление и выбор главного фото товара. */
export function PhotoManager({ productId, onChange }: { productId: number; onChange: () => void }) {
  const { data, reload } = useLoad<{ images: Img[] }>(`/api/admin/products/${productId}/images`);
  const { notify } = useStore();
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [err, setErr] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const refresh = () => { reload(); onChange(); };

  const upload = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length) return;
    setBusy(true); setErr("");
    let added = 0;
    try {
      for (const f of list) { // по одному файлу на запрос
        const fd = new FormData();
        fd.append("files", await shrink(f));
        const res = await fetch(`/api/admin/products/${productId}/images`, { method: "POST", body: fd });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(d.error ?? (res.status === 413 ? "Файл слишком большой" : "Не удалось загрузить"));
        added += d.added;
      }
    } catch (e) { setErr((e as Error).message); }
    finally {
      if (added) { notify(`Загружено фото: ${added}`); refresh(); }
      setBusy(false); if (input.current) input.current.value = "";
    }
  };

  const act = async (fn: () => Promise<unknown>) => {
    try { await fn(); setErr(""); refresh(); } catch (e) { setErr((e as Error).message); }
  };

  return (
    <div className="stack">
      {err && <p className="alert" role="alert">{err}</p>}
      <div className="photo-grid">
        {data?.images.map((im, i) => (
          <div key={im.id} className={`photo-tile ${i === 0 ? "photo-tile--main" : ""}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={im.thumb} alt={`Фото ${i + 1}`} />
            {i === 0 && <span className="photo-tile__main">Главное</span>}
            <div className="photo-tile__bar">
              {i > 0 ? <button aria-label="Сделать главным" title="Сделать главным" onClick={() => act(() => api(`/api/admin/products/${productId}/images`, { method: "PATCH", body: { imageId: im.id, makeMain: true } }))}><Star size={16} /></button> : <span />}
              <button aria-label="Удалить фото" title="Удалить" onClick={() => confirm("Удалить это фото?") && act(() => api(`/api/admin/products/${productId}/images?imageId=${im.id}`, { method: "DELETE" }))}><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>
      <label
        className={`dropzone ${over ? "is-over" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); upload(e.dataTransfer.files); }}
      >
        <UploadCloud size={28} strokeWidth={1.5} />
        <span>{busy ? "Загружаем и оптимизируем…" : "Перетащите фото сюда или нажмите, чтобы выбрать"}</span>
        <span className="small muted">JPG, PNG, WebP, AVIF · до 10 МБ · до 10 фото. Для главной страницы лучше PNG без фона.</span>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple hidden disabled={busy} onChange={(e) => e.target.files && upload(e.target.files)} />
      </label>
    </div>
  );
}
