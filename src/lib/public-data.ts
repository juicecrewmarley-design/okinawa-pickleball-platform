import "server-only";
import { createClient } from "@supabase/supabase-js";
import { notices as mockNotices, sponsors as mockSponsors, tournaments as mockTournaments } from "@/lib/mock-data";
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

export async function getPublicTournaments() {
  const supabase = getPublicSupabase();
  if (!supabase) return mockTournaments;

  const { data, error } = await supabase
    .from("tournaments")
    .select("id,title,description,venue,start_at,entry_deadline,fee_yen,member_fee_yen,guest_fee_yen,capacity,category_capacities,categories,category_config,status")
    .in("status", ["open", "closed", "finished"])
    .order("start_at", { ascending: true });

  if (error || !data) return mockTournaments;
  return (data as TournamentRow[]).map(mapTournament);
}

export async function getPublicTournament(id: string) {
  const supabase = getPublicSupabase();
  if (!supabase) return mockTournaments.find((tournament) => tournament.id === id) ?? null;

  const { data, error } = await supabase
    .from("tournaments")
    .select("id,title,description,venue,start_at,entry_deadline,fee_yen,member_fee_yen,guest_fee_yen,capacity,category_capacities,categories,category_config,status")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return mockTournaments.find((tournament) => tournament.id === id) ?? null;
  return mapTournament(data as TournamentRow);
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
