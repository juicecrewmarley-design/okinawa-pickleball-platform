import type { MemberArea, ResidenceScope } from "@/types/domain";

export const residenceScopeLabels: Record<ResidenceScope, string> = {
  okinawa: "沖縄県内",
  outside: "沖縄県外"
};

export const okinawaMunicipalities = [
  "那覇市",
  "宜野湾市",
  "石垣市",
  "浦添市",
  "名護市",
  "糸満市",
  "沖縄市",
  "豊見城市",
  "うるま市",
  "宮古島市",
  "南城市",
  "国頭村",
  "大宜味村",
  "東村",
  "今帰仁村",
  "本部町",
  "恩納村",
  "宜野座村",
  "金武町",
  "伊江村",
  "読谷村",
  "嘉手納町",
  "北谷町",
  "北中城村",
  "中城村",
  "西原町",
  "与那原町",
  "南風原町",
  "渡嘉敷村",
  "座間味村",
  "粟国村",
  "渡名喜村",
  "南大東村",
  "北大東村",
  "伊平屋村",
  "伊是名村",
  "久米島町",
  "八重瀬町",
  "多良間村",
  "竹富町",
  "与那国町"
];

export function municipalityToArea(municipality: string): MemberArea {
  if (municipality === "那覇市") return "naha";
  if (["宮古島市", "多良間村"].includes(municipality)) return "miyako";
  if (["宜野湾市", "沖縄市", "うるま市", "浦添市", "読谷村", "嘉手納町", "北谷町", "北中城村", "中城村", "西原町"].includes(municipality)) {
    return "central";
  }
  if (["糸満市", "豊見城市", "南城市", "与那原町", "南風原町", "八重瀬町"].includes(municipality)) {
    return "south";
  }
  return "other";
}

export function formatResidence(scope: ResidenceScope, municipality?: string) {
  if (scope === "outside") return residenceScopeLabels.outside;
  return municipality ? `${residenceScopeLabels.okinawa} / ${municipality}` : residenceScopeLabels.okinawa;
}
