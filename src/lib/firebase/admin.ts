import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function getAdminApp() {
  if (typeof window !== "undefined") throw new Error("Firebase Admin is server-only.");
  const existing = getApps().find((app) => app.name === "gachaguard-admin");
  if (existing) return existing;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const emulator = projectId === "demo-otakus"
    && Boolean(process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST);
  if (emulator) return initializeApp({ projectId }, "gachaguard-admin");
  if (!projectId || !clientEmail || !privateKey) throw new Error("Firebase Admin credentials are not configured.");
  return initializeApp({ projectId, credential: cert({ projectId, clientEmail, privateKey }) }, "gachaguard-admin");
}

export function getAdminDb() { return getFirestore(getAdminApp()); }
export function getAdminAuth() { return getAuth(getAdminApp()); }
