import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";

import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: "GachaGuard",
  description: "가챠 게임 지출, 피티, 배너 기록을 관리하는 개인 가드레일",
  manifest: "/manifest.webmanifest",
  applicationName: "GachaGuard",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      {
        url: "/icons/gachaguard-icon-a-shield-capsule-block-32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/icons/gachaguard-icon-a-shield-capsule-block-64.png",
        sizes: "64x64",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
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
