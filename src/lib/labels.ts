import type { MemberArea, RankingCategory } from "@/types/domain";

export const areaLabels: Record<MemberArea, string> = {
  south: "南部",
  naha: "那覇",
  central: "中部",
  miyako: "宮古",
  other: "その他"
};

export const rankingLabels: Record<RankingCategory, string> = {
  mens: "男子",
  womens: "女子",
  mixed: "ミックス",
  overall: "総合"
};

export const statusLabels = {
  draft: "下書き",
  open: "募集中",
  closed: "受付終了",
  finished: "終了"
} as const;
