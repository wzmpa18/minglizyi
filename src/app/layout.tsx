import type { Metadata, Viewport } from "next";
import fs from "fs";
import path from "path";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import CloudSyncInit from "@/components/CloudSyncInit";
import AuthRestoreInit from "@/components/AuthRestoreInit";
import InviteCaptureInit from "@/components/InviteCaptureInit";
import ReminderSchedulerInit from "@/components/ReminderSchedulerInit";
import { ThemeProvider } from "@/components/ThemeProvider";
import GlobalZoomProvider from "@/components/GlobalZoomProvider";
import SwipeBackProvider from "@/components/SwipeBackProvider";
import VersionChecker from "@/components/VersionChecker";
import { ToastHost } from "@/components/ui";
import { PromoFloat } from "@/components/marketing/PromoFloat";

export const metadata: Metadata = {
  title: "言道国学",
  description: "基于传统命理学典籍，提供八字、紫微斗数、奇门遁甲、六爻等排盘功能，仅供文化学习与参考。",
};

// v25.0.47 原生内置资源模式：构建时读取 API 改写脚本源码（单一事实源 public/native-api-patch.js）
const nativeApiPatchCode = fs.readFileSync(
  path.join(process.cwd(), "public", "native-api-patch.js"),
  "utf-8"
);

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 3,
  userScalable: true,
  // P1-REOPEN: iOS/APP WebView 安全区适配前置条件，缺它 env(safe-area-inset-*) 恒为 0
  viewportFit: "cover",
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
        {/* v25.0.47 原生内置资源模式：原生壳内将相对 /api 请求改写到线上服务器（Web 端零影响）。
            构建时从 public/native-api-patch.js 读取源码内联进 HTML head —— 解析期同步执行，
            早于所有应用 JS（next/script 的 beforeInteractive 在静态导出下是运行时队列注入，时序不保险） */}
        <script dangerouslySetInnerHTML={{ __html: nativeApiPatchCode }} />
        <ThemeProvider>
          <VersionChecker />
          <SwipeBackProvider>
            <CloudSyncInit />
            <AuthRestoreInit />
            <InviteCaptureInit />
            <ReminderSchedulerInit />
            <GlobalZoomProvider>
              {children}
            </GlobalZoomProvider>
          </SwipeBackProvider>
          <BottomNav />
          {/* P7-弹窗统一-01：全站统一营销浮窗（后台开关+页面白名单+频次+冷却期+永久关闭） */}
          <PromoFloat />
          {/* P7-弹窗统一-01：全站统一轻提示宿主（showToast 全局事件） */}
          <ToastHost />
        </ThemeProvider>
      </body>
    </html>
  );
}

