import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";

import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: "GachaGuard",
  description: "가챠 게임 과금을 기록하고 예산 초과를 막는 개인 지출 가드.",
  manifest: "/manifest.webmanifest",
  applicationName: "GachaGuard",
  appleWebApp: {
    capable: true,
    title: "GachaGuard",
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col">
        <TooltipProvider>{children}</TooltipProvider>
        <Analytics />
      </body>
    </html>
  );
}
