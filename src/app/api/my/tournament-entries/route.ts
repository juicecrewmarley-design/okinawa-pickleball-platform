import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerAuthContextWithDiagnostics } from "@/lib/server-auth";
import { getSupabaseServerConfig } from "@/lib/supabase-env";

type EntryRow = {
  category: string;
  created_at: string;
  entry_type: "doubles" | "team";
  id: string;
  linking_status: "waiting" | "linked";
  partner_member_id: string | null;
  partner_name: string | null;
  status: "pending" | "confirmed" | "cancelled";
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

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const authResult = await getServerAuthContextWithDiagnostics();

  if (!authResult.context) {
    return NextResponse.json(
      {
        diagnostics: authResult.diagnostics,
        ok: false,
        message: "ログイン情報を取得できませんでした。もう一度ログインしてください。"
      },
      { status: 401 }
    );
  }

  const config = getSupabaseServerConfig();
  const memberId = authResult.context.profile.memberId;

  const supabase = config.supabaseServiceRoleKey
    ? createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
        auth: {
          persistSession: false
        }
      })
    : authResult.context.supabase;

  const { data, error } = await supabase
    .from("tournament_entries")
    .select(
      "id,tournament_id,category,entry_type,team_name,partner_member_id,partner_name,linking_status,status,created_at,tournaments(title,start_at)"
    )
    .or(`user_id.eq.${authResult.context.profile.id},applicant_member_id.eq.${memberId},partner_member_id.eq.${memberId}`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("My tournament entries lookup failed", error);
    return NextResponse.json(
      {
        details: error.details,
        ok: false,
        message: `大会エントリー状況を取得できませんでした。${error.message ?? ""}`.trim()
      },
      { status: 500 }
    );
  }

  const entries = ((data ?? []) as unknown as EntryRow[]).map((entry) => {
    const tournament = Array.isArray(entry.tournaments) ? entry.tournaments[0] : entry.tournaments;

    return {
      category: entry.category,
      createdAt: entry.created_at,
      entryType: entry.entry_type,
      id: entry.id,
      linkingStatus: entry.linking_status,
      partnerMemberId: entry.partner_member_id,
      partnerName: entry.partner_name,
      status: entry.status,
      teamName: entry.team_name,
      tournamentId: entry.tournament_id,
      tournamentStartAt: tournament?.start_at ?? null,
      tournamentTitle: tournament?.title ?? "大会"
    };
  });

  return NextResponse.json({
    entries,
    ok: true
  });
}
