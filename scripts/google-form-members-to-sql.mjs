import { readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";

const [, , inputPathArg, outputPathArg = "supabase/legacy-members-import.sql"] = process.argv;

if (!inputPathArg) {
  console.error("Usage: npm run import:legacy-members -- <google-form.csv> [output.sql]");
  process.exit(1);
}

const inputPath = resolve(inputPathArg);
const outputPath = resolve(outputPathArg);
const csvText = readFileSync(inputPath, "utf8").replace(/^\uFEFF/, "");
const rows = parseCsv(csvText);

if (rows.length < 2) {
  console.error("CSVにデータ行がありません。");
  process.exit(1);
}

const headers = rows[0].map((header) => header.trim());
const records = rows.slice(1).map((row) => rowToRecord(headers, row)).filter((record) => record.member_id && record.email);

if (records.length === 0) {
  console.error("会員IDとメールアドレスを持つ行が見つかりません。");
  process.exit(1);
}

const values = records.map((record) => {
  return `(${[
    sql(record.member_id),
    sql(record.email),
    sql(record.full_name),
    sql(record.furigana),
    sql(record.gender),
    sql(record.birth_date),
    sql(record.phone),
    sql(record.residence_scope),
    sql(record.area),
    sql(record.prefecture),
    sql(record.municipality),
    sql(record.region_text),
    sql(record.pickleball_experience),
    sql(record.form_timestamp),
    sql(`google_form:${basename(inputPath)}`)
  ].join(", ")})`;
});

const output = `-- Googleフォーム既存会員インポートSQL
-- Generated from: ${basename(inputPath)}
-- Rows: ${records.length}

insert into public.legacy_members (
  member_id,
  email,
  full_name,
  furigana,
  gender,
  birth_date,
  phone,
  residence_scope,
  area,
  prefecture,
  municipality,
  region_text,
  pickleball_experience,
  form_timestamp,
  source
) values
${values.join(",\n")}
on conflict (member_id) do update set
  email = excluded.email,
  full_name = excluded.full_name,
  furigana = excluded.furigana,
  gender = excluded.gender,
  birth_date = excluded.birth_date,
  phone = excluded.phone,
  residence_scope = excluded.residence_scope,
  area = excluded.area,
  prefecture = excluded.prefecture,
  municipality = excluded.municipality,
  region_text = excluded.region_text,
  pickleball_experience = excluded.pickleball_experience,
  form_timestamp = excluded.form_timestamp,
  source = excluded.source,
  updated_at = now();

select public.sync_member_id_sequence();
`;

writeFileSync(outputPath, output, "utf8");
console.log(`Created ${outputPath}`);
console.log(`Imported rows: ${records.length}`);

function rowToRecord(headers, row) {
  const get = (label) => row[headers.indexOf(label)]?.trim() ?? "";
  const municipality = get("沖縄県内にお住みの方のみ市町村名を記入ください。\n県外海外の方は空欄で構いません。");
  const regionText = get("お住まいの地域(Your Region)") || get("現在お住まいの地域");
  const prefecture = get("現在お住まいの地域");

  return {
    member_id: normalizeMemberId(get("会員ID")),
    email: get("メールアドレス").toLowerCase(),
    full_name: get("氏名（漢字）※フルネーム"),
    furigana: get("氏名（フリガナ）※フルネーム"),
    gender: mapGender(get("性別")),
    birth_date: normalizeDate(get("生年月日")),
    phone: get("電話番号"),
    residence_scope: prefecture === "沖縄県" ? "okinawa" : "outside",
    area: mapArea(municipality, regionText),
    prefecture,
    municipality,
    region_text: regionText,
    pickleball_experience: get("ピックルボール経験"),
    form_timestamp: normalizeTimestamp(get("タイムスタンプ"))
  };
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(value);
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  row.push(value);
  if (row.some((cell) => cell !== "")) rows.push(row);
  return rows;
}

function normalizeMemberId(value) {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, "");
  const number = normalized.match(/^(?:OKP-?)?(\d+)$/)?.[1];
  if (!number) return normalized;
  return `OKP-${number.padStart(4, "0")}`;
}

function mapGender(value) {
  if (value.includes("男性")) return "male";
  if (value.includes("女性")) return "female";
  if (value.includes("その他")) return "other";
  return "no_answer";
}

function mapArea(municipality, regionText) {
  const text = `${municipality} ${regionText}`;
  if (/那覇/.test(text)) return "naha";
  if (/宮古/.test(text)) return "miyako";
  if (/沖縄市|うるま|宜野湾|北谷|嘉手納|読谷|中城|北中城|西原/.test(text)) return "central";
  if (/糸満|豊見城|南城|八重瀬|与那原|南風原|浦添/.test(text)) return "south";
  return "other";
}

function normalizeDate(value) {
  if (!value) return null;
  const match = value.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (!match) return null;
  return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
}

function normalizeTimestamp(value) {
  if (!value) return null;
  const match = value.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;
  const [, year, month, day, hour, minute, second = "00"] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")} ${hour.padStart(2, "0")}:${minute}:${second}+09`;
}

function sql(value) {
  if (value === null || value === undefined || value === "") return "null";
  return `'${String(value).replace(/'/g, "''")}'`;
}
