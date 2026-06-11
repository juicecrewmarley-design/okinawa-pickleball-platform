import { formatResidence } from "@/lib/okinawa";
import type { MemberProfile } from "@/types/domain";

export function generateMemberId() {
  const random = Math.floor(1000 + Math.random() * 9000);
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
