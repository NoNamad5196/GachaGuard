import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAdminAuth } from "@/lib/firebase/admin";
import { hasFirebaseEnv } from "@/lib/firebase/env";
import { initializeUserProfile } from "@/lib/firebase/profile";
import { SESSION_COOKIE_NAME } from "@/lib/firebase/session";

export const runtime = "nodejs";
const expiresIn = 5 * 24 * 60 * 60 * 1000;
const inputSchema = z.object({ idToken: z.string().min(1).max(16000) }).strict();

function sameOrigin(request: NextRequest) {
  return request.headers.get("origin") === new URL(request.url).origin
    && request.headers.get("sec-fetch-site") !== "cross-site";
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!hasFirebaseEnv()) return NextResponse.json({ error: "Firebase is not configured" }, { status: 503 });
  const body: unknown = await request.json().catch(() => null);
  const input = inputSchema.safeParse(body);
  if (!input.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  try {
    const auth = getAdminAuth();
    const identity = await auth.verifyIdToken(input.data.idToken, true);
    const age = Date.now() / 1000 - identity.auth_time;
    if (age < -60 || age > 300 || identity.firebase.sign_in_provider !== "google.com") {
      return NextResponse.json({ error: "Recent Google sign-in required" }, { status: 401 });
    }
    const session = await auth.createSessionCookie(input.data.idToken, { expiresIn });
    await initializeUserProfile(identity);
    const response = NextResponse.json({ status: "success" });
    response.cookies.set(SESSION_COOKIE_NAME, session, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: expiresIn / 1000,
    });
    return response;
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return NextResponse.json({ error: "Failed to establish session" }, { status: 401 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const response = NextResponse.json({ status: "success" });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0,
  });
  return response;
}
