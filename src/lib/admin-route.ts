import "server-only";
import { NextResponse } from "next/server";
import { singleAdminEmail } from "@/lib/admin";
import { getServerAuthContext, type ServerAuthContext } from "@/lib/server-auth";

export async function getAdminRouteContext(): Promise<
  { context: ServerAuthContext; response?: never } | { context?: never; response: NextResponse }
> {
  const context = await getServerAuthContext();

  if (!context) {
    return {
      response: NextResponse.json(
        {
          ok: false,
          message: "管理者ログインが必要です。"
        },
        { status: 401 }
      )
    };
  }

  if (context.profile.role !== "admin") {
    return {
      response: NextResponse.json(
        {
          ok: false,
          message: `管理者は ${singleAdminEmail} の1名のみです。`
        },
        { status: 403 }
      )
    };
  }

  return { context };
}
