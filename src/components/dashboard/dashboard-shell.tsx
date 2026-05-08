import {
  AlertCircle,
  BellRing,
  CalendarClock,
  Gauge,
  LogOut,
  ShieldCheck,
  Target,
  Pencil,
  Trash2,
  WalletCards,
} from "lucide-react";
import type { ReactNode } from "react";

import { deletePayment, signOut, updatePayment } from "@/app/actions";
import {
  formatKrw,
  getBudgetWarningLevel,
  getEstimatedCostToPity,
  getMonthlySpend,
  getPityProgress,
  getRemainingPulls,
  PAYMENT_TYPE_LABELS,
} from "@/lib/domain/calculations";
import type {
  DashboardData,
  PaymentRecord,
  UserGame,
} from "@/lib/domain/dashboard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaymentForm } from "@/components/dashboard/payment-form";
import { SpendCharts } from "@/components/dashboard/spend-charts";
import {
  AddGameForm,
  BudgetForm,
  GachaLogInlineForm,
  TemplateApplyForm,
} from "@/components/dashboard/quick-forms";

export function DashboardShell({ data }: { data: DashboardData }) {
  const monthlySpend = getMonthlySpend(data.payments);
  const fallbackBudget = data.userGames.reduce(
    (total, userGame) => total + userGame.monthly_budget,
    0,
  );
  const budgetAmount = data.budget?.total_budget ?? fallbackBudget;
  const warning = getBudgetWarningLevel(
    monthlySpend,
    budgetAmount,
    data.budget?.warning_at ?? 70,
  );
  const todaySpent = getTodaySpent(data.payments);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                {data.isDemo ? "Demo Mode" : "Supabase 보호 중"}
              </Badge>
              <Badge variant={warning.level === "over" ? "destructive" : "outline"}>
                {data.yearMonth}
              </Badge>
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                GachaGuard
              </h1>
              <p className="text-sm text-muted-foreground">
                기록하기 전에 한 번 멈추고, 숫자로 충동을 확인합니다.
              </p>
            </div>
          </div>
          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm">
              <LogOut className="h-4 w-4" />
              로그아웃
            </Button>
          </form>
        </header>

        {data.isDemo ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Supabase 연결 전 미리보기</AlertTitle>
            <AlertDescription>
              `.env.local`에 Supabase URL과 publishable key를 넣고 마이그레이션을
              적용하면 저장 기능이 활성화됩니다.
            </AlertDescription>
          </Alert>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard
            icon={<WalletCards className="h-5 w-5" />}
            label="이번 달 총 과금"
            value={formatKrw(monthlySpend)}
            detail={`${formatKrw(budgetAmount)} 예산 중 ${warning.percent}%`}
            tone={warning.level}
          />
          <MetricCard
            icon={<Gauge className="h-5 w-5" />}
            label="예산까지 남은 금액"
            value={formatKrw(warning.remaining)}
            detail={`경고선 ${formatKrw(warning.thresholdAmount)}`}
            tone={warning.level}
          />
          <MetricCard
            icon={<BellRing className="h-5 w-5" />}
            label="오늘 기록된 과금"
            value={formatKrw(todaySpent)}
            detail={`${formatKrw(data.profile.session_warning_amount)} 이상이면 마찰 표시`}
            tone={todaySpent >= data.profile.session_warning_amount ? "warning" : "safe"}
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>소비 대시보드</CardTitle>
                <CardDescription>
                  게임별 비율과 날짜별 피크를 한눈에 봅니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SpendCharts payments={data.payments} userGames={data.userGames} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>천장 트래커</CardTitle>
                <CardDescription>
                  남은 횟수와 예상 추가 비용을 게임별로 계산합니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {data.userGames.map((userGame) => {
                  const remaining = getRemainingPulls(
                    userGame.current_pity,
                    userGame.games.hard_pity,
                  );
                  const estimated = getEstimatedCostToPity(
                    userGame.current_pity,
                    userGame.games.hard_pity,
                    userGame.games.base_cost,
                  );
                  const progress = getPityProgress(
                    userGame.current_pity,
                    userGame.games.hard_pity,
                  );

                  return (
                    <div key={userGame.id} className="rounded-lg border bg-card/60 p-4">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-medium">{userGame.games.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {userGame.games.genre ?? userGame.games.developer}
                          </p>
                        </div>
                        <Badge variant={remaining <= 10 ? "destructive" : "secondary"}>
                          {remaining}회
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>현재 뽑기</span>
                          <span className="metric-tabular">
                            {userGame.current_pity}/{userGame.games.hard_pity ?? "-"}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          예상 추가 비용 {formatKrw(estimated)}
                        </p>
                      </div>
                      <Separator className="my-4" />
                      <GachaLogInlineForm userGame={userGame} isDemo={data.isDemo} />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>최근 과금 기록</CardTitle>
                <CardDescription>
                  이번 달 기록만 표시합니다. 후회도는 v1에서 기록 저장만 지원합니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PaymentsTable
                  payments={data.payments}
                  userGames={data.userGames}
                  isDemo={data.isDemo}
                />
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>빠른 과금 입력</CardTitle>
                <CardDescription>
                  입력 전에 오늘 합계가 기준을 넘으면 확인 창을 띄웁니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PaymentForm
                  userGames={data.userGames}
                  todaySpent={todaySpent}
                  sessionWarningAmount={data.profile.session_warning_amount}
                  isDemo={data.isDemo}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>예산과 게임</CardTitle>
                <CardDescription>
                  월 예산, 게임별 예산, 반복 패스를 관리합니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <BudgetForm data={data} />
                <Separator />
                <AddGameForm data={data} />
                <Separator />
                <TemplateApplyForm isDemo={data.isDemo} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>운영 체크</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex gap-2">
                  <Target className="mt-0.5 h-4 w-4 text-primary" />
                  RLS 기준으로 본인 데이터만 접근합니다.
                </div>
                <div className="flex gap-2">
                  <CalendarClock className="mt-0.5 h-4 w-4 text-primary" />
                  월 기준은 Asia/Seoul로 계산합니다.
                </div>
              </CardContent>
            </Card>
          </aside>
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: "unset" | "safe" | "warning" | "limit" | "over";
}) {
  const toneClass =
    tone === "over" || tone === "limit"
      ? "border-destructive/60 bg-destructive/10"
      : tone === "warning"
        ? "border-yellow-400/50 bg-yellow-400/10"
        : "border-primary/30 bg-primary/10";

  return (
    <Card className={toneClass}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardDescription>{label}</CardDescription>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="metric-tabular text-3xl font-semibold tracking-tight">
          {value}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function PaymentsTable({
  payments,
  userGames,
  isDemo,
}: {
  payments: PaymentRecord[];
  userGames: UserGame[];
  isDemo: boolean;
}) {
  if (payments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
        아직 이번 달 과금 기록이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>날짜</TableHead>
              <TableHead>게임</TableHead>
              <TableHead>유형</TableHead>
              <TableHead className="text-right">금액</TableHead>
              <TableHead className="w-[64px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell className="text-muted-foreground">
                  {new Intl.DateTimeFormat("ko-KR", {
                    timeZone: "Asia/Seoul",
                    month: "2-digit",
                    day: "2-digit",
                  }).format(new Date(payment.paid_at))}
                </TableCell>
                <TableCell>
                  <div className="font-medium">
                    {payment.user_games?.games?.name ?? "등록 게임"}
                  </div>
                  <div className="max-w-[260px] truncate text-xs text-muted-foreground">
                    {payment.memo ?? "메모 없음"}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{PAYMENT_TYPE_LABELS[payment.type]}</Badge>
                </TableCell>
                <TableCell className="metric-tabular text-right font-medium">
                  {formatKrw(payment.amount)}
                </TableCell>
                <TableCell>
                  <form action={deletePayment}>
                    <input type="hidden" name="id" value={payment.id} />
                    <Button
                      type="submit"
                      size="icon"
                      variant="ghost"
                      disabled={isDemo}
                      aria-label="과금 기록 삭제"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </form>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Separator />
      <div className="grid gap-2">
        {payments.map((payment) => (
          <details key={`${payment.id}-edit`} className="rounded-lg border p-3">
            <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <Pencil className="h-4 w-4 text-muted-foreground" />
              {payment.user_games?.games?.name ?? "기록"} 수정
            </summary>
            <form action={updatePayment} className="mt-3 grid gap-3 md:grid-cols-4">
              <input type="hidden" name="id" value={payment.id} />
              <div className="grid gap-1">
                <span className="text-xs text-muted-foreground">게임</span>
                <select
                  name="userGameId"
                  defaultValue={payment.user_game_id}
                  disabled={isDemo}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {userGames.map((userGame) => (
                    <option key={userGame.id} value={userGame.id}>
                      {userGame.games.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1">
                <span className="text-xs text-muted-foreground">유형</span>
                <select
                  name="type"
                  defaultValue={payment.type}
                  disabled={isDemo}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {Object.entries(PAYMENT_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1">
                <span className="text-xs text-muted-foreground">금액</span>
                <input
                  name="amount"
                  type="number"
                  min={1}
                  defaultValue={payment.amount}
                  disabled={isDemo}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>
              <div className="grid gap-1">
                <span className="text-xs text-muted-foreground">메모</span>
                <input
                  name="memo"
                  defaultValue={payment.memo ?? ""}
                  disabled={isDemo}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>
              <Button type="submit" disabled={isDemo} className="md:col-span-4">
                수정 저장
              </Button>
            </form>
          </details>
        ))}
      </div>
    </div>
  );
}

function getTodaySpent(payments: PaymentRecord[]) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
  }).format(new Date());

  return payments.reduce((total, payment) => {
    const paidDay = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
    }).format(new Date(payment.paid_at));

    return paidDay === today ? total + payment.amount : total;
  }, 0);
}
