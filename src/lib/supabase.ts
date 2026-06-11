import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const supabaseEnvNames = {
  url: "NEXT_PUBLIC_SUPABASE_URL",
  anonKey: "NEXT_PUBLIC_SUPABASE_ANON_KEY"
} as const;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null;

let runtimeSupabase: SupabaseClient | null = supabase;

export async function getSupabaseClient() {
  if (runtimeSupabase) return runtimeSupabase;
  if (typeof window === "undefined") return null;

  try {
    const response = await fetch("/api/supabase-config", { cache: "no-store" });
    if (!response.ok) return null;

    const config = (await response.json()) as {
      isConfigured?: boolean;
      supabaseUrl?: string | null;
      supabaseAnonKey?: string | null;
    };

    if (!config.isConfigured || !config.supabaseUrl || !config.supabaseAnonKey) {
      return null;
    }

    runtimeSupabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
    return runtimeSupabase;
  } catch {
    return null;
  }
}

export function isAdminEmail(email?: string | null) {
  const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(",").map((item) => item.trim().toLowerCase()) ?? [];
  return Boolean(email && adminEmails.includes(email.toLowerCase()));
}
