import { FirebaseAuthError } from "firebase-admin/auth";
import { cookies } from "next/headers";
import { getAdminAuth } from "@/lib/firebase/admin";
import { hasFirebaseEnv } from "@/lib/firebase/env";

export const SESSION_COOKIE_NAME = "gachaguard_session";

export interface SessionUser {
  readonly uid: string;
  readonly email: string | null;
  readonly name: string | null;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  if (!hasFirebaseEnv()) return null;
  const value = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!value) return null;
  try {
    const identity = await getAdminAuth().verifySessionCookie(value, true);
    return { uid: identity.uid, email: identity.email ?? null, name: typeof identity.name === "string" ? identity.name : null };
  } catch (error) {
    if (error instanceof FirebaseAuthError) return null;
    throw error;
  }
}
