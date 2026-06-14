"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarCheck, Loader2, Save, Trophy, UserRound } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { QrCodeCard } from "@/components/QrCodeCard";
import { StatCard } from "@/components/StatCard";
import { getMembershipLabel } from "@/lib/member";
import { mockMember } from "@/lib/mock-data";
import { formatResidence, municipalityToArea, okinawaMunicipalities, residenceScopeLabels } from "@/lib/okinawa";
import type { Gender, MemberProfile, ResidenceScope } from "@/types/domain";

type MeResult = {
  message?: string;
  ok?: boolean;
  profile?: Partial<MemberProfile>;
};

type EntryStatus = {
  category: string;
  createdAt: string;
  entryType: "doubles" | "team";
  id: string;
  linkingStatus: "waiting" | "linked";
  partnerMemberId: string | null;
  partnerName: string | null;
  status: "pending" | "confirmed" | "cancelled";
  teamName: string | null;
  tournamentId: string;
  tournamentStartAt: string | null;
  tournamentTitle: string;
};

type EntriesResult = {
  entries?: EntryStatus[];
  message?: string;
  ok?: boolean;
};

type ProfileFormState = {
  birthDate: string;
  email: string;
  fullName: string;
  furigana: string;
  gender: Gender;
  municipality: string;
  phone: string;
  residenceScope: ResidenceScope;
};

const genderOptions: { label: string; value: Gender }[] = [
  { value: "male", label: "男性" },
  { value: "female", label: "女性" },
  { value: "other", label: "その他" },
  { value: "no_answer", label: "回答しない" }
];

function buildProfileFormState(member: MemberProfile): ProfileFormState {
  return {
    birthDate: member.birthDate ?? "",
    email: member.email ?? "",
    fullName: member.fullName ?? "",
    furigana: member.furigana ?? "",
    gender: member.gender ?? "no_answer",
    municipality: member.municipality ?? okinawaMunicipalities[0],
    phone: member.phone ?? "",
    residenceScope: member.residenceScope ?? "okinawa"
  };
}

function getEntryStatusLabel(entry: EntryStatus) {
  if (entry.status === "cancelled") return "キャンセル";
  if (entry.status === "confirmed" || entry.linkingStatus === "linked") return "紐づけ完了";
  return "待機中";
}

function getEntryStatusClass(entry: EntryStatus) {
  if (entry.status === "cancelled") return "bg-slate-100 text-slate-600";
  if (entry.status === "confirmed" || entry.linkingStatus === "linked") return "bg-palm-100 text-palm-700";
  return "bg-coral-100 text-coral-700";
}

export default function MyPage() {
  const [member, setMember] = useState<MemberProfile>(mockMember);
  const [formValues, setFormValues] = useState<ProfileFormState>(() => buildProfileFormState(mockMember));
  const [entries, setEntries] = useState<EntryStatus[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [entriesError, setEntriesError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveTone, setSaveTone] = useState<"success" | "error">("success");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const result = (await response.json()) as MeResult;

        if (active && response.ok && result.ok && result.profile) {
          const nextMember = { ...mockMember, ...result.profile };
          setMember(nextMember);
          setFormValues(buildProfileFormState(nextMember));
          return;
        }
      } catch {
        const stored = window.localStorage.getItem("opba-demo-member");
        if (active && stored) {
          const nextMember = { ...mockMember, ...(JSON.parse(stored) as Partial<MemberProfile>) };
          setMember(nextMember);
          setFormValues(buildProfileFormState(nextMember));
        }
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadEntries() {
      setEntriesLoading(true);
      setEntriesError("");

      try {
        const response = await fetch("/api/my/tournament-entries", { cache: "no-store" });
        const result = (await response.json()) as EntriesResult;

        if (!response.ok || !result.ok) {
          throw new Error(result.message ?? "大会エントリー状況を取得できませんでした。");
        }

        if (active) {
          setEntries(result.entries ?? []);
        }
      } catch (error) {
        if (active) {
          setEntries([]);
          setEntriesError(error instanceof Error ? error.message : "大会エントリー状況を取得できませんでした。");
        }
      } finally {
        if (active) {
          setEntriesLoading(false);
        }
      }
    }

    loadEntries();

    return () => {
      active = false;
    };
  }, []);

  function updateFormValue<Key extends keyof ProfileFormState>(key: Key, value: ProfileFormState[Key]) {
    setFormValues((current) => ({
      ...current,
      [key]: value
    }));
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaveMessage("");
    setSaveTone("success");

    const selectedMunicipality = formValues.residenceScope === "okinawa" ? formValues.municipality : "";

    try {
      const response = await fetch("/api/auth/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...formValues,
          area: formValues.residenceScope === "okinawa" ? municipalityToArea(selectedMunicipality) : "other",
          municipality: selectedMunicipality
        })
      });
      const result = (await response.json()) as MeResult;

      if (!response.ok || !result.ok || !result.profile) {
        throw new Error(result.message ?? "会員情報を保存できませんでした。");
      }

      const nextMember = { ...member, ...result.profile };
      setMember(nextMember);
      setFormValues(buildProfileFormState(nextMember));
      setSaveTone("success");
      setSaveMessage("会員情報を保存しました。");
    } catch (error) {
      setSaveTone("error");
      setSaveMessage(error instanceof Error ? error.message : "会員情報の保存中にエラーが発生しました。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell
      eyebrow="Member Card"
      title="会員証"
      description="QRコード会員証、会員情報の確認・編集、大会エントリー状況を確認できます。"
    >
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-5">
          <QrCodeCard member={member} />
          <section className="rounded-lg border border-ocean-100 bg-white p-5 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">会員情報</h2>
                <p className="mt-1 text-sm font-bold text-slate-500">会員IDと会員種別は表示専用です。</p>
              </div>
              <span className="rounded-full bg-palm-100 px-3 py-1 text-xs font-black text-palm-700">
                {getMembershipLabel(member.membershipType)}
              </span>
            </div>

            <div className="mt-4 grid gap-3 rounded-md bg-ocean-50 p-4 text-sm sm:grid-cols-2">
              <InfoItem label="会員ID" value={member.memberId} />
              <InfoItem label="居住地" value={formatResidence(member.residenceScope, member.municipality)} />
            </div>

            <form onSubmit={handleProfileSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
              <EditableInput label="氏名" value={formValues.fullName} onChange={(value) => updateFormValue("fullName", value)} required />
              <EditableInput label="ふりがな" value={formValues.furigana} onChange={(value) => updateFormValue("furigana", value)} required />
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                性別
                <select
                  value={formValues.gender}
                  onChange={(event) => updateFormValue("gender", event.target.value as Gender)}
                  className="focus-ring rounded-md border border-ocean-100 px-3 py-3"
                >
                  {genderOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <EditableInput label="生年月日" type="date" value={formValues.birthDate} onChange={(value) => updateFormValue("birthDate", value)} />
              <EditableInput label="電話番号" type="tel" value={formValues.phone} onChange={(value) => updateFormValue("phone", value)} />
              <EditableInput label="メールアドレス" type="email" value={formValues.email} onChange={(value) => updateFormValue("email", value)} required />
              <div className="grid gap-2 text-sm font-bold text-slate-700">
                居住地
                <div className="grid grid-cols-2 gap-2 rounded-md bg-ocean-50 p-1">
                  {(["okinawa", "outside"] as ResidenceScope[]).map((scope) => (
                    <button
                      key={scope}
                      type="button"
                      onClick={() => {
                        updateFormValue("residenceScope", scope);
                        updateFormValue("municipality", scope === "okinawa" ? formValues.municipality || okinawaMunicipalities[0] : "");
                      }}
                      className={`focus-ring rounded-md px-3 py-3 text-sm font-black ${
                        formValues.residenceScope === scope ? "bg-white text-ink shadow" : "text-slate-600"
                      }`}
                    >
                      {residenceScopeLabels[scope]}
                    </button>
                  ))}
                </div>
              </div>
              {formValues.residenceScope === "okinawa" ? (
                <label className="grid gap-2 text-sm font-bold text-slate-700">
                  市町村
                  <select
                    value={formValues.municipality || okinawaMunicipalities[0]}
                    onChange={(event) => updateFormValue("municipality", event.target.value)}
                    className="focus-ring rounded-md border border-ocean-100 px-3 py-3"
                  >
                    {okinawaMunicipalities.map((municipalityName) => (
                      <option key={municipalityName} value={municipalityName}>
                        {municipalityName}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="rounded-md bg-ocean-50 p-4 text-sm font-bold leading-6 text-slate-600">
                  沖縄県外の方は市町村なしで保存します。
                </div>
              )}

              {saveMessage ? (
                <p
                  className={`rounded-md px-4 py-3 text-sm font-bold sm:col-span-2 ${
                    saveTone === "success" ? "bg-palm-100 text-palm-700" : "bg-coral-100 text-coral-700"
                  }`}
                >
                  {saveMessage}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={saving}
                className="focus-ring inline-flex items-center justify-center gap-2 rounded-md bg-ink px-5 py-3 font-black text-white transition hover:bg-ocean-700 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
              >
                {saving ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <Save className="size-5" aria-hidden="true" />}
                {saving ? "保存中..." : "会員情報を保存"}
              </button>
            </form>
          </section>
        </div>

        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="OPR" value={String(member.opr)} note="年間ランキング対象ポイント" icon={<Trophy className="size-5" aria-hidden="true" />} />
            <StatCard label="Rank" value={member.ranking ? `${member.ranking}位` : "-"} note="総合ランキング順位" icon={<UserRound className="size-5" aria-hidden="true" />} />
            <StatCard label="Entries" value={String(entries.length)} note="現在の大会エントリー" icon={<CalendarCheck className="size-5" aria-hidden="true" />} />
          </div>

          <section className="rounded-lg border border-ocean-100 bg-white p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-xl font-black">大会エントリー状況</h2>
              <Link href="/tournaments" className="text-sm font-black text-ocean-700">
                大会一覧
              </Link>
            </div>

            {entriesLoading ? (
              <p className="rounded-md bg-ocean-50 p-4 text-sm font-bold text-slate-600">大会エントリー状況を確認しています。</p>
            ) : entriesError ? (
              <p className="rounded-md bg-coral-100 p-4 text-sm font-bold leading-6 text-coral-700">{entriesError}</p>
            ) : entries.length === 0 ? (
              <p className="rounded-md bg-ocean-50 p-4 text-sm font-bold text-slate-600">
                現在エントリーしている大会はございません。
              </p>
            ) : (
              <div className="space-y-3">
                {entries.map((entry) => (
                  <article key={entry.id} className="rounded-md bg-ocean-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-ink">{entry.tournamentTitle}</p>
                        <p className="mt-1 text-sm font-bold text-slate-600">{entry.category}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${getEntryStatusClass(entry)}`}>
                        {getEntryStatusLabel(entry)}
                      </span>
                    </div>
                    {entry.teamName ? <p className="mt-2 text-sm text-slate-600">チーム名: {entry.teamName}</p> : null}
                    {entry.partnerName ? (
                      <p className="mt-2 text-sm text-slate-600">
                        ペア: {entry.partnerName}
                        {entry.partnerMemberId ? `（${entry.partnerMemberId}）` : ""}
                      </p>
                    ) : null}
                    {entry.tournamentStartAt ? (
                      <p className="mt-2 text-xs font-bold text-ocean-700">
                        開催日: {new Date(entry.tournamentStartAt).toLocaleDateString("ja-JP")}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-ocean-100 bg-white p-5 shadow-soft">
            <h2 className="text-xl font-black">OPRポイント内訳</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                ["参加", 120],
                ["勝利", 780],
                ["順位", 360]
              ].map(([label, value]) => (
                <div key={label} className="rounded-md bg-palm-100 p-4">
                  <p className="text-sm font-bold text-palm-700">{label}ポイント</p>
                  <p className="mt-1 text-2xl font-black text-ink">{value}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </PageShell>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-bold text-slate-500">{label}</p>
      <p className="mt-1 font-black text-ink">{value}</p>
    </div>
  );
}

function EditableInput({
  label,
  onChange,
  required,
  type = "text",
  value
}: {
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="focus-ring rounded-md border border-ocean-100 px-3 py-3"
      />
    </label>
  );
}
