"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {studyParentHref} from "@/lib/studyParentNavigation";

/**
 * 全局悬浮返回键（v25.0.78 P4-全页返回键）
 *
 * 背景：iOS 审核要求与用户反馈——APP 内所有二级页面必须有可见的返回入口
 * （WKWebView 无浏览器返回栏，右滑手势之外需要屏幕内按钮）。历史上大量
 * 工具页（/yixue/*、/zhongyi/*、/ai 等）由不同批次开发，均未带返回键。
 *
 * 策略（一处生效，全站兜底）：
 * 1. 原生壳与网页均提供可见的上级入口；
 * 2. 白名单页面不显示：首页 + 5 个一级 tab（BottomNav 常驻）+ 外部直达落地页 + 管理后台；
 * 3. 页面自带返回键（BrandHeader showBack / 页内 aria-label="返回" 按钮）时自动隐藏
 *    ——通过 DOM 轮询检测（页面渐进渲染，250ms × 12 次兜底 3 秒内判定）；
 * 4. z-40：低于全屏弹窗层（z-50），弹窗打开时被遮罩覆盖防误触；
 * 5. 刘海屏避让：top 叠加 env(safe-area-inset-top)。
 *
 * 返回应用内确定的父页面，外部直达与空历史不会把用户带离应用。
 * 注意：本组件必须挂在 SwipeBackProvider 之外——滑动动画期间的 transform
 * 会为 fixed 后代创建包含块（见 SwipeBackProvider 注释 P0-1 事故）。
 */

const HIDDEN_ROUTES = [
  "/",
  "/discover",
  "/friends",
  "/academy",
  "/profile",
  "/download",
  "/friend",
  "/offline",
  "/admin",
];

function isHiddenRoute(pathname: string): boolean {
  return HIDDEN_ROUTES.some(
    (r) => pathname === r || (r !== "/" && pathname.startsWith(r + "/"))
  );
}

export default function GlobalBackButton() {
  const pathname = usePathname();
  const router = useRouter();
  const [hasOwnBack, setHasOwnBack] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    setHasOwnBack(false);
    const SEL = '[aria-label="返回"]:not([data-global-back]), [data-page-back="1"]';
    if (document.querySelector(SEL)) {
      setHasOwnBack(true);
      return;
    }
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (document.querySelector(SEL)) {
        setHasOwnBack(true);
        clearInterval(timer);
      } else if (tries > 12) {
        clearInterval(timer);
      }
    }, 250);
    return () => clearInterval(timer);
  }, [pathname]);

  if (!ready || hasOwnBack) return null;
  if (isHiddenRoute(pathname)) return null;

  const handleBack = () => {
    router.replace(studyParentHref(window.location.pathname,window.location.search));
  };

  return (
    <button
      onClick={handleBack}
      aria-label="返回"
      data-global-back="1"
      className="fixed z-40 flex h-9 w-9 items-center justify-center rounded-full text-white active:scale-95 transition-transform"
      style={{
        top: "calc(env(safe-area-inset-top, 0px) + 8px)",
        left: "10px",
        width: "36px",
        height: "36px",
        backgroundColor: "rgba(20, 12, 32, 0.55)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
      }}
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
  );
}
