import { areaLabels } from "@/lib/labels";
import type { RankingRow } from "@/types/domain";

export function RankingTable({ rows }: { rows: RankingRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-ocean-100 bg-white shadow-soft">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="bg-ocean-50 text-xs uppercase tracking-[0.16em] text-ocean-700">
            <tr>
              <th className="px-4 py-3">順位</th>
              <th className="px-4 py-3">会員ID</th>
              <th className="px-4 py-3">氏名・チーム</th>
              <th className="px-4 py-3">エリア</th>
              <th className="px-4 py-3">勝利数</th>
              <th className="px-4 py-3">OPR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ocean-50">
            {rows.map((row) => (
              <tr key={`${row.memberId}-${row.rank}`} className="hover:bg-ocean-50/60">
                <td className="px-4 py-4">
                  <span className="grid size-9 place-items-center rounded-full bg-coral-100 font-black text-coral-600">
                    {row.rank}
                  </span>
                </td>
                <td className="px-4 py-4 font-bold text-slate-600">{row.memberId}</td>
                <td className="px-4 py-4 font-black text-ink">{row.fullName}</td>
                <td className="px-4 py-4">{areaLabels[row.area]}</td>
                <td className="px-4 py-4">{row.wins}</td>
                <td className="px-4 py-4 text-lg font-black text-palm-700">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
