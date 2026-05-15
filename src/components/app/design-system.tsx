import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function DesignCard({
  title,
  sub,
  right,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  sub?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-card shadow-[0_1px_0_rgba(15,17,21,0.04)]",
        className,
      )}
    >
      {(title || sub || right) && (
        <header className="flex min-h-12 items-center gap-2 border-b border-border/80 px-4 py-3">
          <div className="min-w-0">
            {title ? <h2 className="truncate text-[13.5px] font-semibold">{title}</h2> : null}
            {sub ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</p> : null}
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
    safe: "text-[var(--brand-ink)]",
    warn: "text-[var(--warn-ink)]",
    danger: "text-[var(--danger)]",
    gold: "text-[var(--gold)]",
  }[tone];

  return (
    <div className="min-w-0">
      <div className="text-[11.5px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
        {label}
      </div>
      <div className={cn("mt-1 font-mono text-2xl font-medium tabular-nums", toneClass)}>
        {value}
      </div>
      {delta ? <div className="mt-1 text-xs text-muted-foreground">{delta}</div> : null}
    </div>
  );
}

export function ToneBadge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "safe" | "warn" | "danger" | "gold" | "info";
}) {
  const toneClass = {
    default: "border-border bg-muted text-muted-foreground",
    safe: "border-transparent bg-[var(--brand-tint)] text-[var(--brand-ink)]",
    warn: "border-transparent bg-[var(--warn-tint)] text-[var(--warn-ink)]",
    danger: "border-transparent bg-[var(--danger-tint)] text-[var(--danger-ink)]",
    gold: "border-transparent bg-[var(--gold-tint)] text-[var(--gold-ink)]",
    info: "border-transparent bg-[var(--info-tint)] text-[var(--info-ink)]",
  }[tone];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11.5px] font-medium",
        toneClass,
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
    safe: "bg-[var(--brand)]",
    warn: "bg-[var(--warn)]",
    danger: "bg-[var(--danger)]",
    gold: "bg-[var(--gold)]",
  }[tone];

  return (
    <div className={cn("overflow-hidden rounded-full bg-muted", thick ? "h-2" : "h-1.5")}>
      <div
        className={cn("h-full rounded-full", toneClass)}
        style={{ width: `${Math.max(0, Math.min(value, 100))}%` }}
      />
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
