import { createCustomBanner } from "@/app/actions";
import { DesignCard } from "@/components/app/design-system";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BANNER_TYPE_LABELS } from "@/lib/domain/calculations";
import type { DashboardData } from "@/lib/domain/dashboard";

const DEFAULT_START_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
}).format(new Date());

const DEFAULT_END_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
}).format(new Date(Date.now() + 14 * 86_400_000));

export function CustomBannerForm({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-5" data-screen-label="Create custom banner">
      <section className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">배너 직접 등록</h1>
        <p className="text-sm text-muted-foreground">
          마스터 목록에 없는 배너를 내 계정 전용으로 등록합니다. 등록 후 바로 추적을 시작합니다.
        </p>
      </section>

      <DesignCard title="배너 정보" sub="내 계정에서만 보이는 비공개 배너로 저장됩니다.">
        <form action={createCustomBanner} className="grid gap-4 lg:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="gameId">게임</Label>
            <select
              id="gameId"
              name="gameId"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              disabled={data.isDemo}
              required
            >
              {data.games.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="bannerType">유형</Label>
            <select
              id="bannerType"
              name="bannerType"
              defaultValue="character"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              disabled={data.isDemo}
            >
              {Object.entries(BANNER_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="name">배너 이름</Label>
            <Input id="name" name="name" placeholder="예: 푸른 서약" disabled={data.isDemo} required />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="featured">픽업 대상</Label>
            <Input id="featured" name="featured" placeholder="예: 마리나" disabled={data.isDemo} required />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="startsAtDate">시작일</Label>
            <Input id="startsAtDate" name="startsAtDate" type="date" defaultValue={DEFAULT_START_DATE} disabled={data.isDemo} required />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="endsAtDate">종료일</Label>
            <Input id="endsAtDate" name="endsAtDate" type="date" defaultValue={DEFAULT_END_DATE} disabled={data.isDemo} required />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="softPity">소프트 천장</Label>
            <Input id="softPity" name="softPity" type="number" min={0} placeholder="게임 기본값 사용" disabled={data.isDemo} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="hardPity">하드 천장</Label>
            <Input id="hardPity" name="hardPity" type="number" min={1} placeholder="게임 기본값 사용" disabled={data.isDemo} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="baseRate">기본 확률</Label>
            <Input id="baseRate" name="baseRate" type="number" min={0.0001} max={1} step={0.0001} placeholder="0.006" disabled={data.isDemo} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="rateUp">픽업 확률</Label>
            <Input id="rateUp" name="rateUp" type="number" min={0} max={1} step={0.01} placeholder="0.5" disabled={data.isDemo} />
          </div>

          <div className="grid gap-2 lg:col-span-2">
            <Label htmlFor="sourceUrl">출처 URL</Label>
            <Input id="sourceUrl" name="sourceUrl" type="url" placeholder="공식 공지나 참고 링크" disabled={data.isDemo} />
          </div>

          <div className="flex justify-end lg:col-span-2">
            <Button type="submit" disabled={data.isDemo || data.games.length === 0}>
              등록하고 추적 시작
            </Button>
          </div>
        </form>
      </DesignCard>
    </div>
  );
}
