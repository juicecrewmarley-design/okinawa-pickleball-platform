import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerConfig } from "@/lib/supabase-env";

export const dynamic = "force-dynamic";

type RegisterPayload = {
  email?: string;
  password?: string;
  metadata?: Record<string, string | null>;
};

export async function POST(request: Request) {
  const config = getSupabaseServerConfig();

  if (!config.isConfigured) {
    return NextResponse.json(
      {
        ok: false,
        code: "supabase_not_configured",
        message: `Supabaseに保存できません。VercelのEnvironment Variablesで不足している項目があります: ${config.missingKeys.join(", ")}。設定後に再デプロイしてください。`
      },
      { status: 500 }
    );
  }

  const payload = (await request.json()) as RegisterPayload;
  const email = payload.email?.trim();
  const password = payload.password ?? "";

  if (!email || !password) {
    return NextResponse.json(
      {
        ok: false,
        code: "invalid_payload",
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

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: payload.metadata ?? {}
    }
  });

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        code: "supabase_signup_failed",
        message: error.message
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true
  });
}
