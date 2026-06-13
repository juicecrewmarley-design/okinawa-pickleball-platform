import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerConfig } from "@/lib/supabase-env";

type LookupPayload = {
  memberId?: string;
  purpose?: "applicant" | "partner";
};

type MemberLookupRow = {
  email: string | null;
  full_name: string;
  member_id: string;
  phone: string | null;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalizeSpaces(value: string) {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

function buildMemberIdVariants(value: string) {
  const compact = normalizeSpaces(value);
  const variants = new Set<string>();
  if (!compact) return [];

  variants.add(compact);

  const trailingNumber = compact.match(/(\d+)$/)?.[1];
  if (trailingNumber) {
    const padded = trailingNumber.padStart(4, "0");
    variants.add(trailingNumber);
    variants.add(padded);
    variants.add(`OKP-${padded}`);
    variants.add(`OKP-${trailingNumber}`);
  }

  return Array.from(variants);
}

function pickPreferredMember(rows: MemberLookupRow[] | null, variants: string[]) {
  if (!rows?.length) return null;

  return variants.map((variant) => rows.find((row) => row.member_id.toUpperCase() === variant)).find(Boolean) ?? rows[0];
}

async function findMember(
  supabase: SupabaseClient,
  tableName: "profiles" | "legacy_members",
  variants: string[]
) {
  const { data, error } = await supabase
    .from(tableName)
    .select("member_id,full_name,email,phone")
    .in("member_id", variants)
    .limit(10);

  if (error) {
    return { error, member: null };
  }

  return { error: null, member: pickPreferredMember(data as MemberLookupRow[] | null, variants) };
}

export async function POST(request: Request) {
  const config = getSupabaseServerConfig();

  if (!config.isConfigured || !config.supabaseServiceRoleKey) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "会員ID検索にはSupabaseのサーバー用設定が必要です。Vercelに NEXT_PUBLIC_SUPABASE_URL、NEXT_PUBLIC_SUPABASE_ANON_KEY、SUPABASE_SERVICE_ROLE_KEY を設定してください。"
      },
      { status: 500 }
    );
  }

  const payload = (await request.json()) as LookupPayload;
  const purpose = payload.purpose === "partner" ? "partner" : "applicant";
  const memberId = payload.memberId?.trim() ?? "";
  const variants = buildMemberIdVariants(memberId);

  if (variants.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        message: "会員IDを入力してください。"
      },
      { status: 400 }
    );
  }

  const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
      persistSession: false
    }
  });

  const profileLookup = await findMember(supabase, "profiles", variants);
  if (profileLookup.error) {
    console.error("Member lookup failed in profiles", profileLookup.error);
    return NextResponse.json(
      {
        details: profileLookup.error.details,
        ok: false,
        message: `会員情報を取得できませんでした。profilesテーブルを確認してください。${profileLookup.error.message ? ` (${profileLookup.error.message})` : ""}`
      },
      { status: 500 }
    );
  }

  let member = profileLookup.member;

  if (!member) {
    const legacyLookup = await findMember(supabase, "legacy_members", variants);
    if (legacyLookup.error) {
      console.error("Member lookup failed in legacy_members", legacyLookup.error);
      return NextResponse.json(
        {
          details: legacyLookup.error.details,
          ok: false,
          message: `会員情報を取得できませんでした。legacy_membersテーブルを確認してください。${legacyLookup.error.message ? ` (${legacyLookup.error.message})` : ""}`
        },
        { status: 500 }
      );
    }

    member = legacyLookup.member;
  }

  if (!member) {
    return NextResponse.json(
      {
        ok: false,
        message: "該当する会員IDが見つかりませんでした。番号を確認してください。"
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    profile:
      purpose === "partner"
        ? {
            fullName: member.full_name,
            memberId: member.member_id
          }
        : {
            email: member.email ?? "",
            fullName: member.full_name,
            memberId: member.member_id,
            phone: member.phone ?? ""
          }
  });
}
