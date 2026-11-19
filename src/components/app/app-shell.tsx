import Link from "next/link";
import {
  BarChart3,
  Bell,
  CircleDollarSign,
  Layers,
  ListChecks,
  LogIn,
  LogOut,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";

import { signOut } from "@/app/actions";
import { AppLauncher } from "@/components/app/app-launcher";
import { Button } from "@/components/ui/button";
import { getAuthRedirectPath } from "@/lib/auth/redirects";
import type { DashboardData } from "@/lib/domain/dashboard";
import { cn } from "@/lib/utils";

type AppRoute = "dashboard" | "banners" | "pulls" | "budget" | "settings";

const navItems: Array<{
  id: AppRoute;
  label: string;
  href: string;
  icon: ReactNode;
}> = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: <BarChart3 className="size-4" /> },
  { id: "banners", label: "Banners", href: "/banners", icon: <Layers className="size-4" /> },
  { id: "pulls", label: "Pull Log", href: "/pulls", icon: <ListChecks className="size-4" /> },
  { id: "budget", label: "Budget", href: "/budget", icon: <CircleDollarSign className="size-4" /> },
  { id: "settings", label: "Settings", href: "/settings", icon: <Settings className="size-4" /> },
];

export function AppShell({
  data,
  active,
  crumb,
  authNextPath,
  children,
}: {
  data: DashboardData;
  active: AppRoute;
  crumb: string;
  authNextPath?: string;
  children: ReactNode;
}) {
  const loginNextPath = authNextPath ?? `/${active === "dashboard" ? "dashboard" : active}`;
  const headerLoginPath =
    active === "dashboard" || active === "settings" || authNextPath
      ? loginNextPath
      : "/dashboard";

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-[var(--primary)] selection:text-[var(--primary-foreground)]">
      <div className="mx-auto grid min-h-screen w-full max-w-[1536px] grid-cols-1 lg:grid-cols-[240px_1fr]">
        <aside className="sticky top-0 hidden h-screen flex-col border-r-2 border-border bg-[#0e1017] px-3.5 py-4 lg:flex">
          <Link
            href="/dashboard"
            className="group flex items-center gap-2.5 rounded-sm border-2 border-transparent px-2 py-2 transition-all hover:border-border hover:bg-muted/40"
          >
            <span className="grid size-8 place-items-center rounded-sm bg-[var(--brand)] text-[#0b0c10] shadow-[0_0_12px_rgba(217,255,0,0.5)]">
              <ShieldCheck className="size-5 stroke-[2.5]" />
            </span>
            <div className="min-w-0">
              <span className="block font-heading text-base font-black tracking-tight text-foreground uppercase group-hover:text-[var(--brand)]">
                GachaGuard
              </span>
              <span className="block font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                PROXY_HUD // V1.0
              </span>
            </div>
            <span className="ml-auto rounded-sm border border-[var(--brand)]/50 bg-[var(--brand)]/15 px-1.5 py-0.5 font-mono text-[9.5px] font-bold text-[var(--brand)]">
              SYS:OK
            </span>
          </Link>

          <div className="mt-6 flex items-center justify-between px-2 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <span>{"// NAVIGATION"}</span>
            <span className="text-[var(--brand)]">0{navItems.length}</span>
          </div>
          <nav className="mt-2 grid gap-1">
            {navItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "relative flex h-9 items-center gap-2.5 rounded-sm border-2 border-transparent px-2.5 font-heading text-sm font-bold uppercase tracking-tight text-muted-foreground transition-all hover:border-border hover:bg-muted/50 hover:text-foreground",
                  active === item.id &&
                    "border-2 border-[var(--brand)] bg-[var(--brand)]/15 font-black text-[var(--brand)] shadow-[2px_2px_0px_#000]",
                )}
              >
                {active === item.id ? (
                  <span className="absolute left-0 top-1/2 h-4 w-1 -translate-y-1/2 bg-[var(--brand)] shadow-[0_0_8px_var(--brand)]" />
                ) : null}
                <span className={cn(active === item.id ? "text-[var(--brand)]" : "text-muted-foreground")}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {item.id === "banners" ? (
                  <span className="ml-auto rounded-sm border border-border bg-muted/80 px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums text-foreground">
                    {data.banners.length}
                  </span>
                ) : null}
                {item.id === "pulls" ? (
                  <span className="ml-auto rounded-sm border border-border bg-muted/80 px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums text-foreground">
                    {data.pulls.length}
                  </span>
                ) : null}
              </Link>
            ))}
          </nav>

          <div className="mt-6 flex items-center justify-between px-2 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <span>{"// TRACKED GAMES"}</span>
            <span className="text-muted-foreground/60">{data.userGames.length}</span>
          </div>
          <div className="mt-2 grid gap-1 overflow-y-auto max-h-36 pr-1">
            {data.userGames.slice(0, 5).map((userGame) => (
              <Link
                key={userGame.id}
                href="/banners"
                className="flex h-8 items-center gap-2 rounded-sm border border-transparent px-2 text-xs text-muted-foreground transition-colors hover:border-border hover:bg-muted/40 hover:text-foreground"
              >
                <span className="size-2 shrink-0 bg-[var(--brand)] shadow-[0_0_6px_var(--brand)]" />
                <span className="truncate font-sans font-medium">{userGame.games.name}</span>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground tabular-nums">
                  {
                    data.userBanners.filter(
                      (userBanner) => userBanner.banners.game_id === userGame.game_id,
                    ).length
                  }
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-5 px-2 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {"// SERVICES"}
          </div>
          <div className="mt-1.5">
            <AppLauncher compact />
          </div>

          <div className="mt-auto pt-4">
            <div className="relative overflow-hidden rounded-sm border-2 border-border bg-card p-3 zzz-panel-shadow">
              <div className="mb-1.5 flex items-center gap-1 font-mono text-[9px] font-bold tracking-widest text-[var(--brand)] uppercase">
                <span className="inline-block size-1.5 rounded-full bg-[var(--brand)] animate-pulse" />
                <span>PROXY ID // ONLINE</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="grid size-8 shrink-0 place-items-center rounded-sm border border-[var(--brand)]/50 bg-[var(--brand)]/15 font-mono text-xs font-bold text-[var(--brand)]">
                  {(data.profile.display_name ?? "GG").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-heading text-xs font-bold uppercase tracking-tight text-foreground">
                    {data.profile.display_name ?? "Guard"}
                  </div>
                  <div className="truncate font-mono text-[10px] text-muted-foreground">
                    {data.isAuthenticated
                      ? "Firebase 보호 중"
                      : data.authEnabled
                        ? "로그인하면 저장 가능"
                        : "Demo Mode"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 pb-20 lg:pb-0">
          <header className="sticky top-0 z-20 mx-3 mt-3 flex h-12 items-center justify-between gap-3 rounded-sm border-2 border-border bg-[#0e1017]/95 px-3.5 zzz-panel-shadow backdrop-blur-md lg:mx-4">
            <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
              <span className="grid size-7 place-items-center rounded-sm bg-[var(--brand)] text-[#0b0c10]">
                <ShieldCheck className="size-4 stroke-[2.5]" />
              </span>
              <span className="font-heading text-sm font-black tracking-tight text-foreground uppercase">
                GachaGuard
              </span>
            </Link>
            <div className="hidden min-w-0 items-center gap-2 font-mono text-xs lg:flex">
              <span className="text-[var(--brand)] font-bold">{"//"}</span>
              <span className="text-muted-foreground">GACHAGUARD /</span>
              <span className="font-bold text-foreground uppercase">{crumb}</span>
              <span className="ml-2 rounded-sm border border-border bg-muted/60 px-1.5 py-0.2 font-mono text-[9.5px] text-muted-foreground">
                REC ● LIVE
              </span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link href="/pulls">
                  <Plus className="size-4 stroke-[2.5]" />
                  뽑기 기록
                </Link>
              </Button>
              <Button variant="ghost" size="icon" aria-label="알림" className="text-muted-foreground hover:text-foreground">
                <Bell className="size-4" />
              </Button>
              {data.isAuthenticated ? (
                <form action={signOut}>
                  <Button type="submit" variant="ghost" size="icon" aria-label="로그아웃" className="text-muted-foreground hover:text-foreground">
                    <LogOut className="size-4" />
                  </Button>
                </form>
              ) : (
                <Button asChild variant="ghost" size="icon" aria-label="로그인" className="text-muted-foreground hover:text-foreground">
                  <Link href={getAuthRedirectPath({ auth: "required", next: headerLoginPath })}>
                    <LogIn className="size-4" />
                  </Link>
                </Button>
              )}
            </div>
          </header>

          <main className="px-3 py-4 sm:px-4 lg:px-6 lg:py-5">{children}</main>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t-2 border-border bg-[#0e1017]/98 backdrop-blur-md lg:hidden zzz-panel-shadow">
        {navItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              "relative flex h-14 flex-col items-center justify-center gap-1 font-heading text-[11px] font-bold uppercase tracking-tight text-muted-foreground transition-colors",
              active === item.id && "text-[var(--brand)]",
            )}
          >
            {active === item.id ? (
              <span className="absolute inset-x-2 top-0 h-0.5 bg-[var(--brand)] shadow-[0_0_8px_var(--brand)]" />
            ) : null}
            {item.id === "dashboard" ? <Sparkles className="size-4" /> : item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
