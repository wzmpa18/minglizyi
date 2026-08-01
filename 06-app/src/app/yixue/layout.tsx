"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

// 工具页面路径
const TOOL_PATHS = [
  "/yixue/bazi", "/yixue/meihua", "/yixue/xiaoliuren",
  "/yixue/ziwei", "/yixue/qimen", "/yixue/liuyao",
  "/yixue/daliuren", "/yixue/hehun", "/yixue/yizhangjing",
  "/yixue/xuankong-feixing", "/yixue/taiyi-sanshi", "/yixue/shanxiang-qimen",
  "/yixue/yinpan-qimen", "/yixue/mingli-qimen", "/yixue/qimen-chuanren",
  "/yixue/phone", "/yixue/carplate", "/yixue/zeri", "/yixue/jiemeng",
  "/yixue/jieqi",
];

export default function YixueLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === "/yixue";
  const isToolPage = TOOL_PATHS.some(p => pathname.startsWith(p));

  // 从子页面获取标题
  const [pageTitle, setPageTitle] = useState("言道易学");
  useEffect(() => {
    const titles: Record<string, string> = {
      "/yixue/bazi": "言道八字",
      "/yixue/meihua": "言道梅花易数",
      "/yixue/xiaoliuren": "言道小六壬",
      "/yixue/ziwei": "言道紫微斗数",
      "/yixue/qimen": "言道奇门遁甲",
      "/yixue/liuyao": "言道六爻",
      "/yixue/daliuren": "言道大六壬",
      "/yixue/hehun": "言道八字合婚",
      "/yixue/yizhangjing": "言道达摩一掌经",
      "/yixue/xuankong-feixing": "言道玄空飞星",
      "/yixue/taiyi-sanshi": "言道太乙三式",
      "/yixue/shanxiang-qimen": "言道山向奇门",
      "/yixue/yinpan-qimen": "言道阴盘奇门",
      "/yixue/mingli-qimen": "言道命理奇门",
      "/yixue/qimen-chuanren": "言道奇门穿壬",
      "/yixue/huangli": "言道老黄历",
      "/yixue/wannianli": "言道万年历",
      "/yixue/phone": "言道手机号吉凶",
      "/yixue/carplate": "言道车牌号吉凶",
      "/yixue/zeri": "言道择吉择日",
      "/yixue/jiemeng": "言道周公解梦",
      "/yixue/jieqi": "言道二十四节气",
      "/yixue/learn": "易学学习",
      "/yixue/shop": "易学商城",
      "/yixue/ai": "易学AI",
      "/yixue/profile": "个人中心",
    };
    for (const [path, title] of Object.entries(titles)) {
      if (pathname.startsWith(path)) {
        setPageTitle(title);
        return;
      }
    }
    setPageTitle("言道易学");
  }, [pathname]);

  // 工具页面 header 右侧按钮（编辑按钮）
  const showEdit = isToolPage;

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "#ededed", maxWidth: "420px", margin: "0 auto" }}>
      {/* 顶部导航栏 */}
      <header
        className="sticky top-0 z-50 grid h-10 w-full items-center"
        style={{
          gridTemplateColumns: "40px 40px auto 40px 40px",
          backgroundColor: "#7B2FBE",
        }}
      >
        {/* leftBtn1: 返回按钮 */}
        <button
          onClick={() => {
            if (isHome) {
              router.push("/");
            } else {
              router.back();
            }
          }}
          className="flex h-10 w-10 items-center justify-center"
          title="返回"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        {/* leftBtn2: 分享按钮 */}
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: pageTitle, url: window.location.href });
            } else {
              navigator.clipboard.writeText(window.location.href);
            }
          }}
          className="flex h-10 w-10 items-center justify-center"
          title="分享"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </button>

        {/* 标题 */}
        <div className="text-center text-lg font-bold leading-10 text-white" style={{ fontSize: "18px" }}>
          {pageTitle}
        </div>

        {/* rightBtn2: 设置按钮 */}
        <button
          className="flex h-10 w-10 items-center justify-center"
          title="设置"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>

        {/* rightBtn1: 编辑/刷新按钮 */}
        {showEdit ? (
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent("yixue-edit"));
            }}
            className="flex h-10 w-10 items-center justify-center"
            title="编辑"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        ) : (
          <button
            onClick={() => window.location.reload()}
            className="flex h-10 w-10 items-center justify-center"
            title="刷新"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <polyline points="23 20 23 14 17 14" />
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
            </svg>
          </button>
        )}
      </header>

      {/* 内容区，底部预留全局BottomNav空间 */}
      <main className="flex-1" style={{ paddingBottom: "72px" }}>
        {children}
      </main>
    </div>
  );
}
