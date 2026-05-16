"use client";

import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { useId } from "react";

import { requestMagicLink } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const AUTH_MESSAGES: Record<string, string> = {
  sent: "메일함에서 로그인 링크를 확인해 주세요.",
  "send-error": "로그인 링크 발송에 실패했습니다. Supabase Auth 설정을 확인해 주세요.",
  "callback-error": "인증 링크 확인에 실패했습니다. 링크가 만료되었거나 redirect URL 설정이 맞지 않을 수 있습니다.",
  required: "저장하려면 먼저 로그인해 주세요.",
  "missing-email": "이메일을 입력해 주세요.",
  demo: "현재 Supabase 환경 변수가 없어 데모 모드로만 확인할 수 있습니다.",
};

export function AuthCta({
  authEnabled,
  nextPath,
  authState,
  title = "로그인하면 저장할 수 있어요",
  description = "이메일 magic link로 로그인하면 이 화면에서 계속 이어서 작업할 수 있습니다.",
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
  const emailId = useId();

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-muted/30 p-4",
        compact && "p-3",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-md bg-card text-[var(--brand)]">
          <LockKeyhole className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">{title}</div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {authEnabled
              ? description
              : "Supabase 환경 변수를 연결하면 개인 데이터 저장이 활성화됩니다."}
          </p>
        </div>
      </div>

      {authState ? (
        <div className="mt-3 rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground">
          {AUTH_MESSAGES[authState] ?? AUTH_MESSAGES["send-error"]}
        </div>
      ) : null}

      {authEnabled ? (
        <form action={requestMagicLink} className="mt-3 grid gap-2">
          <input type="hidden" name="next" value={nextPath} />
          <Label htmlFor={emailId} className="sr-only">
            이메일
          </Label>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id={emailId}
                name="email"
                type="email"
                placeholder="you@example.com"
                className="pl-9"
                required
              />
            </div>
            <Button type="submit">
              로그인 링크 받기
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
