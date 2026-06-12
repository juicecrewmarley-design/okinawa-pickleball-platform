"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Loader2, LockKeyhole, Shield } from "lucide-react";
import { PageShell } from "@/components/PageShell";

export default function LoginPage() {
  const [mode, setMode] = useState<"member" | "admin">("member");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });
      const result = (await response.json()) as { ok?: boolean; message?: string; role?: string };

      if (!response.ok || !result.ok) {
        throw new Error(result.message ?? "ログインできませんでした。");
      }

      if (mode === "admin" && result.role !== "admin") {
        setMessage("管理者権限がありません。ホームへ移動します。");
        window.location.href = "/";
        return;
      }

      setMessage("ログインしました。移動します。");
      window.location.href = mode === "admin" ? "/admin" : "/mypage";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ログイン中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell
      eyebrow="Sign In"
      title="ログイン"
      description="会員はマイページへ、運営管理者は管理画面へ進めます。"
    >
      <div className="mx-auto max-w-xl rounded-lg border border-ocean-100 bg-white p-5 shadow-soft sm:p-6">
        <div className="mb-5 grid grid-cols-2 gap-2 rounded-md bg-ocean-50 p-1">
          <button
            type="button"
            onClick={() => setMode("member")}
            className={`focus-ring flex items-center justify-center gap-2 rounded-md px-3 py-3 text-sm font-black ${
              mode === "member" ? "bg-white text-ink shadow" : "text-slate-600"
            }`}
          >
            <LockKeyhole className="size-4" aria-hidden="true" />
            会員
          </button>
          <button
            type="button"
            onClick={() => setMode("admin")}
            className={`focus-ring flex items-center justify-center gap-2 rounded-md px-3 py-3 text-sm font-black ${
              mode === "admin" ? "bg-white text-ink shadow" : "text-slate-600"
            }`}
          >
            <Shield className="size-4" aria-hidden="true" />
            管理者
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            メールアドレス
            <input required name="email" type="email" className="focus-ring rounded-md border border-ocean-100 px-3 py-3" placeholder={mode === "admin" ? "admin@example.com" : "member@example.com"} />
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            パスワード
            <input required name="password" type="password" className="focus-ring rounded-md border border-ocean-100 px-3 py-3" placeholder="パスワード" />
          </label>
          {message ? <p className="rounded-md bg-palm-100 px-4 py-3 text-sm font-bold text-palm-700">{message}</p> : null}
          <button
            disabled={loading}
            className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink px-5 py-3 font-black text-white transition hover:bg-ocean-700 disabled:opacity-60"
          >
            {loading ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <LockKeyhole className="size-5" aria-hidden="true" />}
            {mode === "admin" ? "管理者ログイン" : "ログイン"}
          </button>
        </form>
        <div className="mt-5 grid gap-2 text-center text-sm text-slate-600">
          <Link href="/mypage" className="font-black text-ocean-700">
            マイページへ
          </Link>
          <Link href="/admin" className="font-black text-coral-600">
            管理画面へ
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
