"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, Building2, CalendarDays, CalendarPlus, ClipboardList, Download, Loader2, Medal, Save, Shield, Trophy, Users } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { singleAdminEmail } from "@/lib/admin";
import { getMembershipLabel } from "@/lib/member";
import { tournaments } from "@/lib/mock-data";
import { formatResidence } from "@/lib/okinawa";
import {
  buildCategoryCapacities,
  buildTournamentCategories,
  doublesClasses,
  doublesDivisions,
  sumCategoryCapacities,
  teamAgeCategories
} from "@/lib/tournament-categories";
import type { Gender, MemberArea, MembershipType, PaymentMethod, ResidenceScope, TournamentCategoryConfig, TournamentStatus } from "@/types/domain";

const adminSections = [
  { id: "members", label: "会員", icon: Users },
  { id: "tournament-list", label: "大会一覧", icon: CalendarDays },
  { id: "tournaments", label: "大会作成", icon: CalendarPlus },
  { id: "entries", label: "参加者", icon: ClipboardList },
  { id: "results", label: "結果・OPR", icon: Trophy },
  { id: "notices", label: "お知らせ", icon: Bell },
  { id: "sponsors", label: "協賛企業", icon: Building2 }
];

function capacityInputName(category: string) {
  return `capacity:${category}`;
}

type AdminApiResult = {
  diagnostics?: {
    auth?: {
      profileFound?: boolean;
      role?: string | null;
      userId?: string | null;
    };
    dbAdmin?: boolean | null;
    hasServiceRoleKey?: boolean;
    insertedWith?: string | null;
    insertError?: {
      code?: string;
      details?: string;
      message?: string;
    } | null;
    serviceRoleError?: {
      code?: string;
      details?: string;
      message?: string;
    } | null;
  };
  id?: string;
  message?: string;
  ok?: boolean;
};

type AdminMember = {
  area: MemberArea;
  birthDate: string;
  email: string;
  fullName: string;
  furigana: string;
  gender: Gender;
  id: string;
  memberId: string;
  membershipType: MembershipType;
  municipality: string;
  phone: string;
  residenceScope: ResidenceScope;
  role: string;
};

type AdminMembersResult = {
  members?: AdminMember[];
  message?: string;
  ok?: boolean;
};

type AdminTournament = {
  capacity: number;
  categories: string[];
  createdAt: string;
  description: string;
  entryDeadline: string;
  guestFeeYen: number;
  id: string;
  memberFeeYen: number;
  startAt: string;
  status: TournamentStatus;
  title: string;
  updatedAt: string;
  venue: string;
};

type AdminTournamentsResult = {
  message?: string;
  ok?: boolean;
  tournaments?: AdminTournament[];
};

type AdminEntry = {
  applicantEmail: string;
  applicantMemberId: string;
  applicantMembershipType: MembershipType;
  applicantName: string;
  applicantPhone: string;
  applicantType: "member" | "guest";
  category: string;
  createdAt: string;
  entryFeeYen: number;
  entryType: "doubles" | "team";
  id: string;
  linkingStatus: "waiting" | "linked";
  partnerMemberId: string;
  partnerName: string;
  paymentMethod: PaymentMethod;
  status: "pending" | "confirmed" | "cancelled";
  teamName: string;
  tournamentId: string;
  tournamentStartAt: string;
  tournamentTitle: string;
};

type AdminEntriesResult = {
  entries?: AdminEntry[];
  message?: string;
  ok?: boolean;
};

function formatAdminApiError(result: AdminApiResult) {
  const diagnostics = result.diagnostics;
  if (!diagnostics) return result.message ?? "保存できませんでした。";

  const insertError = diagnostics.insertError;
  const serviceRoleError = diagnostics.serviceRoleError;
  const details = [
    `userId: ${diagnostics.auth?.userId ? "取得済み" : "未取得"}`,
    `profile: ${diagnostics.auth?.profileFound ? "あり" : "なし"}`,
    `role: ${diagnostics.auth?.role ?? "不明"}`,
    `dbAdmin: ${diagnostics.dbAdmin === null || diagnostics.dbAdmin === undefined ? "未確認" : diagnostics.dbAdmin ? "true" : "false"}`,
    `service role key: ${diagnostics.hasServiceRoleKey ? "設定済み" : "未設定"}`,
    insertError ? `insert error: ${insertError.code ?? "codeなし"} ${insertError.message ?? ""} ${insertError.details ?? ""}` : "",
    serviceRoleError ? `service role error: ${serviceRoleError.code ?? "codeなし"} ${serviceRoleError.message ?? ""} ${serviceRoleError.details ?? ""}` : ""
  ].filter(Boolean);

  return `${result.message ?? "保存できませんでした。"}\n${details.join("\n")}`;
}

function getEntryStatusLabel(entry: AdminEntry) {
  if (entry.status === "cancelled") return "キャンセル";
  if (entry.status === "confirmed" || entry.linkingStatus === "linked") return "紐づけ完了";
  return "待機中";
}

function getEntryStatusClass(entry: AdminEntry) {
  if (entry.status === "cancelled") return "bg-slate-100 text-slate-600";
  if (entry.status === "confirmed" || entry.linkingStatus === "linked") return "bg-palm-100 text-palm-700";
  return "bg-coral-100 text-coral-700";
}

function getPaymentMethodLabel(method: PaymentMethod) {
  return method === "paypay" ? "PayPay" : "現金";
}

function getTournamentStatusLabel(status: TournamentStatus) {
  if (status === "draft") return "未公開";
  if (status === "open") return "公開";
  if (status === "closed") return "受付終了";
  return "終了";
}

function isTournamentPublished(status: TournamentStatus) {
  return status !== "draft";
}

function formatDateTime(value: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ja-JP");
}

function formatDate(value: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("ja-JP");
}

function toCsvCell(value: unknown) {
  const stringValue = value === null || value === undefined ? "" : String(value);
  return `"${stringValue.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: unknown[][]) {
  const csv = rows.map((row) => row.map(toCsvCell).join(",")).join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getYearFromDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : String(date.getFullYear());
}

export default function AdminDashboard() {
  const [adminMembers, setAdminMembers] = useState<AdminMember[]>([]);
  const [adminTournaments, setAdminTournaments] = useState<AdminTournament[]>([]);
  const [adminEntries, setAdminEntries] = useState<AdminEntry[]>([]);
  const [adminMembersLoading, setAdminMembersLoading] = useState(true);
  const [adminTournamentsLoading, setAdminTournamentsLoading] = useState(true);
  const [adminEntriesLoading, setAdminEntriesLoading] = useState(true);
  const [adminMembersError, setAdminMembersError] = useState("");
  const [adminTournamentsError, setAdminTournamentsError] = useState("");
  const [adminEntriesError, setAdminEntriesError] = useState("");
  const [selectedTournamentYear, setSelectedTournamentYear] = useState(String(new Date().getFullYear()));
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [savingAction, setSavingAction] = useState<string | null>(null);
  const [savedTournamentId, setSavedTournamentId] = useState<string | null>(null);

  const loadAdminTournaments = useCallback(async () => {
    setAdminTournamentsLoading(true);
    setAdminTournamentsError("");

    try {
      const response = await fetch("/api/admin/tournaments", { cache: "no-store" });
      const result = (await response.json()) as AdminTournamentsResult;

      if (!response.ok || !result.ok) {
        throw new Error(result.message ?? "大会一覧を取得できませんでした。");
      }

      setAdminTournaments(result.tournaments ?? []);
    } catch (error) {
      setAdminTournaments([]);
      setAdminTournamentsError(error instanceof Error ? error.message : "大会一覧を取得できませんでした。");
    } finally {
      setAdminTournamentsLoading(false);
    }
  }, []);

  const tournamentYears = useMemo(() => {
    const years = new Set<string>([String(new Date().getFullYear())]);

    adminTournaments.forEach((tournament) => {
      const year = getYearFromDate(tournament.startAt);
      if (year) years.add(year);
    });

    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [adminTournaments]);

  const filteredAdminTournaments = useMemo(() => {
    if (selectedTournamentYear === "all") return adminTournaments;
    return adminTournaments.filter((tournament) => getYearFromDate(tournament.startAt) === selectedTournamentYear);
  }, [adminTournaments, selectedTournamentYear]);

  useEffect(() => {
    let active = true;

    async function loadMembers() {
      setAdminMembersLoading(true);
      setAdminMembersError("");

      try {
        const response = await fetch("/api/admin/members", { cache: "no-store" });
        const result = (await response.json()) as AdminMembersResult;

        if (!response.ok || !result.ok) {
          throw new Error(result.message ?? "会員一覧を取得できませんでした。");
        }

        if (active) {
          setAdminMembers(result.members ?? []);
        }
      } catch (error) {
        if (active) {
          setAdminMembers([]);
          setAdminMembersError(error instanceof Error ? error.message : "会員一覧を取得できませんでした。");
        }
      } finally {
        if (active) {
          setAdminMembersLoading(false);
        }
      }
    }

    async function loadEntries() {
      setAdminEntriesLoading(true);
      setAdminEntriesError("");

      try {
        const response = await fetch("/api/admin/tournament-entries", { cache: "no-store" });
        const result = (await response.json()) as AdminEntriesResult;

        if (!response.ok || !result.ok) {
          throw new Error(result.message ?? "大会参加者一覧を取得できませんでした。");
        }

        if (active) {
          setAdminEntries(result.entries ?? []);
        }
      } catch (error) {
        if (active) {
          setAdminEntries([]);
          setAdminEntriesError(error instanceof Error ? error.message : "大会参加者一覧を取得できませんでした。");
        }
      } finally {
        if (active) {
          setAdminEntriesLoading(false);
        }
      }
    }

    loadMembers();
    loadAdminTournaments();
    loadEntries();

    return () => {
      active = false;
    };
  }, [loadAdminTournaments]);

  async function postAdminForm(endpoint: string, payload: Record<string, unknown>, fallbackMessage: string) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const result = (await response.json()) as AdminApiResult;

      if (!response.ok || !result.ok) {
        throw new Error(formatAdminApiError(result));
      }

      setMessageTone("success");
      setMessage(result.message ?? fallbackMessage);
      return result;
    } catch (error) {
      console.error("Admin form save failed", {
        endpoint,
        error,
        payload
      });
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "保存中にエラーが発生しました。");
      return null;
    }
  }

  async function handleTournamentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    console.log("tournament save clicked");
    setMessageTone("success");
    setMessage("保存処理を開始しました");
    setSavedTournamentId(null);

    const formData = new FormData(event.currentTarget);
    const title = String(formData.get("title") ?? "").trim();
    const venue = String(formData.get("venue") ?? "").trim();
    const startAt = String(formData.get("startAt") ?? "").trim();
    const entryDeadline = String(formData.get("entryDeadline") ?? "").trim();
    const memberFeeYenText = String(formData.get("memberFeeYen") ?? "").trim();
    const guestFeeYenText = String(formData.get("guestFeeYen") ?? "").trim();
    const defaultCapacityText = String(formData.get("defaultCapacity") ?? "").trim();
    const status = String(formData.get("status") ?? "open") === "draft" ? "draft" : "open";
    const description = String(formData.get("description") ?? "").trim();
    const missingFields = [
      !title ? "大会名" : "",
      !venue ? "会場" : "",
      !startAt ? "開催日時" : "",
      !entryDeadline ? "申込締切" : "",
      !memberFeeYenText ? "一般会員参加料" : "",
      !guestFeeYenText ? "プレミアム会員参加料" : "",
      !defaultCapacityText ? "未入力時の定員" : "",
      !description ? "説明" : ""
    ].filter(Boolean);

    if (missingFields.length > 0) {
      setMessageTone("error");
      setMessage(`不足している項目があります: ${missingFields.join("、")}`);
      return;
    }

    const categoryConfig: TournamentCategoryConfig = {
      doubles: {
        divisions: formData.getAll("doublesDivisions").map(String),
        classes: formData.getAll("doublesClasses").map(String)
      },
      team: {
        enabled: formData.get("teamEnabled") === "on",
        ageCategories: formData.getAll("teamAgeCategories").map(String)
      }
    };
    const categories = buildTournamentCategories(categoryConfig);

    if (categories.length === 0) {
      setMessageTone("error");
      setMessage("不足している項目があります: 大会カテゴリ");
      return;
    }

    const defaultCapacity = Number(defaultCapacityText) || 16;
    const categoryCapacities = buildCategoryCapacities(
      categories,
      Object.fromEntries(categories.map((category) => [category, formData.get(capacityInputName(category))])),
      defaultCapacity
    );
    const memberFeeYen = Number(memberFeeYenText);
    const guestFeeYen = Number(guestFeeYenText);
    categoryConfig.categoryCapacities = categoryCapacities;
    categoryConfig.fees = {
      member: memberFeeYen,
      guest: guestFeeYen
    };
    const payload = {
      title,
      description,
      venue,
      start_at: startAt,
      entry_deadline: entryDeadline,
      fee_yen: memberFeeYen,
      member_fee_yen: memberFeeYen,
      guest_fee_yen: guestFeeYen,
      capacity: sumCategoryCapacities(categoryCapacities),
      categories,
      category_capacities: categoryCapacities,
      category_config: categoryConfig,
      status
    };

    setSavingAction("tournament");
    console.log("fetch /api/admin/tournaments");
    const saved = await postAdminForm("/api/admin/tournaments", payload, "大会を保存しました");
    setSavingAction(null);

    if (saved) {
      setSavedTournamentId(saved.id ?? null);
      await loadAdminTournaments();
      event.currentTarget.reset();
    }
  }

  async function handleNoticeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      title: String(formData.get("title")),
      body: String(formData.get("body")),
      type: String(formData.get("type")),
      is_published: true
    };

    await postAdminForm("/api/admin/notices", payload, "お知らせを投稿しました。");
  }

  async function handleSponsorSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      company_name: String(formData.get("companyName")),
      description: String(formData.get("description")),
      website_url: String(formData.get("websiteUrl")),
      logo_url: String(formData.get("logoUrl")),
      rank: String(formData.get("rank")),
      is_active: true
    };

    await postAdminForm("/api/admin/sponsors", payload, "協賛企業を登録しました。");
  }

  function handleResultSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("試合結果とOPRポイントの入力内容を受け付けました。Supabase接続後はmatch_resultsとopr_pointsへ保存します。");
  }

  function handleMembersExport() {
    downloadCsv("members.csv", [
      ["会員ID", "氏名", "ふりがな", "会員種別", "性別", "生年月日", "居住地", "電話", "メール", "権限"],
      ...adminMembers.map((member) => [
        member.memberId,
        member.fullName,
        member.furigana,
        getMembershipLabel(member.membershipType),
        member.gender,
        member.birthDate,
        formatResidence(member.residenceScope, member.municipality),
        member.phone,
        member.email,
        member.role
      ])
    ]);
  }

  function handleTournamentEntriesExport() {
    downloadCsv("tournament-entries.csv", [
      [
        "大会名",
        "開催日",
        "申込者名",
        "会員ID",
        "会員種別",
        "カテゴリ",
        "エントリー種別",
        "ペア名",
        "ペア会員ID",
        "チーム名",
        "状態",
        "支払い方法",
        "参加費",
        "メール",
        "電話",
        "登録日時"
      ],
      ...adminEntries.map((entry) => [
        entry.tournamentTitle,
        formatDate(entry.tournamentStartAt),
        entry.applicantName,
        entry.applicantMemberId,
        entry.applicantType === "guest" ? "非会員" : getMembershipLabel(entry.applicantMembershipType),
        entry.category,
        entry.entryType === "team" ? "チーム戦" : "ダブルス",
        entry.partnerName,
        entry.partnerMemberId,
        entry.teamName,
        getEntryStatusLabel(entry),
        getPaymentMethodLabel(entry.paymentMethod),
        entry.entryFeeYen,
        entry.applicantEmail,
        entry.applicantPhone,
        formatDateTime(entry.createdAt)
      ])
    ]);
  }

  function handleTournamentsExport() {
    downloadCsv(`tournaments-${selectedTournamentYear}.csv`, [
      ["年度", "大会名", "公開", "未公開", "状態", "会場", "開催日時", "申込締切", "一般会員参加料", "プレミアム会員参加料", "定員", "カテゴリ"],
      ...filteredAdminTournaments.map((tournament) => [
        getYearFromDate(tournament.startAt),
        tournament.title,
        isTournamentPublished(tournament.status) ? "✓" : "",
        !isTournamentPublished(tournament.status) ? "✓" : "",
        getTournamentStatusLabel(tournament.status),
        tournament.venue,
        formatDateTime(tournament.startAt),
        formatDateTime(tournament.entryDeadline),
        tournament.memberFeeYen,
        tournament.guestFeeYen,
        tournament.capacity,
        tournament.categories.join(" / ")
      ])
    ]);
  }

  return (
    <PageShell
      eyebrow="Admin"
      title="管理者画面"
      description="会員一覧、大会作成、参加者一覧、試合結果入力、OPR付与、お知らせ投稿、協賛企業情報登録を行います。"
    >
      <div className="mb-5 flex items-center gap-3 rounded-lg bg-ink p-4 text-white shadow-soft">
        <Shield className="size-6 text-coral-500" aria-hidden="true" />
        <p className="text-sm font-bold leading-6">
          管理者は {singleAdminEmail} の1名のみです。大会作成、お知らせ投稿、協賛企業登録は管理者専用APIから保存します。
        </p>
      </div>

      <nav className="mb-6 flex gap-2 overflow-x-auto rounded-lg border border-ocean-100 bg-white p-2 shadow-soft" aria-label="管理メニュー">
        {adminSections.map((section) => {
          const Icon = section.icon;
          return (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="focus-ring flex shrink-0 items-center gap-2 rounded-md bg-ocean-50 px-4 py-3 text-sm font-black text-ink hover:bg-ocean-100"
            >
              <Icon className="size-4" aria-hidden="true" />
              {section.label}
            </a>
          );
        })}
      </nav>

      {message ? (
        <div
          className={`mb-5 rounded-md px-4 py-3 text-sm font-bold ${
            messageTone === "success" ? "bg-palm-100 text-palm-700" : "bg-coral-100 text-coral-700"
          }`}
        >
          {message.split("\n").map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
          {messageTone === "success" && savedTournamentId ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Link className="rounded-md bg-white px-3 py-2 text-xs font-black text-ink shadow-sm hover:bg-ocean-50" href="/tournaments">
                大会一覧で確認
              </Link>
              <Link className="rounded-md bg-white px-3 py-2 text-xs font-black text-ink shadow-sm hover:bg-ocean-50" href={`/tournaments/${savedTournamentId}`}>
                詳細ページを開く
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-6">
        <section id="members" className="scroll-mt-28 rounded-lg border border-ocean-100 bg-white p-5 shadow-soft sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-black">会員一覧</h2>
            <ExportButton disabled={adminMembersLoading || adminMembers.length === 0} label="会員一覧CSV" onClick={handleMembersExport} />
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-ocean-50 text-xs uppercase tracking-[0.16em] text-ocean-700">
                <tr>
                  <th className="px-4 py-3">会員ID</th>
                  <th className="px-4 py-3">氏名</th>
                  <th className="px-4 py-3">会員種別</th>
                  <th className="px-4 py-3">居住地</th>
                  <th className="px-4 py-3">電話</th>
                  <th className="px-4 py-3">メール</th>
                  <th className="px-4 py-3">権限</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ocean-50">
                {adminMembersLoading ? (
                  <tr>
                    <td className="px-4 py-5 font-bold text-slate-600" colSpan={7}>
                      会員一覧を読み込み中です。
                    </td>
                  </tr>
                ) : adminMembersError ? (
                  <tr>
                    <td className="px-4 py-5 font-bold text-coral-700" colSpan={7}>
                      {adminMembersError}
                    </td>
                  </tr>
                ) : adminMembers.length === 0 ? (
                  <tr>
                    <td className="px-4 py-5 font-bold text-slate-600" colSpan={7}>
                      登録済み会員はまだありません。
                    </td>
                  </tr>
                ) : adminMembers.map((member) => (
                  <tr key={member.memberId}>
                    <td className="px-4 py-4 font-bold text-slate-600">{member.memberId}</td>
                    <td className="px-4 py-4 font-black text-ink">{member.fullName}</td>
                    <td className="px-4 py-4">{getMembershipLabel(member.membershipType)}</td>
                    <td className="px-4 py-4">{formatResidence(member.residenceScope, member.municipality)}</td>
                    <td className="px-4 py-4">{member.phone || "-"}</td>
                    <td className="px-4 py-4">{member.email}</td>
                    <td className="px-4 py-4">{member.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="tournament-list" className="scroll-mt-28 rounded-lg border border-ocean-100 bg-white p-5 shadow-soft sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black">大会一覧</h2>
              <p className="mt-1 text-sm font-bold text-slate-600">年度ごとに大会を確認し、公開・未公開の状態も見られます。</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                年度
                <select
                  value={selectedTournamentYear}
                  onChange={(event) => setSelectedTournamentYear(event.target.value)}
                  className="focus-ring rounded-md border border-ocean-100 px-3 py-2"
                >
                  <option value="all">すべて</option>
                  {tournamentYears.map((year) => (
                    <option key={year} value={year}>
                      {year}年
                    </option>
                  ))}
                </select>
              </label>
              <ExportButton
                disabled={adminTournamentsLoading || filteredAdminTournaments.length === 0}
                label="大会一覧CSV"
                onClick={handleTournamentsExport}
              />
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-ocean-50 text-xs uppercase tracking-[0.16em] text-ocean-700">
                <tr>
                  <th className="px-4 py-3">年度</th>
                  <th className="px-4 py-3">大会名</th>
                  <th className="px-4 py-3">公開</th>
                  <th className="px-4 py-3">未公開</th>
                  <th className="px-4 py-3">状態</th>
                  <th className="px-4 py-3">開催日時</th>
                  <th className="px-4 py-3">会場</th>
                  <th className="px-4 py-3">一般会員</th>
                  <th className="px-4 py-3">プレミアム会員</th>
                  <th className="px-4 py-3">定員</th>
                  <th className="px-4 py-3">カテゴリ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ocean-50">
                {adminTournamentsLoading ? (
                  <tr>
                    <td className="px-4 py-5 font-bold text-slate-600" colSpan={11}>
                      大会一覧を読み込み中です。
                    </td>
                  </tr>
                ) : adminTournamentsError ? (
                  <tr>
                    <td className="px-4 py-5 font-bold text-coral-700" colSpan={11}>
                      {adminTournamentsError}
                    </td>
                  </tr>
                ) : filteredAdminTournaments.length === 0 ? (
                  <tr>
                    <td className="px-4 py-5 font-bold text-slate-600" colSpan={11}>
                      選択した年度の大会はまだありません。
                    </td>
                  </tr>
                ) : (
                  filteredAdminTournaments.map((tournament) => (
                    <tr key={tournament.id}>
                      <td className="px-4 py-4 font-bold text-slate-600">{getYearFromDate(tournament.startAt)}</td>
                      <td className="px-4 py-4 font-black text-ink">
                        <Link href={`/tournaments/${tournament.id}`} className="hover:text-ocean-700">
                          {tournament.title}
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-lg font-black text-palm-700">{isTournamentPublished(tournament.status) ? "✓" : ""}</td>
                      <td className="px-4 py-4 text-lg font-black text-coral-700">{!isTournamentPublished(tournament.status) ? "✓" : ""}</td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${isTournamentPublished(tournament.status) ? "bg-palm-100 text-palm-700" : "bg-coral-100 text-coral-700"}`}>
                          {getTournamentStatusLabel(tournament.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4">{formatDateTime(tournament.startAt)}</td>
                      <td className="px-4 py-4">{tournament.venue}</td>
                      <td className="px-4 py-4">{tournament.memberFeeYen.toLocaleString("ja-JP")}円</td>
                      <td className="px-4 py-4">{tournament.guestFeeYen.toLocaleString("ja-JP")}円</td>
                      <td className="px-4 py-4">{tournament.capacity}名</td>
                      <td className="px-4 py-4">{tournament.categories.join(" / ") || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section id="tournaments" className="scroll-mt-28 rounded-lg border border-ocean-100 bg-white p-5 shadow-soft sm:p-6">
          <form noValidate onSubmit={handleTournamentSubmit}>
            <h2 className="text-2xl font-black">大会作成</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <AdminInput name="title" label="大会名" placeholder="沖縄オープン 2026" required />
              <AdminInput name="venue" label="会場" placeholder="沖縄県総合運動公園" required />
              <AdminInput name="startAt" label="開催日時" type="datetime-local" required />
              <AdminInput name="entryDeadline" label="申込締切" type="datetime-local" required />
              <AdminInput name="memberFeeYen" label="一般会員参加料" type="number" placeholder="3000" required />
              <AdminInput name="guestFeeYen" label="プレミアム会員参加料" type="number" placeholder="2000" required />
              <AdminInput name="defaultCapacity" label="未入力時の定員" type="number" placeholder="16" required />
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                公開状態
                <select name="status" defaultValue="open" className="focus-ring rounded-md border border-ocean-100 px-3 py-3">
                  <option value="open">公開</option>
                  <option value="draft">未公開</option>
                </select>
              </label>
              <fieldset className="rounded-md border border-ocean-100 p-4 sm:col-span-2">
                <legend className="px-2 text-sm font-black text-ink">ダブルス種目</legend>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <CheckboxGroup name="doublesDivisions" title="選択枠" options={doublesDivisions} defaultChecked />
                  <CheckboxGroup name="doublesClasses" title="カテゴリ" options={doublesClasses} defaultChecked />
                </div>
              </fieldset>
              <fieldset className="rounded-md border border-ocean-100 p-4 sm:col-span-2">
                <legend className="px-2 text-sm font-black text-ink">チーム戦</legend>
                <label className="mt-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                  <input name="teamEnabled" type="checkbox" defaultChecked className="size-4 accent-ocean-500" />
                  チーム戦を実施する
                </label>
                <div className="mt-3">
                  <CheckboxGroup name="teamAgeCategories" title="カテゴリ" options={teamAgeCategories} defaultChecked />
                </div>
              </fieldset>
              <fieldset className="rounded-md border border-ocean-100 p-4 sm:col-span-2">
                <legend className="px-2 text-sm font-black text-ink">各種目の定員</legend>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
                  選択した種目だけ保存します。未入力の場合は「未入力時の定員」を使います。
                </p>
                <CategoryCapacityInputs />
              </fieldset>
              <label className="grid gap-2 text-sm font-bold text-slate-700 sm:col-span-2">
                説明
                <textarea required name="description" rows={4} className="focus-ring rounded-md border border-ocean-100 px-3 py-3" placeholder="大会概要、対象者、持ち物など" />
              </label>
            </div>
            <SaveButton label="大会を保存" loading={savingAction === "tournament"} />
          </form>
        </section>

        <section id="entries" className="scroll-mt-28 rounded-lg border border-ocean-100 bg-white p-5 shadow-soft sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-black">大会参加者一覧</h2>
            <ExportButton disabled={adminEntriesLoading || adminEntries.length === 0} label="参加者CSV" onClick={handleTournamentEntriesExport} />
          </div>
          <div className="mt-5 grid gap-4">
            {adminEntriesLoading ? (
              <p className="rounded-md bg-ocean-50 p-4 text-sm font-bold text-slate-600">大会参加者一覧を読み込み中です。</p>
            ) : adminEntriesError ? (
              <p className="rounded-md bg-coral-100 p-4 text-sm font-bold leading-6 text-coral-700">{adminEntriesError}</p>
            ) : adminEntries.length === 0 ? (
              <p className="rounded-md bg-ocean-50 p-4 text-sm font-bold text-slate-600">大会参加者はまだ登録されていません。</p>
            ) : adminEntries.map((entry) => (
              <article key={entry.id} className="rounded-md bg-ocean-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-ink">{entry.applicantName || "氏名未登録"}</p>
                    <p className="mt-1 text-sm text-slate-600">{entry.applicantMemberId || "会員IDなし"}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${getEntryStatusClass(entry)}`}>
                    {getEntryStatusLabel(entry)}
                  </span>
                </div>
                <p className="mt-3 text-sm font-black text-ink">{entry.tournamentTitle}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {entry.category}
                  {entry.teamName ? ` / ${entry.teamName}` : ""}
                </p>
                {entry.partnerName ? (
                  <p className="mt-1 text-sm text-slate-600">
                    ペア: {entry.partnerName}
                    {entry.partnerMemberId ? `（${entry.partnerMemberId}）` : ""}
                  </p>
                ) : null}
                <p className="mt-2 text-sm font-bold text-slate-600">
                  {entry.applicantType === "guest" ? "非会員" : getMembershipLabel(entry.applicantMembershipType)}
                  {entry.entryFeeYen ? ` / 参加費 ${entry.entryFeeYen.toLocaleString("ja-JP")}円` : ""}
                  {` / 支払い方法 ${getPaymentMethodLabel(entry.paymentMethod)}`}
                  {entry.tournamentStartAt ? ` / 開催日 ${new Date(entry.tournamentStartAt).toLocaleDateString("ja-JP")}` : ""}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section id="results" className="scroll-mt-28 rounded-lg border border-ocean-100 bg-white p-5 shadow-soft sm:p-6">
          <form onSubmit={handleResultSubmit}>
            <h2 className="text-2xl font-black">試合結果入力・ポイント付与</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                大会
                <select name="tournament" className="focus-ring rounded-md border border-ocean-100 px-3 py-3">
                  {tournaments.map((tournament) => (
                    <option key={tournament.id}>{tournament.title}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                ランキング種目
                <select name="oprDivision" className="focus-ring rounded-md border border-ocean-100 px-3 py-3">
                  {doublesDivisions.map((division) => (
                    <option key={division} value={division}>
                      {division}
                    </option>
                  ))}
                  <option value="overall_male">男子総合</option>
                  <option value="overall_female">女子総合</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                ランキングカテゴリ
                <select name="oprClass" className="focus-ring rounded-md border border-ocean-100 px-3 py-3">
                  {doublesClasses.map((className) => (
                    <option key={className} value={className}>
                      {className}
                    </option>
                  ))}
                </select>
              </label>
              <AdminInput name="winner" label="勝者エントリー" placeholder="チーム美ら海" required />
              <AdminInput name="score" label="スコア" placeholder="11-8, 11-7" />
              <AdminInput name="participationPoints" label="参加ポイント" type="number" placeholder="20" required />
              <AdminInput name="winPoints" label="勝利ポイント" type="number" placeholder="50" required />
              <AdminInput name="placementPoints" label="順位ポイント" type="number" placeholder="100" required />
            </div>
            <SaveButton label="結果とOPRを保存" icon={<Medal className="size-5" aria-hidden="true" />} />
          </form>
        </section>

        <section id="notices" className="scroll-mt-28 rounded-lg border border-ocean-100 bg-white p-5 shadow-soft sm:p-6">
          <form onSubmit={handleNoticeSubmit}>
            <h2 className="text-2xl font-black">お知らせ投稿</h2>
            <div className="mt-5 grid gap-4">
              <AdminInput name="title" label="タイトル" placeholder="初心者向け体験会を開催します" required />
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                種別
                <select name="type" className="focus-ring rounded-md border border-ocean-100 px-3 py-3">
                  <option value="event">イベント案内</option>
                  <option value="tournament">大会案内</option>
                  <option value="practice">練習会案内</option>
                  <option value="association">協会からのお知らせ</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                本文
                <textarea required name="body" rows={5} className="focus-ring rounded-md border border-ocean-100 px-3 py-3" />
              </label>
            </div>
            <SaveButton label="お知らせを投稿" />
          </form>
        </section>

        <section id="sponsors" className="scroll-mt-28 rounded-lg border border-ocean-100 bg-white p-5 shadow-soft sm:p-6">
          <form onSubmit={handleSponsorSubmit}>
            <h2 className="text-2xl font-black">協賛企業情報登録</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <AdminInput name="companyName" label="企業名" placeholder="琉球スポーツラボ" required />
              <AdminInput name="websiteUrl" label="リンク" type="url" placeholder="https://example.com" />
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                協賛ランク
                <select name="rank" className="focus-ring rounded-md border border-ocean-100 px-3 py-3">
                  <option value="platinum">プラチナ</option>
                  <option value="gold">ゴールド</option>
                  <option value="silver">シルバー</option>
                  <option value="bronze">ブロンズ</option>
                  <option value="supporter">サポーター</option>
                </select>
              </label>
              <AdminInput name="logoUrl" label="ロゴURL" type="url" placeholder="https://..." />
              <label className="grid gap-2 text-sm font-bold text-slate-700 sm:col-span-2">
                紹介文
                <textarea required name="description" rows={4} className="focus-ring rounded-md border border-ocean-100 px-3 py-3" />
              </label>
            </div>
            <SaveButton label="協賛企業を登録" />
          </form>
        </section>
      </div>
    </PageShell>
  );
}

function CategoryCapacityInputs() {
  const doublesCategories = doublesDivisions.flatMap((division) =>
    doublesClasses.map((className) => `${division} / ${className}`)
  );
  const teamCategories = teamAgeCategories.map((category) => `チーム戦 / ${category}`);

  return (
    <div className="mt-4 grid gap-5">
      <div>
        <p className="mb-3 text-sm font-black text-ocean-700">ダブルス</p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {doublesCategories.map((category) => (
            <label key={category} className="grid gap-2 rounded-md bg-ocean-50 p-3 text-sm font-bold text-slate-700">
              {category}
              <input
                name={capacityInputName(category)}
                type="number"
                min="1"
                defaultValue={16}
                className="focus-ring rounded-md border border-ocean-100 px-3 py-2"
              />
            </label>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-3 text-sm font-black text-ocean-700">チーム戦</p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {teamCategories.map((category) => (
            <label key={category} className="grid gap-2 rounded-md bg-palm-100 p-3 text-sm font-bold text-slate-700">
              {category}
              <input
                name={capacityInputName(category)}
                type="number"
                min="1"
                defaultValue={8}
                className="focus-ring rounded-md border border-ocean-100 px-3 py-2"
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminInput({
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

function CheckboxGroup({
  name,
  title,
  options,
  defaultChecked
}: {
  name: string;
  title: string;
  options: string[];
  defaultChecked?: boolean;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-black text-ocean-700">{title}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label key={option} className="flex items-center gap-2 rounded-md bg-ocean-50 px-3 py-2 text-sm font-bold text-slate-700">
            <input name={name} value={option} type="checkbox" defaultChecked={defaultChecked} className="size-4 accent-ocean-500" />
            {option}
          </label>
        ))}
      </div>
    </div>
  );
}

function SaveButton({ label, icon, loading }: { label: string; icon?: React.ReactNode; loading?: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="focus-ring mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink px-5 py-3 font-black text-white transition hover:bg-ocean-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : icon ?? <Save className="size-5" aria-hidden="true" />}
      {loading ? "保存中..." : label}
    </button>
  );
}

function ExportButton({ disabled, label, onClick }: { disabled?: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="focus-ring inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-palm-100 px-4 py-3 text-sm font-black text-palm-700 transition hover:bg-palm-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Download className="size-4" aria-hidden="true" />
      {label}
    </button>
  );
}
