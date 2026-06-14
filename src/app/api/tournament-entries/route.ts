import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerConfig } from "@/lib/supabase-env";

type ApplicantType = "member" | "guest";
type EntryType = "doubles" | "team";

type EntryPayload = {
  applicantEmail?: string | null;
  applicantMemberId?: string | null;
  applicantName?: string | null;
  applicantPhone?: string | null;
  applicantType?: ApplicantType;
  category?: string;
  classOrAgeCategory?: string;
  division?: string;
  entryFeeYen?: number;
  entryType?: EntryType;
  partnerMemberId?: string | null;
  partnerName?: string | null;
  teamMembers?: { memberId?: string | null; name?: string | null }[];
  teamName?: string | null;
  tournamentId?: string | null;
};

type MemberLookupRow = {
  email: string | null;
  full_name: string;
  member_id: string;
  phone: string | null;
};

type SupabaseErrorLike = {
  code?: string;
  details?: string;
  message?: string;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function compact(value?: string | null) {
  return (value ?? "").trim();
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function buildDiagnostics({
  currentUrl,
  hasServiceRoleKey,
  receivedTournamentId,
  tournamentLookupData = null,
  tournamentLookupError = null
}: {
  currentUrl: string;
  hasServiceRoleKey: boolean;
  receivedTournamentId: string;
  tournamentLookupData?: unknown;
  tournamentLookupError?: unknown;
}) {
  return {
    currentUrl,
    hasServiceRoleKey,
    receivedTournamentId,
    tournamentId: receivedTournamentId,
    tournamentLookupData,
    tournamentLookupError
  };
}

function normalizeMemberId(value?: string | null) {
  return compact(value).toUpperCase().replace(/\s+/g, "");
}

function buildMemberIdVariants(value?: string | null) {
  const normalized = normalizeMemberId(value);
  const variants = new Set<string>();
  if (!normalized) return [];

  variants.add(normalized);

  const trailingNumber = normalized.match(/(\d+)$/)?.[1];
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

async function findMember(supabase: SupabaseClient, memberId?: string | null) {
  const variants = buildMemberIdVariants(memberId);
  if (variants.length === 0) return null;

  for (const tableName of ["profiles", "legacy_members"] as const) {
    const { data, error } = await supabase
      .from(tableName)
      .select("member_id,full_name,email,phone")
      .in("member_id", variants)
      .limit(10);

    if (error) throw error;

    const member = pickPreferredMember(data as MemberLookupRow[] | null, variants);
    if (member) return member;
  }

  return null;
}

function getSupabaseErrorMessage(error: SupabaseErrorLike) {
  const missingColumn = getMissingColumnName(error);

  if (error.code === "PGRST204") {
    return missingColumn
      ? `エントリー保存に必要なカラム '${missingColumn}' がSupabaseにありません。supabase/tournament-entries-repair.sql をSQL Editorで実行してください。`
      : "エントリー保存に必要なカラムがSupabaseにありません。supabase/tournament-entries-repair.sql をSQL Editorで実行してください。";
  }

  if (error.code === "23503") {
    return "大会IDまたは会員IDの紐づけで保存できませんでした。大会データが存在するか確認してください。";
  }

  if (error.code === "23505") {
    return "同じ大会・カテゴリへのエントリーが既に存在する可能性があります。";
  }

  return error.message ? `エントリーを保存できませんでした。${error.message}` : "エントリーを保存できませんでした。";
}

function getMissingColumnName(error: SupabaseErrorLike) {
  const source = [error.message, error.details].filter(Boolean).join(" ");
  return source.match(/'([^']+)' column/)?.[1] ?? source.match(/column "([^"]+)"/i)?.[1] ?? null;
}

function toLookupError(error: SupabaseErrorLike | null) {
  if (!error) return null;

  return {
    code: error.code ?? null,
    details: error.details ?? null,
    message: error.message ?? null
  };
}

export async function POST(request: Request) {
  const currentUrl = request.headers.get("referer") ?? request.url;
  const config = getSupabaseServerConfig();
  const hasServiceRoleKey = Boolean(config.supabaseServiceRoleKey);
  const payload = (await request.json()) as EntryPayload;
  const receivedTournamentId = compact(payload.tournamentId);

  const baseDiagnostics = {
    currentUrl,
    hasServiceRoleKey,
    receivedTournamentId
  };

  if (!config.supabaseUrl || !hasServiceRoleKey) {
    return NextResponse.json(
      {
        ...buildDiagnostics(baseDiagnostics),
        ok: false,
        message:
          "エントリー保存にはSupabaseのサーバー用設定が必要です。Vercelに NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を設定してください。"
      },
      { status: 500 }
    );
  }

  if (!receivedTournamentId) {
    return NextResponse.json(
      {
        ...buildDiagnostics(baseDiagnostics),
        ok: false,
        message: "大会IDが送信されていません。大会一覧から開き直してください。"
      },
      { status: 400 }
    );
  }

  if (!isUuid(receivedTournamentId)) {
    return NextResponse.json(
      {
        ...buildDiagnostics(baseDiagnostics),
        ok: false,
        message: "大会IDの形式がUUIDではありません。大会一覧から管理画面で作成した大会を開き直してください。"
      },
      { status: 400 }
    );
  }

  const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
      persistSession: false
    }
  });

  const { data: tournament, error: tournamentError } = await supabase
    .from("tournaments")
    .select("id,status,title")
    .eq("id", receivedTournamentId)
    .maybeSingle();

  if (tournamentError || !tournament) {
    const diagnostics = buildDiagnostics({
      ...baseDiagnostics,
      tournamentLookupData: tournament,
      tournamentLookupError: toLookupError(tournamentError)
    });

    return NextResponse.json(
      {
        ...diagnostics,
        ok: false,
        message: tournamentError
          ? `大会IDの存在確認に失敗しました。${tournamentError.message ?? ""}`.trim()
          : "指定された大会IDはSupabaseの public.tournaments に見つかりませんでした。"
      },
      { status: tournamentError ? 500 : 404 }
    );
  }

  if (tournament.status !== "open") {
    return NextResponse.json(
      {
        ...buildDiagnostics({
          ...baseDiagnostics,
          tournamentLookupData: tournament
        }),
        ok: false,
        message: "この大会は現在エントリー受付中ではありません。"
      },
      { status: 400 }
    );
  }

  try {
    const applicantType: ApplicantType = payload.applicantType === "guest" ? "guest" : "member";
    const entryType: EntryType = payload.entryType === "team" ? "team" : "doubles";
    const applicantMember = applicantType === "member" ? await findMember(supabase, payload.applicantMemberId) : null;

    if (applicantType === "member" && !applicantMember) {
      return NextResponse.json(
        {
          ...buildDiagnostics({
            ...baseDiagnostics,
            tournamentLookupData: tournament
          }),
          ok: false,
          message: "申込者の会員IDが見つかりませんでした。番号を確認してください。"
        },
        { status: 400 }
      );
    }

    const applicantName = compact(payload.applicantName) || applicantMember?.full_name || "";
    const applicantEmail = compact(payload.applicantEmail) || applicantMember?.email || "";
    const applicantPhone = compact(payload.applicantPhone) || applicantMember?.phone || "";

    if (applicantType === "guest" && (!applicantName || !applicantEmail || !applicantPhone)) {
      return NextResponse.json(
        {
          ...buildDiagnostics({
            ...baseDiagnostics,
            tournamentLookupData: tournament
          }),
          ok: false,
          message: "非会員エントリーは、申込者氏名・メールアドレス・電話番号を入力してください。"
        },
        { status: 400 }
      );
    }

    let partnerMember: MemberLookupRow | null = null;
    if (entryType === "doubles" && compact(payload.partnerMemberId)) {
      partnerMember = await findMember(supabase, payload.partnerMemberId);
      if (!partnerMember) {
        return NextResponse.json(
          {
            ...buildDiagnostics({
              ...baseDiagnostics,
              tournamentLookupData: tournament
            }),
            ok: false,
            message: "ペアの会員IDが見つかりませんでした。番号を確認するか、ペア氏名を入力してください。"
          },
          { status: 400 }
        );
      }
    }

    const partnerName = compact(payload.partnerName) || partnerMember?.full_name || "";
    if (entryType === "doubles" && !payload.partnerMemberId && !partnerName) {
      return NextResponse.json(
        {
          ...buildDiagnostics({
            ...baseDiagnostics,
            tournamentLookupData: tournament
          }),
          ok: false,
          message: "ペアの会員IDまたは氏名を入力してください。"
        },
        { status: 400 }
      );
    }

    const teamMembers =
      entryType === "team"
        ? await Promise.all(
            (payload.teamMembers ?? []).slice(0, 3).map(async (member, index) => {
              const memberId = compact(member.memberId);
              const linkedMember = memberId ? await findMember(supabase, memberId) : null;

              if (memberId && !linkedMember) {
                throw new Error(`メンバー${index + 2}の会員IDが見つかりませんでした。番号を確認するか、氏名を入力してください。`);
              }

              const name = compact(member.name) || linkedMember?.full_name || "";
              if (!memberId && !name) {
                throw new Error(`メンバー${index + 2}の会員IDまたは氏名を入力してください。`);
              }

              return {
                memberId: linkedMember?.member_id ?? memberId,
                name
              };
            })
          )
        : [];

    const isLinked =
      entryType === "doubles"
        ? applicantType === "member" && Boolean(applicantMember && partnerMember)
        : applicantType === "member" && Boolean(applicantMember) && teamMembers.length === 3 && teamMembers.every((member) => member.memberId);

    const entry = {
      applicant_email: applicantEmail,
      applicant_member_id: applicantType === "member" ? applicantMember?.member_id ?? compact(payload.applicantMemberId) : null,
      applicant_name: applicantName,
      applicant_phone: applicantPhone,
      applicant_type: applicantType,
      category: compact(payload.category),
      class_or_age_category: compact(payload.classOrAgeCategory),
      division: compact(payload.division),
      entry_fee_yen: Number.isFinite(payload.entryFeeYen) ? Math.max(0, Number(payload.entryFeeYen)) : 0,
      entry_type: entryType,
      linking_status: isLinked ? "linked" : "waiting",
      pair_or_team_name: entryType === "team" ? compact(payload.teamName) || null : null,
      partner_member_id: entryType === "doubles" && partnerMember ? partnerMember.member_id : compact(payload.partnerMemberId) || null,
      partner_name: entryType === "doubles" ? partnerName : null,
      status: isLinked ? "confirmed" : "pending",
      team_members: entryType === "team" ? teamMembers : [],
      team_name: entryType === "team" ? compact(payload.teamName) || null : null,
      tournament_id: receivedTournamentId,
      user_id: null
    };

    const { error } = await supabase.from("tournament_entries").insert(entry);

    if (error) {
      console.error("Tournament entry insert failed", {
        code: error.code,
        details: error.details,
        message: error.message
      });

      return NextResponse.json(
        {
          ...buildDiagnostics({
            ...baseDiagnostics,
            tournamentLookupData: tournament
          }),
          code: error.code,
          details: error.details,
          missingColumn: getMissingColumnName(error),
          ok: false,
          message: getSupabaseErrorMessage(error)
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...buildDiagnostics({
        ...baseDiagnostics,
        tournamentLookupData: tournament
      }),
      linkingStatus: entry.linking_status,
      ok: true,
      status: entry.status
    });
  } catch (error) {
    console.error("Tournament entry request failed", error);

    const message = error instanceof Error ? error.message : "エントリー保存中にエラーが発生しました。";
    const status = /入力|見つかりません/.test(message) ? 400 : 500;

    return NextResponse.json(
      {
        ...buildDiagnostics({
          ...baseDiagnostics,
          tournamentLookupData: tournament
        }),
        ok: false,
        message
      },
      { status }
    );
  }
}
