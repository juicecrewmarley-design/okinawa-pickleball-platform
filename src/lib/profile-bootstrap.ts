import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getEffectiveProfileRole, getInitialProfileRole, isSingleAdminEmail } from "@/lib/admin";

type ProfileRole = "member" | "admin" | "sponsor";

export type AuthProfile = {
  email: string;
  id: string;
  role: ProfileRole;
};

export async function ensureProfileForUser(supabase: SupabaseClient, user: User): Promise<AuthProfile | null> {
  const { data: existingProfile, error: existingProfileError } = await supabase
    .from("profiles")
    .select("id, email, role")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfileError) {
    throw existingProfileError;
  }

  if (existingProfile) {
    const authEmail = user.email ?? existingProfile.email;

    if (isSingleAdminEmail(authEmail) && existingProfile.role !== "admin") {
      const { data: updatedProfile, error: updatedProfileError } = await supabase
        .from("profiles")
        .update({
          email: authEmail,
          role: "admin"
        })
        .eq("id", user.id)
        .select("id, email, role")
        .single();

      if (!updatedProfileError && updatedProfile) {
        return updatedProfile as AuthProfile;
      }
    }

    return {
      ...(existingProfile as AuthProfile),
      role: getEffectiveProfileRole(authEmail, existingProfile.role as ProfileRole)
    };
  }

  const metadata = user.user_metadata ?? {};
  const email = user.email ?? "";
  const fallbackName = email ? email.split("@")[0] : "会員";

  const { data: createdProfile, error: createdProfileError } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      full_name: String(metadata.full_name ?? fallbackName),
      furigana: String(metadata.furigana ?? ""),
      gender: String(metadata.gender ?? "no_answer"),
      birth_date: metadata.birth_date || null,
      phone: String(metadata.phone ?? ""),
      email,
      area: String(metadata.area ?? "other"),
      residence_scope: String(metadata.residence_scope ?? "okinawa"),
      municipality: metadata.municipality ? String(metadata.municipality) : null,
      role: getInitialProfileRole(email)
    })
    .select("id, email, role")
    .single();

  if (createdProfileError) {
    throw createdProfileError;
  }

  return createdProfile as AuthProfile;
}
