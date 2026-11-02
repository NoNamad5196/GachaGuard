import { signOut, type User } from "firebase/auth";
import { getFirebaseAuth } from "./client";

export async function establishSession(user: User) {
  const response = await fetch("/api/auth/session", {
    method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: await user.getIdToken() }), signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("세션을 만들지 못했습니다. Google 로그인을 다시 시도해 주세요.");
  await signOut(getFirebaseAuth());
}
