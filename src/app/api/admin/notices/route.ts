import { NextResponse } from "next/server";
import { getAdminRouteContext } from "@/lib/admin-route";

type NoticePayload = {
  body?: string;
  is_published?: boolean;
  title?: string;
  type?: string;
};

export async function POST(request: Request) {
  const admin = await getAdminRouteContext();
  if (admin.response) return admin.response;

  const payload = (await request.json()) as NoticePayload;
  const title = payload.title?.trim();
  const body = payload.body?.trim();

  if (!title || !body) {
    return NextResponse.json(
      {
        ok: false,
        message: "お知らせのタイトルと本文を入力してください。"
      },
      { status: 400 }
    );
  }

  const { data, error } = await admin.context.supabase
    .from("notices")
    .insert({
      title,
      body,
      type: payload.type || "association",
      is_published: payload.is_published ?? true,
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
    message: `お知らせ「${data.title}」を投稿しました。`
  });
}
