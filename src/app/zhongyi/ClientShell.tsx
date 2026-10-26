"use client";
import {InterfaceButton} from "@/components/InterfaceControls";
import {useInterfaceLocale} from "@/lib/interfaceLocale";

import Link from "next/link";
import { useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import {studyParentHref} from "@/lib/studyParentNavigation";

const topNavLinks = [
  { label: "首页", href: "/zhongyi" },
  { label: "方剂库", href: "/zhongyi/formula" },
  { label: "药材库", href: "/zhongyi/herb" },
  { label: "辨证学习", href: "/zhongyi/shanghan" },
];

declare global { interface Window { __zhongyiBackHandled?: boolean; } }

export default function ZhongyiClientShell({ children }: { children: React.ReactNode }) {
  const {ui}=useInterfaceLocale();
  const pathname = usePathname();
  const router = useRouter();
  const backPending=useRef(false);
  // v25.0.16: trailingSlash:true 下 pathname 带尾斜杠("/zhongyi/")，需规范化后再比较
  const normPathname = pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  const isHome = normPathname === "/zhongyi";
  // Local readers may close their current level before following the fixed parent.
  const handleBack = useCallback(() => {
    if (isHome) {
      router.push("/");
      return;
    }
    {
      if(backPending.current)return;
      backPending.current=true;
      const start=window.location.pathname+window.location.search;
      window.__zhongyiBackHandled = false;
      window.dispatchEvent(new CustomEvent("zhongyi-back"));
      setTimeout(() => {
        backPending.current=false;
        if(window.location.pathname+window.location.search!==start)return;
        if (window.__zhongyiBackHandled) {
          window.__zhongyiBackHandled = false;
        } else {
          router.replace(studyParentHref(window.location.pathname,window.location.search));
        }
      }, 50);
      return;
    }
  }, [isHome, router]);

  // 右滑手势返回
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    if (deltaX > 80 && deltaX > deltaY * 1.5 && touchStartX.current < 40) {
      handleBack();
    }
  }, [handleBack]);

  return (
    <div className="flex min-h-screen flex-col bg-[#0f1419] text-[#e8edf0]" style={{ maxWidth: "420px", margin: "0 auto" }}>
      <header
        className="relative flex flex-wrap items-center gap-y-2 px-4"
        style={{
          background: "rgba(13, 27, 18, 0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(45, 90, 39, 0.3)",
          // v25.0.80: iOS 刘海屏顶栏避让（返回键被灵动岛遮挡问题）
          minHeight: "calc(64px + env(safe-area-inset-top, 0px))",
          paddingBottom: "8px",
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        {!isHome && (
          <InterfaceButton
            onClick={handleBack}
            className="flex h-9 w-9 items-center justify-center rounded-full mr-1 flex-shrink-0"
            style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
            title="返回"
            aria-label="返回上一级"
            data-page-back="1"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e8edf0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </InterfaceButton>
        )}

        <Link href="/zhongyi" className="flex items-center gap-2.5 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-md flex-shrink-0" style={{ backgroundColor: "#2d5a27" }}>
            <span className="text-base font-bold select-none" style={{ color: "#e8edf0" }}>本</span>
          </div>
          <div>
            <span className="text-lg font-bold tracking-wide text-[#e8edf0]">言道中医</span>
            <div style={{ fontSize: "10px", fontWeight: "normal", opacity: 0.65, lineHeight: "1.4", color: "#e8edf0" }}>
              典籍 · 经络 · 方药 · 学习
            </div>
          </div>
        </Link>

        <nav aria-label="中医学习导航" style={{ display: "flex", width: "100%", gap: "4px", paddingTop: "6px" }}>
          {topNavLinks.map((link) => {
            const isActive = link.href === "/zhongyi" ? normPathname === "/zhongyi" : normPathname.startsWith(link.href);
            return (
              <Link key={link.href} href={link.href}
                className="rounded-lg text-sm font-medium transition-all duration-200"
                style={{
                  flex: 1, padding: "6px 4px", textAlign: "center", whiteSpace: "nowrap",
                  color: isActive ? "#d4a84b" : "#8b9a8b",
                  backgroundColor: isActive ? "rgba(45, 90, 39, 0.2)" : "transparent",
                }}
              >
                {ui(link.label)}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="flex-1" style={{ paddingBottom: "72px" }}>
        {children}
      </main>
    </div>
  );
}
