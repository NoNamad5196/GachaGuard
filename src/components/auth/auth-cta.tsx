"use client";

import { AlertCircle, LockKeyhole, LogIn } from "lucide-react";
import { useState } from "react";
import { signInWithPopup, signInWithRedirect } from "firebase/auth";
import { FirebaseError } from "firebase/app";

import { Button } from "@/components/ui/button";
import { getFirebaseAuth, googleProvider } from "@/lib/firebase/client";
import { establishSession } from "@/lib/firebase/browser-session";
import { sanitizeNextPath } from "@/lib/auth/redirects";
import { cn } from "@/lib/utils";

const AUTH_MESSAGES: Record<string, string> = {
  required: "저장하려면 먼저 로그인해 주세요.",
  demo: "현재 Firebase 환경 변수가 없어 데모 모드로만 확인할 수 있습니다.",
  "popup-closed": "로그인이 취소되었습니다. 다시 시도해 주세요.",
  "auth-error": "Google 로그인에 실패했습니다. 연결 상태를 확인해 주세요.",
  "callback-error": "인증 링크 확인에 실패했습니다. Google 로그인을 다시 시도해 주세요.",
};

export function AuthCta({
  authEnabled,
  nextPath,
  authState,
  title = "로그인하면 저장할 수 있어요",
  description = "Google 계정으로 로그인하면 이 화면에서 계속 이어서 작업할 수 있습니다.",
  className,
  compact = false,
}: {
  authEnabled: boolean;
  nextPath: string;
  authState?: string;
  title?: string;
  description?: string;
  className?: string;
  compact?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleGoogleLogin() {
    if (!authEnabled || busy) return;
    setBusy(true);
    setErrorMessage(null);

    try {
      const auth = getFirebaseAuth();
      try {
        const result = await signInWithPopup(auth, googleProvider);
        await establishSession(result.user);
        window.location.assign(sanitizeNextPath(nextPath));
      } catch (e) {
        const code = e instanceof FirebaseError ? e.code : null;
        if (code === "auth/popup-blocked") {
          sessionStorage.setItem("gachaguard_auth_next", sanitizeNextPath(nextPath));
          await signInWithRedirect(auth, googleProvider);
          return;
        } else if (code === "auth/popup-closed-by-user") {
          setErrorMessage(AUTH_MESSAGES["popup-closed"]);
          setBusy(false);
          return;
        } else {
          throw e;
        }
      }

    } catch (error) {
      if (!(error instanceof Error)) throw error;
      setErrorMessage(AUTH_MESSAGES["auth-error"]);
    } finally {
      setBusy(false);
    }
  }

  const displayedMessage =
    errorMessage || (authState ? AUTH_MESSAGES[authState] ?? AUTH_MESSAGES["auth-error"] : null);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-sm border-2 border-border bg-card zzz-panel-shadow p-4",
        compact && "p-3",
        className,
      )}
    >
      <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-wider text-[var(--brand)] uppercase">
        <span>{"// AUTH_GATE //"}</span>
        <span className="text-muted-foreground">{authEnabled ? "LOGIN_REQUIRED" : "DEMO_STANDBY"}</span>
      </div>
      <div className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-sm border border-[var(--brand)]/50 bg-[var(--brand)]/15 text-[var(--brand)] shadow-[0_0_8px_rgba(217,255,0,0.25)]">
          <LockKeyhole className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-heading text-sm font-bold tracking-tight text-foreground uppercase">{title}</div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {authEnabled
              ? description
              : "Firebase 환경 변수를 연결하면 개인 데이터 저장이 활성화됩니다."}
          </p>
        </div>
      </div>

      {displayedMessage ? (
        <div role="alert" className="mt-3 flex items-center gap-2 rounded-sm border-2 border-[var(--warn)] bg-[var(--warn)]/15 px-3 py-2 text-sm text-[var(--warn-ink)] zzz-panel-shadow">
          <AlertCircle className="size-4 shrink-0 text-[var(--warn)]" />
          <span className="font-medium">{displayedMessage}</span>
        </div>
      ) : null}

      <div className="mt-3">
        <input type="hidden" name="next" value={sanitizeNextPath(nextPath)} />
        {authEnabled ? (
          <Button
            type="button"
            onClick={handleGoogleLogin}
            disabled={busy}
            className="w-full sm:w-auto"
          >
            <LogIn className="size-4" />
            {busy ? "로그인 중..." : "Google로 로그인"}
          </Button>
        ) : (
          <Button type="button" variant="outline" disabled className="w-full sm:w-auto text-xs font-mono">
            Demo Mode (인증 비활성)
          </Button>
        )}
      </div>
    </div>
  );
}
