"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CalendarDays, CheckCircle2, Loader2, MapPin, Trophy, Users } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { StatusBadge } from "@/components/StatusBadge";
import { formatYen } from "@/lib/member";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { defaultTournamentCategoryConfig, getCategoryCapacity, sumCategoryCapacities } from "@/lib/tournament-categories";
import type { Tournament } from "@/types/domain";

type EntryType = "doubles" | "team";
type ApplicantType = "member" | "guest";

type TournamentApiResult = {
  message?: string;
  ok?: boolean;
  tournament?: Tournament | null;
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
  const [entryType, setEntryType] = useState<EntryType>("doubles");
  const [applicantType, setApplicantType] = useState<ApplicantType>("member");

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tournament) return;

    setLoading(true);
    setMessage("");

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
        ? selectedApplicantType === "member" && Boolean(applicantMemberId && partnerMemberId && partnerName)
        : selectedApplicantType === "member" && Boolean(applicantMemberId) && teamMembers.every((member) => member.memberId && member.name);
    const status = isLinked ? "confirmed" : "pending";
    const linkingStatus = isLinked ? "linked" : "waiting";
    const entryLabel = entryType === "team" && teamName ? `${category} / ${teamName}` : category;

    try {
      if (isSupabaseConfigured && supabase && isUuid(tournament.id)) {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData.session?.user.id;

        const { error } = await supabase.from("tournament_entries").insert({
          tournament_id: tournament.id,
          user_id: userId ?? null,
          category,
          pair_or_team_name: entryType === "team" ? teamName : null,
          team_name: entryType === "team" ? teamName : null,
          applicant_type: selectedApplicantType,
          applicant_member_id: selectedApplicantType === "member" ? applicantMemberId : null,
          applicant_name: applicantName,
          applicant_email: applicantEmail,
          applicant_phone: applicantPhone,
          entry_fee_yen: entryFeeYen,
          entry_type: entryType,
          division: entryType === "doubles" ? division : "チーム戦",
          class_or_age_category: entryType === "doubles" ? doublesClass : teamAgeCategory,
          partner_member_id: entryType === "doubles" ? partnerMemberId : null,
          partner_name: entryType === "doubles" ? partnerName : null,
          team_members: entryType === "team" ? teamMembers : [],
          linking_status: linkingStatus,
          status
        });

        if (error) throw error;
      }

      setMessage(
        isLinked
          ? `${entryLabel} は紐づけ完了のため、エントリー確定になりました。参加費は${formatYen(entryFeeYen)}です。`
          : `${entryLabel} は申込受付済みです。会員IDの紐づけまたは管理者確認後に確定できます。参加費は${formatYen(entryFeeYen)}です。`
      );
      event.currentTarget.reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "エントリー中にエラーが発生しました。");
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
                onClick={() => setApplicantType(type)}
                className={`focus-ring rounded-md px-3 py-3 text-sm font-black ${
                  applicantType === type ? "bg-white text-ink shadow" : "text-coral-700"
                }`}
              >
                {type === "member" ? `会員 ${formatYen(memberFeeYen)}` : `非会員 ${formatYen(guestFeeYen)}`}
              </button>
            ))}
          </div>

          <div className="mb-4 grid gap-4 rounded-md bg-ocean-50 p-3">
            <AdminLikeInput name="applicantName" label="申込者氏名" placeholder="例: 沖縄 花子" required />
            {applicantType === "member" ? (
              <AdminLikeInput name="applicantMemberId" label="申込者の会員ID" placeholder="例: OKP-0001" required />
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminLikeInput name="applicantEmail" label="メールアドレス" type="email" placeholder="mail@example.com" required />
              <AdminLikeInput name="applicantPhone" label="電話番号" type="tel" placeholder="090-0000-0000" required />
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
              <AdminLikeInput name="partnerMemberId" label="ペアの会員ID（会員の場合）" placeholder="例: OKP-0002" />
              <AdminLikeInput name="partnerName" label="ペアの氏名" placeholder="例: 金城 直人" required />
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
                  <AdminLikeInput name={`teamMember${index}Name`} label={`メンバー${index} 氏名`} placeholder="氏名" required />
                </div>
              ))}
            </div>
          )}

          {message ? (
            <p className="mt-4 flex items-center gap-2 rounded-md bg-palm-100 px-4 py-3 text-sm font-bold text-palm-700">
              <CheckCircle2 className="size-5" aria-hidden="true" />
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
  type = "text",
  placeholder,
  required
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input required={required} name={name} type={type} className="focus-ring rounded-md border border-ocean-100 px-3 py-3" placeholder={placeholder} />
    </label>
  );
}
