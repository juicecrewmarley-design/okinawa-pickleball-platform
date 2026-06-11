import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null;

export function isAdminEmail(email?: string | null) {
  const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(",").map((item) => item.trim().toLowerCase()) ?? [];
  return Boolean(email && adminEmails.includes(email.toLowerCase()));
}
