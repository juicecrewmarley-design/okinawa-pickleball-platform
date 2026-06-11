"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { IdCard } from "lucide-react";
import { buildMemberCardPayload } from "@/lib/member";
import { formatResidence } from "@/lib/okinawa";
import type { MemberProfile } from "@/types/domain";

export function QrCodeCard({ member }: { member: MemberProfile }) {
  const [qrSrc, setQrSrc] = useState("");

  useEffect(() => {
    let active = true;

    QRCode.toDataURL(buildMemberCardPayload(member), {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 180,
      color: {
        dark: "#16313b",
        light: "#ffffff"
      }
    }).then((src) => {
      if (active) setQrSrc(src);
    });

    return () => {
      active = false;
    };
  }, [member]);

  return (
    <section className="overflow-hidden rounded-lg bg-ink text-white shadow-soft">
      <div className="bg-[url('/images/okinawa-pickleball-banner.png')] bg-cover bg-center">
        <div className="bg-ink/66 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-ocean-100">Okinawa Pickleball Association</p>
              <h2 className="mt-1 text-2xl font-black">QRコード会員証</h2>
            </div>
            <IdCard className="size-9 text-coral-500" aria-hidden="true" />
          </div>
        </div>
      </div>
      <div className="grid gap-5 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <p className="text-sm text-ocean-100">会員ID</p>
          <p className="mt-1 text-2xl font-black tracking-wide">{member.memberId}</p>
          <p className="mt-4 text-xl font-black">{member.fullName}</p>
          <p className="text-sm text-ocean-100">{member.furigana}</p>
          <div className="mt-4 inline-flex rounded-full bg-white/12 px-3 py-1 text-sm font-bold">
            居住地: {formatResidence(member.residenceScope, member.municipality)}
          </div>
        </div>
        <div className="grid size-48 place-items-center rounded-md bg-white p-3">
          {qrSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrSrc} alt={`${member.fullName}の会員証QRコード`} className="size-full object-contain" />
          ) : (
            <span className="text-sm font-bold text-slate-500">生成中</span>
          )}
        </div>
      </div>
    </section>
  );
}
