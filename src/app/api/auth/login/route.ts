import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authCookieNames } from "@/lib/server-auth";
import { getSupabaseServerConfig } from "@/lib/supabase-env";

type LoginPayload = {
  email?: string;
  password?: string;
};

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/"
};

export async function POST(request: Request) {
  const config = getSupabaseServerConfig();

  if (!config.isConfigured) {
    return NextResponse.json(
      {
        ok: false,
        message: `Supabase環境変数が不足しています: ${config.missingKeys.join(", ")}`
      },
      { status: 500 }
    );
  }

  const payload = (await request.json()) as LoginPayload;
  const email = payload.email?.trim();
  const password = payload.password ?? "";

  if (!email || !password) {
    return NextResponse.json(
      {
        ok: false,
        message: "メールアドレスとパスワードを入力してください。"
      },
      { status: 400 }
    );
  }

  const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: false
    }
  });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.session || !data.user) {
    return NextResponse.json(
      {
        ok: false,
        message: error?.message ?? "ログインできませんでした。"
      },
      { status: 401 }
    );
  }

  const authedSupabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${data.session.access_token}`
      }
    }
  });

  const { data: profile, error: profileError } = await authedSupabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json(
      {
        ok: false,
        message: "プロフィールが見つかりません。Supabaseのprofilesテーブルとトリガーを確認してください。"
      },
      { status: 403 }
    );
  }

  const response = NextResponse.json({
    ok: true,
    role: profile.role
  });

  response.cookies.set(authCookieNames.accessToken, data.session.access_token, {
    ...cookieOptions,
    maxAge: data.session.expires_in
  });
  response.cookies.set(authCookieNames.refreshToken, data.session.refresh_token, {
    ...cookieOptions,
    maxAge: 60 * 60 * 24 * 30
  });

  return response;
}
