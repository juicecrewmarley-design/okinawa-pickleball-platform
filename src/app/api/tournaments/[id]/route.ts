import { NextResponse } from "next/server";
import { getPublicTournamentResult } from "@/lib/public-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
        ok: false,
        message: "指定された大会は見つかりませんでした。",
        tournament: null
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
