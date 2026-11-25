"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { GlassButton, GlassInput, Reveal } from "@/components/glass";
import { ProductVisual } from "@/components/ProductVisual";
import { fmt } from "@/lib/data";
import { useCatalog } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import { useAccount } from "@/lib/account";

export default function CheckoutPage() {
  const { cart, total, clearCart } = useStore();
  const { get: getProduct } = useCatalog();
  const { account } = useAccount();
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState("");
  const [delivery, setDelivery] = useState("delivery");
  const [pay, setPay] = useState("cash");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<string | null>(null);
  const shipping = delivery === "delivery" && total < 5000 ? 250 : 0;

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const err: Record<string, string> = {};
    if (!String(f.get("name")).trim()) err.name = "Укажите имя";
    if (String(f.get("phone")).replace(/\D/g, "").length < 9) err.phone = "Введите телефон полностью";
    if (delivery === "delivery" && !String(f.get("address")).trim()) err.address = "Укажите адрес доставки";
    setErrors(err);
    setServerError("");
    if (Object.keys(err).length) return;
    setBusy(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customer: { name: String(f.get("name")).trim(), phone: String(f.get("phone")).trim(), address: String(f.get("address") ?? "").trim() || undefined },
          deliveryType: delivery,
          address: String(f.get("address") ?? "").trim() || undefined,
          paymentMethod: pay,
          items: cart.map((l) => ({ slug: l.slug, qty: l.qty, meta: `${l.color} · ${l.size}` })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setServerError(data.error ?? "Не удалось оформить заказ"); return; }
      setDone(`№ ${data.number}`);
      clearCart();
    } catch {
      setServerError("Нет связи с сервером. Попробуйте ещё раз");
    } finally {
      setBusy(false);
    }
  };

  if (done)
    return (
      <div className="page">
        <Reveal className="success glass-light">
          <div className="check"><Check size={32} strokeWidth={1.75} /></div>
          <h1 className="display h2">Заказ {done} принят</h1>
          <p className="muted" style={{ margin: "12px 0 24px" }}>Менеджер свяжется с вами для подтверждения. Статус заказа можно проверить по номеру и телефону.</p>
          <Link href="/catalog" className="btn btn--primary">Продолжить покупки</Link>
        </Reveal>
      </div>
    );

  if (cart.length === 0)
    return (
      <div className="page">
        <div className="success glass-light">
          <h1 className="display h2">Корзина пуста</h1>
          <p className="muted" style={{ margin: "12px 0 24px" }}>Добавьте товары, чтобы оформить заказ.</p>
          <Link href="/catalog" className="btn btn--primary">В каталог</Link>
        </div>
      </div>
    );

  return (
    <div className="page">
      <Reveal>
        <h1 className="display h1" style={{ maxWidth: 1100, margin: "0 auto 24px" }}>Оформление заказа</h1>
        <div className="checkout">
          <form className="glass-light panel stack" style={{ padding: 28 }} onSubmit={submit} noValidate>
            <div className="form-grid">
              <GlassInput key={`n${account?.email}`} id="name" name="name" label="Имя" autoComplete="name" defaultValue={account?.name} error={errors.name} />
              <GlassInput id="phone" name="phone" label="Телефон" type="tel" inputMode="tel" autoComplete="tel" placeholder="+996" defaultValue={account?.phone ?? ""} key={`p${account?.email}`} error={errors.phone} />
            </div>
            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="field-label">Получение</legend>
              <div className="choice">
                {[["delivery", "Доставка по Бишкеку"], ["pickup", "Самовывоз из магазина"]].map(([v, l]) => (
                  <label key={v} className="choice__item"><input type="radio" name="delivery" value={v} checked={delivery === v} onChange={() => setDelivery(v)} />{l}</label>
                ))}
              </div>
            </fieldset>
            {delivery === "delivery" && <GlassInput id="address" name="address" label="Адрес" autoComplete="street-address" defaultValue={account?.address ?? ""} error={errors.address} />}
            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="field-label">Оплата</legend>
              <div className="choice">
                {[["cash", "Наличными при получении"], ["qr", "Перевод / QR"], ["installment", "Рассрочка MBank / М-Бизнес"]].map(([v, l]) => (
                  <label key={v} className="choice__item"><input type="radio" name="pay" value={v} checked={pay === v} onChange={() => setPay(v)} />{l}</label>
                ))}
              </div>
              {pay === "installment" && <p className="small muted" style={{ marginTop: 8 }}>Товар резервируется на 24 часа, менеджер оформит рассрочку вместе с вами.</p>}
            </fieldset>
            {serverError && <p className="field__err" role="alert">{serverError}</p>}
            <GlassButton type="submit" block disabled={busy}>{busy ? "Отправляем…" : "Подтвердить заказ"}</GlassButton>
          </form>

          <aside className="glass-light panel" style={{ padding: 24 }} aria-label="Ваш заказ">
            <h2 className="display h3" style={{ marginBottom: 8 }}>Ваш заказ</h2>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {cart.map((l) => {
                const p = getProduct(l.slug);
                if (!p) return null;
                return (
                  <li key={`${l.slug}${l.color}${l.size}`} className="line" style={{ borderColor: "rgba(64,56,48,0.1)" }}>
                    <div className="line__thumb" style={{ background: "rgba(233,200,181,0.3)" }}><ProductVisual product={p} color={p.colors.find((c) => c.name === l.color)?.hex ?? p.colors[0].hex} /></div>
                    <div><div className="line__name">{p.name}</div><div className="line__meta">{l.color} · {l.size} · {l.qty} шт.</div></div>
                    <div className="line__price">{fmt(p.price * l.qty)}</div>
                  </li>
                );
              })}
            </ul>
            <div className="sum-row"><span>Товары</span><span>{fmt(total)}</span></div>
            <div className="sum-row"><span>Доставка</span><span>{shipping ? fmt(shipping) : "Бесплатно"}</span></div>
            <div className="sum-row sum-row--total"><span>Итого</span><span>{fmt(total + shipping)}</span></div>
          </aside>
        </div>
      </Reveal>
    </div>
  );
}
