"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { BarChart3, ClipboardList, History, LogOut, Package, PackagePlus, ReceiptText, Settings, ShoppingCart, Store, Trash2, Users, Warehouse } from "lucide-react";
import { api } from "@/lib/api";
import { MeCtx, type Me, type Role } from "@/lib/me";

const ROLE_RU: Record<Role, string> = { owner: "Владелец", admin: "Администратор", seller: "Продавец" };

const LINKS: { href: string; label: string; icon: typeof Package; roles: Role[] }[] = [
  { href: "/admin", label: "Дашборд", icon: BarChart3, roles: ["owner", "admin", "seller"] },
  { href: "/admin/orders", label: "Заказы", icon: ClipboardList, roles: ["owner", "admin", "seller"] },
  { href: "/admin/pos", label: "Касса", icon: ReceiptText, roles: ["owner", "seller"] },
  { href: "/admin/products", label: "Товары и цены", icon: Package, roles: ["owner", "admin"] },
  { href: "/admin/receipts", label: "Приход", icon: PackagePlus, roles: ["owner", "admin"] },
  { href: "/admin/stock", label: "Остатки", icon: Warehouse, roles: ["owner", "admin", "seller"] },
  { href: "/admin/writeoffs", label: "Списания", icon: Trash2, roles: ["owner", "admin"] },
  { href: "/admin/users", label: "Пользователи", icon: Users, roles: ["owner"] },
  { href: "/admin/settings", label: "Настройки", icon: Settings, roles: ["owner"] },
  { href: "/admin/audit", label: "Журнал", icon: History, roles: ["owner"] },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const isLogin = path === "/admin/login";

  useEffect(() => {
    if (isLogin) return;
    api<{ user: Me }>("/api/auth/me").then((r) => setMe(r.user)).catch(() => router.replace("/admin/login"));
  }, [isLogin, router]);

  if (isLogin) return <>{children}</>;
  if (!me) return <p style={{ padding: 48, textAlign: "center" }} className="muted">Загрузка…</p>;

  const logout = async () => { await api("/api/auth/logout", { method: "POST", body: {} }); setMe(null); router.replace("/admin/login"); };
  const cur = (h: string) => (h === "/admin" ? path === "/admin" : path.startsWith(h)) ? "page" : undefined;

  return (
    <MeCtx.Provider value={me}>
      <div className="admin">
        <nav className="admin__nav glass-dark" aria-label="Админ-панель">
          <div className="brand">Очаг.</div>
          {LINKS.filter((l) => l.roles.includes(me.role)).map(({ href, label, icon: I }) => (
            <Link key={href} href={href} aria-current={cur(href)}><I size={18} strokeWidth={1.75} />{label}</Link>
          ))}
          <Link href="/"><Store size={18} strokeWidth={1.75} />На сайт</Link>
          <button onClick={logout}><LogOut size={18} strokeWidth={1.75} />Выйти</button>
          <div className="who">{me.name}<br />{ROLE_RU[me.role]}</div>
        </nav>
        <div className="admin__main">{children}</div>
      </div>
    </MeCtx.Provider>
  );
}
