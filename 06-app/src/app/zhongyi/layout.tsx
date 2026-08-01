"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// ============================================================
// 顶部导航按钮配置
// ============================================================
const topNavLinks = [
  { label: "首页", href: "/zhongyi" },
  { label: "方剂库", href: "/zhongyi/formula" },
  { label: "药材库", href: "/zhongyi/herb" },
  { label: "辨证学习", href: "/zhongyi/shanghan" },
];

// ============================================================
// 中医板块布局
// ============================================================
export default function ZhongyiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col bg-[#0f1419] text-[#e8edf0]" style={{ maxWidth: "420px", margin: "0 auto" }}>
      {/* ======================================== */}
      {/* 顶部导航栏 - 毛玻璃效果，深绿色主题 */}
      {/* ======================================== */}
      <header
        className="sticky top-0 z-50 flex h-16 items-center justify-between px-4"
        style={{
          background: "rgba(13, 27, 18, 0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(45, 90, 39, 0.3)",
        }}
      >
        {/* 左侧品牌区 */}
        <Link href="/zhongyi" className="flex items-center gap-2.5 shrink-0">
          {/* 绿色方块 Logo */}
          <div
            className="flex h-9 w-9 items-center justify-center rounded-md flex-shrink-0"
            style={{ backgroundColor: "#2d5a27" }}
          >
            <span
              className="text-base font-bold select-none"
              style={{ color: "#e8edf0" }}
            >
              本
            </span>
          </div>
          <span className="text-lg font-bold tracking-wide text-[#e8edf0]">
            言道中医
          </span>
        </Link>

        {/* 右侧导航按钮 */}
        <nav className="hidden sm:flex items-center gap-1">
          {topNavLinks.map((link) => {
            const isActive =
              link.href === "/zhongyi"
                ? pathname === "/zhongyi"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
                style={{
                  color: isActive ? "#d4a84b" : "#8b9a8b",
                  backgroundColor: isActive
                    ? "rgba(45, 90, 39, 0.2)"
                    : "transparent",
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* ======================================== */}
      {/* 顶部占位 */}
      {/* ======================================== */}
      <div className="h-16" />

      {/* ======================================== */}
      {/* 内容区，底部预留全局BottomNav空间 */}
      {/* ======================================== */}
      <main className="flex-1" style={{ paddingBottom: "72px" }}>
        {children}
      </main>
    </div>
  );
}
