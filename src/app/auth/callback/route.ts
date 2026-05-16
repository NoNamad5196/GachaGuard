import { NextResponse, type NextRequest } from "next/server";

import { getAuthRedirectPath, sanitizeNextPath } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = sanitizeNextPath(requestUrl.searchParams.get("next"));
  const authError =
    requestUrl.searchParams.get("error") ??
    requestUrl.searchParams.get("error_code");

  if (authError || !code || !hasSupabaseEnv()) {
    const auth = !hasSupabaseEnv() ? "demo" : "callback-error";
    return NextResponse.redirect(new URL(getAuthRedirectPath({ auth, next }), requestUrl.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth] Callback exchange failed", {
      name: error.name,
      message: error.message,
      status: "status" in error ? error.status : undefined,
    });
    return NextResponse.redirect(
      new URL(getAuthRedirectPath({ auth: "callback-error", next }), requestUrl.origin),
    );
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
