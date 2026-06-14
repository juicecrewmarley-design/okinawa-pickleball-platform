"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, UserPlus } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { QrCodeCard } from "@/components/QrCodeCard";
import { formatLegacyMemberId, generateMemberId, getMembershipLabel, normalizeMemberNumber } from "@/lib/member";
import { municipalityToArea, okinawaMunicipalities, residenceScopeLabels } from "@/lib/okinawa";
import { getSupabaseConfigStatus, isSupabaseConfigured } from "@/lib/supabase";
import type { Gender, MemberProfile, MembershipType, ResidenceScope } from "@/types/domain";

const genderOptions: { value: Gender; label: string }[] = [
  { value: "male", label: "男性" },
  { value: "female", label: "女性" },
  { value: "other", label: "その他" },
  { value: "no_answer", label: "回答しない" }
];

type RegistrationMode = "select" | "new" | "legacy";

type LegacyLookupStatus = {
  text: string;
  tone: "idle" | "loading" | "success" | "error";
};

type LegacyLookupResult = {
  member?: {
    area: MemberProfile["area"];
    birthDate: string;
    claimed: boolean;
    claimedAt: string | null;
    email: string;
    fullName: string;
    furigana: string;
    gender: Gender;
    memberId: string;
    municipality: string;
    phone: string;
    pickleballExperience: string;
    prefecture: string;
    residenceScope: ResidenceScope;
  };
  message?: string;
  ok?: boolean;
};

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [createdMember, setCreatedMember] = useState<MemberProfile | null>(null);
  const [registrationMode, setRegistrationMode] = useState<RegistrationMode>("select");
  const [memberId, setMemberId] = useState("");
  const [legacyMemberNumber, setLegacyMemberNumber] = useState("");
  const [legacyBirthDate, setLegacyBirthDate] = useState("");
  const [legacyPhoneLast4, setLegacyPhoneLast4] = useState("");
  const [verifiedLegacyMemberId, setVerifiedLegacyMemberId] = useState("");
  const [legacyLookup, setLegacyLookup] = useState<LegacyLookupStatus>({ text: "", tone: "idle" });
  const [fullName, setFullName] = useState("");
  const [furigana, setFurigana] = useState("");
  const [gender, setGender] = useState<Gender>("no_answer");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [residenceScope, setResidenceScope] = useState<ResidenceScope>("okinawa");
  const [municipality, setMunicipality] = useState(okinawaMunicipalities[0]);
  const [membershipType, setMembershipType] = useState<MembershipType>("general");
  const [supabaseReady, setSupabaseReady] = useState(isSupabaseConfigured);

  useEffect(() => {
    setMemberId(generateMemberId());
    getSupabaseConfigStatus().then((status) => setSupabaseReady(status.isConfigured));
    const requestedMode = new URLSearchParams(window.location.search).get("mode");
    if (requestedMode === "new" || requestedMode === "legacy") {
      selectRegistrationMode(requestedMode);
    }
  }, []);

  function resetFormValues(mode: RegistrationMode) {
    setMessage("");
    setCreatedMember(null);
    setLegacyLookup({ text: "", tone: "idle" });
    setFullName("");
    setFurigana("");
    setGender("no_answer");
    setBirthDate("");
    setPhone("");
    setEmail("");
    setResidenceScope("okinawa");
    setMunicipality(okinawaMunicipalities[0]);
    setMembershipType(mode === "legacy" ? "premium" : "general");
    setVerifiedLegacyMemberId("");
    setLegacyBirthDate("");
    setLegacyPhoneLast4("");
    if (mode !== "legacy") {
      setLegacyMemberNumber("");
    }
  }

  function clearLegacyMemberDetails() {
    setVerifiedLegacyMemberId("");
    setFullName("");
    setFurigana("");
    setGender("no_answer");
    setBirthDate("");
    setPhone("");
    setEmail("");
    setResidenceScope("okinawa");
    setMunicipality(okinawaMunicipalities[0]);
  }

  function selectRegistrationMode(mode: RegistrationMode) {
    setRegistrationMode(mode);
    resetFormValues(mode);
    if (mode === "new") {
      setMemberId(generateMemberId());
      setMembershipType("general");
    }
    if (mode === "legacy") {
      setMembershipType("premium");
    }
  }

  async function lookupLegacyMember(numberValue = legacyMemberNumber) {
    const normalizedNumber = normalizeMemberNumber(numberValue);
    const normalizedPhoneLast4 = normalizeMemberNumber(legacyPhoneLast4).slice(-4);
    setLegacyMemberNumber(normalizedNumber);
    setMessage("");

    if (normalizedNumber.length !== 4) {
      setLegacyLookup({ text: "L列のOKP番号4桁を入力してください。例: 0001", tone: "error" });
      return;
    }

    if (!legacyBirthDate && normalizedPhoneLast4.length !== 4) {
      clearLegacyMemberDetails();
      setLegacyLookup({ text: "本人確認のため、生年月日または電話番号下4桁を入力してください。", tone: "error" });
      return;
    }

    setLegacyLookup({ text: "既存会員情報を確認しています。", tone: "loading" });

    try {
      const response = await fetch("/api/legacy-members/lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          birthDate: legacyBirthDate,
          memberNumber: normalizedNumber,
          phoneLast4: normalizedPhoneLast4
        })
      });
      const result = (await response.json()) as LegacyLookupResult;

      if (!response.ok || !result.ok || !result.member) {
        throw new Error(result.message ?? "既存会員情報を取得できませんでした。");
      }

      setFullName(result.member.fullName);
      setFurigana(result.member.furigana);
      setGender(result.member.gender);
      setBirthDate(result.member.birthDate);
      setPhone(result.member.phone);
      setEmail(result.member.email);
      setResidenceScope(result.member.residenceScope);
      setMunicipality(result.member.municipality || okinawaMunicipalities[0]);
      setLegacyMemberNumber(result.member.memberId.replace("OKP-", ""));
      setVerifiedLegacyMemberId(result.member.memberId);
      setLegacyLookup({
        text: result.member.claimed
          ? "この番号は既にアプリ登録済みの可能性があります。登録できない場合は管理者へ確認してください。"
          : "既存会員情報を反映しました。不足情報とパスワードを入力してください。",
        tone: result.member.claimed ? "error" : "success"
      });
    } catch (error) {
      clearLegacyMemberDetails();
      setLegacyLookup({
        text: error instanceof Error ? error.message : "既存会員情報を取得できませんでした。",
        tone: "error"
      });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password"));
    const normalizedLegacyMemberNumber = registrationMode === "legacy" ? normalizeMemberNumber(legacyMemberNumber) : "";
    const requestedLegacyMemberId = normalizedLegacyMemberNumber ? formatLegacyMemberId(normalizedLegacyMemberNumber) : "";
    const selectedMunicipality = residenceScope === "okinawa" ? municipality : "";
    const area = residenceScope === "okinawa" ? municipalityToArea(selectedMunicipality) : "other";
    const issuedMemberId = requestedLegacyMemberId || memberId || generateMemberId();
    const finalMembershipType: MembershipType = registrationMode === "legacy" ? "premium" : membershipType;

    if (registrationMode === "legacy" && normalizedLegacyMemberNumber.length !== 4) {
      setMessage("番号引き継ぎの方は、L列のOKP番号4桁を入力して照合してください。");
      setLoading(false);
      return;
    }

    if (registrationMode === "legacy" && verifiedLegacyMemberId !== requestedLegacyMemberId) {
      setMessage("番号引き継ぎの方は、会員番号と本人確認情報を照合してから登録してください。");
      setLoading(false);
      return;
    }

    if (!fullName || !furigana || !email || !password) {
      setMessage("氏名、ふりがな、メールアドレス、パスワードを入力してください。");
      setLoading(false);
      return;
    }

    const profile: MemberProfile = {
      id: "local-preview",
      memberId: issuedMemberId,
      fullName,
      furigana,
      gender,
      birthDate,
      phone,
      email,
      area,
      residenceScope,
      municipality: selectedMunicipality,
      role: "member",
      membershipType: finalMembershipType,
      opr: 0,
      ranking: 0
    };

    try {
      const metadata = {
        full_name: profile.fullName,
        furigana: profile.furigana,
        gender: profile.gender,
        birth_date: profile.birthDate,
        phone: profile.phone,
        area: profile.area,
        residence_scope: profile.residenceScope,
        municipality: profile.municipality,
        membership_type: finalMembershipType,
        legacy_birth_date: registrationMode === "legacy" ? legacyBirthDate || null : null,
        legacy_member_id: requestedLegacyMemberId || null,
        legacy_phone_last4: registrationMode === "legacy" ? normalizeMemberNumber(legacyPhoneLast4).slice(-4) || null : null
      };

      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          legacyVerification:
            registrationMode === "legacy"
              ? {
                  birthDate: legacyBirthDate || null,
                  memberNumber: requestedLegacyMemberId,
                  phoneLast4: normalizeMemberNumber(legacyPhoneLast4).slice(-4) || null
                }
              : undefined,
          password,
          metadata
        })
      });
      const result = (await response.json()) as { ok?: boolean; message?: string };

      if (!response.ok || !result.ok) {
        throw new Error(result.message ?? "Supabase登録APIでエラーが発生しました。");
      }

      setSupabaseReady(true);
      setMessage("登録しました。確認メールが届く場合は、メール内のリンクを開いてください。");
      setCreatedMember(profile);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "登録中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell
      eyebrow="Member Registration"
      title="会員登録"
      description="氏名、ふりがな、連絡先、居住地を登録し、会員IDとQRコード会員証を発行します。"
    >
      {registrationMode === "select" ? (
        <div className="grid gap-5 md:grid-cols-2">
          <button
            type="button"
            onClick={() => selectRegistrationMode("new")}
            className="focus-ring rounded-lg border border-ocean-100 bg-white p-6 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-ocean-300"
          >
            <span className="grid size-12 place-items-center rounded-full bg-ocean-50 text-ocean-700">
              <UserPlus className="size-6" aria-hidden="true" />
            </span>
            <span className="mt-5 block text-2xl font-black text-ink">新規の方</span>
            <span className="mt-3 block text-sm leading-7 text-slate-600">
              まだOKP番号を持っていない方はこちら。新しい会員IDを発行して登録します。
            </span>
          </button>
          <button
            type="button"
            onClick={() => selectRegistrationMode("legacy")}
            className="focus-ring rounded-lg border border-ocean-100 bg-white p-6 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-coral-300"
          >
            <span className="grid size-12 place-items-center rounded-full bg-coral-100 text-coral-600">
              <CheckCircle2 className="size-6" aria-hidden="true" />
            </span>
            <span className="mt-5 block text-2xl font-black text-ink">番号引き継ぐ方</span>
            <span className="mt-3 block text-sm leading-7 text-slate-600">
              Googleフォームで発行済みのOKP番号がある方はこちら。L列の4桁番号と本人確認で情報を反映します。
            </span>
          </button>
        </div>
      ) : (
      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <form onSubmit={handleSubmit} className="rounded-lg border border-ocean-100 bg-white p-5 shadow-soft sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-coral-600">
                {registrationMode === "legacy" ? "Existing Member" : "New Member"}
              </p>
              <h2 className="mt-1 text-2xl font-black text-ink">
                {registrationMode === "legacy" ? "番号を引き継いで登録" : "新規会員登録"}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => selectRegistrationMode("select")}
              className="focus-ring rounded-md bg-ocean-50 px-4 py-2 text-sm font-black text-ocean-700 hover:bg-ocean-100"
            >
              選択へ戻る
            </button>
          </div>
          {registrationMode === "new" ? (
            <div className="mb-5 rounded-lg border border-ocean-100 bg-ocean-50 p-4">
              <p className="text-sm font-black text-ocean-700">会員種別</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {(["general", "premium"] as MembershipType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setMembershipType(type)}
                    className={`focus-ring rounded-md border px-4 py-4 text-left transition ${
                      membershipType === type
                        ? "border-ocean-500 bg-white text-ink shadow-soft"
                        : "border-ocean-100 bg-white/70 text-slate-600 hover:bg-white"
                    }`}
                  >
                    <span className="block text-lg font-black">{getMembershipLabel(type)}</span>
                    <span className="mt-1 block text-sm leading-6">
                      {type === "general" ? "年会費無料" : "年会費2,000円。大会参加料がプレミアム会員料金になります。"}
                    </span>
                  </button>
                ))}
              </div>
              {membershipType === "premium" ? (
                <div className="mt-4 rounded-md border border-coral-200 bg-white p-4 text-sm leading-7 text-slate-700">
                  <p className="font-black text-coral-600">PayPay決済</p>
                  <p className="mt-1">年会費2,000円をPayPayでお支払いください。決済画面のQRコードやリンクは、正式運用時に協会のPayPay情報へ差し替えます。</p>
                  <div className="mt-3 grid place-items-center rounded-md bg-coral-100 p-5 text-center font-black text-coral-700">
                    PayPay決済画面
                    <span className="mt-1 block text-xs font-bold">2,000円</span>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mb-5 rounded-lg border border-palm-200 bg-palm-100 p-4 text-sm font-bold leading-7 text-palm-700">
              OKP-0001〜OKP-0209の既存会員は、自動的にプレミアム会員として登録されます。
            </div>
          )}
          {registrationMode === "legacy" ? (
            <div className="mb-5 rounded-lg border border-coral-200 bg-coral-100 p-4">
              <label className="grid gap-2 text-sm font-bold text-coral-700">
                L列のOKP番号4桁
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <input
                    required
                    name="legacyMemberNumber"
                    value={legacyMemberNumber}
                    onChange={(event) => {
                      const nextNumber = normalizeMemberNumber(event.target.value).slice(0, 4);
                      setLegacyMemberNumber(nextNumber);
                      setLegacyLookup({ text: "", tone: "idle" });
                      clearLegacyMemberDetails();
                      if (nextNumber.length === 4 && (legacyBirthDate || normalizeMemberNumber(legacyPhoneLast4).length === 4)) {
                        lookupLegacyMember(nextNumber);
                      }
                    }}
                    inputMode="numeric"
                    pattern="[0-9]{4}"
                    className="focus-ring rounded-md border border-coral-200 px-3 py-3 text-ink"
                    placeholder="例: 0001"
                  />
                  <button
                    type="button"
                    onClick={() => lookupLegacyMember()}
                    disabled={legacyLookup.tone === "loading"}
                    className="focus-ring inline-flex items-center justify-center gap-2 rounded-md bg-ink px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {legacyLookup.tone === "loading" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                    情報を反映
                  </button>
                </div>
              </label>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold text-coral-700">
                  本人確認: 生年月日
                  <input
                    type="date"
                    value={legacyBirthDate}
                    onChange={(event) => {
                      setLegacyBirthDate(event.target.value);
                      setLegacyLookup({ text: "", tone: "idle" });
                      clearLegacyMemberDetails();
                    }}
                    className="focus-ring rounded-md border border-coral-200 px-3 py-3 text-ink"
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold text-coral-700">
                  本人確認: 電話番号下4桁
                  <input
                    value={legacyPhoneLast4}
                    onChange={(event) => {
                      setLegacyPhoneLast4(normalizeMemberNumber(event.target.value).slice(0, 4));
                      setLegacyLookup({ text: "", tone: "idle" });
                      clearLegacyMemberDetails();
                    }}
                    inputMode="numeric"
                    maxLength={4}
                    pattern="[0-9]{4}"
                    className="focus-ring rounded-md border border-coral-200 px-3 py-3 text-ink"
                    placeholder="例: 1234"
                  />
                </label>
              </div>
              {legacyLookup.text ? (
                <p
                  className={`mt-3 text-sm font-bold leading-6 ${
                    legacyLookup.tone === "error" ? "text-coral-700" : legacyLookup.tone === "success" ? "text-palm-700" : "text-ocean-700"
                  }`}
                >
                  {legacyLookup.text}
                </p>
              ) : (
                <p className="mt-3 text-sm leading-6 text-coral-700">
                  例: OKP-0001 の方は 0001 と入力し、生年月日または電話番号下4桁で本人確認してください。照合に成功するまで個人情報は表示されません。
                </p>
              )}
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              氏名
              <input
                required
                name="fullName"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="focus-ring rounded-md border border-ocean-100 px-3 py-3"
                placeholder="沖縄 花子"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              ふりがな
              <input
                required
                name="furigana"
                value={furigana}
                onChange={(event) => setFurigana(event.target.value)}
                className="focus-ring rounded-md border border-ocean-100 px-3 py-3"
                placeholder="おきなわ はなこ"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              性別
              <select
                required
                name="gender"
                value={gender}
                onChange={(event) => setGender(event.target.value as Gender)}
                className="focus-ring rounded-md border border-ocean-100 px-3 py-3"
              >
                {genderOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              生年月日
              <input
                name="birthDate"
                type="date"
                value={birthDate}
                onChange={(event) => setBirthDate(event.target.value)}
                className="focus-ring rounded-md border border-ocean-100 px-3 py-3"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              電話番号
              <input
                name="phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="focus-ring rounded-md border border-ocean-100 px-3 py-3"
                placeholder="090-0000-0000"
              />
            </label>
            <div className="grid gap-2 text-sm font-bold text-slate-700">
              居住地
              <div className="grid grid-cols-2 gap-2 rounded-md bg-ocean-50 p-1">
                {(["okinawa", "outside"] as ResidenceScope[]).map((scope) => (
                  <button
                    key={scope}
                    type="button"
                    onClick={() => {
                      setResidenceScope(scope);
                      if (scope === "outside") {
                        setMunicipality("");
                      } else if (!municipality) {
                        setMunicipality(okinawaMunicipalities[0]);
                      }
                    }}
                    className={`focus-ring rounded-md px-3 py-3 text-sm font-black ${
                      residenceScope === scope ? "bg-white text-ink shadow" : "text-slate-600"
                    }`}
                  >
                    {residenceScopeLabels[scope]}
                  </button>
                ))}
              </div>
            </div>
            {residenceScope === "okinawa" ? (
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                市町村
                <select
                  required
                  name="municipality"
                  value={municipality}
                  onChange={(event) => setMunicipality(event.target.value)}
                  className="focus-ring rounded-md border border-ocean-100 px-3 py-3"
                >
                  {okinawaMunicipalities.map((municipalityName) => (
                    <option key={municipalityName} value={municipalityName}>
                      {municipalityName}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="rounded-md bg-ocean-50 p-4 text-sm leading-6 text-slate-600">
                沖縄県外の方は市町村選択なしで登録できます。
              </div>
            )}
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              メールアドレス
              <input
                required
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="focus-ring rounded-md border border-ocean-100 px-3 py-3"
                placeholder="member@example.com"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              パスワード
              <input required name="password" type="password" minLength={8} className="focus-ring rounded-md border border-ocean-100 px-3 py-3" placeholder="8文字以上" />
            </label>
          </div>

          <div className="mt-5 rounded-md bg-ocean-50 p-4">
            <p className="text-sm font-bold text-ocean-700">
              {registrationMode === "legacy" ? "引き継ぐ会員ID" : "新規発行予定の会員ID"}
            </p>
            <p className="mt-1 text-2xl font-black text-ink">
              {registrationMode === "legacy" && legacyMemberNumber ? formatLegacyMemberId(legacyMemberNumber) : memberId}
            </p>
            {registrationMode === "legacy" ? (
              <p className="mt-2 text-xs leading-5 text-slate-500">
                生年月日または電話番号下4桁で本人確認し、この番号を引き継ぎます。
              </p>
            ) : (
              <p className="mt-2 text-xs leading-5 text-slate-500">
                新規会員IDはOKP-1500以降で発行します。Supabase本番環境では、DB側で次の空き番号を正式発行します。
              </p>
            )}
          </div>

          {message ? (
            <p className="mt-4 flex items-center gap-2 rounded-md bg-palm-100 px-4 py-3 text-sm font-bold text-palm-700">
              <CheckCircle2 className="size-5" aria-hidden="true" />
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="focus-ring mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink px-5 py-3 font-black text-white transition hover:bg-ocean-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <UserPlus className="size-5" aria-hidden="true" />}
            会員登録する
          </button>
          <p className="mt-4 text-center text-sm text-slate-600">
            登録済みの方は{" "}
            <Link href="/login" className="font-black text-ocean-700">
              ログイン
            </Link>
          </p>
        </form>

        <div className="space-y-4">
          {createdMember ? (
            <QrCodeCard member={createdMember} />
          ) : (
            <div className="rounded-lg border border-ocean-100 bg-white p-6 shadow-soft">
              <h2 className="text-xl font-black">登録後の表示</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                登録完了後、この場所にQRコード付き会員証のプレビューが表示されます。大会受付ではこのQRを提示する想定です。
              </p>
            </div>
          )}
          <div className="rounded-lg bg-coral-100 p-5 text-coral-600">
            <p className="font-black">MVPメモ</p>
            <p className="mt-2 text-sm leading-6">
              {supabaseReady
                ? "Supabase接続済みです。登録情報はSupabase Authとprofilesテーブルに保存されます。"
                : "Supabase未接続です。NEXT_PUBLIC_SUPABASE_URLとNEXT_PUBLIC_SUPABASE_ANON_KEYがVercelで読み込まれるまで、会員登録は保存されません。"}
            </p>
          </div>
        </div>
      </div>
      )}
    </PageShell>
  );
}
