import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
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

export async function getServerAuthProfile(): Promise<ServerAuthProfile | null> {
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

  return {
    email: profile.email,
    id: profile.id,
    role: profile.role
  };
}
