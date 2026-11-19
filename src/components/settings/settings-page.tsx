import Link from "next/link";
import { Download, Mail, Trash2, Upload } from "lucide-react";

import { AppLauncher } from "@/components/app/app-launcher";
import {
  DesignCard,
  EmptyState,
  StatBlock,
  ToneBadge,
} from "@/components/app/design-system";
import { AuthCta } from "@/components/auth/auth-cta";
import { AddGameForm, TemplateApplyForm } from "@/components/dashboard/quick-forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatKrw } from "@/lib/domain/calculations";
import type { DashboardData } from "@/lib/domain/dashboard";

export function SettingsPage({
  data,
  authState,
}: {
  data: DashboardData;
  authState?: string;
}) {
  return (
    <div className="space-y-5" data-screen-label="Settings">
      <section className="flex flex-col gap-2 rounded-md border border-border/80 bg-[#13161f] p-4.5 zzz-panel-shadow">
        <div className="flex items-center gap-2 font-mono text-[10.5px] font-bold text-[var(--brand)] uppercase tracking-wider">
          <span>{"// SYSTEM_CONFIG // CONTROLS"}</span>
        </div>
        <h1 className="font-heading text-2xl font-black uppercase tracking-tight text-foreground sm:text-3xl">
          Settings
        </h1>
        <p className="font-mono text-xs text-muted-foreground">
          게임, 통화, 알림, 데이터 관리 설정입니다.
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <DesignCard title="추적 중인 게임" sub={`${data.userGames.length}개`}>
          <div className="space-y-0">
            {data.userGames.map((userGame) => {
              const trackedBanners = data.userBanners.filter(
                (userBanner) => userBanner.user_game_id === userGame.id,
              ).length;

              return (
                <div
                  key={userGame.id}
                  className="grid gap-3 border-b border-border/70 py-3 last:border-b-0 hover:bg-muted/20 px-1 rounded-xs transition-colors sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-heading text-sm font-bold uppercase tracking-tight text-foreground">{userGame.games.name}</h3>
                      <ToneBadge>{trackedBanners} banners</ToneBadge>
                    </div>
                    <div className="mt-1 font-mono text-xs text-muted-foreground">
                      {userGame.games.developer ?? "개발사 미입력"} · pity {userGame.current_pity}
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-foreground">
                    {formatKrw(userGame.monthly_budget)}
                  </span>
                </div>
              );
            })}
            {data.userGames.length === 0 ? <EmptyState>추적 중인 게임이 없습니다.</EmptyState> : null}
          </div>
        </DesignCard>

        <DesignCard title="게임 추가" sub="마스터 게임 목록에서 선택">
          <AddGameForm data={data} />
        </DesignCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <DesignCard title="통화 기준" sub="현재 v1은 KRW 중심">
          <div className="grid gap-3">
            <StatBlock label="기본 통화" value="KRW" />
            <p className="font-mono text-xs leading-relaxed text-muted-foreground">
              게임별 1회 비용은 games.base_cost 기준으로 계산합니다. 실제 예산 판단은 결제 기록 금액을 사용합니다.
            </p>
          </div>
        </DesignCard>

        <DesignCard title="알림" sub="제품 안 신호부터 시작">
          <div className="space-y-2.5">
            {[
              ["예산 80% 도달", "켜짐"],
              ["하드 스톱 도달", "켜짐"],
              ["5일 쿨다운", "선택"],
            ].map(([label, status]) => (
              <div key={label} className="flex items-center justify-between gap-3 rounded-sm border border-border/70 bg-muted/20 p-2.5 zzz-panel-shadow">
                <span className="font-heading text-xs font-bold uppercase tracking-tight text-foreground">{label}</span>
                <ToneBadge tone={status === "켜짐" ? "safe" : "default"}>{status}</ToneBadge>
              </div>
            ))}
          </div>
        </DesignCard>

        <DesignCard title="데이터" sub="가져오기와 내보내기">
          <div className="grid gap-2">
            {!data.isAuthenticated ? (
              <AuthCta
                authEnabled={data.authEnabled}
                nextPath="/settings"
                authState={authState}
                compact
                title="로그인하면 설정을 저장할 수 있어요"
                description="게임, 예산, 결제 가져오기 설정은 계정에 연결한 뒤 저장됩니다."
              />
            ) : null}
            <Button asChild variant="outline" className="font-heading font-bold uppercase tracking-tight">
              <Link href="/imports/google">
                <Upload className="size-4" />
                Google 결제 가져오기
              </Link>
            </Button>
            <Button variant="outline" disabled className="font-heading font-bold uppercase tracking-tight">
              <Download className="size-4" />
              CSV 내보내기
            </Button>
            <Button variant="outline" disabled className="font-heading font-bold uppercase tracking-tight">
              <Mail className="size-4" />
              이메일 리포트
            </Button>
            <Button variant="outline" disabled className="font-heading font-bold uppercase tracking-tight">
              <Trash2 className="size-4" />
              기록 초기화
            </Button>
          </div>
        </DesignCard>
      </section>

      <DesignCard
        title="계정"
        sub={
          data.isAuthenticated
            ? "Google 계정"
            : data.authEnabled
              ? "비로그인 미리보기"
              : "Demo Mode"
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <Input value={data.profile.display_name ?? ""} readOnly aria-label="표시 이름" className="font-mono text-xs" />
          <Input value={data.profile.email ?? ""} readOnly aria-label="이메일" className="font-mono text-xs" />
          <Input value={data.profile.timezone} readOnly aria-label="시간대" className="font-mono text-xs" />
        </div>
        <div className="mt-4">
          <TemplateApplyForm isDemo={data.isDemo} />
        </div>
      </DesignCard>

      <DesignCard
        title="서비스 런처"
        sub="같은 계정과 게임을 공유하는 OtakuS 연결 서비스"
      >
        <AppLauncher />
      </DesignCard>
    </div>
  );
}
