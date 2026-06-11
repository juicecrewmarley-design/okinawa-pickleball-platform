import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);

  return NextResponse.json(
    {
      isConfigured,
      supabaseUrl: isConfigured ? supabaseUrl : null,
      supabaseAnonKey: isConfigured ? supabaseAnonKey : null
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
