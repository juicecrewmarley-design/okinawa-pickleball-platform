export type MemberArea = "south" | "naha" | "central" | "miyako" | "other";

export type ResidenceScope = "okinawa" | "outside";

export type Gender = "male" | "female" | "other" | "no_answer";

export type MemberRole = "member" | "admin" | "sponsor";

export type MembershipType = "general" | "premium";

export type PaymentMethod = "cash" | "paypay";

export type TournamentStatus = "draft" | "open" | "closed" | "finished";

export type RankingCategory = "mens" | "womens" | "mixed" | "overall";

export type MemberProfile = {
  id: string;
  memberId: string;
  fullName: string;
  furigana: string;
  gender: Gender;
  birthDate: string;
  phone: string;
  email: string;
  area: MemberArea;
  residenceScope: ResidenceScope;
  municipality?: string;
  role: MemberRole;
  membershipType: MembershipType;
  opr: number;
  ranking: number;
};

export type Tournament = {
  id: string;
  title: string;
  description: string;
  venue: string;
  startAt: string;
  entryDeadline: string;
  feeYen: number;
  memberFeeYen?: number;
  guestFeeYen?: number;
  capacity: number;
  categoryCapacities?: Record<string, number>;
  categories: string[];
  categoryConfig?: TournamentCategoryConfig;
  status: TournamentStatus;
};

export type TournamentCategoryConfig = {
  doubles: {
    divisions: string[];
    classes: string[];
  };
  team: {
    enabled: boolean;
    ageCategories: string[];
  };
  categoryCapacities?: Record<string, number>;
  fees?: {
    member: number;
    guest: number;
  };
};

export type TournamentEntry = {
  id: string;
  tournamentId: string;
  memberId: string;
  memberName: string;
  category: string;
  pairOrTeamName?: string;
  teamName?: string;
  applicantType?: "member" | "guest";
  applicantMembershipType?: MembershipType;
  applicantName?: string;
  applicantEmail?: string;
  applicantPhone?: string;
  entryFeeYen?: number;
  paymentMethod?: PaymentMethod;
  entryType?: "doubles" | "team";
  partnerMemberId?: string;
  partnerName?: string;
  teamMembers?: { memberId: string; name: string }[];
  linkingStatus?: "waiting" | "linked";
  status: "pending" | "confirmed" | "cancelled";
  createdAt: string;
};

export type RankingRow = {
  rank: number;
  memberId: string;
  fullName: string;
  area: MemberArea;
  points: number;
  wins: number;
};

export type Notice = {
  id: string;
  title: string;
  body: string;
  type: "event" | "tournament" | "practice" | "association";
  publishedAt: string;
};

export type Sponsor = {
  id: string;
  companyName: string;
  description: string;
  websiteUrl: string;
  rank: "platinum" | "gold" | "silver" | "bronze" | "supporter";
  logoLabel: string;
};
