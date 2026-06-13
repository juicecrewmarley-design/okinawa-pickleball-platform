import "server-only";
import { cookies } from "next/headers";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getEffectiveProfileRole } from "@/lib/admin";
import { getSupabaseServerConfig } from "@/lib/supabase-env";
import type { MemberRole } from "@/types/domain";

export const authCookieNames = {
  accessToken: "opba-access-token",
  refreshToken: "opba-refresh-token"
} as const;

export type ServerAuthProfile = {
  email: string;
  id: string;
  role: MemberRole;
};

export type ServerAuthContext = {
  accessToken: string;
  profile: ServerAuthProfile;
  supabase: SupabaseClient;
};

export type ServerAuthDiagnostics = {
  authError?: string;
  hasAccessToken: boolean;
  isConfigured: boolean;
  missingKeys: string[];
  profileEmail: string | null;
  profileError?: string;
  profileFound: boolean;
  role: MemberRole | null;
  userEmail: string | null;
  userId: string | null;
};

export type ServerAuthContextResult = {
  context: ServerAuthContext | null;
  diagnostics: ServerAuthDiagnostics;
};

export async function getServerAuthContextWithDiagnostics(): Promise<ServerAuthContextResult> {
  const config = getSupabaseServerConfig();
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(authCookieNames.accessToken)?.value;
  const diagnostics: ServerAuthDiagnostics = {
    hasAccessToken: Boolean(accessToken),
    isConfigured: config.isConfigured,
    missingKeys: config.missingKeys,
    profileEmail: null,
    profileFound: false,
    role: null,
    userEmail: null,
    userId: null
  };

  if (!config.isConfigured || !accessToken) {
    return {
      context: null,
      diagnostics
    };
  }

  const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);

  if (userError || !userData.user) {
    diagnostics.authError = userError?.message ?? "ログインユーザーを取得できませんでした。";
    return {
      context: null,
      diagnostics
    };
  }

  diagnostics.userEmail = userData.user.email ?? null;
  diagnostics.userId = userData.user.id;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, role")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    diagnostics.profileError = profileError?.message ?? "profilesにログインユーザーの行が見つかりません。";
    return {
      context: null,
      diagnostics
    };
  }

  const email = userData.user.email ?? profile.email;
  const role = getEffectiveProfileRole(email, profile.role);
  diagnostics.profileEmail = profile.email;
  diagnostics.profileFound = true;
  diagnostics.role = role;

  return {
    context: {
      accessToken,
      profile: {
        email,
        id: profile.id,
        role
      },
      supabase
    },
    diagnostics
  };
}

export async function getServerAuthContext(): Promise<ServerAuthContext | null> {
  const result = await getServerAuthContextWithDiagnostics();
  return result.context;
}

export async function getServerAuthProfile(): Promise<ServerAuthProfile | null> {
  const context = await getServerAuthContext();
  return context?.profile ?? null;
}
