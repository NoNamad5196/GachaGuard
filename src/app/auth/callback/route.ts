import { NextResponse, type NextRequest } from "next/server";
import { getAuthRedirectPath, sanitizeNextPath } from "@/lib/auth/redirects";

export async function GET(request: NextRequest) {
  const next = sanitizeNextPath(request.nextUrl.searchParams.get("next"));
  return NextResponse.redirect(new URL(getAuthRedirectPath({ auth: "callback-error", next }), request.url));
}
