import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerConfig } from "@/lib/supabase-env";

export const dynamic = "force-dynamic";

type MemberIdRow = {
  member_id: string | null;
};

function formatMemberId(value: number) {
  return `OKP-${String(value).padStart(4, "0")}`;
}

function getMemberNumber(memberId?: string | null) {
  const number = memberId?.match(/^OKP-(\d+)$/)?.[1];
  return number ? Number(number) : null;
}

function getNextFromRows(rows: MemberIdRow[][]) {
  const usedNumbers = new Set<number>();
  let maxNumber = 1499;

  rows.flat().forEach((row) => {
    const number = getMemberNumber(row.member_id);
    if (number === null) return;
    usedNumbers.add(number);
    maxNumber = Math.max(maxNumber, number);
  });

  let candidate = Math.max(maxNumber + 1, 1500);
  while (usedNumbers.has(candidate)) {
    candidate += 1;
  }

  return formatMemberId(candidate);
}

export async function GET() {
  const config = getSupabaseServerConfig();

  if (!config.isConfigured) {
    return NextResponse.json(
      {
        ok: false,
        memberId: null,
        message: "Supabase環境変数が未設定のため、次の会員IDを確認できません。"
      },
      { status: 500 }
    );
  }

  const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey || config.supabaseAnonKey, {
    auth: {
      persistSession: false
    }
  });

  const { data: previewMemberId, error: previewError } = await supabase.rpc("peek_next_member_id");

  if (!previewError && typeof previewMemberId === "string" && previewMemberId) {
    return NextResponse.json({
      ok: true,
      memberId: previewMemberId
    });
  }

  const [profilesResult, legacyMembersResult] = await Promise.all([
    supabase.from("profiles").select("member_id").like("member_id", "OKP-%").limit(10000),
    supabase.from("legacy_members").select("member_id").like("member_id", "OKP-%").limit(10000)
  ]);

  if (profilesResult.error || legacyMembersResult.error) {
    console.error("Next member ID lookup failed", {
      legacyMembersError: legacyMembersResult.error,
      previewError,
      profilesError: profilesResult.error
    });

    return NextResponse.json(
      {
        ok: false,
        memberId: null,
        message: "次の会員IDを確認できませんでした。SupabaseのSQLまたはRLS設定を確認してください。"
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    memberId: getNextFromRows([
      (profilesResult.data ?? []) as MemberIdRow[],
      (legacyMembersResult.data ?? []) as MemberIdRow[]
    ])
  });
}
