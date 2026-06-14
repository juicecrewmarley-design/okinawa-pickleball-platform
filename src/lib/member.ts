import { formatResidence } from "@/lib/okinawa";
import type { MemberProfile, MembershipType } from "@/types/domain";

export function generateMemberId() {
  const random = Math.floor(1500 + Math.random() * 8500);
  return `OKP-${random}`;
}

export function normalizeMemberId(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function normalizeMemberNumber(value: string) {
  return value.replace(/\D/g, "");
}

export function formatLegacyMemberId(value: string) {
  const normalized = normalizeMemberId(value);
  const number = normalized.match(/^(?:OKP-?)?(\d+)$/)?.[1];
  if (!number) return normalized;
  return `OKP-${number.padStart(4, "0")}`;
}

export function getMemberNumber(memberId: string) {
  const number = normalizeMemberId(memberId).match(/^(?:OKP-?)?(\d+)$/)?.[1];
  return number ? Number(number) : null;
}

export function isLegacyPremiumMemberId(memberId: string) {
  const memberNumber = getMemberNumber(memberId);
  return memberNumber !== null && memberNumber >= 1 && memberNumber <= 209;
}

export function normalizeMembershipType(value?: string | null, memberId = ""): MembershipType {
  if (isLegacyPremiumMemberId(memberId)) return "premium";
  return value === "premium" ? "premium" : "general";
}

export function getMembershipLabel(type: MembershipType) {
  return type === "premium" ? "プレミアム会員" : "一般会員";
}

export function buildMemberCardPayload(member: Pick<MemberProfile, "memberId" | "fullName" | "residenceScope" | "municipality">) {
  return JSON.stringify({
    issuer: "Okinawa Pickleball Association",
    memberId: member.memberId,
    name: member.fullName,
    residence: formatResidence(member.residenceScope, member.municipality),
    issuedAt: new Date().toISOString()
  });
}

export function formatYen(value: number) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0
  }).format(value);
}
