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

export type SupabaseConfigStatus = {
  isConfigured: boolean;
  missingKeys: string[];
  message?: string;
};

export async function getSupabaseConfigStatus(): Promise<SupabaseConfigStatus> {
  if (isSupabaseConfigured) {
    return {
      isConfigured: true,
      missingKeys: [],
      message: "Supabase接続済みです。"
    };
  }

  if (typeof window === "undefined") {
    return {
      isConfigured: false,
      missingKeys: [supabaseEnvNames.url, supabaseEnvNames.anonKey],
      message: "Supabase環境変数が読み込まれていません。"
    };
  }

  try {
    const response = await fetch("/api/supabase-config", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Supabase設定確認APIに接続できません。");
    }

    const config = (await response.json()) as Partial<SupabaseConfigStatus>;
    return {
      isConfigured: Boolean(config.isConfigured),
      missingKeys: config.missingKeys ?? [],
      message: config.message
    };
  } catch {
    return {
      isConfigured: false,
      missingKeys: [supabaseEnvNames.url, supabaseEnvNames.anonKey],
      message: "Supabase設定確認APIに接続できません。"
    };
  }
}

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
