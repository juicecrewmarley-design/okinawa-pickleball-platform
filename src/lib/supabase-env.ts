export function getSupabaseServerConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim() || "";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || process.env.SUPABASE_ANON_KEY?.trim() || "";
  const missingKeys = [
    supabaseUrl ? "" : "NEXT_PUBLIC_SUPABASE_URL",
    supabaseAnonKey ? "" : "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  ].filter(Boolean);

  return {
    isConfigured: Boolean(supabaseUrl && supabaseAnonKey),
    missingKeys,
    supabaseAnonKey,
    supabaseUrl
  };
}
