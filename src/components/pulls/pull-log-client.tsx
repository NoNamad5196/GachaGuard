"use client";

import { useMemo, useState } from "react";
import { Edit3, Search, Trash2 } from "lucide-react";

import { deletePull, updatePullResult } from "@/app/actions";
import { formatKrw } from "@/lib/domain/calculations";
import type { DashboardData, PullRecord } from "@/lib/domain/dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DesignCard,
  EmptyState,
  StatBlock,
  ToneBadge,
} from "@/components/app/design-system";
import { AddPullSheet } from "@/components/pulls/add-pull-sheet";

export function PullLogClient({ data }: { data: DashboardData }) {
  const [game, setGame] = useState("all");
  const [rarity, setRarity] = useState("all");
  const [query, setQuery] = useState("");

  const rows = useMemo(
    () =>
      data.pulls.filter((pull) => {
        const banner = pull.user_banners?.banners;
        const gameId = banner?.games?.id;
        const text = `${pull.item_name ?? ""} ${banner?.name ?? ""} ${banner?.featured ?? ""}`.toLowerCase();

        return (
          (game === "all" || gameId === game) &&
          (rarity === "all" || String(pull.rarity) === rarity) &&
          (!query.trim() || text.includes(query.trim().toLowerCase()))
        );
      }),
    [data.pulls, game, query, rarity],
  );

  const totalCost = rows.reduce((total, pull) => total + pull.cost, 0);
  const fiveStars = rows.filter((pull) => pull.rarity >= 5).length;
  const fourStars = rows.filter((pull) => pull.rarity === 4).length;

  return (
    <div className="space-y-5" data-screen-label="Pull Log">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Pull Log</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            배너별 결과와 비용을 검색하고, 잘못 입력한 결과를 바로 고칩니다.
          </p>
        </div>
        <AddPullSheet userBanners={data.userBanners} isDemo={data.isDemo} />
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <DesignCard>
          <StatBlock label="표시 비용" value={formatKrw(totalCost)} />
        </DesignCard>
        <DesignCard>
          <StatBlock label="5성 결과" value={`${fiveStars}개`} tone="gold" />
        </DesignCard>
        <DesignCard>
          <StatBlock label="4성 결과" value={`${fourStars}개`} tone="default" />
        </DesignCard>
      </section>

      <DesignCard title="필터" sub={`${rows.length} / ${data.pulls.length}개 표시`}>
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_140px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="아이템, 캐릭터, 배너 검색"
              className="pl-9"
            />
          </label>
          <select
            value={game}
            onChange={(event) => setGame(event.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">모든 게임</option>
            {data.games.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <select
            value={rarity}
            onChange={(event) => setRarity(event.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">모든 등급</option>
            <option value="5">5성</option>
            <option value="4">4성</option>
            <option value="3">3성</option>
          </select>
        </div>
      </DesignCard>

      <DesignCard title="뽑기 기록" bodyClassName="p-0">
        {rows.length > 0 ? (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-[var(--surface-2)] text-left text-[11.5px] uppercase tracking-[0.04em] text-muted-foreground">
                    <th className="px-4 py-3 font-medium">날짜</th>
                    <th className="px-4 py-3 font-medium">게임</th>
                    <th className="px-4 py-3 font-medium">배너</th>
                    <th className="px-4 py-3 font-medium">결과</th>
                    <th className="px-4 py-3 text-right font-medium">피티</th>
                    <th className="px-4 py-3 text-right font-medium">비용</th>
                    <th className="px-4 py-3 text-right font-medium">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((pull) => (
                    <PullRow key={pull.id} pull={pull} isDemo={data.isDemo} />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 p-4 lg:hidden">
              {rows.map((pull) => (
                <MobilePullCard key={pull.id} pull={pull} isDemo={data.isDemo} />
              ))}
            </div>
          </>
        ) : (
          <div className="p-4">
            <EmptyState>조건에 맞는 뽑기 기록이 없습니다.</EmptyState>
          </div>
        )}
      </DesignCard>
    </div>
  );
}

function PullRow({ pull, isDemo }: { pull: PullRecord; isDemo: boolean }) {
  const banner = pull.user_banners?.banners;
  const game = banner?.games;

  return (
    <tr className="border-b last:border-b-0 hover:bg-muted/35">
      <td className="px-4 py-3 text-muted-foreground">
        <div>{formatDate(pull.pulled_at)}</div>
        <div className="font-mono text-xs">{formatTime(pull.pulled_at)}</div>
      </td>
      <td className="px-4 py-3">{game?.name ?? "게임"}</td>
      <td className="px-4 py-3 text-muted-foreground">{banner?.name ?? "배너"}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <ToneBadge tone={pull.rarity >= 5 ? "gold" : pull.rarity >= 4 ? "info" : "default"}>
            {pull.rarity}성
          </ToneBadge>
          <span>{pull.item_name ?? "결과 미입력"}</span>
        </div>
        {pull.is_rate_up ? (
          <div className="mt-1 text-xs text-[var(--gold)]">픽업 획득</div>
        ) : null}
      </td>
      <td className="px-4 py-3 text-right font-mono tabular-nums">{pull.pity_before}</td>
      <td className="px-4 py-3 text-right font-mono tabular-nums">{formatKrw(pull.cost)}</td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-1">
          <EditPullForm pull={pull} isDemo={isDemo} />
          <form action={deletePull}>
            <input type="hidden" name="id" value={pull.id} />
            <Button type="submit" variant="ghost" size="icon" disabled={isDemo} aria-label="삭제">
              <Trash2 className="size-4" />
            </Button>
          </form>
        </div>
      </td>
    </tr>
  );
}

function MobilePullCard({ pull, isDemo }: { pull: PullRecord; isDemo: boolean }) {
  const banner = pull.user_banners?.banners;

  return (
    <div className="rounded-lg border bg-muted/25 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ToneBadge tone={pull.rarity >= 5 ? "gold" : pull.rarity >= 4 ? "info" : "default"}>
              {pull.rarity}성
            </ToneBadge>
            <span className="text-sm font-medium">{pull.item_name ?? "결과 미입력"}</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {banner?.name ?? "배너"} · {formatDate(pull.pulled_at)}
          </div>
        </div>
        <span className="font-mono text-xs text-muted-foreground">{formatKrw(pull.cost)}</span>
      </div>
      <div className="mt-3 flex gap-1">
        <EditPullForm pull={pull} isDemo={isDemo} />
        <form action={deletePull}>
          <input type="hidden" name="id" value={pull.id} />
          <Button type="submit" variant="ghost" size="sm" disabled={isDemo}>
            <Trash2 className="size-4" />
            삭제
          </Button>
        </form>
      </div>
    </div>
  );
}

function EditPullForm({ pull, isDemo }: { pull: PullRecord; isDemo: boolean }) {
  return (
    <details className="relative">
      <summary className="list-none">
        <Button type="button" variant="ghost" size="icon" disabled={isDemo} aria-label="수정">
          <Edit3 className="size-4" />
        </Button>
      </summary>
      <form
        action={updatePullResult}
        className="absolute right-0 top-9 z-10 grid w-64 gap-2 rounded-lg border bg-card p-3 shadow-lg"
      >
        <input type="hidden" name="id" value={pull.id} />
        <select
          name="rarity"
          defaultValue={pull.rarity}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="5">5성</option>
          <option value="4">4성</option>
          <option value="3">3성</option>
        </select>
        <Input name="itemName" defaultValue={pull.item_name ?? ""} placeholder="결과 이름" />
        <label className="flex items-center gap-2 text-sm">
          <input name="isRateUp" type="checkbox" value="true" defaultChecked={pull.is_rate_up ?? false} />
          픽업 결과
        </label>
        <Button type="submit" size="sm">
          저장
        </Button>
      </form>
    </details>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
