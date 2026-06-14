import { NextResponse } from "next/server";
import { getPublicTournamentResult } from "@/lib/public-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim());
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = rawId.trim();

  if (!isUuid(id)) {
    return NextResponse.json(
      {
        currentUrl: request.url,
        isConfigured: true,
        ok: false,
        message: "この大会URLはSupabaseの大会IDではありません。大会一覧から管理画面で作成した大会を開き直してください。",
        tournament: null,
        tournamentId: id
      },
      { status: 400 }
    );
  }

  const result = await getPublicTournamentResult(id);

  if (result.error) {
    return NextResponse.json(
      {
        details: result.details,
        isConfigured: result.isConfigured,
        ok: false,
        message: result.error,
        tournament: null
      },
      { status: 500 }
    );
  }

  if (!result.data) {
    return NextResponse.json(
      {
        isConfigured: result.isConfigured,
        currentUrl: request.url,
        ok: false,
        message: "指定された大会はSupabaseの public.tournaments に見つかりませんでした。大会一覧から開き直してください。",
        tournament: null,
        tournamentId: id
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    isConfigured: result.isConfigured,
    ok: true,
    tournament: result.data
  });
}
