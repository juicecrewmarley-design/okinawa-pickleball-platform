"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CalendarDays, Home, IdCard, LogOut, Shield, Trophy } from "lucide-react";
import { clsx } from "clsx";

const navItems = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/mypage", label: "会員証", icon: IdCard },
  { href: "/tournaments", label: "大会", icon: CalendarDays },
  { href: "/rankings", label: "OPR", icon: Trophy },
  { href: "/notices", label: "お知らせ", icon: Bell },
  { href: "/admin", label: "管理", icon: Shield },
  { href: "/logout", label: "ログアウト", icon: LogOut }
];

export function AppHeader() {
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");

  return (
    <header className="sticky top-0 z-40 border-b border-ocean-100/80 bg-white/92 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-full bg-ocean-500 text-lg font-black text-white shadow-soft">
            OP
          </span>
          <span>
            <span className="block text-sm font-semibold text-ocean-700">沖縄県ピックルボール協会</span>
            <span className="block text-lg font-black leading-tight text-ink">公式アプリ</span>
          </span>
        </Link>
        {!isAuthPage ? (
        <nav className="flex gap-2 overflow-x-auto pb-1 lg:pb-0" aria-label="主要メニュー">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "focus-ring flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold transition",
                  active
                    ? "bg-ink text-white shadow-soft"
                    : "bg-ocean-50 text-ink hover:bg-ocean-100"
                )}
                title={item.label}
              >
                <Icon className="size-4" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        ) : null}
      </div>
    </header>
  );
}
