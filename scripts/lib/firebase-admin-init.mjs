export function initFirebaseAdmin(adminModule) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
  const privateKey = rawPrivateKey ? rawPrivateKey.replace(/\\n/g, "\n") : null;

  const firestoreEmulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
  const authEmulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;

  const hasEmulatorEnv = Boolean(firestoreEmulatorHost || authEmulatorHost || projectId === "demo-otakus");

  if (hasEmulatorEnv) {
    const isValidEmulator =
      projectId === "demo-otakus" &&
      Boolean(firestoreEmulatorHost) &&
      Boolean(authEmulatorHost);

    if (!isValidEmulator) {
      throw new Error(
        "Emulator configuration invalid: Emulator is only permitted with FIREBASE_PROJECT_ID='demo-otakus' and BOTH FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST set. ADC fallback is disabled."
      );
    }

    const existing = adminModule.apps?.find?.((app) => app.name === "gachaguard-migration");
    if (existing) return existing;

    return adminModule.initializeApp(
      {
        projectId: "demo-otakus",
        credential: {
          getAccessToken: async () => ({ access_token: "owner", expires_in: 3600 }),
        },
      },
      "gachaguard-migration"
    );
  }

  // Strictly enforce explicit service account credentials - no ADC fallback
  if (!projectId || !clientEmail || !privateKey) {
    const missing = [];
    if (!projectId) missing.push("FIREBASE_PROJECT_ID");
    if (!clientEmail) missing.push("FIREBASE_CLIENT_EMAIL");
    if (!privateKey) missing.push("FIREBASE_PRIVATE_KEY");
    throw new Error(
      `Explicit Firebase service account credentials required for --apply: missing ${missing.join(", ")}. ADC fallback is strictly disabled.`
    );
  }

  const existing = adminModule.apps?.find?.((app) => app.name === "gachaguard-migration");
  if (existing) return existing;

  return adminModule.initializeApp(
    {
      projectId,
      credential: adminModule.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    },
    "gachaguard-migration"
  );
}
