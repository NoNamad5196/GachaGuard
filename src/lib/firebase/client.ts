import { getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirebaseClientConfig, hasFirebaseClientEnv } from "./env";

export const firebaseConfigured = hasFirebaseClientEnv();

export function getFirebaseAuth() {
  const app = getApps().find((item) => item.name === "gachaguard-web")
    ?? initializeApp(getFirebaseClientConfig(), "gachaguard-web");
  return getAuth(app);
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
