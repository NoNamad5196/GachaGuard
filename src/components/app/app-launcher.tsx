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
              "flex items-center justify-between gap-2 rounded-sm border-2 px-2.5 py-1.5 text-left font-mono transition-all",
              s.current
                ? "border-[var(--brand)] bg-[var(--brand)]/10 text-foreground shadow-[2px_2px_0px_#000]"
                : s.href
                  ? "border-border bg-card text-muted-foreground hover:border-[var(--brand)]/60 hover:bg-muted/40 hover:text-foreground"
                  : "cursor-not-allowed border-border/50 bg-muted/20 text-muted-foreground/60 opacity-60",
            )
          : cn(
              "relative flex flex-col items-start gap-2 overflow-hidden rounded-sm border-2 p-4 text-left font-mono transition-all zzz-panel-shadow",
              s.current
                ? "border-[var(--brand)] bg-card shadow-[3px_3px_0px_#000] hover:border-[var(--brand)]"
                : s.href
                  ? "border-border bg-card hover:border-[var(--brand)]/60 hover:bg-muted/30"
                  : "cursor-not-allowed border-border/50 bg-muted/20 opacity-60",
            );

        const content = compact ? (
          <>
            <span className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden="true"
                className="grid size-5 place-items-center rounded-xs text-xs font-bold"
                style={{
                  color: s.color,
                  backgroundColor: `${s.color}20`,
                }}
              >
                {s.icon}
              </span>
              <strong className="truncate font-heading text-xs font-bold tracking-tight text-foreground">
                {s.name}
              </strong>
            </span>
            <span
              className={cn(
                "shrink-0 font-mono text-[10px] font-semibold uppercase",
                s.current ? "text-[var(--brand)]" : s.href ? "text-muted-foreground" : "text-muted-foreground/50",
              )}
            >
              {statusLabel}
            </span>
          </>
        ) : (
          <>
            <div className="flex w-full items-center justify-between">
              <span
                aria-hidden="true"
                className="flex size-9 items-center justify-center rounded-sm border text-base font-bold"
                style={{
                  color: s.color,
                  borderColor: `${s.color}50`,
                  backgroundColor: `${s.color}15`,
                  boxShadow: `0 0 10px ${s.color}25`,
                }}
              >
                {s.icon}
              </span>
              <span
                className={cn(
                  "rounded-xs border px-1.5 py-0.5 text-[9.5px] font-mono font-bold uppercase",
                  s.current
                    ? "border-[var(--brand)]/60 bg-[var(--brand)]/15 text-[var(--brand)]"
                    : s.href
                      ? "border-border bg-muted/40 text-muted-foreground"
                      : "border-border/40 text-muted-foreground/50",
                )}
              >
                {s.current ? "LIVE" : s.href ? "LINKED" : "STANDBY"}
              </span>
            </div>
            <strong className="font-heading text-base font-bold tracking-tight text-foreground">{s.name}</strong>
            <small className="text-xs leading-5 text-muted-foreground">{s.description}</small>
            <span
              className={cn(
                "mt-auto pt-2 font-mono text-[11px] font-semibold uppercase",
                s.current ? "text-[var(--brand)]" : s.href ? "text-foreground group-hover:text-[var(--brand)]" : "text-muted-foreground/60",
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
