import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeMembershipType } from "@/lib/member";
import { getSupabaseServerConfig } from "@/lib/supabase-env";
import type { MembershipType } from "@/types/domain";

export const dynamic = "force-dynamic";

type RegisterPayload = {
  email?: string;
  legacyVerification?: {
    birthDate?: string;
    memberNumber?: string;
    phoneLast4?: string;
  };
  password?: string;
  metadata?: Record<string, string | null>;
};

type LegacyMemberRow = {
  birth_date: string | null;
  claimed_by: string | null;
  member_id: string;
  phone: string | null;
};

type CreatedProfileRow = {
  member_id: string | null;
};

type SupabaseErrorLike = {
  code?: string;
  details?: string;
  hint?: string;
  message?: string;
  name?: string;
  status?: number;
};

function buildLegacyMemberId(value?: string | null) {
  const normalized = (value ?? "").trim().toUpperCase().replace(/\s+/g, "");
  const number = normalized.match(/^(?:OKP-?)?(\d+)$/)?.[1];
  if (!number) return "";

  return `OKP-${number.padStart(4, "0")}`;
}

function normalizePhoneLast4(value?: string | null) {
  return (value ?? "").replace(/\D/g, "").slice(-4);
}

function isValidBirthDate(value?: string | null) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function verifyLegacyMember(member: LegacyMemberRow, verification?: RegisterPayload["legacyVerification"]) {
  const birthDateMatches = isValidBirthDate(verification?.birthDate) && member.birth_date === verification?.birthDate;
  const submittedPhoneLast4 = normalizePhoneLast4(verification?.phoneLast4);
  const memberPhoneLast4 = normalizePhoneLast4(member.phone);
  const phoneMatches =
    submittedPhoneLast4.length === 4 && memberPhoneLast4.length === 4 && submittedPhoneLast4 === memberPhoneLast4;

  return birthDateMatches || phoneMatches;
}

function getErrorDetails(error: SupabaseErrorLike | null | undefined) {
  if (!error) return null;

  return {
    code: error.code ?? null,
    details: error.details ?? null,
    hint: error.hint ?? null,
    message: error.message ?? null,
    name: error.name ?? null,
    status: error.status ?? null
  };
}

function getRegisterErrorMessage(error: SupabaseErrorLike) {
  const message = error.message ?? "";

  if (/database error saving new user/i.test(message)) {
    return "新規ユーザー保存時のデータベースエラーです。Supabase SQL Editorで最新の supabase/registration-repair.sql を実行してから、もう一度登録してください。";
  }

  if (/already registered|already exists|already been registered/i.test(message)) {
    return "このメールアドレスは既に登録されています。ログイン画面からログインしてください。プロフィールが無い場合は、補修SQLを実行してください。";
  }

  return message || "新規ユーザーを保存できませんでした。";
}

export async function POST(request: Request) {
  const config = getSupabaseServerConfig();

  if (!config.isConfigured) {
    return NextResponse.json(
      {
        ok: false,
        code: "supabase_not_configured",
        message: `Supabaseに保存できません。VercelのEnvironment Variablesで不足している項目があります: ${config.missingKeys.join(
          ", "
        )}。設定後に再デプロイしてください。`
      },
      { status: 500 }
    );
  }

  if (!config.supabaseServiceRoleKey) {
    return NextResponse.json(
      {
        ok: false,
        code: "service_role_not_configured",
        message: "会員登録には SUPABASE_SERVICE_ROLE_KEY が必要です。VercelのEnvironment Variablesに追加して再デプロイしてください。"
      },
      { status: 500 }
    );
  }

  const payload = (await request.json()) as RegisterPayload;
  const email = payload.email?.trim().toLowerCase();
  const password = payload.password ?? "";
  const requestedLegacyMemberId = buildLegacyMemberId(payload.metadata?.legacy_member_id ?? payload.legacyVerification?.memberNumber);
  const requestedMembershipType = normalizeMembershipType(payload.metadata?.membership_type, requestedLegacyMemberId) as MembershipType;
  const finalMembershipType: MembershipType = requestedLegacyMemberId ? "premium" : requestedMembershipType;

  if (!email || !password) {
    return NextResponse.json(
      {
        ok: false,
        code: "invalid_payload",
        message: "メールアドレスとパスワードを入力してください。"
      },
      { status: 400 }
    );
  }

  const metadata: Record<string, string | null> = {
    ...(payload.metadata ?? {}),
    full_name: payload.metadata?.full_name || null,
    furigana: payload.metadata?.furigana || "",
    gender: payload.metadata?.gender || "no_answer",
    membership_type: finalMembershipType,
    legacy_member_id: requestedLegacyMemberId || null,
    legacy_birth_date: payload.legacyVerification?.birthDate ?? null,
    legacy_phone_last4: normalizePhoneLast4(payload.legacyVerification?.phoneLast4) || null
  };

  const adminSupabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
      persistSession: false
    }
  });

  const { data: existingProfile, error: existingProfileError } = await adminSupabase
    .from("profiles")
    .select("id,email")
    .eq("email", email)
    .maybeSingle();

  if (existingProfileError) {
    console.error("Existing profile lookup failed during registration", existingProfileError);
  }

  if (existingProfile) {
    return NextResponse.json(
      {
        ok: false,
        code: "email_already_registered",
        details: getErrorDetails(existingProfileError),
        message: "このメールアドレスは既に登録されています。ログイン画面からログインしてください。"
      },
      { status: 409 }
    );
  }

  if (requestedLegacyMemberId) {
    if (!isValidBirthDate(payload.legacyVerification?.birthDate) && normalizePhoneLast4(payload.legacyVerification?.phoneLast4).length !== 4) {
      return NextResponse.json(
        {
          ok: false,
          code: "legacy_verification_required",
          message: "番号引き継ぎ登録には、生年月日または電話番号下4桁での本人確認が必要です。"
        },
        { status: 400 }
      );
    }

    const { data: legacyMember, error: legacyError } = await adminSupabase
      .from("legacy_members")
      .select("member_id,birth_date,phone,claimed_by")
      .eq("member_id", requestedLegacyMemberId)
      .maybeSingle();

    if (legacyError) {
      console.error("Legacy member verification failed", legacyError);
      return NextResponse.json(
        {
          ok: false,
          code: "legacy_verification_failed",
          details: getErrorDetails(legacyError),
          message: "既存会員情報を確認できませんでした。管理者へ確認してください。"
        },
        { status: 500 }
      );
    }

    if (!legacyMember || !verifyLegacyMember(legacyMember as LegacyMemberRow, payload.legacyVerification)) {
      return NextResponse.json(
        {
          ok: false,
          code: "legacy_verification_mismatch",
          message: "会員番号または本人確認情報が一致しません。"
        },
        { status: 400 }
      );
    }

    if ((legacyMember as LegacyMemberRow).claimed_by) {
      return NextResponse.json(
        {
          ok: false,
          code: "legacy_member_already_claimed",
          message: "この会員番号は既にアプリ登録済みです。心当たりがない場合は管理者へ確認してください。"
        },
        { status: 409 }
      );
    }
  }

  const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: false
    }
  });

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata
    }
  });

  if (error) {
    const errorDetails = getErrorDetails(error as SupabaseErrorLike);
    console.error("Supabase sign up failed", errorDetails);

    return NextResponse.json(
      {
        ok: false,
        code: "supabase_signup_failed",
        details: errorDetails,
        message: getRegisterErrorMessage(error as SupabaseErrorLike)
      },
      { status: 400 }
    );
  }

  if (!data.user?.id) {
    return NextResponse.json(
      {
        ok: false,
        code: "auth_user_missing",
        message: "Supabase AuthユーザーIDを取得できませんでした。既に同じメールアドレスで登録済みの可能性があります。"
      },
      { status: 500 }
    );
  }

  let { data: createdProfile, error: createdProfileError } = await adminSupabase
    .from("profiles")
    .select("member_id")
    .eq("id", data.user.id)
    .maybeSingle();

  if (createdProfileError) {
    console.error("Created profile lookup failed during registration", createdProfileError);
  }

  if (!createdProfile) {
    const { error: profileUpsertError } = await adminSupabase.rpc("upsert_profile_from_auth_user", {
      auth_email: email,
      auth_raw_user_meta_data: metadata,
      auth_user_id: data.user.id,
      strict_legacy_match: true
    });

    if (profileUpsertError) {
      const errorDetails = getErrorDetails(profileUpsertError);
      console.error("Profile upsert failed after signup", errorDetails);

      return NextResponse.json(
        {
          ok: false,
          code: "profile_upsert_failed",
          details: errorDetails,
          message: "Authユーザーは作成されましたが、profilesへの保存に失敗しました。補修SQLを実行してください。"
        },
        { status: 500 }
      );
    }

    const retryProfileResult = await adminSupabase
      .from("profiles")
      .select("member_id")
      .eq("id", data.user.id)
      .maybeSingle();

    createdProfile = retryProfileResult.data;
    createdProfileError = retryProfileResult.error;
  }

  if (createdProfileError || !createdProfile) {
    return NextResponse.json(
      {
        ok: false,
        code: "profile_missing_after_signup",
        details: getErrorDetails(createdProfileError),
        message: "Authユーザーは作成されましたが、profiles行を確認できませんでした。補修SQLを実行してください。"
      },
      { status: 500 }
    );
  }

  const createdMemberId = ((createdProfile as CreatedProfileRow | null)?.member_id ?? requestedLegacyMemberId) || null;

  return NextResponse.json({
    memberId: createdMemberId,
    ok: true
  });
}
