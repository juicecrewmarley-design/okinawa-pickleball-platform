"use client";

import { useState } from "react";
import { Trophy } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { RankingTable } from "@/components/RankingTable";
import { doublesClasses, doublesDivisions } from "@/lib/tournament-categories";
import { oprRankingKey, oprRankings, overallRankingsByGender } from "@/lib/mock-data";

type OverallGender = "male" | "female";

const overallGenderLabels: Record<OverallGender, string> = {
  male: "男子総合",
  female: "女子総合"
};

export default function RankingsPage() {
  const [division, setDivision] = useState(doublesDivisions[0]);
  const [className, setClassName] = useState(doublesClasses[0]);
  const [overallGender, setOverallGender] = useState<OverallGender>("male");
  const activeRows = oprRankings[oprRankingKey(division, className)] ?? [];

  return (
    <PageShell
      eyebrow="OPR Ranking"
      title="年間OPRランキング"
      description="男子ダブルス、女子ダブルス、ミックスダブルスをカテゴリ別に集計し、総合は男子・女子に分けて表示します。"
    >
      <section className="space-y-5">
        <div className="rounded-lg border border-ocean-100 bg-white p-4 shadow-soft">
          <div className="grid gap-3">
            <FilterGroup label="種目">
              {doublesDivisions.map((item) => (
                <FilterButton key={item} active={division === item} onClick={() => setDivision(item)}>
                  {item}
                </FilterButton>
              ))}
            </FilterGroup>
            <FilterGroup label="カテゴリ">
              {doublesClasses.map((item) => (
                <FilterButton key={item} active={className === item} onClick={() => setClassName(item)}>
                  {item}
                </FilterButton>
              ))}
            </FilterGroup>
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2 text-ink">
            <Trophy className="size-5 text-coral-600" aria-hidden="true" />
            <h2 className="text-xl font-black">{division} / {className}</h2>
          </div>
          <RankingTable rows={activeRows} />
        </div>
      </section>

      <section className="mt-8 space-y-5">
        <div className="rounded-lg border border-ocean-100 bg-white p-4 shadow-soft">
          <FilterGroup label="総合">
            {(["male", "female"] as OverallGender[]).map((gender) => (
              <FilterButton key={gender} active={overallGender === gender} onClick={() => setOverallGender(gender)}>
                {overallGenderLabels[gender]}
              </FilterButton>
            ))}
          </FilterGroup>
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2 text-ink">
            <Trophy className="size-5 text-palm-700" aria-hidden="true" />
            <h2 className="text-xl font-black">{overallGenderLabels[overallGender]}</h2>
          </div>
          <RankingTable rows={overallRankingsByGender[overallGender]} />
        </div>
      </section>
    </PageShell>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm font-black text-ocean-700">{label}</p>
      <div className="flex gap-2 overflow-x-auto pb-1">{children}</div>
    </div>
  );
}

function FilterButton({
  active,
  children,
  onClick
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`focus-ring inline-flex shrink-0 items-center gap-2 rounded-md px-4 py-3 text-sm font-black ${
        active ? "bg-ink text-white" : "bg-ocean-50 text-ink hover:bg-ocean-100"
      }`}
    >
      <Trophy className="size-4" aria-hidden="true" />
      {children}
    </button>
  );
}
