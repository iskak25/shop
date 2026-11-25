"use client";

import { useState, type FormEvent } from "react";
import { GlassButton } from "@/components/glass";
import { api, useLoad } from "@/lib/api";
import { fmt } from "@/lib/data";
import { useStore } from "@/lib/store";
import { useMe } from "@/lib/me";
import { PhotoManager } from "./PhotoManager";

interface P {
  id: number; sku: string; name: string; category: string; stock: number; reserved: number; salePrice: number | null; oldPrice: number | null;
  costPrice?: number; thumb: string | null; photos: number; isPublished: boolean; installmentAllowed: boolean; status: string; minQty: number;
}
interface Lookups { categories: { id: number; nameRu: string }[] }

const STATUS: Record<string, [string, string]> = { draft: ["Черновик", ""], awaiting_price: ["Ждёт цену", "pill-tag--warn"], active: ["Активен", "pill-tag--ok"] };

function Row({ p, owner, onSaved, onError }: { p: P; owner: boolean; onSaved: () => void; onError: (m: string) => void }) {
  const [photos, setPhotos] = useState(false);
  const [price, setPrice] = useState(p.salePrice?.toString() ?? "");
  const [old, setOld] = useState(p.oldPrice?.toString() ?? "");
  const [pub, setPub] = useState(p.isPublished);
  const [inst, setInst] = useState(p.installmentAllowed);
  const { notify } = useStore();
  const margin = p.costPrice && Number(price) ? Math.round(((Number(price) - p.costPrice) / Number(price)) * 100) : null;

  const save = async () => {
    try {
      await api(`/api/admin/products/${p.id}`, { method: "PATCH", body: { salePrice: price ? Number(price) : null, oldPrice: old ? Number(old) : null, isPublished: pub, installmentAllowed: inst } });
      notify("Сохранено"); onSaved();
    } catch (e) { onError((e as Error).message); }
  };
  const [label, cls] = STATUS[p.status] ?? [p.status, ""];

  const cols = owner ? 9 : 4;
  return (
    <>
    <tr>
      <td>
        <div className="row-gap" style={{ flexWrap: "nowrap" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {p.thumb ? <img className="admin-thumb" src={p.thumb} alt="" /> : <span className="admin-thumb" aria-hidden />}
          <div><b>{p.name}</b><div className="small muted">{p.sku} · {p.category}</div>
            <button className="small" style={{ textDecoration: "underline", minHeight: 32 }} aria-expanded={photos} onClick={() => setPhotos((v) => !v)}>{photos ? "Скрыть фото" : `Фото (${p.photos})`}</button>
          </div>
        </div>
      </td>
      <td className="num">{p.stock}<span className="muted"> / {p.reserved}</span></td>
      {owner && <td className="num">{fmt(p.costPrice ?? 0)}</td>}
      <td>{owner ? <input className="input" type="number" min={1} aria-label="Цена продажи" value={price} onChange={(e) => setPrice(e.target.value)} /> : p.salePrice ? fmt(p.salePrice) : "—"}</td>
      {owner && <td><input className="input" type="number" min={1} aria-label="Старая цена" value={old} onChange={(e) => setOld(e.target.value)} /></td>}
      {owner && <td className="num">{margin != null ? `${margin} %` : "—"}</td>}
      <td><span className={`pill-tag ${cls}`}>{label}</span></td>
      {owner && (
        <td>
          <label className="row-gap small"><input type="checkbox" checked={pub} onChange={(e) => setPub(e.target.checked)} disabled={!price} /> На сайте</label>
          <label className="row-gap small"><input type="checkbox" checked={inst} onChange={(e) => setInst(e.target.checked)} /> Рассрочка</label>
        </td>
      )}
      {owner && <td><GlassButton className="btn-sm" onClick={save}>Сохранить</GlassButton></td>}
    </tr>
    {photos && <tr><td colSpan={cols}><PhotoManager productId={p.id} onChange={onSaved} /></td></tr>}
    </>
  );
}

export default function ProductsPage() {
  const me = useMe();
  const owner = me.role === "owner";
  const { data, error, reload } = useLoad<{ products: P[] }>("/api/admin/products");
  const { data: lk } = useLoad<Lookups>("/api/admin/lookups");
  const { notify } = useStore();
  const [err, setErr] = useState("");
  const [markup, setMarkup] = useState("40");
  const [show, setShow] = useState(false);

  const create = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const colors = String(f.get("colors") ?? "").split(",").map((s) => s.trim()).filter(Boolean).map((s) => {
      const m = s.match(/^(.+?)\s*(#[0-9a-fA-F]{6})?$/);
      return { name: m?.[1] ?? s, hex: m?.[2] ?? "#c9b8a0" };
    });
    try {
      await api("/api/admin/products", {
        body: {
          nameRu: f.get("name"), categoryId: Number(f.get("categoryId")), description: f.get("description") ?? "", minQty: Number(f.get("minQty") || 0),
          barcode: f.get("barcode") || undefined, brand: f.get("brand") || undefined,
          attributes: { kind: f.get("kind"), colors, sizes: String(f.get("sizes") ?? "").split(",").map((s) => s.trim()).filter(Boolean), specs: [] },
        },
      });
      notify("Товар создан. Оприходуйте его, и владелец назначит цену"); setShow(false); setErr(""); reload();
    } catch (x) { setErr((x as Error).message); }
  };

  const bulk = async () => {
    try { const r = await api<{ updated: number }>("/api/admin/bulk-markup", { body: { percent: Number(markup) } }); notify(`Цены назначены: ${r.updated}`); reload(); }
    catch (x) { setErr((x as Error).message); }
  };

  const awaiting = data?.products.filter((p) => p.status === "awaiting_price").length ?? 0;

  return (
    <>
      <div className="row-gap" style={{ justifyContent: "space-between" }}>
        <h1 className="display">Товары и цены</h1>
        <GlassButton className="btn-sm" onClick={() => setShow((s) => !s)}>{show ? "Закрыть" : "Новый товар"}</GlassButton>
      </div>
      {(error || err) && <p className="alert" role="alert">{error || err}</p>}

      {show && (
        <form className="glass-light card-pad stack" onSubmit={create}>
          <div className="form-grid">
            <div className="field"><label htmlFor="n">Название</label><input id="n" name="name" className="input" required /></div>
            <div className="field"><label htmlFor="c">Категория</label><select id="c" name="categoryId" className="input">{lk?.categories.map((c) => <option key={c.id} value={c.id}>{c.nameRu}</option>)}</select></div>
            <div className="field"><label htmlFor="k">Вид (иллюстрация)</label><select id="k" name="kind" className="input">{[["pot", "Кастрюля"], ["pan", "Сковорода"], ["kettle", "Чайник"], ["kazan", "Казан"], ["bowl", "Миска"], ["cup", "Чашка"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div className="field"><label htmlFor="b">Бренд</label><input id="b" name="brand" className="input" /></div>
            <div className="field"><label htmlFor="bc">Штрихкод</label><input id="bc" name="barcode" className="input" /></div>
            <div className="field"><label htmlFor="m">Мин. остаток</label><input id="m" name="minQty" type="number" min={0} defaultValue={3} className="input" /></div>
            <div className="field"><label htmlFor="co">Цвета (через запятую, можно «Графит #5a5148»)</label><input id="co" name="colors" className="input" /></div>
            <div className="field"><label htmlFor="s">Размеры / объёмы (через запятую)</label><input id="s" name="sizes" className="input" /></div>
          </div>
          <div className="field"><label htmlFor="d">Описание</label><textarea id="d" name="description" className="input" /></div>
          <GlassButton type="submit">Создать</GlassButton>
        </form>
      )}

      {owner && awaiting > 0 && (
        <div className="glass-light card-pad row-gap">
          <span><b>{awaiting}</b> товаров ждут цену. Быстро назначить: себестоимость +</span>
          <input className="input" style={{ width: 90, minHeight: 44 }} type="number" min={0} value={markup} onChange={(e) => setMarkup(e.target.value)} aria-label="Наценка, %" /> %
          <GlassButton className="btn-sm" onClick={bulk}>Назначить и опубликовать</GlassButton>
        </div>
      )}

      <div className="glass-light card-pad table-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Товар</th><th className="num">Факт / резерв</th>{owner && <th className="num">Себест.</th>}<th>Цена</th>
              {owner && <><th>Старая</th><th className="num">Маржа</th></>}<th>Статус</th>{owner && <><th>Публикация</th><th /></>}
            </tr>
          </thead>
          <tbody>{data?.products.map((p) => <Row key={`${p.id}-${p.salePrice}-${p.isPublished}`} p={p} owner={owner} onSaved={reload} onError={setErr} />)}</tbody>
        </table>
      </div>
    </>
  );
}
