"use client";

import { ChangeEventHandler, FocusEventHandler, FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertCircle, CalendarDays, CheckCircle2, Loader2, MapPin, Trophy, Users } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { StatusBadge } from "@/components/StatusBadge";
import { formatYen } from "@/lib/member";
import { isSupabaseConfigured } from "@/lib/supabase";
import { defaultTournamentCategoryConfig, getCategoryCapacity, sumCategoryCapacities } from "@/lib/tournament-categories";
import type { Tournament } from "@/types/domain";

type EntryType = "doubles" | "team";
type ApplicantType = "member" | "guest";

type TournamentApiResult = {
  message?: string;
  ok?: boolean;
  tournament?: Tournament | null;
};

type EntryApiResult = {
  code?: string;
  details?: string;
  message?: string;
  ok?: boolean;
};

type MemberLookupPurpose = "applicant" | "partner";

type MemberLookupResult = {
  message?: string;
  ok?: boolean;
  profile?: {
    email?: string;
    fullName: string;
    memberId: string;
    phone?: string;
  };
};

type LookupStatus = {
  text: string;
  tone: "idle" | "loading" | "success" | "error";
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export default function TournamentDetailPage() {
  const params = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [tournamentLoading, setTournamentLoading] = useState(true);
  const [tournamentError, setTournamentError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [entryType, setEntryType] = useState<EntryType>("doubles");
  const [applicantType, setApplicantType] = useState<ApplicantType>("member");
  const [applicantMemberId, setApplicantMemberId] = useState("");
  const [applicantName, setApplicantName] = useState("");
  const [applicantEmail, setApplicantEmail] = useState("");
  const [applicantPhone, setApplicantPhone] = useState("");
  const [partnerMemberId, setPartnerMemberId] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [applicantLookup, setApplicantLookup] = useState<LookupStatus>({ text: "", tone: "idle" });
  const [partnerLookup, setPartnerLookup] = useState<LookupStatus>({ text: "", tone: "idle" });
  const lastLookupKey = useRef<Record<MemberLookupPurpose, string>>({
    applicant: "",
    partner: ""
  });

  useEffect(() => {
    let active = true;

    async function loadTournament() {
      setTournamentLoading(true);
      setTournamentError("");

      try {
        const response = await fetch(`/api/tournaments/${params.id}`, { cache: "no-store" });
        const result = (await response.json()) as TournamentApiResult;

        if (!response.ok || !result.ok) {
          throw new Error(result.message ?? "大会情報を取得できませんでした。");
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

  const categoryConfig = tournament?.categoryConfig ?? defaultTournamentCategoryConfig;
  const categoryCapacities = tournament?.categoryCapacities ?? categoryConfig.categoryCapacities;
  const totalCapacity = sumCategoryCapacities(categoryCapacities) || tournament?.capacity || 0;
  const memberFeeYen = tournament?.memberFeeYen ?? categoryConfig.fees?.member ?? tournament?.feeYen ?? 0;
  const guestFeeYen = tournament?.guestFeeYen ?? categoryConfig.fees?.guest ?? tournament?.feeYen ?? 0;

  const lookupMember = useCallback(async (memberId: string, purpose: MemberLookupPurpose) => {
    const trimmedMemberId = memberId.trim();
    if (!trimmedMemberId) return;

    const lookupKey = `${purpose}:${trimmedMemberId}`;
    if (lastLookupKey.current[purpose] === lookupKey) return;
    lastLookupKey.current[purpose] = lookupKey;

    const setLookup = purpose === "applicant" ? setApplicantLookup : setPartnerLookup;
    setLookup({ text: "会員情報を確認しています。", tone: "loading" });

    try {
      const response = await fetch("/api/members/lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          memberId: trimmedMemberId,
          purpose
        })
      });
      const result = (await response.json()) as MemberLookupResult;

      if (!response.ok || !result.ok || !result.profile) {
        throw new Error(result.message ?? "会員情報を取得できませんでした。");
      }

      if (purpose === "applicant") {
        setApplicantMemberId(result.profile.memberId);
        setApplicantName(result.profile.fullName);
        setApplicantEmail(result.profile.email ?? "");
        setApplicantPhone(result.profile.phone ?? "");
      } else {
        setPartnerMemberId(result.profile.memberId);
        setPartnerName(result.profile.fullName);
      }

      lastLookupKey.current[purpose] = `${purpose}:${result.profile.memberId}`;
      setLookup({ text: "会員情報を反映しました。", tone: "success" });
    } catch (error) {
      lastLookupKey.current[purpose] = "";
      setLookup({
        text: error instanceof Error ? error.message : "会員情報を取得できませんでした。",
        tone: "error"
      });
    }
  }, []);

  useEffect(() => {
    if (applicantType !== "member" || applicantMemberId.trim().length < 2) return;

    const timeoutId = window.setTimeout(() => {
      lookupMember(applicantMemberId, "applicant");
    }, 650);

    return () => window.clearTimeout(timeoutId);
  }, [applicantMemberId, applicantType, lookupMember]);

  useEffect(() => {
    if (entryType !== "doubles" || partnerMemberId.trim().length < 2) return;

    const timeoutId = window.setTimeout(() => {
      lookupMember(partnerMemberId, "partner");
    }, 650);

    return () => window.clearTimeout(timeoutId);
  }, [entryType, lookupMember, partnerMemberId]);

  function resetEntryForm() {
    setApplicantMemberId("");
    setApplicantName("");
    setApplicantEmail("");
    setApplicantPhone("");
    setPartnerMemberId("");
    setPartnerName("");
    setApplicantLookup({ text: "", tone: "idle" });
    setPartnerLookup({ text: "", tone: "idle" });
    lastLookupKey.current = {
      applicant: "",
      partner: ""
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tournament) return;

    setLoading(true);
    setMessage("");
    setMessageTone("success");

    const formData = new FormData(event.currentTarget);
    const selectedApplicantType = String(formData.get("applicantType")) === "guest" ? "guest" : "member";
    const applicantMemberId = String(formData.get("applicantMemberId") ?? "").trim();
    const applicantName = String(formData.get("applicantName") ?? "").trim();
    const applicantEmail = String(formData.get("applicantEmail") ?? "").trim();
    const applicantPhone = String(formData.get("applicantPhone") ?? "").trim();
    const teamName = String(formData.get("teamName") ?? "").trim();
    const division = String(formData.get("division") ?? "");
    const doublesClass = String(formData.get("doublesClass") ?? "");
    const teamAgeCategory = String(formData.get("teamAgeCategory") ?? "");

    const partnerMemberId = String(formData.get("partnerMemberId") ?? "").trim();
    const partnerName = String(formData.get("partnerName") ?? "").trim();
    const teamMembers = [2, 3, 4].map((index) => ({
      memberId: String(formData.get(`teamMember${index}Id`) ?? "").trim(),
      name: String(formData.get(`teamMember${index}Name`) ?? "").trim()
    }));

    const category = entryType === "doubles" ? `${division} / ${doublesClass}` : `チーム戦 / ${teamAgeCategory}`;
    const entryFeeYen = selectedApplicantType === "member" ? memberFeeYen : guestFeeYen;
    const isLinked =
      entryType === "doubles"
        ? selectedApplicantType === "member" && Boolean(applicantMemberId && partnerMemberId)
        : selectedApplicantType === "member" && Boolean(applicantMemberId) && teamMembers.every((member) => member.memberId);
    const status = isLinked ? "confirmed" : "pending";
    const linkingStatus = isLinked ? "linked" : "waiting";
    const entryLabel = entryType === "team" && teamName ? `${category} / ${teamName}` : category;

    const missingFields = [
      selectedApplicantType === "member" && !applicantMemberId ? "申込者の会員ID" : "",
      selectedApplicantType === "guest" && !applicantName ? "申込者氏名" : "",
      selectedApplicantType === "guest" && !applicantEmail ? "メールアドレス" : "",
      selectedApplicantType === "guest" && !applicantPhone ? "電話番号" : "",
      entryType === "doubles" && !partnerMemberId && !partnerName ? "ペアの会員IDまたは氏名" : "",
      entryType === "team" && !teamName ? "チーム名" : "",
      entryType === "team" && teamMembers.some((member) => !member.memberId && !member.name)
        ? "メンバー2〜4の会員IDまたは氏名"
        : ""
    ].filter(Boolean);

    if (missingFields.length > 0) {
      setMessage(`未入力の項目があります: ${missingFields.join("、")}。会員IDで紐づける場合、氏名などは未記入で大丈夫です。`);
      setMessageTone("error");
      setLoading(false);
      return;
    }

    try {
      if (isSupabaseConfigured && isUuid(tournament.id)) {
        const response = await fetch(`/api/tournaments/${tournament.id}/entries`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
          category,
          pairOrTeamName: entryType === "team" ? teamName : null,
          teamName: entryType === "team" ? teamName : null,
          applicantType: selectedApplicantType,
          applicantMemberId: selectedApplicantType === "member" ? applicantMemberId : null,
          applicantName,
          applicantEmail,
          applicantPhone,
          entryFeeYen,
          entryType,
          division: entryType === "doubles" ? division : "チーム戦",
          classOrAgeCategory: entryType === "doubles" ? doublesClass : teamAgeCategory,
          partnerMemberId: entryType === "doubles" ? partnerMemberId : null,
          partnerName: entryType === "doubles" ? partnerName : null,
          teamMembers: entryType === "team" ? teamMembers : [],
          linkingStatus,
          status
          })
        });

        const result = (await response.json()) as EntryApiResult;

        if (!response.ok || !result.ok) {
          const details = result.details ? ` 詳細: ${result.details}` : "";
          const code = result.code ? ` (${result.code})` : "";
          throw new Error(`${result.message ?? "エントリーを保存できませんでした。"}${code}${details}`);
        }
      }

      setMessage(
        isLinked
          ? `${entryLabel} は紐づけ完了のため、エントリー確定になりました。参加費は${formatYen(entryFeeYen)}です。`
          : `${entryLabel} は申込受付済みです。会員IDの紐づけまたは管理者確認後に確定できます。参加費は${formatYen(entryFeeYen)}です。`
      );
      setMessageTone("success");
      event.currentTarget.reset();
      resetEntryForm();
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
              会員 {formatYen(memberFeeYen)} / 非会員 {formatYen(guestFeeYen)}
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
            <p className="font-black">エントリー確定ルール</p>
            <p className="mt-2 text-sm leading-6">
              ダブルスはペア1名、チーム戦は合計4名のメンバーを紐づけます。必要人数がそろった時点でエントリー確定になります。
            </p>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="rounded-lg border border-ocean-100 bg-white p-5 shadow-soft sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-full bg-ocean-50 text-ocean-700">
              <Trophy className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-xl font-black">エントリー</h2>
              <p className="text-sm text-slate-600">会員・非会員を選び、必要メンバーを紐づけてください。</p>
            </div>
          </div>

          <input type="hidden" name="applicantType" value={applicantType} />

          <div className="mb-4 grid grid-cols-2 gap-2 rounded-md bg-coral-100 p-1">
            {(["member", "guest"] as ApplicantType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setApplicantType(type);
                  setApplicantLookup({ text: "", tone: "idle" });
                  if (type === "guest") {
                    setApplicantMemberId("");
                    lastLookupKey.current.applicant = "";
                  }
                }}
                className={`focus-ring rounded-md px-3 py-3 text-sm font-black ${
                  applicantType === type ? "bg-white text-ink shadow" : "text-coral-700"
                }`}
              >
                {type === "member" ? `会員 ${formatYen(memberFeeYen)}` : `非会員 ${formatYen(guestFeeYen)}`}
              </button>
            ))}
          </div>

          <div className="mb-4 grid gap-4 rounded-md bg-ocean-50 p-3">
            {applicantType === "member" ? (
              <div>
                <AdminLikeInput
                  name="applicantMemberId"
                  label="申込者の会員ID"
                  placeholder="例: 0001 または OKP-0001"
                  required
                  value={applicantMemberId}
                  onBlur={() => lookupMember(applicantMemberId, "applicant")}
                  onChange={(event) => {
                    setApplicantMemberId(event.target.value);
                    setApplicantLookup({ text: "", tone: "idle" });
                  }}
                />
                <LookupHint status={applicantLookup} />
                <p className="mt-2 text-xs font-bold leading-5 text-ocean-700">
                  会員IDで紐づくため、氏名・メールアドレス・電話番号は未記入でもエントリーできます。
                </p>
              </div>
            ) : null}
            <AdminLikeInput
              name="applicantName"
              label={applicantType === "member" ? "申込者氏名（会員ID入力時は未記入OK）" : "申込者氏名"}
              placeholder="例: 沖縄 花子"
              required={applicantType === "guest"}
              value={applicantName}
              onChange={(event) => setApplicantName(event.target.value)}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminLikeInput
                name="applicantEmail"
                label={applicantType === "member" ? "メールアドレス（会員ID入力時は未記入OK）" : "メールアドレス"}
                type="email"
                placeholder="mail@example.com"
                required={applicantType === "guest"}
                value={applicantEmail}
                onChange={(event) => setApplicantEmail(event.target.value)}
              />
              <AdminLikeInput
                name="applicantPhone"
                label={applicantType === "member" ? "電話番号（会員ID入力時は未記入OK）" : "電話番号"}
                type="tel"
                placeholder="090-0000-0000"
                required={applicantType === "guest"}
                value={applicantPhone}
                onChange={(event) => setApplicantPhone(event.target.value)}
              />
            </div>
          </div>

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
                  label="ペアの会員ID（会員の場合）"
                  placeholder="例: 0002 または OKP-0002"
                  value={partnerMemberId}
                  onBlur={() => lookupMember(partnerMemberId, "partner")}
                  onChange={(event) => {
                    setPartnerMemberId(event.target.value);
                    setPartnerLookup({ text: "", tone: "idle" });
                  }}
                />
                <LookupHint status={partnerLookup} />
              </div>
              <AdminLikeInput
                name="partnerName"
                label="ペアの氏名（会員ID入力時は未記入OK）"
                placeholder="例: 金城 直人"
                required={!partnerMemberId.trim()}
                value={partnerName}
                onChange={(event) => setPartnerName(event.target.value)}
              />
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
              <AdminLikeInput name="teamName" label="チーム名" placeholder="例: 那覇スマッシュ" required />
              {[2, 3, 4].map((index) => (
                <div key={index} className="grid gap-3 rounded-md bg-ocean-50 p-3 sm:grid-cols-2">
                  <AdminLikeInput name={`teamMember${index}Id`} label={`メンバー${index} 会員ID（会員の場合）`} placeholder={`例: OKP-000${index}`} />
                  <AdminLikeInput name={`teamMember${index}Name`} label={`メンバー${index} 氏名（会員ID入力時は未記入OK）`} placeholder="氏名" />
                </div>
              ))}
            </div>
          )}

          {message ? (
            <p
              className={`mt-4 flex items-center gap-2 rounded-md px-4 py-3 text-sm font-bold ${
                messageTone === "error" ? "bg-coral-100 text-coral-700" : "bg-palm-100 text-palm-700"
              }`}
            >
              {messageTone === "error" ? (
                <AlertCircle className="size-5 shrink-0" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />
              )}
              {message}
            </p>
          ) : null}
          <button
            disabled={loading || tournament.status !== "open"}
            className="focus-ring mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink px-5 py-3 font-black text-white transition hover:bg-ocean-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="size-5" aria-hidden="true" />}
            紐づけてエントリーする
          </button>
        </form>
      </div>
    </PageShell>
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
