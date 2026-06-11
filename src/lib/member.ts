import { formatResidence } from "@/lib/okinawa";
import type { MemberProfile } from "@/types/domain";

export function generateMemberId() {
  const random = Math.floor(1000 + Math.random() * 9000);
  return `OKP-${random}`;
}

export function normalizeMemberId(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
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
