"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { leaveToolPage } from "@/lib/leaveToolPage";

// 工具页面路径
const TOOL_PATHS = [
  "/yixue/bazi", "/yixue/meihua", "/yixue/xiaoliuren",
  "/yixue/ziwei", "/yixue/qimen", "/yixue/liuyao",
  "/yixue/daliuren", "/yixue/hehun", "/yixue/yizhangjing",
  "/yixue/xuankong-feixing", "/yixue/taiyi-sanshi",
  "/yixue/compass",
  "/yixue/qizheng", "/yixue/liji", "/yixue/luban",
  "/yixue/phone", "/yixue/carplate", "/yixue/zeri", "/yixue/jiemeng",
  "/yixue/jieqi", "/yixue/astro", "/yixue/tarot",
  "/yixue/shensha", "/yixue/ganzhi", "/yixue/kongwang",
  "/yixue/nayin", "/yixue/wuxing", "/yixue/chenggu",
  "/yixue/huangli", "/yixue/wannianli",
  "/yixue/name", "/yixue/qiming",
];

// 全局返回标记：子页面切换回输入模式后设为 true
declare global { interface Window { __yixueBackHandled?: boolean; } }

export default function YixueLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  // v25.0.16: trailingSlash:true 下 pathname 带尾斜杠("/yixue/")，全等比较恒为 false，
  // 列表页返回键退化为 router.back()，从工具页返回列表后再按返回会跳回工具页
  const normPathname = pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  const isToolPage = TOOL_PATHS.some(p => normPathname.startsWith(p));

  const [pageTitle, setPageTitle] = useState("言道易学");
  useEffect(() => {
    const titles: Record<string, string> = {
      "/yixue/bazi": "言道八字", "/yixue/meihua": "言道梅花易数",
      "/yixue/xiaoliuren": "言道小六壬", "/yixue/ziwei": "言道紫微斗数",
      "/yixue/qimen": "言道奇门遁甲", "/yixue/liuyao": "言道六爻",
      "/yixue/daliuren": "言道大六壬", "/yixue/hehun": "言道八字合婚",
      "/yixue/yizhangjing": "言道达摩一掌经", "/yixue/xuankong-feixing": "言道玄空飞星", "/yixue/compass": "言道专业罗盘",
      "/yixue/qizheng": "言道七政四余", "/yixue/liji": "言道立极尺", "/yixue/luban": "言道鲁班尺",
      "/yixue/taiyi-sanshi": "言道太乙三式", "/yixue/huangli": "言道老黄历",
      "/yixue/wannianli": "言道万年历", "/yixue/phone": "言道手机号码解析",
      "/yixue/carplate": "言道车牌号民俗解读", "/yixue/zeri": "言道择吉择日",
      "/yixue/jiemeng": "言道周公解梦", "/yixue/jieqi": "言道二十四节气",
      "/yixue/astro": "言道占星术", "/yixue/tarot": "言道塔罗牌",
      "/yixue/shensha": "言道神煞", "/yixue/ganzhi": "言道干支",
      "/yixue/kongwang": "言道空亡", "/yixue/nayin": "言道纳音",
      "/yixue/wuxing": "言道五行", "/yixue/chenggu": "言道称骨",
      "/yixue/name": "言道姓名解析", "/yixue/qiming": "言道智能起名",
      "/yixue/learn": "易学学习", "/yixue/shop": "易学商城",
      "/yixue/ai": "易学AI", "/yixue/profile": "个人中心",
    };
    for (const [path, title] of Object.entries(titles)) {
      if (pathname.startsWith(path)) { setPageTitle(title); return; }
    }
    setPageTitle("言道易学");
  }, [pathname]);

  // v25.0.44（20260820用户指令）：返回键统一按浏览顺序返回。
  // 先广播 yixue-back 让工具页收起弹窗（弹窗打开时关闭弹窗）；
  // 未被消费则：结果页直接返回工具列表（不再重开排盘表单，杜绝"排盘页↔表单弹窗"死循环），
  // 列表页按历史栈返回（栈不足回主页）。
  // 弹窗打开时跳离页需设置 __skipPopupCleanup，否则弹窗卸载清理的 history.back() 会撤销本次导航（BottomNav 同款守护）。
  const handleBack = () => {
    window.__yixueBackHandled = false;
    window.dispatchEvent(new CustomEvent("yixue-back"));
    setTimeout(() => {
      if (window.__yixueBackHandled) return;
      if (typeof document !== "undefined" && document.body.classList.contains("modal-open")) {
        (window as unknown as { __skipPopupCleanup?: boolean }).__skipPopupCleanup = true;
      }
      if (isToolPage) {
        leaveToolPage(router);
      } else if (window.history.length > 1) {
        router.back();
      } else {
        router.push("/");
      }
    }, 80);
  };

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "#ededed", maxWidth: "420px", margin: "0 auto" }}>
      <header
        className="sticky top-0 z-50 grid w-full items-center"
        style={{ gridTemplateColumns: "44px 1fr 44px", backgroundColor: "#7B2FBE", minHeight: "48px", padding: "0" }}
      >
        <button
          onClick={handleBack}
          className="flex h-10 w-10 items-center justify-center" title="返回"
          aria-label="返回"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="text-center text-white font-bold" style={{ fontSize: "17px", lineHeight: "48px", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
          {pageTitle}
        </div>

        <button
          onClick={async () => {
            try {
              const shareData = { title: pageTitle, text: `言道国学 - ${pageTitle}`, url: window.location.href };
              if (navigator.share) {
                await navigator.share(shareData);
              } else {
                await navigator.clipboard.writeText(window.location.href);
                const toast = document.createElement("div");
                toast.textContent = "链接已复制，可粘贴分享";
                toast.style.cssText = "position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:9999;background:rgba(0,0,0,0.8);color:#fff;padding:10px 20px;border-radius:10px;font-size:14px;pointer-events:none;";
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 2000);
              }
            } catch (e) {
              // 用户取消分享不算错误
            }
          }}
          className="flex h-10 w-10 items-center justify-center" title="分享"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </button>
      </header>

      {/* v25.0.27: 移除 52px 空白占位（sticky header 已在文档流中），内容直接顶到品牌栏下方 */}
      <main className="flex-1" style={{ paddingBottom: "72px" }}>
        {children}
        {/* P6-补03 第二阶段：工具页统一页脚提示（仅此一行，无冗余来源说明） */}
        <div className="w-full text-center" style={{ padding: "8px 0 4px", fontSize: "10px", color: "#b0a8bd" }}>
          内容仅供文化娱乐参考，不构成任何专业建议
        </div>
      </main>
    </div>
  );
}
