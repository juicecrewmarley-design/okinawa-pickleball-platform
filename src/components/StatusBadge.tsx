import { clsx } from "clsx";
import type { TournamentStatus } from "@/types/domain";
import { statusLabels } from "@/lib/labels";

const badgeStyle: Record<TournamentStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  open: "bg-palm-100 text-palm-700",
  closed: "bg-coral-100 text-coral-600",
  finished: "bg-ocean-100 text-ocean-700"
};

export function StatusBadge({ status }: { status: TournamentStatus }) {
  return (
    <span className={clsx("inline-flex rounded-full px-3 py-1 text-xs font-black", badgeStyle[status])}>
      {statusLabels[status]}
    </span>
  );
}
