import { redirect } from "next/navigation";
import { Filter, Search } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { TournamentCard } from "@/components/TournamentCard";
import { getServerAuthProfile } from "@/lib/server-auth";
import { getPublicTournamentsResult } from "@/lib/public-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TournamentsPage() {
  const authProfile = await getServerAuthProfile();

  if (!authProfile) {
    redirect("/login");
  }

  const result = await getPublicTournamentsResult();
  const tournaments = result.data;

  return (
    <PageShell
      eyebrow="Tournaments"
      title="大会一覧"
      description="募集中の大会、開催予定、受付終了大会を確認できます。MVPではカテゴリごとのエントリーを大会詳細から行います。"
    >
      <div className="mb-5 grid gap-3 rounded-lg border border-ocean-100 bg-white p-4 shadow-soft md:grid-cols-[1fr_auto]">
        <label className="flex items-center gap-3 rounded-md bg-ocean-50 px-3 py-2">
          <Search className="size-5 text-ocean-700" aria-hidden="true" />
          <input className="focus-ring w-full bg-transparent py-2 text-sm" placeholder="大会名、会場、カテゴリで検索" />
        </label>
        <label className="flex min-w-48 items-center gap-3 rounded-md bg-ocean-50 px-3 py-2">
          <Filter className="size-5 text-ocean-700" aria-hidden="true" />
          <select className="focus-ring w-full bg-transparent py-2 text-sm font-bold">
            <option>すべて</option>
            <option>募集中</option>
            <option>受付終了</option>
            <option>終了</option>
          </select>
        </label>
      </div>

      {result.error ? (
        <div className="rounded-lg border border-coral-200 bg-coral-100 p-5 text-sm font-bold leading-7 text-coral-700 shadow-soft">
          {result.error}
        </div>
      ) : tournaments.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {tournaments.map((tournament) => (
            <TournamentCard key={tournament.id} tournament={tournament} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-ocean-100 bg-white p-5 text-sm font-bold leading-7 text-slate-600 shadow-soft">
          現在公開中の大会はありません。管理画面で大会を作成すると、ここに表示されます。
        </div>
      )}
    </PageShell>
  );
}
