"use client";

import {
  AlertCircle,
  CheckCircle2,
  FileUp,
  Loader2,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { importGooglePayments } from "@/app/actions";
import {
  DesignCard,
  EmptyState,
  StatBlock,
  ToneBadge,
} from "@/components/app/design-system";
import { AuthCta } from "@/components/auth/auth-cta";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatKrw } from "@/lib/domain/calculations";
import type { DashboardData } from "@/lib/domain/dashboard";
import {
  type GoogleImportCandidate,
  parseGooglePaymentFile,
} from "@/lib/google-payments/parser";
import type { PaymentType } from "@/types/database";

const SKIP_VALUE = "__skip__";

const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  gacha: "뽑기",
  pass: "패스",
  coin: "재화",
  event: "이벤트",
  other: "기타",
};

type RowState = {
  selected: boolean;
  userGameId: string;
  type: PaymentType;
};

type SaveResult = {
  inserted: number;
  skippedDuplicates: number;
};

export function GoogleImportPage({
  data,
  existingImportFingerprints,
  authState,
}: {
  data: DashboardData;
  existingImportFingerprints: string[];
  authState?: string;
}) {
  const [candidates, setCandidates] = useState<GoogleImportCandidate[]>([]);
  const [rowState, setRowState] = useState<Record<string, RowState>>({});
  const [parseError, setParseError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const stats = useMemo(
    () => ({
      total: candidates.length,
      ready: candidates.filter((candidate) => candidate.status === "ready").length,
      review: candidates.filter((candidate) => candidate.status === "needs_review").length,
      duplicate: candidates.filter((candidate) => candidate.status === "duplicate").length,
      unsupported: candidates.filter((candidate) => candidate.status === "unsupported").length,
    }),
    [candidates],
  );
  const selectedRows = candidates.filter((candidate) => {
    const state = rowState[candidate.id];
    return (
      state?.selected &&
      state.userGameId &&
      state.userGameId !== SKIP_VALUE &&
      candidate.status !== "duplicate" &&
      candidate.status !== "unsupported"
    );
  });
  const selectedTotal = selectedRows.reduce((total, candidate) => total + candidate.amount, 0);
  const canSave = data.isAuthenticated && selectedRows.length > 0 && !isPending;

  async function handleFileChange(file: File | undefined) {
    setSaveResult(null);
    setSaveError(null);
    setParseError(null);

    if (!file) {
      setCandidates([]);
      setRowState({});
      setFileName(null);
      return;
    }

    setIsParsing(true);
    setFileName(file.name);

    try {
      const parsed = await parseGooglePaymentFile(file, {
        userGames: data.userGames,
        existingImportFingerprints,
      });
      const nextState = Object.fromEntries(
        parsed.map((candidate) => [
          candidate.id,
          {
            selected: candidate.status === "ready" && Boolean(candidate.suggestedUserGameId),
            userGameId: candidate.suggestedUserGameId ?? SKIP_VALUE,
            type: candidate.type,
          },
        ]),
      );

      setCandidates(parsed);
      setRowState(nextState);

      if (parsed.length === 0) {
        setParseError("결제 항목을 찾지 못했습니다. Google Play/Pay 내보내기 파일인지 확인해 주세요.");
      }
    } catch (error) {
      setCandidates([]);
      setRowState({});
      setParseError(error instanceof Error ? error.message : "파일을 읽는 중 문제가 발생했습니다.");
    } finally {
      setIsParsing(false);
    }
  }

  function updateRow(id: string, partial: Partial<RowState>) {
    setRowState((current) => ({
      ...current,
      [id]: {
        ...current[id],
        ...partial,
      },
    }));
  }

  function handleSave() {
    setSaveError(null);
    setSaveResult(null);

    startTransition(async () => {
      try {
        const result = await importGooglePayments({
          rows: selectedRows.map((candidate) => {
            const state = rowState[candidate.id];

            return {
              userGameId: state.userGameId,
              amount: candidate.amount,
              type: state.type,
              paidAt: candidate.paidAt,
              source: candidate.source,
              externalOrderId: candidate.externalOrderId,
              importFingerprint: candidate.importFingerprint,
              merchant: candidate.merchant,
              rawDescription: candidate.rawDescription,
              currency: candidate.currency,
            };
          }),
        });

        setSaveResult(result);
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : "가져오기를 저장하지 못했습니다.");
      }
    });
  }

  return (
    <div className="space-y-5" data-screen-label="Google payment import">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Google 결제 가져오기
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Google Play/Pay 결제기록을 검수한 뒤 예산 지출 기준으로 저장합니다.
          </p>
        </div>
        <ToneBadge tone={data.isDemo ? "warn" : "safe"}>
          <ShieldCheck className="size-3" />
          {data.isAuthenticated
            ? "Supabase 보호 중"
            : data.authEnabled
              ? "로그인하면 저장 가능"
              : "Demo Mode"}
        </ToneBadge>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <DesignCard title="파일" sub="Takeout ZIP, JSON, CSV">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="google-payment-file">Google 결제 파일</Label>
              <Input
                id="google-payment-file"
                type="file"
                accept=".zip,.json,.csv,application/zip,application/json,text/csv"
                onChange={(event) => void handleFileChange(event.currentTarget.files?.[0])}
              />
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex items-center gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-md bg-card text-[var(--brand)]">
                  {isParsing ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <UploadCloud className="size-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {fileName ?? "아직 선택된 파일이 없습니다"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    원본 파일은 브라우저에서만 파싱됩니다.
                  </div>
                </div>
              </div>
            </div>
            {parseError ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>파일 확인 필요</AlertTitle>
                <AlertDescription>{parseError}</AlertDescription>
              </Alert>
            ) : null}
          </div>
        </DesignCard>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DesignCard bodyClassName="p-4">
            <StatBlock label="읽은 항목" value={`${stats.total}`} delta="파일 기준" />
          </DesignCard>
          <DesignCard bodyClassName="p-4">
            <StatBlock label="저장 가능" value={`${stats.ready}`} delta={formatKrw(selectedTotal)} tone="safe" />
          </DesignCard>
          <DesignCard bodyClassName="p-4">
            <StatBlock label="검수 필요" value={`${stats.review}`} delta="게임 매핑 필요" tone="warn" />
          </DesignCard>
          <DesignCard bodyClassName="p-4">
            <StatBlock
              label="제외"
              value={`${stats.duplicate + stats.unsupported}`}
              delta={`${stats.duplicate} 중복 · ${stats.unsupported} 미지원`}
            />
          </DesignCard>
        </div>
      </section>

      <DesignCard
        title="미리보기"
        sub={`${selectedRows.length}개 선택됨`}
        right={
          <Button onClick={handleSave} disabled={!canSave}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
            선택 항목 저장
          </Button>
        }
      >
        {!data.isAuthenticated ? (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>저장은 로그인 후 가능합니다</AlertTitle>
            <AlertDescription>
              파일 미리보기와 매핑은 먼저 확인할 수 있고, 선택 항목 저장만 로그인 후 진행합니다.
            </AlertDescription>
          </Alert>
        ) : null}
        {!data.isAuthenticated ? (
          <AuthCta
            authEnabled={data.authEnabled}
            nextPath="/imports/google"
            authState={authState}
            compact
            className="mb-4"
            title="로그인하면 가져온 결제를 저장할 수 있어요"
            description="Google 결제 파일은 브라우저에서만 읽고, 선택한 결제 항목만 계정에 저장합니다."
          />
        ) : null}
        {saveResult ? (
          <Alert className="mb-4">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>가져오기 완료</AlertTitle>
            <AlertDescription>
              {saveResult.inserted}개를 저장했고 {saveResult.skippedDuplicates}개 중복 항목은 건너뛰었습니다.
            </AlertDescription>
          </Alert>
        ) : null}
        {saveError ? (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>저장 실패</AlertTitle>
            <AlertDescription>{saveError}</AlertDescription>
          </Alert>
        ) : null}

        {candidates.length > 0 ? (
          <div className="overflow-x-auto">
            <Table className="min-w-[920px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[54px]">선택</TableHead>
                  <TableHead>결제</TableHead>
                  <TableHead>금액</TableHead>
                  <TableHead>게임</TableHead>
                  <TableHead>분류</TableHead>
                  <TableHead>상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((candidate) => {
                  const state = rowState[candidate.id];
                  const isBlocked =
                    candidate.status === "duplicate" || candidate.status === "unsupported";

                  return (
                    <TableRow key={candidate.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          className="size-4 accent-[var(--brand)]"
                          checked={Boolean(state?.selected)}
                          disabled={isBlocked}
                          onChange={(event) =>
                            updateRow(candidate.id, { selected: event.currentTarget.checked })
                          }
                          aria-label={`${candidate.rawDescription} 선택`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[300px]">
                          <div className="truncate text-sm font-medium">
                            {candidate.productName ?? candidate.appName ?? candidate.rawDescription}
                          </div>
                          <div className="mt-1 truncate text-xs text-muted-foreground">
                            {formatDate(candidate.paidAt)} · {sourceLabel(candidate.source)}
                            {candidate.externalOrderId ? ` · ${candidate.externalOrderId}` : ""}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono tabular-nums">
                        {candidate.currency === "KRW"
                          ? formatKrw(candidate.amount)
                          : `${candidate.currency} ${candidate.amount}`}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={state?.userGameId ?? SKIP_VALUE}
                          onValueChange={(value) =>
                            updateRow(candidate.id, {
                              userGameId: value,
                              selected: value !== SKIP_VALUE && !isBlocked,
                            })
                          }
                          disabled={isBlocked}
                        >
                          <SelectTrigger className="w-[190px]">
                            <SelectValue placeholder="게임 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={SKIP_VALUE}>제외</SelectItem>
                            {data.userGames.map((userGame) => (
                              <SelectItem key={userGame.id} value={userGame.id}>
                                {userGame.games.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={state?.type ?? candidate.type}
                          onValueChange={(value) =>
                            updateRow(candidate.id, { type: value as PaymentType })
                          }
                          disabled={isBlocked}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="분류" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(PAYMENT_TYPE_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <StatusBadge candidate={candidate} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState>Google 결제 파일을 선택하면 미리보기가 표시됩니다.</EmptyState>
        )}
      </DesignCard>
    </div>
  );
}

function StatusBadge({ candidate }: { candidate: GoogleImportCandidate }) {
  if (candidate.status === "ready") {
    return <ToneBadge tone="safe">저장 가능</ToneBadge>;
  }

  if (candidate.status === "needs_review") {
    return <ToneBadge tone="warn">검수 필요</ToneBadge>;
  }

  if (candidate.status === "duplicate") {
    return <ToneBadge>중복</ToneBadge>;
  }

  return <ToneBadge tone="danger">{candidate.statusReason ?? "미지원"}</ToneBadge>;
}

function sourceLabel(source: GoogleImportCandidate["source"]) {
  return source === "google_play" ? "Google Play" : "Google Pay";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
