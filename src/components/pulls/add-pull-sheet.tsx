"use client";

import { Plus, Star } from "lucide-react";
import { useMemo, useState } from "react";

import { createPullSession } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { formatKrw } from "@/lib/domain/calculations";
import type { UserBanner } from "@/lib/domain/dashboard";
import { cn } from "@/lib/utils";

export function AddPullSheet({
  userBanners,
  isDemo,
  defaultUserBannerId,
}: {
  userBanners: UserBanner[];
  isDemo: boolean;
  defaultUserBannerId?: string;
}) {
  const [userBannerId, setUserBannerId] = useState(
    defaultUserBannerId ?? userBanners[0]?.id ?? "",
  );
  const [pullsCount, setPullsCount] = useState(10);
  const [rarity, setRarity] = useState(3);

  const selected = useMemo(
    () => userBanners.find((item) => item.id === userBannerId),
    [userBannerId, userBanners],
  );

  const defaultCost = selected?.banners.games.base_cost ?? 0;
  const predictedPity = selected ? selected.current_pity + pullsCount : pullsCount;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          disabled={userBanners.length === 0}
          className="bg-[var(--brand)] font-heading font-bold uppercase tracking-tight text-[#0b0d11] shadow-[0_0_12px_rgba(212,255,42,0.25)] hover:bg-[var(--brand)]/90"
        >
          <Plus className="size-4 stroke-[2.5]" />
          뽑기 기록
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-[var(--brand)] uppercase tracking-wider">
            <span>[ PULL_SESSION // NEW_RECORD ]</span>
          </div>
          <SheetTitle>뽑기 세션 추가</SheetTitle>
          <SheetDescription>
            단일 뽑기나 10연차를 기록하면 배너 pity와 Pull Log가 함께 갱신됩니다.
          </SheetDescription>
        </SheetHeader>

        <form action={createPullSession} className="grid gap-4 px-4 pb-4 font-mono text-xs">
          <div className="grid gap-2">
            <Label htmlFor="userBannerId">배너</Label>
            <select
              id="userBannerId"
              name="userBannerId"
              value={userBannerId}
              onChange={(event) => setUserBannerId(event.target.value)}
              disabled={isDemo}
              className="h-9 rounded-sm border-2 border-input bg-card/60 px-3 font-mono text-xs text-foreground focus-visible:border-[var(--brand)] outline-none"
              required
            >
              {userBanners.map((userBanner) => (
                <option key={userBanner.id} value={userBanner.id} className="bg-popover text-popover-foreground">
                  {userBanner.banners.games.name} · {userBanner.banners.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="pullsCount">횟수</Label>
              <Input
                id="pullsCount"
                name="pullsCount"
                type="number"
                min={1}
                max={100}
                value={pullsCount}
                onChange={(event) => setPullsCount(Number(event.target.value) || 1)}
                disabled={isDemo}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="costPerPull">1회 비용</Label>
              <Input
                key={userBannerId}
                id="costPerPull"
                name="costPerPull"
                type="number"
                min={0}
                defaultValue={defaultCost}
                disabled={isDemo}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>최고 결과</Label>
            <div className="grid grid-cols-3 gap-2">
              {[3, 4, 5].map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant={rarity === value ? "default" : "secondary"}
                  onClick={() => setRarity(value)}
                  disabled={isDemo}
                  className={cn(
                    "font-heading font-bold uppercase tracking-tight",
                    rarity === value && value === 5 && "bg-[var(--gold)] text-[#0b0d11] shadow-[0_0_10px_rgba(255,203,61,0.35)]",
                    rarity === value && value === 4 && "bg-[var(--info)] text-[#0b0d11] shadow-[0_0_10px_rgba(36,229,255,0.35)]",
                  )}
                >
                  <Star className="size-3.5 fill-current" />
                  {value}성
                </Button>
              ))}
            </div>
            <input type="hidden" name="rarity" value={rarity} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="itemName">결과 이름</Label>
            <Input
              id="itemName"
              name="itemName"
              placeholder="예: 픽업 캐릭터, 4성 무기, 일반 결과"
              disabled={isDemo}
            />
          </div>

          {rarity === 5 ? (
            <label className="flex items-center gap-2 rounded-sm border-2 border-[var(--gold)]/60 bg-[var(--gold)]/10 p-3 text-sm font-mono text-[var(--gold)]">
              <input name="isRateUp" type="checkbox" value="true" disabled={isDemo} className="accent-[var(--gold)]" />
              픽업 5성입니다
            </label>
          ) : null}

          <div className="rounded-sm border-2 border-border bg-card/60 p-3 text-sm font-mono text-muted-foreground zzz-panel-shadow">
            {selected ? (
              <>
                {selected.banners.name} pity가{" "}
                <span className="font-bold text-[var(--brand)]">
                  {selected.current_pity} → {rarity >= 5 ? 0 : predictedPity}
                </span>
                로 갱신됩니다. 예상 비용은{" "}
                <span className="font-bold text-foreground">
                  {formatKrw(defaultCost * pullsCount)}
                </span>
                입니다.
              </>
            ) : (
              "먼저 추적할 배너를 선택해 주세요."
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="memo">메모</Label>
            <Input id="memo" name="memo" placeholder="예: 스택 확인, pity 진입 전 10연차" disabled={isDemo} />
          </div>

          <Button
            type="submit"
            disabled={isDemo || !userBannerId}
            className="bg-[var(--brand)] font-heading font-bold uppercase tracking-tight text-[#0b0d11] shadow-[0_0_12px_rgba(212,255,42,0.25)] hover:bg-[var(--brand)]/90"
          >
            세션 저장
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
