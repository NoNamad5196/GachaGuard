import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { initializeApp, deleteApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, GoogleAuthProvider, signInAnonymously, signInWithCredential } from "firebase/auth";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { POST } from "@/app/api/auth/session/route";
import { getSessionUser } from "@/lib/firebase/session";

const browser = vi.hoisted(() => ({ cookie: "" }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => browser.cookie ? { value: browser.cookie } : undefined }) }));

let app: FirebaseApp;
let token: string;
let uid: string;

beforeAll(async () => {
  const host = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if (!host || !process.env.FIRESTORE_EMULATOR_HOST) throw new Error("Emulators required");
  process.env.FIREBASE_PROJECT_ID = "demo-otakus";
  app = initializeApp({ apiKey: "emulator-only", projectId: "demo-otakus" }, "session-tests");
  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://${host}`, { disableWarnings: true });
  const credential = await signInAnonymously(auth);
  uid = credential.user.uid;
  token = await credential.user.getIdToken();
});

afterAll(async () => { await deleteApp(app); });

function request(idToken: string, origin?: string) {
  return new NextRequest("http://localhost/api/auth/session", {
    method: "POST", headers: { "content-type": "application/json", host: "localhost", ...(origin ? { origin } : {}) },
    body: JSON.stringify({ idToken }),
  });
}

async function googleIdentity(subject: string) {
  const head = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub: subject, email: `${subject}@example.test`, email_verified: true,
    name: "Local Google", aud: "demo-otakus", iss: "https://accounts.google.com", iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  return signInWithCredential(getAuth(app), GoogleAuthProvider.credential(`${head}.${payload}.`));
}

describe("Firebase session trust boundary", () => {
  it("rejects cross-origin session fixation", async () => {
    const response = await POST(request(token, "https://attacker.invalid"));
    expect(response.status).toBe(403);
    expect(response.cookies.getAll()).toHaveLength(0);
  });

  it("rejects missing origin instead of silently accepting CSRF", async () => {
    const response = await POST(request(token));
    expect(response.status).toBe(403);
  });

  it("rejects malformed identity tokens", async () => {
    const response = await POST(request("invalid", "http://localhost"));
    expect(response.status).toBe(401);
    expect(response.cookies.getAll()).toHaveLength(0);
  });

  it("does not exchange non-Google identities for application sessions", async () => {
    const response = await POST(request(token, "http://localhost"));
    expect(response.status).toBe(401);
    expect(response.cookies.getAll()).toHaveLength(0);
  });

  it("exchanges a Google identity for one HttpOnly session cookie", async () => {
    const google = await googleIdentity("emulator-google");
    const response = await POST(request(await google.user.getIdToken(), "http://localhost"));
    expect(response.status).toBe(200);
    const cookies = response.cookies.getAll();
    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toMatchObject({ name: "gachaguard_session", httpOnly: true, sameSite: "lax", path: "/" });
    browser.cookie = cookies[0].value;
    expect((await getSessionUser())?.uid).toBe(google.user.uid);
    const user = await getAdminDb().doc(`users/${google.user.uid}`).get();
    expect(user.get("profile.user_id")).toBe(google.user.uid);
    expect(user.get("account.providers")).toEqual(["google.com"]);
  });

  it("preserves an existing shared profile when creating a GachaGuard session", async () => {
    const google = await googleIdentity("existing-profile");
    const profile = { user_id: google.user.uid, display_name: "Shared Profile", timezone: "Asia/Seoul",
      reset_day: 5, reset_hour: 12, reminders: { weekly: false, events: true, daily: false } };
    await getAdminDb().doc(`users/${google.user.uid}`).set({ profile });
    const response = await POST(request(await google.user.getIdToken(), "http://localhost"));
    expect(response.status).toBe(200);
    const user = await getAdminDb().doc(`users/${google.user.uid}`).get();
    expect(user.get("profile")).toEqual(profile);
    expect(user.get("schema_version")).toBeUndefined();
  });

  it("resolves only a verified session cookie and rejects forged cookies", async () => {
    browser.cookie = await getAdminAuth().createSessionCookie(token, { expiresIn: 3600000 });
    expect((await getSessionUser())?.uid).toBe(uid);
    browser.cookie = "forged";
    expect(await getSessionUser()).toBeNull();
  });

  it("rejects a valid cookie once its account is disabled", async () => {
    browser.cookie = await getAdminAuth().createSessionCookie(token, { expiresIn: 3600000 });
    await getAdminAuth().updateUser(uid, { disabled: true });
    expect(await getSessionUser()).toBeNull();
  });
});
