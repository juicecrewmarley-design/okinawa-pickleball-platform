import Link from "next/link";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { formatYen } from "@/lib/member";
import type { Tournament } from "@/types/domain";
import { StatusBadge } from "@/components/StatusBadge";
import { getCategoryCapacity, sumCategoryCapacities } from "@/lib/tournament-categories";

export function TournamentCard({ tournament }: { tournament: Tournament }) {
  const generalFeeYen = tournament.memberFeeYen ?? tournament.categoryConfig?.fees?.member ?? tournament.feeYen;
  const premiumFeeYen = tournament.guestFeeYen ?? tournament.categoryConfig?.fees?.guest ?? tournament.feeYen;
  const categoryCapacities = tournament.categoryCapacities ?? tournament.categoryConfig?.categoryCapacities;
  const totalCapacity = sumCategoryCapacities(categoryCapacities) || tournament.capacity;

  return (
    <article className="rounded-lg border border-ocean-100 bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <StatusBadge status={tournament.status} />
          <h2 className="mt-3 text-xl font-black leading-snug text-ink">{tournament.title}</h2>
        </div>
        <span className="rounded-md bg-coral-100 px-3 py-2 text-right text-xs font-black leading-5 text-coral-600">
          一般 {formatYen(generalFeeYen)}
          <br />
          プレミアム {formatYen(premiumFeeYen)}
        </span>
      </div>
      <p className="min-h-12 text-sm leading-6 text-slate-600">{tournament.description}</p>
      <dl className="mt-4 grid gap-3 text-sm text-slate-700">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-ocean-500" aria-hidden="true" />
          <span>{new Date(tournament.startAt).toLocaleString("ja-JP")}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="size-4 text-ocean-500" aria-hidden="true" />
          <span>{tournament.venue}</span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="size-4 text-ocean-500" aria-hidden="true" />
          <span>総定員 {totalCapacity}名</span>
        </div>
      </dl>
      <div className="mt-5 flex flex-wrap gap-2">
        {tournament.categories.map((category) => (
          <span key={category} className="rounded-full bg-ocean-50 px-3 py-1 text-xs font-bold text-ocean-700">
            {category}
            {getCategoryCapacity(categoryCapacities, category) ? ` ${getCategoryCapacity(categoryCapacities, category)}名` : ""}
          </span>
        ))}
      </div>
      <Link
        href={`/tournaments/${tournament.id}`}
        className="focus-ring mt-5 inline-flex w-full items-center justify-center rounded-md bg-ink px-4 py-3 text-sm font-black text-white transition hover:bg-ocean-700"
      >
        詳細・エントリー
      </Link>
    </article>
  );
}
