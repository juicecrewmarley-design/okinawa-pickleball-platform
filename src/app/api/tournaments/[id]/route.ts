import { NextResponse } from "next/server";
import { getPublicTournament } from "@/lib/public-data";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournament = await getPublicTournament(id);

  return NextResponse.json({
    ok: Boolean(tournament),
    tournament
  });
}
