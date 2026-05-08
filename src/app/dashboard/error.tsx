"use client";

import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>대시보드를 불러오지 못했습니다.</AlertTitle>
        <AlertDescription className="mt-2 space-y-3">
          <p>{error.message}</p>
          <Button type="button" variant="secondary" onClick={reset}>
            다시 시도
          </Button>
        </AlertDescription>
      </Alert>
    </main>
  );
}
