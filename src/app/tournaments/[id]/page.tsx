"use client";

import { ChangeEventHandler, FocusEventHandler, FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertCircle, CalendarDays, CheckCircle2, Loader2, MapPin, Trophy, Users } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { StatusBadge } from "@/components/StatusBadge";
import { formatYen, getMembershipLabel } from "@/lib/member";
import { isSupabaseConfigured } from "@/lib/supabase";
import { defaultTournamentCategoryConfig, getCategoryCapacity, sumCategoryCapacities } from "@/lib/tournament-categories";
import type { MemberProfile, MembershipType, PaymentMethod, Tournament } from "@/types/domain";

type EntryType = "doubles" | "team";

type TournamentApiResult = {
  currentUrl?: string;
  message?: string;
  ok?: boolean;
  tournament?: Tournament | null;
  tournamentId?: string;
};

type EntryApiResult = {
  code?: string;
  currentUrl?: string;
  details?: string;
  hasServiceRoleKey?: boolean;
  linkingStatus?: "waiting" | "linked";
  message?: string;
  missingColumn?: string | null;
  ok?: boolean;
  receivedTournamentId?: string;
  status?: "pending" | "confirmed" | "cancelled";
  tournamentLookupData?: unknown;
  tournamentLookupError?: unknown;
  tournamentId?: string;
};

type MeApiResult = {
  message?: string;
  ok?: boolean;
  profile?: Pick<
    MemberProfile,
    | "area"
    | "birthDate"
    | "email"
    | "fullName"
    | "furigana"
    | "gender"
    | "id"
    | "memberId"
    | "membershipType"
    | "municipality"
    | "phone"
    | "residenceScope"
    | "role"
  >;
};

type MemberLookupResult = {
  message?: string;
  ok?: boolean;
  profile?: {
    fullName: string;
    memberId: string;
  };
};

type LookupStatus = {
  text: string;
  tone: "idle" | "loading" | "success" | "error";
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim());
}

function getPaymentMethodLabel(method: PaymentMethod) {
  return method === "paypay" ? "PayPay" : "現金";
}

function formatEntryResultMessage(result: EntryApiResult, entryFeeYen: number, paymentMethod: PaymentMethod) {
  const paymentLabel = getPaymentMethodLabel(paymentMethod);

  if (result.status === "confirmed" || result.linkingStatus === "linked") {
    return `エントリーを保存しました。ペアの申込が揃ったため、エントリー完了です。参加料は${formatYen(entryFeeYen)}、支払い方法は${paymentLabel}です。`;
  }

  return `エントリーを保存しました。ペアの申込がまだ揃っていないため、現在は待機中です。ペア側も同じ大会・カテゴリであなたの会員IDを入力すると完了になります。参加料は${formatYen(entryFeeYen)}、支払い方法は${paymentLabel}です。`;
}

export default function TournamentDetailPage() {
  const params = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [tournamentLoading, setTournamentLoading] = useState(true);
  const [tournamentError, setTournamentError] = useState("");
  const [currentMember, setCurrentMember] = useState<MeApiResult["profile"] | null>(null);
  const [currentMemberError, setCurrentMemberError] = useState("");
  const [currentUrl, setCurrentUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [entryType, setEntryType] = useState<EntryType>("doubles");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [partnerMemberId, setPartnerMemberId] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [partnerLookup, setPartnerLookup] = useState<LookupStatus>({ text: "", tone: "idle" });
  const lastPartnerLookupKey = useRef("");

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadTournament() {
      setTournamentLoading(true);
      setTournamentError("");

      try {
        const response = await fetch(`/api/tournaments/${params.id}`, { cache: "no-store" });
        const result = (await response.json()) as TournamentApiResult;

        if (!response.ok || !result.ok) {
          const context = [
            result.tournamentId ? `tournamentId: ${result.tournamentId}` : "",
            result.currentUrl ? `URL: ${result.currentUrl}` : ""
          ]
            .filter(Boolean)
            .join(" / ");
          throw new Error(`${result.message ?? "大会情報を取得できませんでした。"}${context ? ` (${context})` : ""}`);
        }

        if (active) {
          setTournament(result.tournament ?? null);
        }
      } catch (error) {
        if (active) {
          setTournament(null);
          setTournamentError(error instanceof Error ? error.message : "大会情報を取得できませんでした。");
        }
      } finally {
        if (active) {
          setTournamentLoading(false);
        }
      }
    }

    loadTournament();

    return () => {
      active = false;
    };
  }, [params.id]);

  useEffect(() => {
    let active = true;

    async function loadCurrentMember() {
      setCurrentMemberError("");

      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const result = (await response.json()) as MeApiResult;

        if (!response.ok || !result.ok || !result.profile) {
          throw new Error(result.message ?? "ログイン中の会員情報を取得できませんでした。");
        }

        if (active) {
          setCurrentMember(result.profile);
        }
      } catch (error) {
        if (active) {
          setCurrentMember(null);
          setCurrentMemberError(error instanceof Error ? error.message : "ログイン中の会員情報を取得できませんでした。");
        }
      }
    }

    loadCurrentMember();

    return () => {
      active = false;
    };
  }, []);

  const categoryConfig = tournament?.categoryConfig ?? defaultTournamentCategoryConfig;
  const categoryCapacities = tournament?.categoryCapacities ?? categoryConfig.categoryCapacities;
  const totalCapacity = sumCategoryCapacities(categoryCapacities) || tournament?.capacity || 0;
  const generalFeeYen = tournament?.memberFeeYen ?? categoryConfig.fees?.member ?? tournament?.feeYen ?? 0;
  const premiumFeeYen = tournament?.guestFeeYen ?? categoryConfig.fees?.guest ?? tournament?.feeYen ?? 0;
  const membershipType: MembershipType = currentMember?.membershipType ?? "general";
  const entryFeeYen = membershipType === "premium" ? premiumFeeYen : generalFeeYen;
  const isSupabaseTournamentId = tournament ? isUuid(tournament.id) : false;

  const lookupPartner = useCallback(async (memberId: string) => {
    const trimmedMemberId = memberId.trim();
    if (!trimmedMemberId) return;

    const lookupKey = `partner:${trimmedMemberId}`;
    if (lastPartnerLookupKey.current === lookupKey) return;
    lastPartnerLookupKey.current = lookupKey;

    setPartnerLookup({ text: "ペア会員情報を確認しています。", tone: "loading" });

    try {
      const response = await fetch("/api/members/lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          memberId: trimmedMemberId,
          purpose: "partner"
        })
      });
      const result = (await response.json()) as MemberLookupResult;

      if (!response.ok || !result.ok || !result.profile) {
        throw new Error(result.message ?? "ペア会員情報を取得できませんでした。");
      }

      setPartnerMemberId(result.profile.memberId);
      setPartnerName(result.profile.fullName);
      lastPartnerLookupKey.current = `partner:${result.profile.memberId}`;
      setPartnerLookup({ text: "ペア会員情報を反映しました。", tone: "success" });
    } catch (error) {
      lastPartnerLookupKey.current = "";
      setPartnerName("");
      setPartnerLookup({
        text: error instanceof Error ? error.message : "ペア会員情報を取得できませんでした。",
        tone: "error"
      });
    }
  }, []);

  useEffect(() => {
    if (entryType !== "doubles" || partnerMemberId.trim().length < 2) return;

    const timeoutId = window.setTimeout(() => {
      lookupPartner(partnerMemberId);
    }, 650);

    return () => window.clearTimeout(timeoutId);
  }, [entryType, lookupPartner, partnerMemberId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tournament || !currentMember) return;

    setLoading(true);
    setMessage("");
    setMessageTone("success");

    const formData = new FormData(event.currentTarget);
    const teamName = String(formData.get("teamName") ?? "").trim();
    const division = String(formData.get("division") ?? "");
    const doublesClass = String(formData.get("doublesClass") ?? "");
    const teamAgeCategory = String(formData.get("teamAgeCategory") ?? "");
    const submittedPartnerMemberId = partnerMemberId.trim();
    const submittedPartnerName = partnerName.trim();
    const submittedPaymentMethod = paymentMethod;
    const teamMembers = [2, 3, 4].map((index) => ({
      memberId: String(formData.get(`teamMember${index}Id`) ?? "").trim(),
      name: String(formData.get(`teamMember${index}Name`) ?? "").trim()
    }));

    const category = entryType === "doubles" ? `${division} / ${doublesClass}` : `チーム戦 / ${teamAgeCategory}`;
    const entryLabel = entryType === "team" && teamName ? `${category} / ${teamName}` : category;

    const missingFields = [
      !currentMember.memberId ? "申込者の会員ID" : "",
      entryType === "doubles" && !submittedPartnerMemberId ? "ペアの会員ID" : "",
      entryType === "doubles" && !submittedPartnerName ? "ペアの氏名確認" : "",
      entryType === "team" && !teamName ? "チーム名" : "",
      entryType === "team" && teamMembers.some((member) => !member.memberId && !member.name)
        ? "メンバー2〜4の会員IDまたは氏名"
        : ""
    ].filter(Boolean);

    if (missingFields.length > 0) {
      setMessage(`不足している項目があります: ${missingFields.join("、")}`);
      setMessageTone("error");
      setLoading(false);
      return;
    }

    try {
      if (!isSupabaseConfigured) {
        throw new Error("Supabase環境変数が未設定のため、エントリーを保存できません。Vercelの環境変数を確認してください。");
      }

      if (!isUuid(tournament.id)) {
        throw new Error(`Supabaseに保存できる大会IDではありません。大会一覧から管理画面で作成した大会を開き直してください。tournamentId: ${tournament.id} / URL: ${window.location.href}`);
      }

      const response = await fetch("/api/tournament-entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          applicantEmail: currentMember.email,
          applicantMemberId: currentMember.memberId,
          applicantMembershipType: membershipType,
          applicantName: currentMember.fullName,
          applicantPhone: currentMember.phone,
          applicantType: "member",
          category,
          classOrAgeCategory: entryType === "doubles" ? doublesClass : teamAgeCategory,
          division: entryType === "doubles" ? division : "チーム戦",
          entryFeeYen,
          entryType,
          pairOrTeamName: entryType === "team" ? teamName : null,
          paymentMethod: submittedPaymentMethod,
          partnerMemberId: entryType === "doubles" ? submittedPartnerMemberId : null,
          partnerName: entryType === "doubles" ? submittedPartnerName : null,
          teamMembers: entryType === "team" ? teamMembers : [],
          teamName: entryType === "team" ? teamName : null,
          tournamentId: tournament.id
        })
      });

      const result = (await response.json()) as EntryApiResult;

      if (!response.ok || !result.ok) {
        const details = result.details ? ` 詳細: ${result.details}` : "";
        const code = result.code ? ` (${result.code})` : "";
        const context = [
          result.receivedTournamentId ? `受信した大会ID: ${result.receivedTournamentId}` : "",
          result.tournamentId ? `tournamentId: ${result.tournamentId}` : "",
          result.missingColumn ? `不足カラム: ${result.missingColumn}` : "",
          typeof result.hasServiceRoleKey === "boolean" ? `SERVICE_ROLE_KEY: ${result.hasServiceRoleKey ? "設定済み" : "未設定"}` : "",
          result.tournamentLookupData ? `大会確認データ: ${JSON.stringify(result.tournamentLookupData)}` : "",
          result.tournamentLookupError ? `大会確認エラー: ${JSON.stringify(result.tournamentLookupError)}` : "",
          result.currentUrl ? `URL: ${result.currentUrl}` : ""
        ]
          .filter(Boolean)
          .join(" / ");
        throw new Error(`${result.message ?? "エントリーを保存できませんでした。"}${code}${details}${context ? ` (${context})` : ""}`);
      }

      setMessage(`${formatEntryResultMessage(result, entryFeeYen, submittedPaymentMethod)} 対象: ${entryLabel}`);
      setMessageTone("success");
      setPartnerMemberId("");
      setPartnerName("");
      setPartnerLookup({ text: "", tone: "idle" });
      lastPartnerLookupKey.current = "";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "エントリー中にエラーが発生しました。");
      setMessageTone("error");
    } finally {
      setLoading(false);
    }
  }

  if (tournamentLoading) {
    return (
      <PageShell title="大会を読み込み中" description="大会情報を確認しています。">
        <p className="rounded-lg border border-ocean-100 bg-white p-5 text-sm font-bold text-slate-600 shadow-soft">
          少しお待ちください。
        </p>
      </PageShell>
    );
  }

  if (tournamentError) {
    return (
      <PageShell title="大会情報を取得できませんでした">
        <div className="rounded-lg border border-coral-200 bg-coral-100 p-5 text-sm font-bold leading-7 text-coral-700 shadow-soft">
          {tournamentError}
        </div>
        <Link className="mt-5 inline-flex font-black text-ocean-700" href="/tournaments">
          大会一覧へ戻る
        </Link>
      </PageShell>
    );
  }

  if (!tournament) {
    return (
      <PageShell title="大会が見つかりません">
        <Link className="font-black text-ocean-700" href="/tournaments">
          大会一覧へ戻る
        </Link>
      </PageShell>
    );
  }

  return (
    <PageShell eyebrow="Tournament Entry" title={tournament.title} description={tournament.description}>
      <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
        <section className="rounded-lg border border-ocean-100 bg-white p-5 shadow-soft sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={tournament.status} />
            <span className="rounded-md bg-coral-100 px-3 py-2 text-sm font-black leading-6 text-coral-600">
              一般会員 {formatYen(generalFeeYen)} / プレミアム会員 {formatYen(premiumFeeYen)}
            </span>
          </div>
          <dl className="mt-6 grid gap-4 text-sm text-slate-700">
            <div className="flex items-center gap-3 rounded-md bg-ocean-50 p-4">
              <CalendarDays className="size-5 text-ocean-700" aria-hidden="true" />
              <span>{new Date(tournament.startAt).toLocaleString("ja-JP")}</span>
            </div>
            <div className="flex items-center gap-3 rounded-md bg-ocean-50 p-4">
              <MapPin className="size-5 text-ocean-700" aria-hidden="true" />
              <span>{tournament.venue}</span>
            </div>
            <div className="flex items-center gap-3 rounded-md bg-ocean-50 p-4">
              <Users className="size-5 text-ocean-700" aria-hidden="true" />
              <span>総定員 {totalCapacity}名 / 申込締切 {new Date(tournament.entryDeadline).toLocaleDateString("ja-JP")}</span>
            </div>
          </dl>

          <div className="mt-6">
            <h2 className="text-xl font-black">カテゴリ</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {tournament.categories.map((category) => (
                <span key={category} className="rounded-full bg-palm-100 px-3 py-1 text-sm font-black text-palm-700">
                  {category}
                  {getCategoryCapacity(categoryCapacities, category) ? ` ${getCategoryCapacity(categoryCapacities, category)}名` : ""}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-md bg-coral-100 p-4 text-coral-600">
            <p className="font-black">紐づけエントリーの状態</p>
            <p className="mt-2 text-sm leading-6">
              ダブルスは片方だけが申込した時点では「待機」です。ペア側も同じ大会・カテゴリで相手の会員IDを入力すると「エントリー完了」になります。
            </p>
          </div>
        </section>

        {!isSupabaseTournamentId ? (
          <section className="rounded-lg border border-coral-200 bg-white p-5 shadow-soft sm:p-6">
            <div className="flex items-start gap-3 rounded-md bg-coral-100 px-4 py-4 text-coral-700">
              <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <div>
                <h2 className="text-lg font-black">この大会URLからはエントリーできません</h2>
                <p className="mt-2 text-sm font-bold leading-6">
                  Supabaseに保存された大会IDではありません。大会一覧から、管理画面で作成した大会を開き直してください。
                </p>
                <dl className="mt-4 grid gap-2 break-all text-xs leading-5">
                  <div>
                    <dt className="font-black">現在の大会ID</dt>
                    <dd>{tournament.id}</dd>
                  </div>
                  <div>
                    <dt className="font-black">現在のURL</dt>
                    <dd>{currentUrl || `/tournaments/${params.id}`}</dd>
                  </div>
                </dl>
              </div>
            </div>
            <Link
              href="/tournaments"
              className="focus-ring mt-5 inline-flex w-full items-center justify-center rounded-md bg-ink px-5 py-3 text-sm font-black text-white transition hover:bg-ocean-700"
            >
              大会一覧から開き直す
            </Link>
          </section>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-lg border border-ocean-100 bg-white p-5 shadow-soft sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-full bg-ocean-50 text-ocean-700">
                <Trophy className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-xl font-black">エントリー</h2>
                <p className="text-sm text-slate-600">ログイン中の会員情報で申込します。申込者情報の入力は不要です。</p>
              </div>
            </div>

            {currentMemberError ? (
              <div className="mb-4 rounded-md bg-coral-100 px-4 py-3 text-sm font-bold leading-6 text-coral-700">
                {currentMemberError}
              </div>
            ) : null}

            {currentMember ? (
              <div className="mb-4 grid gap-3 rounded-md bg-ocean-50 p-4 text-sm">
                <div className="grid gap-1">
                  <span className="font-bold text-slate-500">申込者会員ID</span>
                  <span className="text-xl font-black text-ink">{currentMember.memberId}</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoItem label="氏名" value={currentMember.fullName} />
                  <InfoItem label="会員種別" value={getMembershipLabel(membershipType)} />
                  <InfoItem label="メール" value={currentMember.email} />
                  <InfoItem label="電話番号" value={currentMember.phone || "未登録"} />
                </div>
                <p className="rounded-md bg-white px-3 py-2 text-sm font-black text-ocean-700">
                  今回の参加料: {formatYen(entryFeeYen)}
                </p>
              </div>
            ) : (
              <div className="mb-4 rounded-md bg-ocean-50 px-4 py-3 text-sm font-bold text-slate-600">
                ログイン中の会員情報を読み込んでいます。
              </div>
            )}

            <div className="mb-4 grid grid-cols-2 gap-2 rounded-md bg-ocean-50 p-1">
              {(["doubles", "team"] as EntryType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setEntryType(type)}
                  className={`focus-ring rounded-md px-3 py-3 text-sm font-black ${
                    entryType === type ? "bg-white text-ink shadow" : "text-slate-600"
                  }`}
                >
                  {type === "doubles" ? "ダブルス" : "チーム戦"}
                </button>
              ))}
            </div>

            {entryType === "doubles" ? (
              <div className="grid gap-4">
                <label className="grid gap-2 text-sm font-bold text-slate-700">
                  選択枠
                  <select required name="division" className="focus-ring rounded-md border border-ocean-100 px-3 py-3">
                    {categoryConfig.doubles.divisions.map((division) => (
                      <option key={division} value={division}>
                        {division}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-bold text-slate-700">
                  カテゴリ
                  <select required name="doublesClass" className="focus-ring rounded-md border border-ocean-100 px-3 py-3">
                    {categoryConfig.doubles.classes.map((className) => (
                      <option key={className} value={className}>
                        {className}
                      </option>
                    ))}
                  </select>
                </label>
                <div>
                  <AdminLikeInput
                    name="partnerMemberId"
                    label="ペアの会員ID"
                    placeholder="例: 0002 または OKP-0002"
                    required
                    value={partnerMemberId}
                    onBlur={() => lookupPartner(partnerMemberId)}
                    onChange={(event) => {
                      setPartnerMemberId(event.target.value);
                      setPartnerName("");
                      setPartnerLookup({ text: "", tone: "idle" });
                    }}
                  />
                  <LookupHint status={partnerLookup} />
                </div>
                <InfoItem label="ペアの氏名" value={partnerName || "会員IDを入力すると表示されます"} />
              </div>
            ) : (
              <div className="grid gap-4">
                <label className="grid gap-2 text-sm font-bold text-slate-700">
                  チーム戦カテゴリ
                  <select required name="teamAgeCategory" className="focus-ring rounded-md border border-ocean-100 px-3 py-3">
                    {categoryConfig.team.ageCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
                <AdminLikeInput name="teamName" label="チーム名" placeholder="例: 琉球スマッシュ" required />
                {[2, 3, 4].map((index) => (
                  <div key={index} className="grid gap-3 rounded-md bg-ocean-50 p-3 sm:grid-cols-2">
                    <AdminLikeInput name={`teamMember${index}Id`} label={`メンバー${index} 会員ID`} placeholder={`例: OKP-000${index}`} />
                    <AdminLikeInput name={`teamMember${index}Name`} label={`メンバー${index} 氏名`} placeholder="氏名" />
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 rounded-md bg-ocean-50 p-4">
              <p className="text-sm font-black text-ink">支払い方法</p>
              <div className="mt-3 grid grid-cols-2 gap-2 rounded-md bg-white p-1">
                {(["cash", "paypay"] as PaymentMethod[]).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`focus-ring rounded-md px-3 py-3 text-sm font-black ${
                      paymentMethod === method ? "bg-ink text-white shadow" : "text-slate-600 hover:bg-ocean-50"
                    }`}
                  >
                    {getPaymentMethodLabel(method)}
                  </button>
                ))}
              </div>
            </div>

            {message ? (
              <p
                className={`mt-4 flex items-start gap-2 rounded-md px-4 py-3 text-sm font-bold leading-6 ${
                  messageTone === "error" ? "bg-coral-100 text-coral-700" : "bg-palm-100 text-palm-700"
                }`}
              >
                {messageTone === "error" ? (
                  <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                )}
                {message}
              </p>
            ) : null}
            <button
              disabled={loading || tournament.status !== "open" || !currentMember}
              className="focus-ring mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink px-5 py-3 font-black text-white transition hover:bg-ocean-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="size-5" aria-hidden="true" />}
              紐づけてエントリーする
            </button>
          </form>
        )}
      </div>
    </PageShell>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white px-3 py-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 break-words font-black text-ink">{value}</p>
    </div>
  );
}

function AdminLikeInput({
  label,
  name,
  onBlur,
  onChange,
  type = "text",
  placeholder,
  required,
  value
}: {
  label: string;
  name: string;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  type?: string;
  placeholder?: string;
  required?: boolean;
  value?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input
        required={required}
        name={name}
        type={type}
        value={value}
        onBlur={onBlur}
        onChange={onChange}
        className="focus-ring rounded-md border border-ocean-100 px-3 py-3"
        placeholder={placeholder}
      />
    </label>
  );
}

function LookupHint({ status }: { status: LookupStatus }) {
  if (!status.text) return null;

  const toneClass = {
    error: "text-coral-700",
    idle: "text-slate-600",
    loading: "text-ocean-700",
    success: "text-palm-700"
  }[status.tone];

  return (
    <p className={`mt-2 flex items-center gap-2 text-xs font-bold ${toneClass}`}>
      {status.tone === "loading" ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : null}
      {status.text}
    </p>
  );
}
