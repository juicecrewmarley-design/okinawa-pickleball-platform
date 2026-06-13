import { NextResponse } from "next/server";
import { getAdminRouteContext } from "@/lib/admin-route";

type SponsorPayload = {
  company_name?: string;
  description?: string;
  is_active?: boolean;
  logo_url?: string;
  rank?: string;
  website_url?: string;
};

export async function POST(request: Request) {
  const admin = await getAdminRouteContext();
  if (admin.response) return admin.response;

  const payload = (await request.json()) as SponsorPayload;
  const companyName = payload.company_name?.trim();
  const description = payload.description?.trim();

  if (!companyName || !description) {
    return NextResponse.json(
      {
        ok: false,
        message: "企業名と紹介文を入力してください。"
      },
      { status: 400 }
    );
  }

  const { data, error } = await admin.context.supabase
    .from("sponsors")
    .insert({
      company_name: companyName,
      description,
      website_url: payload.website_url || "",
      logo_url: payload.logo_url || "",
      rank: payload.rank || "supporter",
      is_active: payload.is_active ?? true
    })
    .select("id, company_name")
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
    message: `協賛企業「${data.company_name}」を登録しました。`
  });
}
