import Link from "next/link";
import {
  BarChart3,
  Bell,
  CircleDollarSign,
  Layers,
  ListChecks,
  LogOut,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";

import { signOut } from "@/app/actions";
import type { DashboardData } from "@/lib/domain/dashboard";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
  children,
}: {
  data: DashboardData;
  active: AppRoute;
  crumb: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid min-h-screen w-full max-w-[1440px] grid-cols-1 lg:grid-cols-[232px_1fr]">
        <aside className="sticky top-0 hidden h-screen border-r border-border bg-card px-3 py-4 lg:block">
          <Link href="/dashboard" className="flex items-center gap-2 px-2 py-1.5">
            <span className="grid size-8 place-items-center rounded-md bg-[var(--brand)] text-white">
              <ShieldCheck className="size-4" />
            </span>
            <span className="font-semibold">GachaGuard</span>
            <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
              Beta
            </span>
          </Link>

          <div className="mt-6 text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
            Workspace
          </div>
          <nav className="mt-2 grid gap-1">
            {navItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  active === item.id && "bg-muted font-medium text-foreground",
                )}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.id === "banners" ? (
                  <span className="ml-auto font-mono text-xs tabular-nums">
                    {data.banners.length}
                  </span>
                ) : null}
                {item.id === "pulls" ? (
                  <span className="ml-auto font-mono text-xs tabular-nums">
                    {data.pulls.length}
                  </span>
                ) : null}
              </Link>
            ))}
          </nav>

          <div className="mt-6 text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
            Games
          </div>
          <div className="mt-2 grid gap-1">
            {data.userGames.slice(0, 5).map((userGame) => (
              <Link
                key={userGame.id}
                href="/banners"
                className="flex h-9 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <span className="size-2 rounded-full bg-[var(--brand)]" />
                <span className="truncate">{userGame.games.name}</span>
                <span className="ml-auto font-mono text-xs tabular-nums">
                  {
                    data.userBanners.filter(
                      (userBanner) => userBanner.banners.game_id === userGame.game_id,
                    ).length
                  }
                </span>
              </Link>
            ))}
          </div>

          <div className="absolute inset-x-3 bottom-4 rounded-lg bg-muted p-3">
            <div className="flex items-center gap-2">
              <div className="grid size-8 place-items-center rounded-md bg-card text-xs font-semibold">
                {(data.profile.display_name ?? "GG").slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">
                  {data.profile.display_name ?? "Guard"}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {data.isDemo ? "Demo Mode" : "Supabase 보호 중"}
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 pb-16 lg:pb-0">
          <header className="sticky top-0 z-20 mx-3 mt-3 flex h-12 items-center gap-3 rounded-lg border border-border bg-card/95 px-3 backdrop-blur lg:mx-4">
            <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
              <span className="grid size-7 place-items-center rounded-md bg-[var(--brand)] text-white">
                <ShieldCheck className="size-3.5" />
              </span>
              <span className="font-semibold">GachaGuard</span>
            </Link>
            <div className="hidden min-w-0 text-sm lg:block">
              <span className="text-muted-foreground">GachaGuard / </span>
              <span className="font-medium">{crumb}</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link href="/pulls">
                  <Plus className="size-4" />
                  뽑기 기록
                </Link>
              </Button>
              <Button variant="ghost" size="icon" aria-label="알림">
                <Bell className="size-4" />
              </Button>
              <form action={signOut}>
                <Button type="submit" variant="ghost" size="icon" aria-label="로그아웃">
                  <LogOut className="size-4" />
                </Button>
              </form>
            </div>
          </header>

          <main className="px-3 py-4 sm:px-4 lg:px-6 lg:py-5">{children}</main>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-card lg:hidden">
        {navItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              "flex h-14 flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground",
              active === item.id && "text-foreground",
            )}
          >
            {item.id === "dashboard" ? <Sparkles className="size-4" /> : item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
