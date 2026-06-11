"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, UserPlus } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { QrCodeCard } from "@/components/QrCodeCard";
import { formatLegacyMemberId, generateMemberId, normalizeMemberNumber } from "@/lib/member";
import { municipalityToArea, okinawaMunicipalities, residenceScopeLabels } from "@/lib/okinawa";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import type { Gender, MemberProfile, ResidenceScope } from "@/types/domain";

const genderOptions: { value: Gender; label: string }[] = [
  { value: "male", label: "男性" },
  { value: "female", label: "女性" },
  { value: "other", label: "その他" },
  { value: "no_answer", label: "回答しない" }
];

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [createdMember, setCreatedMember] = useState<MemberProfile | null>(null);
  const [memberId, setMemberId] = useState("");
  const [legacyMemberNumber, setLegacyMemberNumber] = useState("");
  const [residenceScope, setResidenceScope] = useState<ResidenceScope>("okinawa");
  const [supabaseReady, setSupabaseReady] = useState(isSupabaseConfigured);

  useEffect(() => {
    setMemberId(generateMemberId());
    getSupabaseClient().then((client) => setSupabaseReady(Boolean(client)));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));
    const legacyMemberNumber = normalizeMemberNumber(String(formData.get("legacyMemberNumber") ?? ""));
    const requestedLegacyMemberId = legacyMemberNumber ? formatLegacyMemberId(legacyMemberNumber) : "";
    const municipality = residenceScope === "okinawa" ? String(formData.get("municipality") ?? "") : "";
    const area = residenceScope === "okinawa" ? municipalityToArea(municipality) : "other";
    const issuedMemberId = requestedLegacyMemberId || memberId || generateMemberId();
    const profile: MemberProfile = {
      id: "local-preview",
      memberId: issuedMemberId,
      fullName: String(formData.get("fullName")),
      furigana: String(formData.get("furigana")),
      gender: String(formData.get("gender")) as Gender,
      birthDate: String(formData.get("birthDate")),
      phone: String(formData.get("phone")),
      email,
      area,
      residenceScope,
      municipality,
      role: "member",
      opr: 0,
      ranking: 0
    };

    try {
      const supabase = await getSupabaseClient();

      if (supabase) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: profile.fullName,
              furigana: profile.furigana,
              gender: profile.gender,
              birth_date: profile.birthDate,
              phone: profile.phone,
              area: profile.area,
              residence_scope: profile.residenceScope,
              municipality: profile.municipality,
              legacy_member_id: requestedLegacyMemberId || null
            }
          }
        });

        if (error) throw error;

        setMessage("登録しました。確認メールが届く場合は、メール内のリンクを開いてください。");
      } else {
        window.localStorage.setItem("opba-demo-member", JSON.stringify(profile));
        setMessage("Supabase環境変数が読み込まれていないため、プレビュー用会員として保存しました。");
      }

      setCreatedMember(!supabase || requestedLegacyMemberId ? profile : null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "登録中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell
      eyebrow="Member Registration"
      title="会員登録"
      description="氏名、ふりがな、連絡先、居住地を登録し、会員IDとQRコード会員証を発行します。"
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <form onSubmit={handleSubmit} className="rounded-lg border border-ocean-100 bg-white p-5 shadow-soft sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              氏名
              <input required name="fullName" className="focus-ring rounded-md border border-ocean-100 px-3 py-3" placeholder="沖縄 花子" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              ふりがな
              <input required name="furigana" className="focus-ring rounded-md border border-ocean-100 px-3 py-3" placeholder="おきなわ はなこ" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              性別
              <select required name="gender" className="focus-ring rounded-md border border-ocean-100 px-3 py-3">
                {genderOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              生年月日
              <input name="birthDate" type="date" className="focus-ring rounded-md border border-ocean-100 px-3 py-3" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              電話番号
              <input name="phone" type="tel" className="focus-ring rounded-md border border-ocean-100 px-3 py-3" placeholder="090-0000-0000" />
            </label>
            <div className="grid gap-2 text-sm font-bold text-slate-700">
              居住地
              <div className="grid grid-cols-2 gap-2 rounded-md bg-ocean-50 p-1">
                {(["okinawa", "outside"] as ResidenceScope[]).map((scope) => (
                  <button
                    key={scope}
                    type="button"
                    onClick={() => setResidenceScope(scope)}
                    className={`focus-ring rounded-md px-3 py-3 text-sm font-black ${
                      residenceScope === scope ? "bg-white text-ink shadow" : "text-slate-600"
                    }`}
                  >
                    {residenceScopeLabels[scope]}
                  </button>
                ))}
              </div>
            </div>
            {residenceScope === "okinawa" ? (
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                市町村
                <select required name="municipality" className="focus-ring rounded-md border border-ocean-100 px-3 py-3">
                  {okinawaMunicipalities.map((municipalityName) => (
                    <option key={municipalityName} value={municipalityName}>
                      {municipalityName}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="rounded-md bg-ocean-50 p-4 text-sm leading-6 text-slate-600">
                沖縄県外の方は市町村選択なしで登録できます。
              </div>
            )}
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              メールアドレス
              <input required name="email" type="email" className="focus-ring rounded-md border border-ocean-100 px-3 py-3" placeholder="member@example.com" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              パスワード
              <input required name="password" type="password" minLength={8} className="focus-ring rounded-md border border-ocean-100 px-3 py-3" placeholder="8文字以上" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700 sm:col-span-2">
              Googleフォームで発行済みの会員番号
              <input
                name="legacyMemberNumber"
                value={legacyMemberNumber}
                onChange={(event) => setLegacyMemberNumber(normalizeMemberNumber(event.target.value))}
                inputMode="numeric"
                pattern="[0-9]*"
                className="focus-ring rounded-md border border-ocean-100 px-3 py-3"
                placeholder="例: 0001"
              />
              <span className="text-xs leading-5 text-slate-500">
                既にGoogleフォームで会員登録済みの方だけ、番号のみ入力してください。Supabase側では登録メールアドレスと照合して、この番号を引き継ぎます。
              </span>
            </label>
          </div>

          <div className="mt-5 rounded-md bg-ocean-50 p-4">
            <p className="text-sm font-bold text-ocean-700">
              {legacyMemberNumber ? "引き継ぐGoogleフォーム番号" : "新規発行予定の会員ID（プレビュー）"}
            </p>
            <p className="mt-1 text-2xl font-black text-ink">{legacyMemberNumber || memberId}</p>
            {legacyMemberNumber ? (
              <p className="mt-2 text-xs leading-5 text-slate-500">
                登録時は自動で既存会員IDに変換して照合します。
              </p>
            ) : (
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Supabase本番環境では、DB側で次の空き番号を正式発行します。
              </p>
            )}
          </div>

          {message ? (
            <p className="mt-4 flex items-center gap-2 rounded-md bg-palm-100 px-4 py-3 text-sm font-bold text-palm-700">
              <CheckCircle2 className="size-5" aria-hidden="true" />
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="focus-ring mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink px-5 py-3 font-black text-white transition hover:bg-ocean-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <UserPlus className="size-5" aria-hidden="true" />}
            会員登録する
          </button>
          <p className="mt-4 text-center text-sm text-slate-600">
            登録済みの方は{" "}
            <Link href="/login" className="font-black text-ocean-700">
              ログイン
            </Link>
          </p>
        </form>

        <div className="space-y-4">
          {createdMember ? (
            <QrCodeCard member={createdMember} />
          ) : (
            <div className="rounded-lg border border-ocean-100 bg-white p-6 shadow-soft">
              <h2 className="text-xl font-black">登録後の表示</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                登録完了後、この場所にQRコード付き会員証のプレビューが表示されます。大会受付ではこのQRを提示する想定です。
              </p>
            </div>
          )}
          <div className="rounded-lg bg-coral-100 p-5 text-coral-600">
            <p className="font-black">MVPメモ</p>
            <p className="mt-2 text-sm leading-6">
              {supabaseReady
                ? "Supabase接続済みです。登録情報はSupabase Authとprofilesテーブルに保存されます。"
                : "Supabase未設定時はブラウザ内にプレビュー保存します。NEXT_PUBLIC_SUPABASE_URLとNEXT_PUBLIC_SUPABASE_ANON_KEYを設定するとSupabaseへ保存します。"}
            </p>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
