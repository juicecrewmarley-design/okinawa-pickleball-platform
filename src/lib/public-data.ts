import "server-only";
import { createClient } from "@supabase/supabase-js";
import { notices as mockNotices, sponsors as mockSponsors } from "@/lib/mock-data";
import { getSupabaseServerConfig } from "@/lib/supabase-env";
import type { Notice, Sponsor, Tournament, TournamentCategoryConfig, TournamentStatus } from "@/types/domain";

type TournamentRow = {
  capacity: number | null;
  categories: string[] | null;
  category_capacities: Record<string, number> | null;
  category_config: TournamentCategoryConfig | null;
  description: string;
  entry_deadline: string | null;
  fee_yen: number;
  guest_fee_yen: number;
  id: string;
  member_fee_yen: number;
  start_at: string;
  status: TournamentStatus;
  title: string;
  venue: string;
};

type NoticeRow = {
  body: string;
  id: string;
  published_at: string;
  title: string;
  type: Notice["type"];
};

type SponsorRow = {
  company_name: string;
  description: string;
  id: string;
  logo_url: string | null;
  rank: Sponsor["rank"];
  website_url: string | null;
};

export type PublicDataResult<T> = {
  data: T;
  details?: string;
  error: string | null;
  isConfigured: boolean;
};

function getPublicSupabase() {
  const config = getSupabaseServerConfig();
  if (!config.isConfigured) return null;

  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: false
    }
  });
}

function mapTournament(row: TournamentRow): Tournament {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    venue: row.venue,
    startAt: row.start_at,
    entryDeadline: row.entry_deadline ?? row.start_at,
    feeYen: row.fee_yen,
    memberFeeYen: row.member_fee_yen,
    guestFeeYen: row.guest_fee_yen,
    capacity: row.capacity ?? 0,
    categoryCapacities: row.category_capacities ?? undefined,
    categories: row.categories ?? [],
    categoryConfig: row.category_config ?? undefined,
    status: row.status
  };
}

function mapNotice(row: NoticeRow): Notice {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    type: row.type,
    publishedAt: new Date(row.published_at).toLocaleDateString("ja-JP")
  };
}

function mapSponsor(row: SponsorRow): Sponsor {
  return {
    id: row.id,
    companyName: row.company_name,
    description: row.description,
    websiteUrl: row.website_url || "#",
    rank: row.rank,
    logoLabel: row.company_name.slice(0, 2).toUpperCase()
  };
}

function publicTournamentErrorMessage(error: { code?: string; details?: string; message?: string }) {
  const detailText = [error.code, error.message, error.details].filter(Boolean).join(" / ");

  if (error.code === "42P01") {
    return "大会テーブル public.tournaments が見つかりません。Supabase SQL Editorで大会テーブル作成SQLを実行してください。";
  }

  if (error.code === "42501" || error.message?.toLowerCase().includes("permission")) {
    return `大会一覧を取得できませんでした。public.tournaments の select 権限またはRLSポリシーを確認してください。${detailText ? ` (${detailText})` : ""}`;
  }

  return `大会一覧を取得できませんでした。Supabaseエラーを確認してください。${detailText ? ` (${detailText})` : ""}`;
}

const tournamentColumns =
  "id,title,description,venue,start_at,entry_deadline,fee_yen,member_fee_yen,guest_fee_yen,capacity,category_capacities,categories,category_config,status";

export async function getPublicTournaments() {
  const result = await getPublicTournamentsResult();
  return result.data;
}

export async function getPublicTournamentsResult(): Promise<PublicDataResult<Tournament[]>> {
  const supabase = getPublicSupabase();
  if (!supabase) {
    return {
      data: [],
      error: "Supabase環境変数が未設定のため、大会一覧を取得できません。NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を確認してください。",
      isConfigured: false
    };
  }

  const { data, error } = await supabase
    .from("tournaments")
    .select(tournamentColumns)
    .in("status", ["open", "closed", "finished"])
    .order("start_at", { ascending: true });

  if (error || !data) {
    return {
      data: [],
      details: error?.details,
      error: error ? publicTournamentErrorMessage(error) : "大会一覧を取得できませんでした。Supabaseからデータが返りませんでした。",
      isConfigured: true
    };
  }

  return {
    data: (data as TournamentRow[]).map(mapTournament),
    error: null,
    isConfigured: true
  };
}

export async function getPublicTournament(id: string) {
  const result = await getPublicTournamentResult(id);
  return result.data;
}

export async function getPublicTournamentResult(id: string): Promise<PublicDataResult<Tournament | null>> {
  const supabase = getPublicSupabase();
  if (!supabase) {
    return {
      data: null,
      error: "Supabase環境変数が未設定のため、大会詳細を取得できません。NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を確認してください。",
      isConfigured: false
    };
  }

  const { data, error } = await supabase
    .from("tournaments")
    .select(tournamentColumns)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return {
      data: null,
      details: error.details,
      error: publicTournamentErrorMessage(error).replace("大会一覧", "大会詳細"),
      isConfigured: true
    };
  }

  return {
    data: data ? mapTournament(data as TournamentRow) : null,
    error: null,
    isConfigured: true
  };
}

export async function getPublicNotices() {
  const supabase = getPublicSupabase();
  if (!supabase) return mockNotices;

  const { data, error } = await supabase
    .from("notices")
    .select("id,title,body,type,published_at")
    .eq("is_published", true)
    .order("published_at", { ascending: false });

  if (error || !data) return mockNotices;
  return (data as NoticeRow[]).map(mapNotice);
}

export async function getPublicSponsors() {
  const supabase = getPublicSupabase();
  if (!supabase) return mockSponsors;

  const { data, error } = await supabase
    .from("sponsors")
    .select("id,company_name,description,website_url,logo_url,rank")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error || !data) return mockSponsors;
  return (data as SponsorRow[]).map(mapSponsor);
}
