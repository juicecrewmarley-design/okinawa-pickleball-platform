import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerConfig } from "@/lib/supabase-env";

type LegacyLookupPayload = {
  birthDate?: string;
  memberNumber?: string;
  phoneLast4?: string;
};

type LegacyMemberRow = {
  area: "south" | "naha" | "central" | "miyako" | "other";
  birth_date: string | null;
  claimed_at: string | null;
  claimed_by: string | null;
  email: string;
  full_name: string;
  furigana: string | null;
  gender: "male" | "female" | "other" | "no_answer";
  member_id: string;
  municipality: string | null;
  phone: string | null;
  pickleball_experience: string | null;
  prefecture: string | null;
  residence_scope: "okinawa" | "outside";
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function buildLegacyMemberId(value: string) {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, "");
  const number = normalized.match(/^(?:OKP-?)?(\d+)$/)?.[1];
  if (!number) return "";

  return `OKP-${number.padStart(4, "0")}`;
}

function normalizePhoneLast4(value?: string) {
  return (value ?? "").replace(/\D/g, "").slice(-4);
}

function isValidBirthDate(value?: string) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function verifyLegacyMember(member: LegacyMemberRow, payload: LegacyLookupPayload) {
  const birthDateMatches = isValidBirthDate(payload.birthDate) && member.birth_date === payload.birthDate;
  const submittedPhoneLast4 = normalizePhoneLast4(payload.phoneLast4);
  const memberPhoneLast4 = normalizePhoneLast4(member.phone ?? "");
  const phoneMatches = submittedPhoneLast4.length === 4 && memberPhoneLast4.length === 4 && submittedPhoneLast4 === memberPhoneLast4;

  return birthDateMatches || phoneMatches;
}

export async function POST(request: Request) {
  const config = getSupabaseServerConfig();

  if (!config.isConfigured || !config.supabaseServiceRoleKey) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "既存会員番号の照合にはSupabaseのサーバー用設定が必要です。Vercelに SUPABASE_SERVICE_ROLE_KEY を設定してください。"
      },
      { status: 500 }
    );
  }

  const payload = (await request.json()) as LegacyLookupPayload;
  const memberId = buildLegacyMemberId(payload.memberNumber ?? "");
  const hasVerification = isValidBirthDate(payload.birthDate) || normalizePhoneLast4(payload.phoneLast4).length === 4;

  if (!memberId) {
    return NextResponse.json(
      {
        ok: false,
        message: "4桁の会員番号を入力してください。"
      },
      { status: 400 }
    );
  }

  if (!hasVerification) {
    return NextResponse.json(
      {
        ok: false,
        message: "本人確認のため、生年月日または電話番号下4桁を入力してください。"
      },
      { status: 400 }
    );
  }

  const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
      persistSession: false
    }
  });

  const { data, error } = await supabase
    .from("legacy_members")
    .select("member_id,email,full_name,furigana,gender,birth_date,phone,area,residence_scope,municipality,prefecture,pickleball_experience,claimed_by,claimed_at")
    .eq("member_id", memberId)
    .maybeSingle();

  if (error) {
    console.error("Legacy member lookup failed", error);
    return NextResponse.json(
      {
        details: error.details,
        ok: false,
        message: `既存会員情報を取得できませんでした。legacy_membersテーブルを確認してください。${error.message ? ` (${error.message})` : ""}`
      },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      {
        ok: false,
        message: "会員番号または本人確認情報が一致しませんでした。"
      },
      { status: 404 }
    );
  }

  const member = data as LegacyMemberRow;

  if (member.claimed_by) {
    return NextResponse.json(
      {
        ok: false,
        message: "この会員番号は既にアプリ登録済みです。心当たりがない場合は管理者へ確認してください。"
      },
      { status: 409 }
    );
  }

  if (!verifyLegacyMember(member, payload)) {
    return NextResponse.json(
      {
        ok: false,
        message: "会員番号または本人確認情報が一致しませんでした。"
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    member: {
      area: member.area,
      birthDate: member.birth_date ?? "",
      claimed: Boolean(member.claimed_by),
      claimedAt: member.claimed_at,
      email: member.email,
      fullName: member.full_name,
      furigana: member.furigana ?? "",
      gender: member.gender,
      memberId: member.member_id,
      municipality: member.municipality ?? "",
      phone: member.phone ?? "",
      pickleballExperience: member.pickleball_experience ?? "",
      prefecture: member.prefecture ?? "",
      residenceScope: member.residence_scope
    },
    ok: true
  });
}
