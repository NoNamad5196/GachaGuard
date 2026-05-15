import {
  addUserGame,
  applyMonthlyTemplates,
  createGachaLog,
  updatePity,
  upsertBudget,
} from "@/app/actions";
import type { DashboardData, UserGame } from "@/lib/domain/dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export function BudgetForm({ data }: { data: DashboardData }) {
  return (
    <form action={upsertBudget} className="grid gap-3">
      <input type="hidden" name="yearMonth" value={data.yearMonth} />
      <div className="grid gap-2">
        <Label htmlFor="totalBudget">이번 달 총 예산</Label>
        <Input
          id="totalBudget"
          name="totalBudget"
          type="number"
          min={0}
          defaultValue={data.budget?.total_budget ?? 220000}
          disabled={data.isDemo}
          className="metric-tabular"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="warningAt">경고 기준 (%)</Label>
        <Input
          id="warningAt"
          name="warningAt"
          type="number"
          min={1}
          max={100}
          defaultValue={data.budget?.warning_at ?? 70}
          disabled={data.isDemo}
          className="metric-tabular"
        />
      </div>
      <Button type="submit" disabled={data.isDemo}>
        예산 저장
      </Button>
    </form>
  );
}

export function AddGameForm({ data }: { data: DashboardData }) {
  const registeredIds = new Set(data.userGames.map((userGame) => userGame.game_id));
  const availableGames = data.games.filter((game) => !registeredIds.has(game.id));

  return (
    <form action={addUserGame} className="grid gap-3">
      <div className="grid gap-2">
        <Label htmlFor="gameId">게임 추가</Label>
        <select
          id="gameId"
          name="gameId"
          disabled={data.isDemo || availableGames.length === 0}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          required
        >
          {availableGames.map((game) => (
            <option key={game.id} value={game.id}>
              {game.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="monthlyBudget">게임별 예산</Label>
          <Input
            id="monthlyBudget"
            name="monthlyBudget"
            type="number"
            min={0}
            defaultValue={50000}
            disabled={data.isDemo}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="currentPity">현재 피티</Label>
          <Input
            id="currentPity"
            name="currentPity"
            type="number"
            min={0}
            defaultValue={0}
            disabled={data.isDemo}
          />
        </div>
      </div>
      <input type="hidden" name="warningThresholdPercent" value="70" />
      <Button type="submit" disabled={data.isDemo || availableGames.length === 0}>
        게임 저장
      </Button>
    </form>
  );
}

export function TemplateApplyForm({ isDemo }: { isDemo: boolean }) {
  return (
    <form action={applyMonthlyTemplates}>
      <Button type="submit" variant="secondary" className="w-full" disabled={isDemo}>
        이번 달 반복 결제 반영
      </Button>
    </form>
  );
}

export function GachaLogInlineForm({
  userGame,
  isDemo,
}: {
  userGame: UserGame;
  isDemo: boolean;
}) {
  return (
    <div className="space-y-3">
      <form action={updatePity} className="flex gap-2">
        <input type="hidden" name="userGameId" value={userGame.id} />
        <Input
          name="currentPity"
          type="number"
          min={0}
          defaultValue={userGame.current_pity}
          disabled={isDemo}
          className="metric-tabular"
          aria-label={`${userGame.games.name} 현재 피티`}
        />
        <Button type="submit" variant="secondary" disabled={isDemo}>
          갱신
        </Button>
      </form>
      <Separator />
      <form action={createGachaLog} className="grid gap-2">
        <input type="hidden" name="userGameId" value={userGame.id} />
        <input type="hidden" name="pityAtPull" value={userGame.current_pity} />
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Input
            name="pulls"
            type="number"
            min={1}
            defaultValue={10}
            disabled={isDemo}
            aria-label={`${userGame.games.name} 뽑기 횟수`}
          />
          <Button type="submit" disabled={isDemo}>
            뽑기 추가
          </Button>
        </div>
        <Input
          name="result"
          placeholder="결과 메모"
          disabled={isDemo}
          aria-label={`${userGame.games.name} 뽑기 결과`}
        />
      </form>
    </div>
  );
}
