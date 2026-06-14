import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { getServerAuthContextWithDiagnostics, type ServerAuthDiagnostics } from "@/lib/server-auth";
import { getSupabaseServerConfig } from "@/lib/supabase-env";

type TournamentPayload = {
  capacity?: number;
  categories?: string[];
  category_capacities?: Record<string, number>;
  category_config?: Record<string, unknown>;
  description?: string;
  entry_deadline?: string;
  fee_yen?: number;
  guest_fee_yen?: number;
  member_fee_yen?: number;
  start_at?: string;
  status?: string;
  title?: string;
  venue?: string;
};

const tournamentSelectColumns = "id,title";
const tournamentListColumns =
  "id,title,description,venue,start_at,entry_deadline,member_fee_yen,guest_fee_yen,capacity,categories,status,created_at,updated_at";

type TournamentRow = {
  capacity: number | null;
  categories: string[] | null;
  created_at: string;
  description: string;
  entry_deadline: string | null;
  guest_fee_yen: number | null;
  id: string;
  member_fee_yen: number | null;
  start_at: string;
  status: "draft" | "open" | "closed" | "finished";
  title: string;
  updated_at: string;
  venue: string;
};

type SupabaseInsertError = {
  code?: string;
  details?: string;
  hint?: string;
  message?: string;
};

type TournamentSaveDiagnostics = {
  auth: ServerAuthDiagnostics;
  dbAdmin: boolean | null;
  deletedWith?: "rls" | "service_role" | null;
  deleteError?: SupabaseInsertError | null;
  hasServiceRoleKey: boolean;
  insertError: SupabaseInsertError | null;
  insertedWith: "rls" | "service_role" | null;
  serviceRoleError: SupabaseInsertError | null;
};

function toNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function toPositiveNumber(value: unknown, fallback = 0) {
  const numberValue = toNumber(value, fallback);
  return numberValue > 0 ? numberValue : fallback;
}

function toStringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function toCapacityMap(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value).map(([key, capacity]) => [key, toPositiveNumber(capacity, 0)])
  );
}

function adminTournamentErrorMessage(error: { code?: string; message?: string }) {
  if (error.code === "42P01") {
    return "大会保存先の tournaments テーブルが見つかりません。Supabase SQL Editorで大会テーブル作成SQLを実行してください。";
  }

  if (error.code === "42501" || error.message?.toLowerCase().includes("row-level security")) {
    return "大会を保存できませんでした。SupabaseのRLSで拒否されています。ログイン中ユーザーの profiles.role が admin か確認してください。";
  }

  if (error.code === "23503") {
    return "大会を保存できませんでした。管理者ユーザーの profiles 行が見つからない可能性があります。profile-repair.sql を実行してください。";
  }

  return `大会を保存できませんでした。Supabaseエラー: ${error.message ?? "詳細不明"}`;
}

function serializeSupabaseError(error: SupabaseInsertError | null): SupabaseInsertError | null {
  if (!error) return null;

  return {
    code: error.code,
    details: error.details,
    hint: error.hint,
    message: error.message
  };
}

function errorResponse(message: string, status: number, diagnostics: TournamentSaveDiagnostics) {
  return NextResponse.json(
    {
      diagnostics,
      ok: false,
      message
    },
    { status }
  );
}

function revalidateTournamentPages(tournamentId: string) {
  revalidatePath("/");
  revalidatePath("/tournaments");
  revalidatePath(`/tournaments/${tournamentId}`);
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const config = getSupabaseServerConfig();
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

  const supabase = config.supabaseServiceRoleKey
    ? createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
        auth: {
          persistSession: false
        }
      })
    : authResult.context.supabase;

  const { data, error } = await supabase
    .from("tournaments")
    .select(tournamentListColumns)
    .order("start_at", { ascending: false });

  if (error) {
    console.error("Admin tournaments lookup failed", error);
    return NextResponse.json(
      {
        details: error.details,
        ok: false,
        message: `大会一覧を取得できませんでした。${error.message ?? ""}`.trim()
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    tournaments: ((data ?? []) as TournamentRow[]).map((tournament) => ({
      capacity: tournament.capacity ?? 0,
      categories: tournament.categories ?? [],
      createdAt: tournament.created_at,
      description: tournament.description,
      entryDeadline: tournament.entry_deadline ?? "",
      guestFeeYen: tournament.guest_fee_yen ?? 0,
      id: tournament.id,
      memberFeeYen: tournament.member_fee_yen ?? 0,
      startAt: tournament.start_at,
      status: tournament.status,
      title: tournament.title,
      updatedAt: tournament.updated_at,
      venue: tournament.venue
    }))
  });
}

export async function POST(request: Request) {
  try {
    const config = getSupabaseServerConfig();
    const authResult = await getServerAuthContextWithDiagnostics();
    const diagnostics: TournamentSaveDiagnostics = {
      auth: authResult.diagnostics,
      dbAdmin: null,
      hasServiceRoleKey: Boolean(config.supabaseServiceRoleKey),
      insertError: null,
      insertedWith: null,
      serviceRoleError: null
    };

    if (!authResult.context || !authResult.diagnostics.userId) {
      return errorResponse("ログイン情報を取得できませんでした。もう一度管理者ログインしてください。", 401, diagnostics);
    }

    if (!authResult.diagnostics.profileFound) {
      return errorResponse("ログインユーザーのプロフィールが見つかりません。profilesテーブルを確認してください。", 401, diagnostics);
    }

    if (authResult.context.profile.role !== "admin") {
      return errorResponse("管理者権限がありません。profiles.role が admin か確認してください。", 403, diagnostics);
    }

    const payload = (await request.json()) as TournamentPayload;
    const title = payload.title?.trim();
    const venue = payload.venue?.trim();
    const description = payload.description?.trim();
    const startAt = payload.start_at?.trim();
    const categories = toStringArray(payload.categories);
    const categoryCapacities = toCapacityMap(payload.category_capacities);
    const categoryConfig = payload.category_config && typeof payload.category_config === "object" ? payload.category_config : {};

    if (!title || !venue || !description || !startAt) {
      return NextResponse.json(
        {
          ok: false,
          message: "大会名、会場、開催日時、説明を入力してください。"
        },
        { status: 400 }
      );
    }

    if (categories.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "大会カテゴリを1つ以上選択してください。"
        },
        { status: 400 }
      );
    }

    const { data: dbAdmin, error: adminCheckError } = await authResult.context.supabase.rpc("is_admin");
    diagnostics.dbAdmin = dbAdmin === true;

    if (adminCheckError || dbAdmin !== true) {
      console.error("Admin tournament saving rejected by DB admin check", {
        adminCheckError,
        dbAdmin,
        auth: diagnostics.auth,
        profile: authResult.context.profile
      });

      return errorResponse(
        adminCheckError
          ? adminTournamentErrorMessage(adminCheckError)
          : "大会を保存できませんでした。Supabase側で管理者判定が通りませんでした。",
        403,
        diagnostics
      );
    }

    const tournamentPayload = {
      title,
      description,
      venue,
      start_at: startAt,
      entry_deadline: payload.entry_deadline || null,
      fee_yen: toNumber(payload.fee_yen),
      member_fee_yen: toNumber(payload.member_fee_yen),
      guest_fee_yen: toNumber(payload.guest_fee_yen),
      capacity: toPositiveNumber(payload.capacity),
      categories,
      category_capacities: categoryCapacities,
      category_config: {
        ...categoryConfig,
        categoryCapacities
      },
      status: payload.status === "draft" ? "draft" : "open",
      created_by: authResult.context.profile.id
    };

    const { data, error } = await authResult.context.supabase
      .from("tournaments")
      .insert(tournamentPayload)
      .select(tournamentSelectColumns)
      .single();

    if (!error) {
      diagnostics.insertedWith = "rls";
      revalidateTournamentPages(data.id);

      return NextResponse.json({
        diagnostics,
        ok: true,
        id: data.id,
        message: "大会を保存しました"
      });
    }

    diagnostics.insertError = serializeSupabaseError(error);
    console.error("Admin tournament insert failed", {
      error,
      auth: diagnostics.auth,
      payload: tournamentPayload,
      profile: authResult.context.profile,
      table: "public.tournaments"
    });

    if (config.supabaseServiceRoleKey) {
      const serviceSupabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
        auth: {
          persistSession: false
        }
      });

      const { data: serviceData, error: serviceError } = await serviceSupabase
        .from("tournaments")
        .insert(tournamentPayload)
        .select(tournamentSelectColumns)
        .single();

      if (!serviceError) {
        diagnostics.insertedWith = "service_role";
        revalidateTournamentPages(serviceData.id);

        return NextResponse.json({
          diagnostics,
          ok: true,
          id: serviceData.id,
          message: "大会を保存しました"
        });
      }

      diagnostics.serviceRoleError = serializeSupabaseError(serviceError);
      console.error("Admin tournament service role insert failed", {
        error: serviceError,
        auth: diagnostics.auth,
        payload: tournamentPayload,
        profile: authResult.context.profile,
        table: "public.tournaments"
      });
    } else {
      console.error("Admin tournament insert failed", {
        error,
        auth: diagnostics.auth,
        hasServiceRoleKey: false,
        payload: tournamentPayload,
        profile: authResult.context.profile,
        table: "public.tournaments"
      });
    }

    return errorResponse(
      config.supabaseServiceRoleKey
        ? adminTournamentErrorMessage(error)
        : `${adminTournamentErrorMessage(error)} Vercelに SUPABASE_SERVICE_ROLE_KEY を設定すると、管理者確認後にサーバー側から保存できます。`,
      400,
      diagnostics
    );
  } catch (error) {
    console.error("Admin tournament route crashed", error);

    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? `大会を保存できませんでした。${error.message}` : "大会保存中に予期しないエラーが発生しました。"
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const config = getSupabaseServerConfig();
    const authResult = await getServerAuthContextWithDiagnostics();
    const diagnostics: TournamentSaveDiagnostics = {
      auth: authResult.diagnostics,
      dbAdmin: null,
      deletedWith: null,
      deleteError: null,
      hasServiceRoleKey: Boolean(config.supabaseServiceRoleKey),
      insertError: null,
      insertedWith: null,
      serviceRoleError: null
    };

    if (!authResult.context || !authResult.diagnostics.userId) {
      return errorResponse("ログイン情報を取得できませんでした。もう一度管理者ログインしてください。", 401, diagnostics);
    }

    if (!authResult.diagnostics.profileFound) {
      return errorResponse("ログインユーザーのプロフィールが見つかりません。profilesテーブルを確認してください。", 401, diagnostics);
    }

    if (authResult.context.profile.role !== "admin") {
      return errorResponse("管理者権限がありません。profiles.role が admin か確認してください。", 403, diagnostics);
    }

    const tournamentId = new URL(request.url).searchParams.get("id")?.trim();

    if (!tournamentId) {
      return errorResponse("削除する大会IDが指定されていません。", 400, diagnostics);
    }

    const { data: dbAdmin, error: adminCheckError } = await authResult.context.supabase.rpc("is_admin");
    diagnostics.dbAdmin = dbAdmin === true;

    if (adminCheckError || dbAdmin !== true) {
      console.error("Admin tournament delete rejected by DB admin check", {
        adminCheckError,
        auth: diagnostics.auth,
        dbAdmin,
        profile: authResult.context.profile,
        tournamentId
      });

      return errorResponse(
        adminCheckError
          ? adminTournamentErrorMessage(adminCheckError)
          : "大会を削除できませんでした。Supabase側で管理者判定が通りませんでした。",
        403,
        diagnostics
      );
    }

    if (config.supabaseServiceRoleKey) {
      const serviceSupabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
        auth: {
          persistSession: false
        }
      });

      const { data, error } = await serviceSupabase
        .from("tournaments")
        .delete()
        .eq("id", tournamentId)
        .select(tournamentSelectColumns)
        .maybeSingle();

      if (error) {
        diagnostics.deleteError = serializeSupabaseError(error);
        console.error("Admin tournament service role delete failed", {
          error,
          auth: diagnostics.auth,
          profile: authResult.context.profile,
          table: "public.tournaments",
          tournamentId
        });

        return errorResponse(`大会を削除できませんでした。Supabaseエラー: ${error.message ?? "詳細不明"}`, 400, diagnostics);
      }

      if (!data) {
        return errorResponse("削除対象の大会が見つかりませんでした。", 404, diagnostics);
      }

      diagnostics.deletedWith = "service_role";
      revalidateTournamentPages(tournamentId);

      return NextResponse.json({
        diagnostics,
        id: tournamentId,
        message: "大会を削除しました。",
        ok: true
      });
    }

    const { data, error } = await authResult.context.supabase
      .from("tournaments")
      .delete()
      .eq("id", tournamentId)
      .select(tournamentSelectColumns)
      .maybeSingle();

    if (error) {
      diagnostics.deleteError = serializeSupabaseError(error);
      console.error("Admin tournament RLS delete failed", {
        error,
        auth: diagnostics.auth,
        profile: authResult.context.profile,
        table: "public.tournaments",
        tournamentId
      });

      return errorResponse(
        `大会を削除できませんでした。Supabaseエラー: ${error.message ?? "詳細不明"} Vercelに SUPABASE_SERVICE_ROLE_KEY を設定すると、管理者確認後にサーバー側から削除できます。`,
        400,
        diagnostics
      );
    }

    if (!data) {
      return errorResponse("削除対象の大会が見つかりませんでした。", 404, diagnostics);
    }

    diagnostics.deletedWith = "rls";
    revalidateTournamentPages(tournamentId);

    return NextResponse.json({
      diagnostics,
      id: tournamentId,
      message: "大会を削除しました。",
      ok: true
    });
  } catch (error) {
    console.error("Admin tournament delete route crashed", error);

    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? `大会を削除できませんでした。${error.message}` : "大会削除中に予期しないエラーが発生しました。"
      },
      { status: 500 }
    );
  }
}
