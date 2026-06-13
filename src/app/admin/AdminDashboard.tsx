"use client";

import { FormEvent, useState } from "react";
import { Bell, Building2, CalendarPlus, ClipboardList, Medal, Save, Shield, Trophy, Users } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { singleAdminEmail } from "@/lib/admin";
import { entries, mockMember, tournaments } from "@/lib/mock-data";
import { formatResidence } from "@/lib/okinawa";
import {
  buildCategoryCapacities,
  buildTournamentCategories,
  doublesClasses,
  doublesDivisions,
  sumCategoryCapacities,
  teamAgeCategories
} from "@/lib/tournament-categories";
import type { TournamentCategoryConfig } from "@/types/domain";

const adminSections = [
  { id: "members", label: "会員", icon: Users },
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
  id?: string;
  message?: string;
  ok?: boolean;
};

export default function AdminDashboard() {
  const [message, setMessage] = useState("");

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
        throw new Error(result.message ?? "保存できませんでした。");
      }

      setMessage(result.message ?? fallbackMessage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存中にエラーが発生しました。");
    }
  }

  async function handleTournamentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const formData = new FormData(event.currentTarget);
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
    const defaultCapacity = Number(formData.get("defaultCapacity")) || 16;
    const categoryCapacities = buildCategoryCapacities(
      categories,
      Object.fromEntries(categories.map((category) => [category, formData.get(capacityInputName(category))])),
      defaultCapacity
    );
    const memberFeeYen = Number(formData.get("memberFeeYen"));
    const guestFeeYen = Number(formData.get("guestFeeYen"));
    categoryConfig.categoryCapacities = categoryCapacities;
    categoryConfig.fees = {
      member: memberFeeYen,
      guest: guestFeeYen
    };
    const payload = {
      title: String(formData.get("title")),
      description: String(formData.get("description")),
      venue: String(formData.get("venue")),
      start_at: String(formData.get("startAt")),
      entry_deadline: String(formData.get("entryDeadline")),
      fee_yen: memberFeeYen,
      member_fee_yen: memberFeeYen,
      guest_fee_yen: guestFeeYen,
      capacity: sumCategoryCapacities(categoryCapacities),
      categories,
      category_capacities: categoryCapacities,
      category_config: categoryConfig,
      status: "open"
    };

    await postAdminForm("/api/admin/tournaments", payload, "大会を作成しました。");
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

      {message ? <p className="mb-5 rounded-md bg-palm-100 px-4 py-3 text-sm font-bold text-palm-700">{message}</p> : null}

      <div className="space-y-6">
        <section id="members" className="scroll-mt-28 rounded-lg border border-ocean-100 bg-white p-5 shadow-soft sm:p-6">
          <h2 className="text-2xl font-black">会員一覧</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-ocean-50 text-xs uppercase tracking-[0.16em] text-ocean-700">
                <tr>
                  <th className="px-4 py-3">会員ID</th>
                  <th className="px-4 py-3">氏名</th>
                  <th className="px-4 py-3">居住地</th>
                  <th className="px-4 py-3">メール</th>
                  <th className="px-4 py-3">OPR</th>
                  <th className="px-4 py-3">権限</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ocean-50">
                {[mockMember].map((member) => (
                  <tr key={member.memberId}>
                    <td className="px-4 py-4 font-bold text-slate-600">{member.memberId}</td>
                    <td className="px-4 py-4 font-black text-ink">{member.fullName}</td>
                    <td className="px-4 py-4">{formatResidence(member.residenceScope, member.municipality)}</td>
                    <td className="px-4 py-4">{member.email}</td>
                    <td className="px-4 py-4 font-black text-palm-700">{member.opr}</td>
                    <td className="px-4 py-4">{member.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="tournaments" className="scroll-mt-28 rounded-lg border border-ocean-100 bg-white p-5 shadow-soft sm:p-6">
          <form onSubmit={handleTournamentSubmit}>
            <h2 className="text-2xl font-black">大会作成</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <AdminInput name="title" label="大会名" placeholder="沖縄オープン 2026" required />
              <AdminInput name="venue" label="会場" placeholder="沖縄県総合運動公園" required />
              <AdminInput name="startAt" label="開催日時" type="datetime-local" required />
              <AdminInput name="entryDeadline" label="申込締切" type="datetime-local" required />
              <AdminInput name="memberFeeYen" label="会員参加費" type="number" placeholder="3000" required />
              <AdminInput name="guestFeeYen" label="非会員参加費" type="number" placeholder="4000" required />
              <AdminInput name="defaultCapacity" label="未入力時の定員" type="number" placeholder="16" required />
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
            <SaveButton label="大会を保存" />
          </form>
        </section>

        <section id="entries" className="scroll-mt-28 rounded-lg border border-ocean-100 bg-white p-5 shadow-soft sm:p-6">
          <h2 className="text-2xl font-black">大会参加者一覧</h2>
          <div className="mt-5 grid gap-4">
            {entries.map((entry) => {
              const tournament = tournaments.find((item) => item.id === entry.tournamentId);
              return (
                <article key={entry.id} className="rounded-md bg-ocean-50 p-4">
                  <p className="font-black text-ink">{entry.memberName}</p>
                  <p className="mt-1 text-sm text-slate-600">{entry.memberId}</p>
                  <p className="mt-2 text-sm">{tournament?.title} / {entry.category}{entry.teamName ? ` / ${entry.teamName}` : ""}</p>
                  <p className="mt-1 text-sm font-bold text-slate-600">
                    {entry.applicantType === "guest" ? "非会員" : "会員"}
                    {entry.entryFeeYen ? ` / 参加費 ${entry.entryFeeYen.toLocaleString("ja-JP")}円` : ""}
                  </p>
                  <span className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-black text-ocean-700">
                    {entry.status} / {entry.linkingStatus === "linked" ? "紐づけ完了" : "紐づけ待ち"}
                  </span>
                </article>
              );
            })}
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

function SaveButton({ label, icon }: { label: string; icon?: React.ReactNode }) {
  return (
    <button className="focus-ring mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink px-5 py-3 font-black text-white transition hover:bg-ocean-700">
      {icon ?? <Save className="size-5" aria-hidden="true" />}
      {label}
    </button>
  );
}
