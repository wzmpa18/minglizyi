"use client";

/**
 * P7-弹窗统一-01：全站统一营销浮窗组件
 * 「邀请好友送题库」等营销浮窗禁止页面自行编写固定定位代码，一律使用本组件。
 *
 * 治理规则（全部由后台 toolConfigStore.promoFloat 配置驱动）：
 * 1. 后台总开关：enabled=false 时全站不展示（首发默认关闭）；
 * 2. 页面白名单：仅推广中心（/profile/promote）、个人中心（/profile）、邀请页（/invite）允许展示；
 * 3. 频次限制：每日最多展示 dailyMaxShows 次；
 * 4. 关闭冷却期：用户点 × 关闭后 cooldownHours 小时内不再出现；
 * 5. 永久关闭：allowPermanentClose=true 时提供「不再显示」，经 ConfirmDialog 确认后永久关闭；
 * 6. 位置固定在底部导航上方右侧，不遮挡章节、题目、阅读、学习进度和底部导航；
 * 7. 静态展示，不自动弹出、不自动跳出（无任何定时器/滚动触发逻辑）。
 */

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getToolConfig } from "@/lib/toolConfigStore";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const LS_PERMANENT = "yandao_promo_float_closed_forever";
const LS_LAST_CLOSED = "yandao_promo_float_last_closed";
const LS_DAY_SHOWS = "yandao_promo_float_day_shows";

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function PromoFloat() {
  const pathname = usePathname() || "";
  const router = useRouter();
  const cfg = getToolConfig().promoFloat;
  const [visible, setVisible] = useState(false);
  const [confirmNever, setConfirmNever] = useState(false);

  useEffect(() => {
    if (!cfg.enabled) return;
    // 页面白名单（前缀匹配；trailingSlash 规范化）
    const norm = pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
    if (!cfg.allowedPages.some((p) => norm === p || norm.startsWith(p + "/"))) return;

    try {
      if (localStorage.getItem(LS_PERMANENT) === "1") return;
      const lastClosed = Number(localStorage.getItem(LS_LAST_CLOSED) || 0);
      if (lastClosed && Date.now() - lastClosed < cfg.cooldownHours * 3600 * 1000) return;
      const record = JSON.parse(localStorage.getItem(LS_DAY_SHOWS) || "{}") as { day?: string; count?: number };
      if (record.day === todayKey() && (record.count || 0) >= cfg.dailyMaxShows) return;
      if (record.day !== todayKey()) localStorage.setItem(LS_DAY_SHOWS, JSON.stringify({ day: todayKey(), count: 0 }));
      // 计入当日展示次数（频次限制）
      localStorage.setItem(LS_DAY_SHOWS, JSON.stringify({ day: todayKey(), count: (record.day === todayKey() ? record.count || 0 : 0) + 1 }));
    } catch {
      return;
    }
    setVisible(true);
  }, [pathname, cfg.enabled, cfg.allowedPages, cfg.cooldownHours, cfg.dailyMaxShows]);

  if (!cfg.enabled || !visible) return null;

  const closeWithCooldown = () => {
    setVisible(false);
    try {
      localStorage.setItem(LS_LAST_CLOSED, String(Date.now()));
    } catch {}
  };

  return (
    <>
      <div
        className="fixed z-30 flex items-start"
        style={{ right: "max(12px, calc(50vw - 198px))", bottom: "88px" }}
        aria-label="推广浮窗"
      >
        <button
          onClick={() => {
            setVisible(false);
            router.push(cfg.target);
          }}
          className="flex flex-col items-center rounded-xl px-2.5 py-2 shadow-lg active:scale-95"
          style={{ background: "linear-gradient(160deg,#e85d4f,#c05046)", border: "2px solid #ffe3b3" }}
          title="邀好友送题库"
        >
          <span className="text-[10px] font-bold" style={{ color: "#ffe3b3" }}>邀好友</span>
          <span className="text-[12px] font-bold text-white">送题库</span>
        </button>
        <div className="ml-1 flex flex-col gap-1">
          <button
            onClick={closeWithCooldown}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-black/35 text-[11px] leading-none text-white"
            aria-label="关闭推广浮窗"
          >
            ×
          </button>
          {cfg.allowPermanentClose && (
            <button
              onClick={() => setConfirmNever(true)}
              className="whitespace-nowrap rounded-full bg-black/35 px-1.5 py-0.5 text-[9px] leading-none text-white"
            >
              不再显示
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmNever}
        title="不再显示推广浮窗？"
        message="关闭后将不再展示邀请推广浮窗，您仍可从推广中心进入邀请页面。"
        confirmText="不再显示"
        cancelText="保留"
        onConfirm={() => {
          setConfirmNever(false);
          setVisible(false);
          try {
            localStorage.setItem(LS_PERMANENT, "1");
          } catch {}
        }}
        onCancel={() => setConfirmNever(false)}
      />
    </>
  );
}
