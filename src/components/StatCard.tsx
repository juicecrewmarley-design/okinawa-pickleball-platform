import { ReactNode } from "react";

type StatCardProps = {
  label: string;
  value: string;
  note: string;
  icon: ReactNode;
};

export function StatCard({ label, value, note, icon }: StatCardProps) {
  return (
    <div className="rounded-lg border border-ocean-100 bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-ocean-700">{label}</p>
        <span className="grid size-10 place-items-center rounded-full bg-ocean-50 text-ocean-700">{icon}</span>
      </div>
      <p className="mt-4 text-3xl font-black text-ink">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{note}</p>
    </div>
  );
}
