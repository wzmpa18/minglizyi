import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import CloudSyncInit from "@/components/CloudSyncInit";
import AuthRestoreInit from "@/components/AuthRestoreInit";
import { ThemeProvider } from "@/components/ThemeProvider";
import GlobalZoomProvider from "@/components/GlobalZoomProvider";
import SwipeBackProvider from "@/components/SwipeBackProvider";

export const metadata: Metadata = {
  title: "言道国学",
  description: "基于传统命理学典籍，提供八字、紫微斗数、奇门遁甲、六爻等排盘功能，仅供文化学习与参考。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 3,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="UTF-8" />
        <meta name="charset" content="UTF-8" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="言道国学" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="theme-color" content="#7B2FBE" />
      </head>
      <body>
        <ThemeProvider>
          <SwipeBackProvider>
            <CloudSyncInit />
            <AuthRestoreInit />
            <GlobalZoomProvider>
              {children}
            </GlobalZoomProvider>
          </SwipeBackProvider>
          <BottomNav />
        </ThemeProvider>
      </body>
    </html>
  );
}

