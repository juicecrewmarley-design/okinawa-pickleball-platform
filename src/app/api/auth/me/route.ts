import { NextResponse } from "next/server";
import { getServerAuthContextWithDiagnostics } from "@/lib/server-auth";
import { normalizeMembershipType } from "@/lib/member";
import type { Gender, MemberArea, MembershipType, ResidenceScope } from "@/types/domain";

type ProfileRow = {
  area: MemberArea;
  birth_date: string | null;
  email: string;
  full_name: string;
  furigana: string;
  gender: Gender;
  id: string;
  member_id: string;
  membership_type?: MembershipType | null;
  municipality: string | null;
  phone: string | null;
  residence_scope: ResidenceScope;
  role: string;
};

const profileColumns =
  "id,member_id,full_name,furigana,gender,birth_date,phone,email,area,residence_scope,municipality,role,membership_type";
const fallbackProfileColumns =
  "id,member_id,full_name,furigana,gender,birth_date,phone,email,area,residence_scope,municipality,role";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function sanitizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeGender(value: unknown): Gender {
  return value === "male" || value === "female" || value === "other" || value === "no_answer" ? value : "no_answer";
}

function sanitizeResidenceScope(value: unknown): ResidenceScope {
  return value === "outside" ? "outside" : "okinawa";
}

function sanitizeArea(value: unknown): MemberArea {
  return value === "south" || value === "naha" || value === "central" || value === "miyako" || value === "other" ? value : "other";
}

function serializeProfile(profile: ProfileRow) {
  const membershipType = normalizeMembershipType(profile.membership_type, profile.member_id);

  return {
    area: profile.area,
    birthDate: profile.birth_date ?? "",
    email: profile.email,
    fullName: profile.full_name,
    furigana: profile.furigana,
    gender: profile.gender,
    id: profile.id,
    memberId: profile.member_id,
    membershipType,
    municipality: profile.municipality ?? "",
    phone: profile.phone ?? "",
    residenceScope: profile.residence_scope,
    role: profile.role
  };
}

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

  const primaryProfileResult = await authResult.context.supabase
    .from("profiles")
    .select(profileColumns)
    .eq("id", authResult.context.profile.id)
    .maybeSingle();
  let data = primaryProfileResult.data as ProfileRow | null;
  let error = primaryProfileResult.error;

  if (error && [error.message, error.details].filter(Boolean).join(" ").includes("membership_type")) {
    const fallback = await authResult.context.supabase
      .from("profiles")
      .select(fallbackProfileColumns)
      .eq("id", authResult.context.profile.id)
      .maybeSingle();
    data = fallback.data as ProfileRow | null;
    error = fallback.error;
  }

  if (error || !data) {
    return NextResponse.json(
      {
        details: error?.details,
        ok: false,
        message: error?.message ?? "プロフィールが見つかりませんでした。"
      },
      { status: error ? 500 : 404 }
    );
  }

  const profile = data as ProfileRow;

  return NextResponse.json({
    ok: true,
    profile: serializeProfile(profile)
  });
}

export async function PUT(request: Request) {
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

  const payload = (await request.json()) as Record<string, unknown>;
  const fullName = sanitizeText(payload.fullName);
  const furigana = sanitizeText(payload.furigana);
  const email = sanitizeText(payload.email);
  const residenceScope = sanitizeResidenceScope(payload.residenceScope);
  const municipality = residenceScope === "okinawa" ? sanitizeText(payload.municipality) : "";

  if (!fullName || !furigana || !email) {
    return NextResponse.json(
      {
        ok: false,
        message: "氏名、ふりがな、メールアドレスを入力してください。"
      },
      { status: 400 }
    );
  }

  const updatePayload = {
    area: sanitizeArea(payload.area),
    birth_date: sanitizeText(payload.birthDate) || null,
    email,
    full_name: fullName,
    furigana,
    gender: sanitizeGender(payload.gender),
    municipality,
    phone: sanitizeText(payload.phone),
    residence_scope: residenceScope,
    updated_at: new Date().toISOString()
  };

  const updateResult = await authResult.context.supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", authResult.context.profile.id)
    .select(profileColumns)
    .single();
  let data = updateResult.data as ProfileRow | null;
  let error = updateResult.error;

  if (error && [error.message, error.details].filter(Boolean).join(" ").includes("membership_type")) {
    const fallback = await authResult.context.supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", authResult.context.profile.id)
      .select(fallbackProfileColumns)
      .single();
    data = fallback.data as ProfileRow | null;
    error = fallback.error;
  }

  if (error || !data) {
    console.error("Profile update failed", error);
    return NextResponse.json(
      {
        details: error?.details,
        ok: false,
        message: error?.code === "23505" ? "このメールアドレスは既に使われています。" : `会員情報を保存できませんでした。${error?.message ?? ""}`.trim()
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: "会員情報を保存しました。",
    profile: serializeProfile(data)
  });
}
