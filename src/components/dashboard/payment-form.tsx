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

const QUICK_AMOUNTS = [1100, 3300, 11000, 33000];
const PAYMENT_TYPES: PaymentType[] = ["gacha", "pass", "coin", "event", "other"];

export function PaymentForm({
  userGames,
  todaySpent,
  sessionWarningAmount,
  isDemo,
}: {
  userGames: UserGame[];
  todaySpent: number;
  sessionWarningAmount: number;
  isDemo: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [userGameId, setUserGameId] = useState(userGames[0]?.id ?? "");
  const [type, setType] = useState<PaymentType>("gacha");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [pendingForm, setPendingForm] = useState<FormData | null>(null);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

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

  return (
    <div className="space-y-4">
      {isDemo ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>데모 모드</AlertTitle>
          <AlertDescription>
            Supabase 환경 변수를 연결하면 입력과 저장이 활성화됩니다.
          </AlertDescription>
        </Alert>
      ) : null}

      <form
        ref={formRef}
        className="grid gap-4"
        onSubmit={(event) => {
          if (isDemo) {
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
            <Select value={userGameId} onValueChange={setUserGameId} disabled={isDemo}>
              <SelectTrigger className="w-full">
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
            <Select value={type} onValueChange={(value) => setType(value as PaymentType)}>
              <SelectTrigger className="w-full">
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
              className="pl-9 metric-tabular"
              placeholder="33000"
              disabled={isDemo}
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
                disabled={isDemo}
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
            placeholder="픽업 10연, 월정액, 충동 구매 이유 등"
            disabled={isDemo}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isDemo || isPending}>
          <Plus className="h-4 w-4" />
          과금 기록
        </Button>
      </form>

      <AlertDialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>오늘 이미 {formatKrw(todaySpent)} 썼어요.</AlertDialogTitle>
            <AlertDialogDescription>
              이 기록을 추가하면 오늘 합계는 {formatKrw(warning.totalAfter)}입니다.
              잠깐 멈춰서 실제로 필요한 과금인지 확인해 주세요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>잠깐만요</AlertDialogCancel>
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
