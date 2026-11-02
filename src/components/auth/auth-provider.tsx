"use client";

import { useEffect, type ReactNode } from "react";
import { getRedirectResult } from "firebase/auth";
import { firebaseConfigured, getFirebaseAuth } from "@/lib/firebase/client";
import { establishSession } from "@/lib/firebase/browser-session";
import { getAuthRedirectPath, sanitizeNextPath } from "@/lib/auth/redirects";

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  useEffect(() => {
    if (!firebaseConfigured) return;
    void getRedirectResult(getFirebaseAuth()).then(async (result) => {
      if (!result) return;
      const next = sanitizeNextPath(sessionStorage.getItem("gachaguard_auth_next"));
      await establishSession(result.user);
      sessionStorage.removeItem("gachaguard_auth_next");
      window.location.replace(next);
    }).catch((error: unknown) => {
      if (!(error instanceof Error)) throw error;
      window.location.replace(getAuthRedirectPath({ auth: "auth-error", next: window.location.pathname }));
    });
  }, []);
  return children;
}
