"use client";

import { useEffect } from "react";
import { getUserToken } from "@/lib/auth";
import { consumeSessionToolEvents } from "@/lib/toolAnalytics";
import { clientPlatformHeaders } from "@/lib/platformGate";

/**
 * 用户活跃心跳组件 - v25.0.71
 *
 * 机制：
 * 1. 已登录用户每秒累计页面可见秒数（后台标签页/锁屏不计入）
 * 2. 每 60 秒心跳一次：POST /api/auth/activity/heartbeat
 *    { activeSeconds: 期间可见秒数, toolEvents: 期间工具事件数 }
 * 3. 服务端限幅累加进 user_activity_daily（北京时间自然日），
 *    后台「用户管理」可见各用户每日登录时长与使用情况
 * 4. 心跳全程静默：失败不打扰主流程、未登录不上报、退出登录即停
 */

const HEARTBEAT_INTERVAL_MS = 60 * 1000;
const MIN_REPORT_SECONDS = 15; // 单周期可见不足 15 秒不上报（切页噪声）

export default function UserActivityInit() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let visibleSeconds = 0;
    let beatTimer: ReturnType<typeof setInterval> | null = null;
    let tickTimer: ReturnType<typeof setInterval> | null = null;

    const tick = () => {
      if (document.visibilityState === "visible") visibleSeconds += 1;
    };

    const sendHeartbeat = async () => {
      const token = getUserToken();
      if (!token) return; // 未登录不上报
      const secs = visibleSeconds;
      const tools = consumeSessionToolEvents();
      visibleSeconds = 0;
      if (secs < MIN_REPORT_SECONDS && tools === 0) return;
      try {
        await fetch("/api/auth/activity/heartbeat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...clientPlatformHeaders(),
          },
          body: JSON.stringify({ activeSeconds: Math.min(secs, 120), toolEvents: Math.min(tools, 100) }),
          keepalive: true,
        });
      } catch { /* 静默：心跳失败不影响任何功能 */ }
    };

    // 登录态延迟检测（等 AuthRestoreInit 恢复完成后再起表）
    const startTimer = window.setTimeout(() => {
      if (!getUserToken()) {
        // 仍未登录：仍启动计数器（用户可能稍后登录），心跳内自会判断登录态
      }
      tickTimer = setInterval(tick, 1000);
      beatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    }, 2000);

    return () => {
      window.clearTimeout(startTimer);
      if (tickTimer) clearInterval(tickTimer);
      if (beatTimer) clearInterval(beatTimer);
    };
  }, []);

  return null;
}
