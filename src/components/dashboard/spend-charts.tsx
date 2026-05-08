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

import { formatKrw } from "@/lib/domain/calculations";
import type { PaymentRecord, UserGame } from "@/lib/domain/dashboard";

const COLORS = ["#34d399", "#fbbf24", "#fb7185", "#60a5fa", "#c084fc", "#f97316"];

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
    <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="h-[260px] rounded-lg border bg-card/60 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium">게임별 비율</h3>
          <span className="text-xs text-muted-foreground">{byGame.length}개 게임</span>
        </div>
        {byGame.length > 0 ? (
          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Tooltip formatter={(value) => formatKrw(Number(value))} />
              <Pie
                data={byGame}
                dataKey="value"
                nameKey="name"
                innerRadius={54}
                outerRadius={88}
                paddingAngle={3}
              >
                {byGame.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart label="이번 달 과금 기록이 아직 없어요." />
        )}
      </div>

      <div className="h-[260px] rounded-lg border bg-card/60 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium">일별 지출</h3>
          <span className="text-xs text-muted-foreground">Asia/Seoul 기준</span>
        </div>
        {byDay.length > 0 ? (
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={byDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={70}
                fontSize={12}
                tickFormatter={(value) => `${Math.round(Number(value) / 10000)}만`}
              />
              <Tooltip formatter={(value) => formatKrw(Number(value))} />
              <Bar dataKey="amount" radius={[6, 6, 2, 2]} fill="#34d399" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart label="막대가 비어 있으면 마음도 조금 가볍죠." />
        )}
      </div>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[205px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
      {label}
    </div>
  );
}
