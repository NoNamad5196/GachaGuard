export function getFirebaseClientConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

export function hasFirebaseClientEnv() {
  const config = getFirebaseClientConfig();
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
}

export function hasFirebaseEnv() {
  const emulator = process.env.FIREBASE_PROJECT_ID === "demo-otakus"
    && Boolean(process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST);
  return emulator || Boolean(hasFirebaseClientEnv() && process.env.FIREBASE_PROJECT_ID
    && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY
    && process.env.FIREBASE_PROJECT_ID === process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
}
