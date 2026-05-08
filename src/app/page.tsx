import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Mail, ShieldCheck } from "lucide-react";

import { requestMagicLink } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getCurrentUser } from "@/lib/supabase/server";

const AUTH_MESSAGES: Record<string, string> = {
  sent: "메일함에서 로그인 링크를 확인해 주세요.",
  error: "로그인 링크 발송에 실패했습니다. Supabase Auth 설정을 확인해 주세요.",
  "missing-email": "이메일을 입력해 주세요.",
  demo: "현재 Supabase 환경 변수가 없어 데모 대시보드로만 확인할 수 있습니다.",
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 px-4 py-8 md:grid-cols-[1.05fr_0.95fr]">
        <section className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Supabase RLS 기반 개인 과금 가드
          </div>
          <div className="space-y-4">
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
              과금 버튼을 누르기 전에, 숫자가 먼저 말하게 하세요.
            </h1>
            <p className="max-w-xl text-base leading-7 text-muted-foreground">
              GachaGuard는 게임별 과금, 월 예산, 천장까지 남은 비용을 한 화면에
              모아 충동적인 결제를 늦추는 개인 대시보드입니다.
            </p>
          </div>
          <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
            <div className="rounded-lg border bg-card/60 p-4">70% 경고선</div>
            <div className="rounded-lg border bg-card/60 p-4">천장 예상 비용</div>
            <div className="rounded-lg border bg-card/60 p-4">세션 마찰 모달</div>
          </div>
        </section>

        <Card className="w-full">
          <CardHeader>
            <CardTitle>로그인</CardTitle>
            <CardDescription>
              이메일 매직 링크로 시작합니다. 환경 변수가 없으면 데모를 먼저 볼 수
              있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {params.auth ? (
              <div className="rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground">
                {AUTH_MESSAGES[params.auth] ?? AUTH_MESSAGES.error}
              </div>
            ) : null}

            <form action={requestMagicLink} className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="email">이메일</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-9"
                    disabled={!hasSupabaseEnv()}
                  />
                </div>
              </div>
              <Button type="submit" disabled={!hasSupabaseEnv()}>
                매직 링크 받기
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <Button asChild variant="secondary" className="w-full">
              <Link href="/dashboard">데모 대시보드 보기</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
