import Link from "next/link";

import { cn } from "@/lib/utils";

export type OtakuSServiceId = "sipsungjang" | "otakuhub" | "gachaguard";

export interface OtakuSService {
  readonly id: OtakuSServiceId;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly color: string;
  readonly href: string | null;
  readonly current: boolean;
}

export function validUrl(value?: string): string | null {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export function getOtakuSServices(
  env?: Record<string, string | undefined>,
): readonly OtakuSService[] {
  const sipsungjangUrl = env
    ? env.NEXT_PUBLIC_SIPSUNGJANG_URL
    : process.env.NEXT_PUBLIC_SIPSUNGJANG_URL;
  const otakuhubUrl = env
    ? env.NEXT_PUBLIC_OTAKUHUB_URL
    : process.env.NEXT_PUBLIC_OTAKUHUB_URL;

  return [
    {
      id: "sipsungjang",
      name: "SipSungJang",
      description: "육성 · 주간 목표 · 플레이 수첩",
      icon: "✦",
      color: "#c9a84c",
      href: validUrl(sipsungjangUrl),
      current: false,
    },
    {
      id: "otakuhub",
      name: "OtakuHub",
      description: "게임 · 서브컬처 이벤트와 일정",
      icon: "◈",
      color: "#6ab0e8",
      href: validUrl(otakuhubUrl),
      current: false,
    },
    {
      id: "gachaguard",
      name: "GachaGuard",
      description: "소비 기록 · 예산 · 과금 돌아보기",
      icon: "⊕",
      color: "#a882e8",
      href: "/dashboard",
      current: true,
    },
  ];
}

export function AppLauncher({ compact = false }: { compact?: boolean }) {
  const services = getOtakuSServices();

  return (
    <div className={compact ? "grid gap-1.5" : "grid gap-3 md:grid-cols-3"}>
      {services.map((s) => {
        const statusLabel = s.current
          ? "◆ 현재 서비스"
          : s.href
            ? "서비스 열기 ↗"
            : "연결 준비 중";

        const cardClass = compact
          ? cn(
              "flex items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-left transition-colors",
              s.current
                ? "border-[var(--brand)] bg-[var(--brand-tint)] text-foreground"
                : s.href
                  ? "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                  : "cursor-not-allowed border-border bg-muted/40 text-muted-foreground opacity-75",
            )
          : cn(
              "flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors",
              s.current
                ? "border-[var(--brand)] bg-[var(--brand-tint)]/45 hover:border-[var(--brand-ink)]"
                : s.href
                  ? "border-border bg-card hover:bg-muted"
                  : "cursor-not-allowed border-border bg-muted/50 opacity-70",
            );

        const content = compact ? (
          <>
            <span className="flex min-w-0 items-center gap-2">
              <span aria-hidden="true" className="text-xs font-bold" style={{ color: s.color }}>
                {s.icon}
              </span>
              <strong className="truncate text-xs font-semibold">{s.name}</strong>
            </span>
            <span
              className={cn(
                "shrink-0 text-[10px] font-semibold",
                s.current || s.href ? "text-[var(--brand-ink)]" : "text-muted-foreground",
              )}
            >
              {statusLabel}
            </span>
          </>
        ) : (
          <>
            <span
              aria-hidden="true"
              className="flex size-9 items-center justify-center rounded-lg border text-base font-bold"
              style={{
                color: s.color,
                borderColor: `${s.color}40`,
                backgroundColor: `${s.color}14`,
              }}
            >
              {s.icon}
            </span>
            <strong className="text-sm font-bold text-foreground">{s.name}</strong>
            <small className="text-xs leading-5 text-muted-foreground">{s.description}</small>
            <span
              className={cn(
                "mt-auto pt-1 text-[11px] font-semibold",
                s.current || s.href ? "text-[var(--brand-ink)]" : "text-muted-foreground",
              )}
            >
              {statusLabel}
            </span>
          </>
        );

        if (s.href) {
          if (s.current) {
            return (
              <Link key={s.id} href={s.href} className={cardClass}>
                {content}
              </Link>
            );
          }
          return (
            <a
              key={s.id}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className={cardClass}
            >
              {content}
            </a>
          );
        }

        return (
          <div key={s.id} aria-disabled="true" className={cardClass}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
