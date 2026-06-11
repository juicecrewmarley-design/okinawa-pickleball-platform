import { NextResponse } from "next/server";
import { getSupabaseServerConfig } from "@/lib/supabase-env";

export const dynamic = "force-dynamic";

export function GET() {
  const config = getSupabaseServerConfig();

  return NextResponse.json(
    {
      isConfigured: config.isConfigured,
      missingKeys: config.missingKeys,
      hasUrl: Boolean(config.supabaseUrl),
      hasAnonKey: Boolean(config.supabaseAnonKey),
      supabaseUrl: config.isConfigured ? config.supabaseUrl : null,
      message: config.isConfigured
        ? "Supabase接続済みです。"
        : `Supabase未接続です。不足: ${config.missingKeys.join(", ")}`
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
