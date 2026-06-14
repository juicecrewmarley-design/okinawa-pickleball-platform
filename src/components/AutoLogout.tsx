"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const AUTO_LOGOUT_MS = 20 * 60 * 1000;
const publicPathPrefixes = ["/login", "/register"];

function isPublicPath(pathname: string) {
  return publicPathPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function AutoLogout() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isPublicPath(pathname)) return;

    let timeoutId: number | null = null;

    const logout = async () => {
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } finally {
        router.push("/login?timeout=1");
      }
    };

    const resetTimer = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(logout, AUTO_LOGOUT_MS);
    };

    const events: Array<keyof WindowEventMap> = ["click", "keydown", "mousemove", "scroll", "touchstart"];
    events.forEach((eventName) => window.addEventListener(eventName, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      events.forEach((eventName) => window.removeEventListener(eventName, resetTimer));
    };
  }, [pathname, router]);

  return null;
}
