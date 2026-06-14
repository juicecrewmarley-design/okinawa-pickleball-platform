import { NextResponse } from "next/server";
import { authCookieNames } from "@/lib/server-auth";

const expiredCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 0
};

export async function POST() {
  const response = NextResponse.json({ ok: true });

  response.cookies.set(authCookieNames.accessToken, "", expiredCookieOptions);
  response.cookies.set(authCookieNames.refreshToken, "", expiredCookieOptions);

  return response;
}
