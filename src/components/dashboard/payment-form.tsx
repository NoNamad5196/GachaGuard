"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { AlertTriangle, Coins, Plus } from "lucide-react";

import { createPayment } from "@/app/actions";
import {
  formatKrw,
  getSessionWarning,
  PAYMENT_TYPE_LABELS,
} from "@/lib/domain/calculations";
import type { UserGame } from "@/lib/domain/dashboard";
import type { PaymentType } from "@/types/database";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AuthCta } from "@/components/auth/auth-cta";

const QUICK_AMOUNTS = [1100, 3300, 11000, 33000];
const PAYMENT_TYPES: PaymentType[] = ["gacha", "pass", "coin", "event", "other"];

export function PaymentForm({
  userGames,
  todaySpent,
  sessionWarningAmount,
  isDemo,
  authEnabled,
  isAuthenticated,
  authState,
}: {
  userGames: UserGame[];
  todaySpent: number;
  sessionWarningAmount: number;
  isDemo: boolean;
  authEnabled: boolean;
  isAuthenticated: boolean;
  authState?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [userGameId, setUserGameId] = useState(userGames[0]?.id ?? "");
  const [type, setType] = useState<PaymentType>("gacha");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [pendingForm, setPendingForm] = useState<FormData | null>(null);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const canMutate = !isDemo && isAuthenticated;

  const warning = useMemo(
    () =>
      getSessionWarning({
        amount: Number(amount) || 0,
        todaySpent,
        sessionWarningAmount,
      }),
    [amount, sessionWarningAmount, todaySpent],
  );

  function submitForm(formData: FormData) {
    startTransition(async () => {
      await createPayment(formData);
      formRef.current?.reset();
      setAmount("");
      setMemo("");
      setPendingForm(null);
      setDialogOpen(false);
    });
  }

  if (userGames.length === 0) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>먼저 게임을 추가해 주세요</AlertTitle>
        <AlertDescription>
          설정에서 추적할 게임을 추가하면 지출 기록을 남길 수 있습니다.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {!isAuthenticated ? (
        <AuthCta
          authEnabled={authEnabled}
          nextPath="/dashboard"
          authState={authState}
          compact
          title="로그인하면 지출을 저장할 수 있어요"
          description="대시보드는 먼저 둘러보고, 개인 결제 기록은 로그인 후 저장합니다."
        />
      ) : null}

      <form
        ref={formRef}
        className="grid gap-4"
        onSubmit={(event) => {
          if (!canMutate) {
            event.preventDefault();
            return;
          }

          if (warning.shouldWarn && !pendingForm) {
            event.preventDefault();
            setPendingForm(new FormData(event.currentTarget));
            setDialogOpen(true);
          }
        }}
        action={createPayment}
      >
        <input type="hidden" name="userGameId" value={userGameId} />
        <input type="hidden" name="type" value={type} />

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>게임</Label>
            <Select value={userGameId} onValueChange={setUserGameId} disabled={!canMutate}>
              <SelectTrigger className="w-full rounded-md">
                <SelectValue placeholder="게임 선택" />
              </SelectTrigger>
              <SelectContent>
                {userGames.map((userGame) => (
                  <SelectItem key={userGame.id} value={userGame.id}>
                    {userGame.games.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>유형</Label>
            <Select
              value={type}
              onValueChange={(value) => setType(value as PaymentType)}
              disabled={!canMutate}
            >
              <SelectTrigger className="w-full rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_TYPES.map((paymentType) => (
                  <SelectItem key={paymentType} value={paymentType}>
                    {PAYMENT_TYPE_LABELS[paymentType]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="amount">금액</Label>
          <div className="relative">
            <Coins className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="amount"
              name="amount"
              inputMode="numeric"
              min={1}
              value={amount}
              onChange={(event) => setAmount(event.target.value.replace(/[^0-9]/g, ""))}
              className="metric-tabular pl-9"
              placeholder="33000"
              disabled={!canMutate}
              required
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {QUICK_AMOUNTS.map((quickAmount) => (
              <Button
                key={quickAmount}
                type="button"
                variant="secondary"
                size="sm"
                disabled={!canMutate}
                onClick={() => setAmount(String(quickAmount))}
              >
                {quickAmount.toLocaleString("ko-KR")}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="memo">메모</Label>
          <Textarea
            id="memo"
            name="memo"
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
            placeholder="예: 픽업 10연차 전 충전, 월간 패스"
            disabled={!canMutate}
          />
        </div>

        <Button type="submit" className="w-full" disabled={!canMutate || isPending}>
          <Plus className="h-4 w-4" />
          지출 기록
        </Button>
      </form>

      <AlertDialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>오늘 이미 {formatKrw(todaySpent)} 썼어요.</AlertDialogTitle>
            <AlertDialogDescription>
              이 기록을 추가하면 오늘 합계는 {formatKrw(warning.totalAfter)}입니다.
              잠깐 멈추고 실제로 필요한 결제인지 확인해 주세요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>멈출게요</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                if (pendingForm) {
                  submitForm(pendingForm);
                }
              }}
            >
              네, 기록할게요
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
