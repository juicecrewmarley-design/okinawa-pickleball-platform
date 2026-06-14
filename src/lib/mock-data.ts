import type { MemberProfile, Notice, RankingCategory, RankingRow, Sponsor, Tournament, TournamentEntry } from "@/types/domain";
import { doublesClasses, doublesDivisions, teamAgeCategories } from "@/lib/tournament-categories";

const okinawaOpenCapacities: Record<string, number> = {
  "男子ダブルス / オープン初中級者": 24,
  "男子ダブルス / オープン中上級者": 24,
  "男子ダブルス / 35+": 16,
  "男子ダブルス / 50+": 16,
  "男子ダブルス / 65+": 12,
  "女子ダブルス / オープン初中級者": 24,
  "女子ダブルス / オープン中上級者": 24,
  "女子ダブルス / 35+": 16,
  "女子ダブルス / 50+": 16,
  "女子ダブルス / 65+": 12,
  "ミックスダブルス / オープン初中級者": 28,
  "ミックスダブルス / オープン中上級者": 28,
  "ミックスダブルス / 35+": 20,
  "ミックスダブルス / 50+": 20,
  "ミックスダブルス / 65+": 12,
  "チーム戦 / 合計年齢100+": 8,
  "チーム戦 / 150+": 8,
  "チーム戦 / 180+": 8,
  "チーム戦 / 200+": 8
};

export const mockMember: MemberProfile = {
  id: "demo-member",
  memberId: "OPBA-2026-01001",
  fullName: "沖縄 花子",
  furigana: "おきなわ はなこ",
  gender: "female",
  birthDate: "1992-07-16",
  phone: "090-0000-0000",
  email: "hanako@example.com",
  area: "naha",
  residenceScope: "okinawa",
  municipality: "那覇市",
  role: "member",
  membershipType: "premium",
  opr: 1280,
  ranking: 12
};

export const tournaments: Tournament[] = [
  {
    id: "okinawa-open-2026",
    title: "沖縄オープン ピックルボールカップ 2026",
    description: "県内外のプレイヤーが参加できる年間ランキング対象大会です。",
    venue: "沖縄県総合運動公園 レクリエーションドーム",
    startAt: "2026-08-22T09:00:00+09:00",
    entryDeadline: "2026-08-10T23:59:00+09:00",
    feeYen: 3000,
    memberFeeYen: 3000,
    guestFeeYen: 4000,
    capacity: 324,
    categoryCapacities: okinawaOpenCapacities,
    categories: [
      ...doublesDivisions.flatMap((division) => doublesClasses.map((className) => `${division} / ${className}`)),
      ...teamAgeCategories.map((category) => `チーム戦 / ${category}`)
    ],
    categoryConfig: {
      doubles: {
        divisions: ["男子ダブルス", "女子ダブルス", "ミックスダブルス"],
        classes: ["オープン初中級者", "オープン中上級者", "35+", "50+", "65+"]
      },
      team: {
        enabled: true,
        ageCategories: ["合計年齢100+", "150+", "180+", "200+"]
      },
      categoryCapacities: okinawaOpenCapacities,
      fees: {
        member: 3000,
        guest: 4000
      }
    },
    status: "open"
  },
  {
    id: "naha-summer-league",
    title: "那覇サマーリーグ",
    description: "初心者から中級者まで参加しやすいリーグ形式の大会です。",
    venue: "那覇市民体育館",
    startAt: "2026-07-12T10:00:00+09:00",
    entryDeadline: "2026-07-01T23:59:00+09:00",
    feeYen: 2000,
    memberFeeYen: 2000,
    guestFeeYen: 3000,
    capacity: 56,
    categoryCapacities: {
      "ミックスダブルス / オープン初中級者": 24,
      "ミックスダブルス / 35+": 24,
      "チーム戦 / 合計年齢100+": 8
    },
    categories: ["ミックスダブルス / オープン初中級者", "ミックスダブルス / 35+", "チーム戦 / 合計年齢100+"],
    categoryConfig: {
      doubles: {
        divisions: ["ミックスダブルス"],
        classes: ["オープン初中級者", "35+"]
      },
      team: {
        enabled: true,
        ageCategories: ["合計年齢100+"]
      },
      categoryCapacities: {
        "ミックスダブルス / オープン初中級者": 24,
        "ミックスダブルス / 35+": 24,
        "チーム戦 / 合計年齢100+": 8
      },
      fees: {
        member: 2000,
        guest: 3000
      }
    },
    status: "open"
  },
  {
    id: "miyako-island-cup",
    title: "宮古島カップ",
    description: "宮古エリアの交流促進を目的にした地域大会です。",
    venue: "宮古島市総合体育館",
    startAt: "2026-09-20T09:30:00+09:00",
    entryDeadline: "2026-09-05T23:59:00+09:00",
    feeYen: 2500,
    memberFeeYen: 2500,
    guestFeeYen: 3500,
    capacity: 68,
    categoryCapacities: {
      "男子ダブルス / 50+": 16,
      "女子ダブルス / 50+": 16,
      "ミックスダブルス / 65+": 28,
      "チーム戦 / 200+": 8
    },
    categories: ["男子ダブルス / 50+", "女子ダブルス / 50+", "ミックスダブルス / 65+", "チーム戦 / 200+"],
    categoryConfig: {
      doubles: {
        divisions: ["男子ダブルス", "女子ダブルス", "ミックスダブルス"],
        classes: ["50+", "65+"]
      },
      team: {
        enabled: true,
        ageCategories: ["200+"]
      },
      categoryCapacities: {
        "男子ダブルス / 50+": 16,
        "女子ダブルス / 50+": 16,
        "ミックスダブルス / 65+": 28,
        "チーム戦 / 200+": 8
      },
      fees: {
        member: 2500,
        guest: 3500
      }
    },
    status: "open"
  }
];

export const entries: TournamentEntry[] = [
  {
    id: "entry-1",
    tournamentId: "okinawa-open-2026",
    memberId: "OPBA-2026-01001",
    memberName: "沖縄 花子",
    category: "ミックスダブルス / オープン中上級者",
    applicantType: "member",
    applicantName: "沖縄 花子",
    applicantEmail: "hanako@example.com",
    applicantPhone: "090-0000-0000",
    entryFeeYen: 3000,
    entryType: "doubles",
    partnerMemberId: "OKP-0002",
    partnerName: "金城 直人",
    linkingStatus: "linked",
    status: "confirmed",
    createdAt: "2026-06-01"
  },
  {
    id: "entry-2",
    tournamentId: "naha-summer-league",
    memberId: "OPBA-2026-01008",
    memberName: "宮城 太郎",
    category: "チーム戦 / 合計年齢100+",
    teamName: "那覇スマッシュ",
    applicantType: "member",
    applicantName: "宮城 太郎",
    applicantEmail: "taro@example.com",
    applicantPhone: "090-1111-2222",
    entryFeeYen: 2000,
    entryType: "team",
    teamMembers: [
      { memberId: "OKP-0008", name: "宮城 太郎" },
      { memberId: "OKP-0013", name: "比嘉 勇人" }
    ],
    linkingStatus: "waiting",
    status: "pending",
    createdAt: "2026-06-04"
  },
  {
    id: "entry-3",
    tournamentId: "okinawa-open-2026",
    memberId: "非会員",
    memberName: "山田 海",
    category: "男子ダブルス / オープン初中級者",
    applicantType: "guest",
    applicantName: "山田 海",
    applicantEmail: "guest@example.com",
    applicantPhone: "090-3333-4444",
    entryFeeYen: 4000,
    entryType: "doubles",
    partnerName: "佐藤 空",
    linkingStatus: "waiting",
    status: "pending",
    createdAt: "2026-06-06"
  }
];

const mensRankingRows: RankingRow[] = [
  { rank: 1, memberId: "OPBA-2026-01008", fullName: "宮城 太郎", area: "central", points: 1580, wins: 18 },
  { rank: 2, memberId: "OPBA-2026-01013", fullName: "比嘉 勇人", area: "south", points: 1495, wins: 16 },
  { rank: 3, memberId: "OPBA-2026-01021", fullName: "上原 健", area: "naha", points: 1410, wins: 14 }
];

const womensRankingRows: RankingRow[] = [
  { rank: 1, memberId: "OPBA-2026-01001", fullName: "沖縄 花子", area: "naha", points: 1280, wins: 12 },
  { rank: 2, memberId: "OPBA-2026-01019", fullName: "島袋 美咲", area: "miyako", points: 1210, wins: 11 },
  { rank: 3, memberId: "OPBA-2026-01024", fullName: "仲村 優", area: "central", points: 1175, wins: 10 }
];

const mixedRankingRows: RankingRow[] = [
  { rank: 1, memberId: "OPBA-2026-01001", fullName: "沖縄 花子", area: "naha", points: 1760, wins: 20 },
  { rank: 2, memberId: "OPBA-2026-01008", fullName: "宮城 太郎", area: "central", points: 1605, wins: 17 },
  { rank: 3, memberId: "OPBA-2026-01019", fullName: "島袋 美咲", area: "miyako", points: 1515, wins: 15 }
];

function rankingRowsFor(division: string, classIndex: number) {
  const sourceRows =
    division === "男子ダブルス" ? mensRankingRows : division === "女子ダブルス" ? womensRankingRows : mixedRankingRows;

  return sourceRows.map((row, index) => ({
    ...row,
    points: Math.max(0, row.points - classIndex * 70 - index * 10),
    wins: Math.max(0, row.wins - classIndex)
  }));
}

export function oprRankingKey(division: string, className: string) {
  return `${division} / ${className}`;
}

export const oprRankings: Record<string, RankingRow[]> = Object.fromEntries(
  doublesDivisions.flatMap((division) =>
    doublesClasses.map((className, classIndex): [string, RankingRow[]] => [
      oprRankingKey(division, className),
      rankingRowsFor(division, classIndex)
    ])
  )
);

export const overallRankingsByGender: Record<"male" | "female", RankingRow[]> = {
  male: [
    { rank: 1, memberId: "OPBA-2026-01008", fullName: "宮城 太郎", area: "central", points: 2120, wins: 24 },
    { rank: 2, memberId: "OPBA-2026-01013", fullName: "比嘉 勇人", area: "south", points: 1960, wins: 21 },
    { rank: 3, memberId: "OPBA-2026-01021", fullName: "上原 健", area: "naha", points: 1840, wins: 19 }
  ],
  female: [
    { rank: 1, memberId: "OPBA-2026-01001", fullName: "沖縄 花子", area: "naha", points: 2040, wins: 22 },
    { rank: 2, memberId: "OPBA-2026-01019", fullName: "島袋 美咲", area: "miyako", points: 1880, wins: 18 },
    { rank: 3, memberId: "OPBA-2026-01024", fullName: "仲村 優", area: "central", points: 1795, wins: 17 }
  ]
};

export const rankings: Record<RankingCategory, RankingRow[]> = {
  mens: overallRankingsByGender.male,
  womens: overallRankingsByGender.female,
  mixed: oprRankings[oprRankingKey("ミックスダブルス", "オープン中上級者")],
  overall: [
    { rank: 1, memberId: "OPBA-2026-01008", fullName: "宮城 太郎", area: "central", points: 2120, wins: 24 },
    { rank: 2, memberId: "OPBA-2026-01001", fullName: "沖縄 花子", area: "naha", points: 2040, wins: 22 },
    { rank: 3, memberId: "OPBA-2026-01013", fullName: "比嘉 勇人", area: "south", points: 1960, wins: 21 }
  ]
};

export const notices: Notice[] = [
  {
    id: "notice-1",
    title: "初心者向け体験会を毎月開催します",
    body: "那覇・中部・南部で体験会を開催。ラケットの貸出もあります。",
    type: "practice",
    publishedAt: "2026-06-03"
  },
  {
    id: "notice-2",
    title: "沖縄オープンのエントリー受付を開始しました",
    body: "男子、女子、ミックス、初心者、年齢合計カテゴリを受付中です。",
    type: "tournament",
    publishedAt: "2026-06-01"
  },
  {
    id: "notice-3",
    title: "協賛企業の募集を開始しました",
    body: "県内スポーツ振興と大会運営を一緒に支える企業を募集しています。",
    type: "association",
    publishedAt: "2026-05-28"
  }
];

export const sponsors: Sponsor[] = [
  {
    id: "sponsor-1",
    companyName: "琉球スポーツラボ",
    description: "県内スポーツイベントの企画・運営を支援する地域密着企業です。",
    websiteUrl: "https://example.com",
    rank: "platinum",
    logoLabel: "RSL"
  },
  {
    id: "sponsor-2",
    companyName: "美ら海ウェルネス",
    description: "健康づくりと地域交流を応援するウェルネスブランドです。",
    websiteUrl: "https://example.com",
    rank: "gold",
    logoLabel: "CW"
  },
  {
    id: "sponsor-3",
    companyName: "宮古アイランドツアーズ",
    description: "離島大会や交流イベントの移動・滞在を支援します。",
    websiteUrl: "https://example.com",
    rank: "silver",
    logoLabel: "MIT"
  }
];
