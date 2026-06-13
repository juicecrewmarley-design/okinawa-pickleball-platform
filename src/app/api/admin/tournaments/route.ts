import { NextResponse } from "next/server";
import { getAdminRouteContext } from "@/lib/admin-route";

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

export async function POST(request: Request) {
  try {
    const admin = await getAdminRouteContext();
    if (admin.response) return admin.response;

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

    const { data: dbAdmin, error: adminCheckError } = await admin.context.supabase.rpc("is_admin");

    if (adminCheckError || dbAdmin !== true) {
      console.error("Admin tournament saving rejected by DB admin check", {
        adminCheckError,
        dbAdmin,
        profile: admin.context.profile
      });

      return NextResponse.json(
        {
          ok: false,
          message: adminCheckError
            ? adminTournamentErrorMessage(adminCheckError)
            : "大会を保存できませんでした。Supabase上の profiles.role が admin になっているか確認してください。"
        },
        { status: 403 }
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
      created_by: admin.context.profile.id
    };

    const { data, error } = await admin.context.supabase
      .from("tournaments")
      .insert(tournamentPayload)
      .select(tournamentSelectColumns)
      .single();

    if (error) {
      console.error("Admin tournament insert failed", {
        error,
        payload: tournamentPayload,
        profile: admin.context.profile,
        table: "public.tournaments"
      });

      return NextResponse.json(
        {
          ok: false,
          message: adminTournamentErrorMessage(error)
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      id: data.id,
      message: "大会を保存しました"
    });
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
