"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState } from "@/components/app/design-system";
import { formatKrw } from "@/lib/domain/calculations";
import type { PaymentRecord, UserGame } from "@/lib/domain/dashboard";

const COLORS = ["#d9ff00", "#ff6b00", "#00e5ff", "#ffcb3d", "#ff2e4c", "#b347ff"];

export function SpendCharts({
  payments,
  userGames,
}: {
  payments: PaymentRecord[];
  userGames: UserGame[];
}) {
  const byGame = userGames
    .map((userGame) => {
      const value = payments
        .filter((payment) => payment.user_game_id === userGame.id)
        .reduce((total, payment) => total + payment.amount, 0);

      return {
        name: userGame.games.name,
        value,
      };
    })
    .filter((item) => item.value > 0);

  const byDay = Array.from(
    payments.reduce((map, payment) => {
      const label = new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul",
        month: "numeric",
        day: "numeric",
      }).format(new Date(payment.paid_at));
      map.set(label, (map.get(label) ?? 0) + payment.amount);
      return map;
    }, new Map<string, number>()),
  ).map(([date, amount]) => ({ date, amount }));

  return (
    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="h-[270px] rounded-sm border-2 border-border bg-card/60 p-4 zzz-panel-shadow">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="size-2 bg-[var(--brand)] shadow-[0_0_6px_var(--brand)]" />
            <h3 className="font-heading text-sm font-bold uppercase tracking-tight text-foreground">
              게임별 지출 비중
            </h3>
          </div>
          <span className="rounded-sm border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] font-bold text-muted-foreground">
            {byGame.length} GAMES
          </span>
        </div>
        {byGame.length > 0 ? (
          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Tooltip
                formatter={(value) => formatKrw(Number(value))}
                contentStyle={{
                  backgroundColor: "#13151b",
                  border: "2px solid #282e3f",
                  borderRadius: 4,
                  boxShadow: "3px 3px 0px #000000",
                  color: "#f5f7fa",
                  fontFamily: "monospace",
                  fontSize: "12px",
                }}
                itemStyle={{ color: "#d9ff00", fontWeight: "bold" }}
              />
              <Pie
                data={byGame}
                dataKey="value"
                nameKey="name"
                innerRadius={52}
                outerRadius={86}
                paddingAngle={4}
                stroke="#0b0c10"
                strokeWidth={2}
              >
                {byGame.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState>이번 달 결제 기록이 아직 없습니다.</EmptyState>
        )}
      </div>

      <div className="h-[270px] rounded-sm border-2 border-border bg-card/60 p-4 zzz-panel-shadow">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="size-2 bg-[var(--info)] shadow-[0_0_6px_var(--info)]" />
            <h3 className="font-heading text-sm font-bold uppercase tracking-tight text-foreground">
              일자별 지출
            </h3>
          </div>
          <span className="rounded-sm border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] font-bold text-muted-foreground">
            ASIA/SEOUL
          </span>
        </div>
        {byDay.length > 0 ? (
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={byDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2433" vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={{ stroke: "#282e3f" }}
                tick={{ fill: "#8d98af", fontSize: 11, fontFamily: "monospace" }}
              />
              <YAxis
                tickLine={false}
                axisLine={{ stroke: "#282e3f" }}
                width={70}
                tick={{ fill: "#8d98af", fontSize: 11, fontFamily: "monospace" }}
                tickFormatter={(value) => `${Math.round(Number(value) / 10000)}만`}
              />
              <Tooltip
                formatter={(value) => formatKrw(Number(value))}
                contentStyle={{
                  backgroundColor: "#13151b",
                  border: "2px solid #282e3f",
                  borderRadius: 4,
                  boxShadow: "3px 3px 0px #000000",
                  color: "#f5f7fa",
                  fontFamily: "monospace",
                  fontSize: "12px",
                }}
                itemStyle={{ color: "#d9ff00", fontWeight: "bold" }}
              />
              <Bar dataKey="amount" radius={[2, 2, 0, 0]} fill="#d9ff00" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState>막대가 비어 있으면 마음도 조금 가볍습니다.</EmptyState>
        )}
      </div>
    </div>
  );
}
