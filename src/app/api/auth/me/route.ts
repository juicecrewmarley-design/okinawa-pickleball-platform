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
  const membershipType = normalizeMembershipType(profile.membership_type, profile.member_id);

  return NextResponse.json({
    ok: true,
    profile: {
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
    }
  });
}
