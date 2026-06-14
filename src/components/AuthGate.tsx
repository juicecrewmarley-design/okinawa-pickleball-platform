"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const publicPathPrefixes = ["/login", "/register"];

function isPublicPath(pathname: string) {
  return publicPathPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAllowed, setIsAllowed] = useState(() => isPublicPath(pathname));

  useEffect(() => {
    let active = true;

    if (isPublicPath(pathname)) {
      setIsAllowed(true);
      return;
    }

    setIsAllowed(false);

    async function verifyLogin() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const result = (await response.json()) as { ok?: boolean };

        if (!active) return;

        if (response.ok && result.ok) {
          setIsAllowed(true);
          return;
        }
      } catch {
        // Redirect below.
      }

      if (active) {
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      }
    }

    verifyLogin();

    return () => {
      active = false;
    };
  }, [pathname, router]);

  if (!isAllowed) {
    return (
      <main className="grid min-h-screen place-items-center bg-ocean-50 px-4">
        <div className="rounded-lg border border-ocean-100 bg-white p-6 text-center shadow-soft">
          <p className="text-lg font-black text-ink">ログイン確認中です</p>
          <p className="mt-2 text-sm font-bold text-slate-600">未ログインの場合はログイン画面へ移動します。</p>
        </div>
      </main>
    );
  }

  return children;
}
