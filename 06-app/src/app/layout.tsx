import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import AIAssistant from "@/components/AIAssistant";
import CloudSyncInit from "@/components/CloudSyncInit";
import { ThemeProvider } from "@/components/ThemeProvider";

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
        <meta name="format-detection" content="telephone=no" />
        <meta name="theme-color" content="#7B2FBE" />
      </head>
      <body>
        <ThemeProvider>
          <CloudSyncInit />
          {children}
          <BottomNav />
          <AIAssistant />
        </ThemeProvider>
      </body>
    </html>
  );
}
