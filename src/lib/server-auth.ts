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

export async function getServerAuthContext(): Promise<ServerAuthContext | null> {
  const config = getSupabaseServerConfig();
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(authCookieNames.accessToken)?.value;

  if (!config.isConfigured || !accessToken) {
    return null;
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
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, role")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return null;
  }

  const email = userData.user.email ?? profile.email;

  return {
    accessToken,
    profile: {
      email,
      id: profile.id,
      role: getEffectiveProfileRole(email, profile.role)
    },
    supabase
  };
}

export async function getServerAuthProfile(): Promise<ServerAuthProfile | null> {
  const context = await getServerAuthContext();
  return context?.profile ?? null;
}
