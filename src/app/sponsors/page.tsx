import Link from "next/link";
import { ArrowUpRight, Building2 } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { getPublicSponsors } from "@/lib/public-data";

const rankLabel = {
  platinum: "プラチナ",
  gold: "ゴールド",
  silver: "シルバー",
  bronze: "ブロンズ",
  supporter: "サポーター"
};

export const dynamic = "force-dynamic";

export default async function SponsorsPage() {
  const sponsors = await getPublicSponsors();

  return (
    <PageShell
      eyebrow="Sponsors"
      title="協賛企業ページ"
      description="協賛企業のロゴ、紹介文、リンク、協賛ランクを掲載し、大会運営と地域スポーツ振興のPRにつなげます。"
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {sponsors.map((sponsor) => (
          <article key={sponsor.id} className="rounded-lg border border-ocean-100 bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <span className="grid size-16 place-items-center rounded-md bg-ink text-lg font-black text-white">
                {sponsor.logoLabel}
              </span>
              <span className="rounded-full bg-coral-100 px-3 py-1 text-xs font-black text-coral-600">
                {rankLabel[sponsor.rank]}
              </span>
            </div>
            <div className="mt-5 flex items-center gap-2">
              <Building2 className="size-5 text-ocean-700" aria-hidden="true" />
              <h2 className="text-xl font-black text-ink">{sponsor.companyName}</h2>
            </div>
            <p className="mt-3 min-h-20 text-sm leading-7 text-slate-600">{sponsor.description}</p>
            <Link
              href={sponsor.websiteUrl}
              className="focus-ring mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-ocean-500 px-4 py-3 font-black text-white hover:bg-ocean-700"
            >
              企業サイト
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
