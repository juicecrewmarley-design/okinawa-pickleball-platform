import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerAuthContextWithDiagnostics } from "@/lib/server-auth";
import { getSupabaseServerConfig } from "@/lib/supabase-env";
import { normalizeMembershipType } from "@/lib/member";
import type { MembershipType } from "@/types/domain";

type EntryRow = {
  applicant_email: string | null;
  applicant_member_id: string | null;
  applicant_membership_type?: MembershipType | null;
  applicant_name: string;
  applicant_phone: string | null;
  applicant_type: "member" | "guest";
  category: string;
  created_at: string;
  entry_fee_yen: number;
  entry_type: "doubles" | "team";
  id: string;
  linking_status: "waiting" | "linked";
  partner_member_id: string | null;
  partner_name: string | null;
  status: "pending" | "confirmed" | "cancelled";
  team_members: { memberId?: string; name?: string }[] | null;
  team_name: string | null;
  tournament_id: string;
  tournaments:
    | {
        start_at: string | null;
        title: string;
      }
    | {
        start_at: string | null;
        title: string;
      }[]
    | null;
};

const entryColumns =
  "id,tournament_id,category,applicant_type,applicant_member_id,applicant_membership_type,applicant_name,applicant_email,applicant_phone,entry_fee_yen,entry_type,partner_member_id,partner_name,team_name,team_members,linking_status,status,created_at,tournaments(title,start_at)";
const fallbackEntryColumns =
  "id,tournament_id,category,applicant_type,applicant_member_id,applicant_name,applicant_email,applicant_phone,entry_fee_yen,entry_type,partner_member_id,partner_name,team_name,team_members,linking_status,status,created_at,tournaments(title,start_at)";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const authResult = await getServerAuthContextWithDiagnostics();

  if (!authResult.context) {
    return NextResponse.json(
      {
        diagnostics: authResult.diagnostics,
        ok: false,
        message: "ログイン情報を取得できませんでした。もう一度管理者ログインしてください。"
      },
      { status: 401 }
    );
  }

  if (authResult.context.profile.role !== "admin") {
    return NextResponse.json(
      {
        ok: false,
        message: "管理者権限がありません。"
      },
      { status: 403 }
    );
  }

  const config = getSupabaseServerConfig();
  const supabase = config.supabaseServiceRoleKey
    ? createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
        auth: {
          persistSession: false
        }
      })
    : authResult.context.supabase;

  const primaryResult = await supabase
    .from("tournament_entries")
    .select(entryColumns)
    .order("created_at", { ascending: false });
  let data = primaryResult.data as unknown as EntryRow[] | null;
  let error = primaryResult.error;

  if (error && [error.message, error.details].filter(Boolean).join(" ").includes("applicant_membership_type")) {
    const fallback = await supabase
      .from("tournament_entries")
      .select(fallbackEntryColumns)
      .order("created_at", { ascending: false });
    data = fallback.data as unknown as EntryRow[] | null;
    error = fallback.error;
  }

  if (error) {
    console.error("Admin tournament entries lookup failed", error);
    return NextResponse.json(
      {
        details: error.details,
        ok: false,
        message: `大会参加者一覧を取得できませんでした。${error.message ?? ""}`.trim()
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    entries: (data ?? []).map((entry) => {
      const tournament = Array.isArray(entry.tournaments) ? entry.tournaments[0] : entry.tournaments;

      return {
        applicantEmail: entry.applicant_email ?? "",
        applicantMemberId: entry.applicant_member_id ?? "",
        applicantMembershipType: normalizeMembershipType(entry.applicant_membership_type, entry.applicant_member_id ?? ""),
        applicantName: entry.applicant_name,
        applicantPhone: entry.applicant_phone ?? "",
        applicantType: entry.applicant_type,
        category: entry.category,
        createdAt: entry.created_at,
        entryFeeYen: entry.entry_fee_yen,
        entryType: entry.entry_type,
        id: entry.id,
        linkingStatus: entry.linking_status,
        partnerMemberId: entry.partner_member_id ?? "",
        partnerName: entry.partner_name ?? "",
        status: entry.status,
        teamMembers: entry.team_members ?? [],
        teamName: entry.team_name ?? "",
        tournamentId: entry.tournament_id,
        tournamentStartAt: tournament?.start_at ?? "",
        tournamentTitle: tournament?.title ?? "大会"
      };
    }),
    ok: true
  });
}
