import type { MemberRole } from "@/types/domain";

export const singleAdminEmail = "juicecrewmarley@yahoo.co.jp";

export function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? "";
}

export function isSingleAdminEmail(email?: string | null) {
  return normalizeEmail(email) === singleAdminEmail;
}

export function getEffectiveProfileRole(email: string | null | undefined, role: MemberRole): MemberRole {
  if (role === "admin") {
    return isSingleAdminEmail(email) ? "admin" : "member";
  }

  return role;
}

export function getInitialProfileRole(email?: string | null): MemberRole {
  return isSingleAdminEmail(email) ? "admin" : "member";
}
