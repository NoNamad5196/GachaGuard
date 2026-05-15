import { Download, Mail, Trash2 } from "lucide-react";

import { formatKrw } from "@/lib/domain/calculations";
import type { DashboardData } from "@/lib/domain/dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DesignCard,
  EmptyState,
  StatBlock,
  ToneBadge,
} from "@/components/app/design-system";
import { AddGameForm, TemplateApplyForm } from "@/components/dashboard/quick-forms";

export function SettingsPage({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-5" data-screen-label="Settings">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
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
                  className="grid gap-3 border-b border-border py-3 last:border-b-0 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-medium">{userGame.games.name}</h3>
                      <ToneBadge>{trackedBanners} banners</ToneBadge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {userGame.games.developer ?? "개발사 미입력"} · 피티 {userGame.current_pity}
                    </div>
                  </div>
                  <span className="font-mono text-sm text-muted-foreground">
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
            <p className="text-sm leading-6 text-muted-foreground">
              게임별 1회 비용은 `games.base_cost` 기준으로 계산합니다. 실제 예산 판단은 결제 기록 금액을 사용합니다.
            </p>
          </div>
        </DesignCard>

        <DesignCard title="알림" sub="제품 내 신호부터 시작">
          <div className="space-y-3">
            {[
              ["예산 80% 도달", "켜짐"],
              ["하드 스톱 도달", "켜짐"],
              ["5성 후 쿨다운", "선택"],
            ].map(([label, status]) => (
              <div key={label} className="flex items-center justify-between gap-3">
                <span className="text-sm">{label}</span>
                <ToneBadge tone={status === "켜짐" ? "safe" : "default"}>{status}</ToneBadge>
              </div>
            ))}
          </div>
        </DesignCard>

        <DesignCard title="데이터" sub="가져오기/내보내기">
          <div className="grid gap-2">
            <Button variant="outline" disabled>
              <Download className="size-4" />
              CSV 내보내기
            </Button>
            <Button variant="outline" disabled>
              <Mail className="size-4" />
              이메일 리포트
            </Button>
            <Button variant="outline" disabled>
              <Trash2 className="size-4" />
              기록 초기화
            </Button>
          </div>
        </DesignCard>
      </section>

      <DesignCard title="계정" sub={data.isDemo ? "Demo Mode" : "Supabase 계정"}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input value={data.profile.display_name ?? ""} readOnly aria-label="표시 이름" />
          <Input value={data.profile.email ?? ""} readOnly aria-label="이메일" />
          <Input value={data.profile.timezone} readOnly aria-label="시간대" />
        </div>
        <div className="mt-4">
          <TemplateApplyForm isDemo={data.isDemo} />
        </div>
      </DesignCard>
    </div>
  );
}
