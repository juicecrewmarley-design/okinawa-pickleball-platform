"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/PageShell";

type LogoutResult = {
  ok?: boolean;
  message?: string;
};

export default function LogoutPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogout() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        cache: "no-store"
      });
      const result = (await response.json()) as LogoutResult;

      if (!response.ok || !result.ok) {
        throw new Error(result.message ?? "ログアウトできませんでした。もう一度お試しください。");
      }

      router.replace("/login");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ログアウト中にエラーが発生しました。");
      setLoading(false);
    }
  }

  return (
    <PageShell
      eyebrow="Logout"
      title="ログアウト"
      description="この端末でのログイン状態を終了します。共有端末を使っている場合は、ログアウトしてから画面を閉じてください。"
    >
      <section className="mx-auto max-w-xl rounded-lg border border-ocean-100 bg-white p-6 shadow-soft">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-ocean-50 text-ocean-700">
            <LogOut className="size-6" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl font-black text-ink">ログアウトしますか？</h2>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
              ログアウト後は、会員証・大会エントリー・管理画面を見るために再ログインが必要です。
            </p>
          </div>
        </div>

        {message ? (
          <p className="mt-5 rounded-md bg-coral-100 px-4 py-3 text-sm font-bold leading-6 text-coral-700">
            {message}
          </p>
        ) : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            href="/"
            className="focus-ring inline-flex items-center justify-center rounded-md bg-ocean-50 px-5 py-3 font-black text-ink transition hover:bg-ocean-100"
          >
            戻る
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loading}
            className="focus-ring inline-flex items-center justify-center gap-2 rounded-md bg-ink px-5 py-3 font-black text-white transition hover:bg-ocean-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <LogOut className="size-5" aria-hidden="true" />}
            {loading ? "ログアウト中..." : "ログアウトする"}
          </button>
        </div>
      </section>
    </PageShell>
  );
}
