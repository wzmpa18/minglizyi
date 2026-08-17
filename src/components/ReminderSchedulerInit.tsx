"use client";

// ============================================================================
// 记事提醒调度器 - P6-TOOL-04 Phase 1
// 挂载于根布局：应用打开期间每 60 秒扫描一次到期提醒，
// 幂等派发到统一系统通知中心 + 系统推送（需用户授权）。
// 漏发/失败自动写入告警服务，禁止静默出错。
// ============================================================================

import { useEffect, useRef } from "react";
import { dispatchDueReminders, detectMissedReminders, detectDuplicateReminders } from "@/lib/calendarEventsStore";
import { addNotification, CATEGORY_META } from "@/lib/notificationCenter";

const CHECK_INTERVAL_MS = 60 * 1000;

function pushSystemNotification(title: string, body: string): boolean {
  try {
    if (typeof Notification === "undefined") return false;
    if (Notification.permission === "granted") {
      const n = new Notification(title, { body, icon: "/icon-192.png", tag: "yandao-reminder" });
      setTimeout(() => n.close(), 10000);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export default function ReminderSchedulerInit() {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const run = () => {
      try {
        const result = dispatchDueReminders(
          (title, body) => {
            addNotification({ category: "reminder", title, body, idempotentKey: undefined });
          },
          pushSystemNotification
        );

        // 异常检测：漏发/重复 → 写入告警（后台可查）
        if (result.alerts.length > 0 || result.failed > 0) {
          import("@/lib/alertService").then(({ raiseAlert }) => {
            for (const a of result.alerts) {
              raiseAlert("REMINDER_DISPATCH_FAIL", "warning", `提醒派发失败：${a}`);
            }
            if (result.failed > 0) {
              raiseAlert("REMINDER_DISPATCH_FAIL", "warning", `本轮有 ${result.failed} 条提醒投递失败，已记录待重试`);
            }
          }).catch(() => {});
        }

        const missed = detectMissedReminders();
        if (missed.length > 0) {
          import("@/lib/alertService").then(({ raiseAlert }) => {
            raiseAlert("REMINDER_MISSED", "error", `检测到 ${missed.length} 条漏发提醒（如：${missed[0].eventTitle}）`);
          }).catch(() => {});
        }

        const dup = detectDuplicateReminders();
        if (dup > 0) {
          import("@/lib/alertService").then(({ raiseAlert }) => {
            raiseAlert("REMINDER_DUPLICATE", "error", `检测到 ${dup} 条重复提醒日志`);
          }).catch(() => {});
        }
      } catch (e) {
        console.error("[ReminderScheduler] 扫描异常:", e);
      }
    };

    // 首次延迟 5 秒执行（等应用初始化完成），此后每分钟一次
    const firstTimer = setTimeout(run, 5000);
    timerRef.current = setInterval(run, CHECK_INTERVAL_MS);
    return () => {
      clearTimeout(firstTimer);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return null;
}

// 供设置页调用：申请系统推送权限
export function requestPushPermission(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      if (typeof Notification === "undefined") return resolve(false);
      if (Notification.permission === "granted") return resolve(true);
      if (Notification.permission === "denied") return resolve(false);
      Notification.requestPermission().then((p) => resolve(p === "granted")).catch(() => resolve(false));
    } catch {
      resolve(false);
    }
  });
}

export { CATEGORY_META };
