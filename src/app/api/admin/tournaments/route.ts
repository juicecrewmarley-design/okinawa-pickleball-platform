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

function toNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

export async function POST(request: Request) {
  const admin = await getAdminRouteContext();
  if (admin.response) return admin.response;

  const payload = (await request.json()) as TournamentPayload;
  const title = payload.title?.trim();
  const venue = payload.venue?.trim();
  const description = payload.description?.trim();
  const startAt = payload.start_at?.trim();

  if (!title || !venue || !description || !startAt) {
    return NextResponse.json(
      {
        ok: false,
        message: "大会名、会場、開催日時、説明を入力してください。"
      },
      { status: 400 }
    );
  }

  const { data, error } = await admin.context.supabase
    .from("tournaments")
    .insert({
      title,
      description,
      venue,
      start_at: startAt,
      entry_deadline: payload.entry_deadline || null,
      fee_yen: toNumber(payload.fee_yen),
      member_fee_yen: toNumber(payload.member_fee_yen),
      guest_fee_yen: toNumber(payload.guest_fee_yen),
      capacity: toNumber(payload.capacity),
      categories: payload.categories ?? [],
      category_capacities: payload.category_capacities ?? {},
      category_config: payload.category_config ?? {},
      status: payload.status === "draft" ? "draft" : "open",
      created_by: admin.context.profile.id
    })
    .select("id, title")
    .single();

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error.message
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    id: data.id,
    message: `大会「${data.title}」を作成しました。`
  });
}
