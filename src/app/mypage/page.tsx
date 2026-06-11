"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarCheck, Trophy, UserRound } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { QrCodeCard } from "@/components/QrCodeCard";
import { StatCard } from "@/components/StatCard";
import { entries, mockMember, tournaments } from "@/lib/mock-data";
import { formatResidence } from "@/lib/okinawa";
import type { MemberProfile } from "@/types/domain";

export default function MyPage() {
  const [member, setMember] = useState<MemberProfile>(mockMember);

  useEffect(() => {
    const stored = window.localStorage.getItem("opba-demo-member");
    if (stored) {
      setMember({ ...mockMember, ...(JSON.parse(stored) as Partial<MemberProfile>) });
    }
  }, []);

  const memberEntries = entries.filter((entry) => entry.memberId === member.memberId || entry.memberId === mockMember.memberId);

  return (
    <PageShell
      eyebrow="My Page"
      title="会員マイページ"
      description="会員情報、QRコード会員証、参加大会履歴、OPRポイント、ランキング順位を確認できます。"
    >
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-5">
          <QrCodeCard member={member} />
          <section className="rounded-lg border border-ocean-100 bg-white p-5 shadow-soft">
            <h2 className="text-xl font-black">会員情報</h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-bold text-slate-500">氏名</dt>
                <dd className="mt-1 font-black text-ink">{member.fullName}</dd>
              </div>
              <div>
                <dt className="font-bold text-slate-500">ふりがな</dt>
                <dd className="mt-1 font-black text-ink">{member.furigana}</dd>
              </div>
              <div>
                <dt className="font-bold text-slate-500">メール</dt>
                <dd className="mt-1 font-black text-ink">{member.email}</dd>
              </div>
              <div>
                <dt className="font-bold text-slate-500">居住地</dt>
                <dd className="mt-1 font-black text-ink">{formatResidence(member.residenceScope, member.municipality)}</dd>
              </div>
            </dl>
          </section>
        </div>

        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="OPR" value={String(member.opr)} note="年間ランキング対象ポイント" icon={<Trophy className="size-5" aria-hidden="true" />} />
            <StatCard label="Rank" value={member.ranking ? `${member.ranking}位` : "-"} note="総合ランキング順位" icon={<UserRound className="size-5" aria-hidden="true" />} />
            <StatCard label="Entries" value={String(memberEntries.length)} note="参加大会履歴" icon={<CalendarCheck className="size-5" aria-hidden="true" />} />
          </div>

          <section className="rounded-lg border border-ocean-100 bg-white p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-xl font-black">参加大会履歴</h2>
              <Link href="/tournaments" className="text-sm font-black text-ocean-700">
                大会一覧
              </Link>
            </div>
            <div className="space-y-3">
              {memberEntries.map((entry) => {
                const tournament = tournaments.find((item) => item.id === entry.tournamentId);
                return (
                  <article key={entry.id} className="rounded-md bg-ocean-50 p-4">
                    <p className="font-black text-ink">{tournament?.title ?? "大会"}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {entry.category}
                      {entry.teamName ? ` / ${entry.teamName}` : ""}
                    </p>
                    <p className="mt-2 text-xs font-bold text-ocean-700">ステータス: {entry.status}</p>
                  </article>
                );
              })}
            </div>
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
