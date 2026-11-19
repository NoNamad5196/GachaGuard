import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function DesignCard({
  title,
  sub,
  right,
  children,
  className,
  bodyClassName,
  hazard,
}: {
  title?: string;
  sub?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  hazard?: "caution" | "danger" | "volt";
}) {
  const hazardClass = hazard
    ? {
        caution: "hazard-stripes-caution",
        danger: "hazard-stripes-danger",
        volt: "hazard-stripes-volt",
      }[hazard]
    : null;

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-sm border-2 border-border bg-card zzz-panel-shadow transition-all duration-150",
        className,
      )}
    >
      {hazardClass ? (
        <div className={cn("h-1.5 w-full border-b border-border/80", hazardClass)} />
      ) : null}
      {(title || sub || right) && (
        <header className="flex min-h-11 items-center justify-between gap-3 border-b-2 border-border/80 bg-muted/40 px-3.5 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="size-2 shrink-0 bg-[var(--brand)] shadow-[0_0_8px_var(--brand)]" />
            <div className="min-w-0">
              {title ? (
                <h2 className="truncate font-heading text-sm font-bold tracking-tight text-foreground uppercase">
                  {title}
                </h2>
              ) : null}
              {sub ? (
                <p className="truncate font-mono text-[11px] text-muted-foreground">{sub}</p>
              ) : null}
            </div>
          </div>
          {right ? <div className="ml-auto flex shrink-0 items-center gap-2">{right}</div> : null}
        </header>
      )}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function StatBlock({
  label,
  value,
  delta,
  tone = "default",
}: {
  label: string;
  value: string;
  delta?: string;
  tone?: "default" | "safe" | "warn" | "danger" | "gold";
}) {
  const toneClass = {
    default: "text-foreground",
    safe: "text-[var(--brand)] drop-shadow-[0_0_8px_rgba(217,255,0,0.35)]",
    warn: "text-[var(--warn)] drop-shadow-[0_0_8px_rgba(255,107,0,0.35)]",
    danger: "text-[var(--danger)] drop-shadow-[0_0_8px_rgba(255,46,76,0.4)]",
    gold: "text-[var(--gold)] drop-shadow-[0_0_8px_rgba(255,203,61,0.35)]",
  }[tone];

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
        <span className="text-[var(--brand)] font-bold">{"//"}</span>
        <span>{label}</span>
      </div>
      <div className={cn("mt-1.5 font-heading text-2xl font-black tracking-tight tabular-nums sm:text-3xl", toneClass)}>
        {value}
      </div>
      {delta ? (
        <div className="mt-1 font-mono text-xs text-muted-foreground flex items-center gap-1.5">
          <span className="inline-block size-1 bg-muted-foreground/60 rounded-full" />
          <span>{delta}</span>
        </div>
      ) : null}
    </div>
  );
}

export function ToneBadge({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: "default" | "safe" | "warn" | "danger" | "gold" | "info";
  className?: string;
}) {
  const toneClass = {
    default: "border-border bg-muted/80 text-muted-foreground",
    safe: "border-[var(--brand)] bg-[var(--brand)]/15 text-[var(--brand)] shadow-[0_0_8px_rgba(217,255,0,0.2)]",
    warn: "border-[var(--warn)] bg-[var(--warn)]/20 text-[var(--warn)] shadow-[0_0_8px_rgba(255,107,0,0.2)]",
    danger: "border-[var(--danger)] bg-[var(--danger)]/20 text-[var(--danger)] shadow-[0_0_8px_rgba(255,46,76,0.25)]",
    gold: "border-[var(--gold)] bg-[var(--gold)]/20 text-[var(--gold)] shadow-[0_0_8px_rgba(255,203,61,0.2)]",
    info: "border-[var(--info)] bg-[var(--info)]/20 text-[var(--info)] shadow-[0_0_8px_rgba(0,229,255,0.2)]",
  }[tone];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 font-mono text-[11px] font-bold tracking-wide uppercase transition-colors whitespace-nowrap shrink-0",
        toneClass,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ProgressBar({
  value,
  tone = "safe",
  thick,
}: {
  value: number;
  tone?: "safe" | "warn" | "danger" | "gold";
  thick?: boolean;
}) {
  const toneClass = {
    safe: "bg-[var(--brand)] shadow-[0_0_10px_rgba(217,255,0,0.6)]",
    warn: "bg-[var(--warn)] hazard-stripes-caution shadow-[0_0_10px_rgba(255,107,0,0.6)]",
    danger: "bg-[var(--danger)] hazard-stripes-danger shadow-[0_0_10px_rgba(255,46,76,0.7)]",
    gold: "bg-[var(--gold)] shadow-[0_0_10px_rgba(255,203,61,0.6)]",
  }[tone];

  const clamped = Math.max(0, Math.min(value, 100));

  return (
    <div className={cn("relative overflow-hidden rounded-sm border-2 border-border bg-[var(--surface-sunken)] p-0.5", thick ? "h-3.5" : "h-2.5")}>
      <div
        className={cn("h-full transition-all duration-300", toneClass)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-sm border-2 border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center font-mono text-xs text-muted-foreground zzz-dot-matrix">
      <span className="rounded bg-muted px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest text-[var(--brand)] uppercase border border-border">
        [ SYS_IDLE // NO DATA ]
      </span>
      <p className="max-w-md text-muted-foreground/90">{children}</p>
    </div>
  );
}
