import Image from "next/image";
import Link from "next/link";
import { Building2, CalendarDays, IdCard, Trophy, Users } from "lucide-react";
import { rankings } from "@/lib/mock-data";
import { getPublicNotices, getPublicSponsors, getPublicTournaments } from "@/lib/public-data";
import { StatCard } from "@/components/StatCard";
import { TournamentCard } from "@/components/TournamentCard";
import { RankingTable } from "@/components/RankingTable";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [tournaments, notices, sponsors] = await Promise.all([
    getPublicTournaments(),
    getPublicNotices(),
    getPublicSponsors()
  ]);
  const openTournaments = tournaments.filter((tournament) => tournament.status === "open").slice(0, 2);

  return (
    <main>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/images/okinawa-pickleball-banner.png"
            alt="沖縄の海とピックルボールをイメージしたビジュアル"
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/86 to-white/28" />
        </div>
        <div className="relative mx-auto grid min-h-[470px] max-w-7xl content-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="mb-3 text-sm font-black uppercase tracking-[0.24em] text-coral-600">Okinawa Pickleball Association</p>
            <h1 className="max-w-3xl text-4xl font-black leading-tight text-ink sm:text-5xl">
              沖縄県ピックルボール協会 公式アプリ
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-700">
              会員登録、大会エントリー、QR会員証、OPRランキング、協賛企業PRをひとつにまとめ、2030年までに県内1万人のプレイヤーを支える運営基盤を作ります。
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link className="focus-ring rounded-md bg-ink px-5 py-3 font-black text-white shadow-soft transition hover:bg-ocean-700" href="/register">
                会員登録を始める
              </Link>
              <Link className="focus-ring rounded-md bg-white px-5 py-3 font-black text-ink shadow-soft transition hover:bg-ocean-50" href="/tournaments">
                大会を見る
              </Link>
            </div>
          </div>
          <div className="grid content-end gap-3 sm:grid-cols-2 lg:pt-20">
            <div className="rounded-lg bg-white/92 p-4 shadow-soft">
              <p className="text-sm font-black text-ocean-700">MVP優先機能</p>
              <p className="mt-2 text-2xl font-black">登録、会員証、大会、OPR</p>
            </div>
            <div className="rounded-lg bg-ink p-4 text-white shadow-soft">
              <p className="text-sm font-black text-ocean-100">2030 Goal</p>
              <p className="mt-2 text-2xl font-black">県内1万人へ</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-8 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Members" value="1,240" note="県内5エリアで会員登録を一元管理" icon={<Users className="size-5" aria-hidden="true" />} />
        <StatCard label="Events" value="18" note="大会、練習会、体験会を掲載" icon={<CalendarDays className="size-5" aria-hidden="true" />} />
        <StatCard label="Ranking" value="15枠+" note="種目別カテゴリと男女総合ランキング" icon={<Trophy className="size-5" aria-hidden="true" />} />
        <StatCard label="Sponsors" value="12社" note="協賛企業のPR導線を整備" icon={<Building2 className="size-5" aria-hidden="true" />} />
      </section>

      <section className="mx-auto grid max-w-7xl gap-7 px-4 pb-12 sm:px-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-coral-600">Tournaments</p>
              <h2 className="text-2xl font-black text-ink">募集中の大会</h2>
            </div>
            <Link className="text-sm font-black text-ocean-700 hover:text-coral-600" href="/tournaments">
              すべて見る
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {openTournaments.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} />
            ))}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border border-ocean-100 bg-white p-5 shadow-soft">
            <div className="mb-4 flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-full bg-coral-100 text-coral-600">
                <IdCard className="size-5" aria-hidden="true" />
              </span>
              <h2 className="text-xl font-black">会員証の準備</h2>
            </div>
            <p className="text-sm leading-6 text-slate-600">
              会員IDは自動発行され、マイページでQRコード付き会員証を表示できます。
            </p>
            <Link className="focus-ring mt-4 inline-flex w-full justify-center rounded-md bg-ocean-500 px-4 py-3 font-black text-white hover:bg-ocean-700" href="/mypage">
              会員証を見る
            </Link>
          </div>

          <div className="rounded-lg border border-ocean-100 bg-white p-5 shadow-soft">
            <h2 className="text-xl font-black">最新のお知らせ</h2>
            <div className="mt-4 space-y-4">
              {notices.slice(0, 3).map((notice) => (
                <Link key={notice.id} href="/notices" className="block rounded-md bg-ocean-50 p-3 hover:bg-ocean-100">
                  <p className="text-sm font-black text-ink">{notice.title}</p>
                  <p className="mt-1 text-xs text-slate-600">{notice.publishedAt}</p>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-coral-600">OPR</p>
            <h2 className="text-2xl font-black text-ink">総合ランキング</h2>
          </div>
          <Link className="text-sm font-black text-ocean-700 hover:text-coral-600" href="/rankings">
            ランキングへ
          </Link>
        </div>
        <RankingTable rows={rankings.overall} />
      </section>

      <section className="border-t border-ocean-100 bg-white/70">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-8 sm:px-6 md:grid-cols-3">
          {sponsors.map((sponsor) => (
            <Link key={sponsor.id} href="/sponsors" className="rounded-lg border border-ocean-100 bg-white p-5 shadow-soft transition hover:-translate-y-0.5">
              <span className="grid size-12 place-items-center rounded-md bg-ink text-sm font-black text-white">{sponsor.logoLabel}</span>
              <p className="mt-4 font-black text-ink">{sponsor.companyName}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{sponsor.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
