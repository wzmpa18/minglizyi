"use client";

import Link from "next/link";
import { useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

// 中医分类详情页路径（需要逐级返回的页面）
const DETAIL_PATHS = [
  "/zhongyi/meridian", "/zhongyi/formula", "/zhongyi/herb",
  "/zhongyi/classic", "/zhongyi/bianzheng", "/zhongyi/shanghan",
  "/zhongyi/exam", "/zhongyi/constitution",
];

const topNavLinks = [
  { label: "首页", href: "/zhongyi" },
  { label: "方剂库", href: "/zhongyi/formula" },
  { label: "药材库", href: "/zhongyi/herb" },
  { label: "辨证学习", href: "/zhongyi/shanghan" },
];

declare global { interface Window { __zhongyiBackHandled?: boolean; } }

export default function ZhongyiLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === "/zhongyi";
  const isDetailPage = DETAIL_PATHS.some(p => pathname.startsWith(p) && pathname !== p);

  // 返回处理：详情页先派发事件让子页面处理，其他用 router.back()
  const handleBack = useCallback(() => {
    if (isHome) {
      router.push("/");
      return;
    }
    if (isDetailPage) {
      window.__zhongyiBackHandled = false;
      window.dispatchEvent(new CustomEvent("zhongyi-back"));
      setTimeout(() => {
        if (window.__zhongyiBackHandled) {
          window.__zhongyiBackHandled = false;
        } else {
          router.back();
        }
      }, 50);
      return;
    }
    router.back();
  }, [isHome, isDetailPage, router]);

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
        className="sticky top-0 z-50 flex h-16 items-center justify-between px-4"
        style={{
          background: "rgba(13, 27, 18, 0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(45, 90, 39, 0.3)",
        }}
      >
        {!isHome && (
          <button
            onClick={handleBack}
            className="flex h-9 w-9 items-center justify-center rounded-full mr-1 flex-shrink-0"
            style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
            title="返回"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e8edf0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}

        <Link href="/zhongyi" className="flex items-center gap-2.5 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-md flex-shrink-0" style={{ backgroundColor: "#2d5a27" }}>
            <span className="text-base font-bold select-none" style={{ color: "#e8edf0" }}>本</span>
          </div>
          <div>
            <span className="text-lg font-bold tracking-wide text-[#e8edf0]">言道中医</span>
            <div style={{ fontSize: "10px", fontWeight: "normal", opacity: 0.65, lineHeight: "1.4", color: "#e8edf0" }}>
              yandao.vip 分享下载有礼
            </div>
          </div>
        </Link>

        <nav className="hidden sm:flex items-center gap-1">
          {topNavLinks.map((link) => {
            const isActive = link.href === "/zhongyi" ? pathname === "/zhongyi" : pathname.startsWith(link.href);
            return (
              <Link key={link.href} href={link.href}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
                style={{
                  color: isActive ? "#d4a84b" : "#8b9a8b",
                  backgroundColor: isActive ? "rgba(45, 90, 39, 0.2)" : "transparent",
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <div className="h-16" />
      <main className="flex-1" style={{ paddingBottom: "72px" }}>
        {children}
      </main>
    </div>
  );
}