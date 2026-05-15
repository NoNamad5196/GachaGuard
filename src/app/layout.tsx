import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";

import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: "GachaGuard",
  description: "가챠 게임 지출, 피티, 배너 기록을 관리하는 개인 가드레일",
  manifest: "/manifest.webmanifest",
  applicationName: "GachaGuard",
  appleWebApp: {
    capable: true,
    title: "GachaGuard",
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <TooltipProvider>{children}</TooltipProvider>
        <Analytics />
      </body>
    </html>
  );
}
