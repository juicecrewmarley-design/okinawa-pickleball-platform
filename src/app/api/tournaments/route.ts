import { NextResponse } from "next/server";
import { getPublicTournamentsResult } from "@/lib/public-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const result = await getPublicTournamentsResult();

  if (result.error) {
    return NextResponse.json(
      {
        details: result.details,
        isConfigured: result.isConfigured,
        ok: false,
        message: result.error,
        tournaments: []
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    isConfigured: result.isConfigured,
    ok: true,
    tournaments: result.data
  });
}
