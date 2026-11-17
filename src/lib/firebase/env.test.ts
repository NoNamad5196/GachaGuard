import { afterEach, describe, expect, it, vi } from "vitest";
import { hasFirebaseEnv } from "./env";

afterEach(() => vi.unstubAllEnvs());

function clearFirebaseEnv() {
  for (const name of ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY", "FIRESTORE_EMULATOR_HOST",
    "FIREBASE_AUTH_EMULATOR_HOST", "NEXT_PUBLIC_FIREBASE_API_KEY", "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID", "NEXT_PUBLIC_FIREBASE_APP_ID"]) vi.stubEnv(name, "");
}

describe("Firebase configuration mode", () => {
  it("keeps the app in demo mode with no configuration even under test", () => {
    clearFirebaseEnv();
    expect(hasFirebaseEnv()).toBe(false);
  });
  it("does not activate cloud mode with only a public project ID", () => {
    clearFirebaseEnv();
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "configured-project");
    expect(hasFirebaseEnv()).toBe(false);
  });
  it("requires both local emulators and the explicit demo project", () => {
    clearFirebaseEnv();
    vi.stubEnv("FIREBASE_PROJECT_ID", "demo-otakus");
    vi.stubEnv("FIRESTORE_EMULATOR_HOST", "127.0.0.1:8080");
    vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", "127.0.0.1:9099");
    expect(hasFirebaseEnv()).toBe(true);
  });
  it("rejects emulator shortcuts for a non-demo project", () => {
    clearFirebaseEnv();
    vi.stubEnv("FIREBASE_PROJECT_ID", "not-demo");
    vi.stubEnv("FIRESTORE_EMULATOR_HOST", "127.0.0.1:8080");
    vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", "127.0.0.1:9099");
    expect(hasFirebaseEnv()).toBe(false);
  });
});
