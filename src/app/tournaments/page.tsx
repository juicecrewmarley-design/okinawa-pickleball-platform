import { Filter, Search } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { TournamentCard } from "@/components/TournamentCard";
import { tournaments } from "@/lib/mock-data";

export default function TournamentsPage() {
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

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {tournaments.map((tournament) => (
          <TournamentCard key={tournament.id} tournament={tournament} />
        ))}
      </div>
    </PageShell>
  );
}
