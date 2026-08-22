"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const BRAND = "#7B2FBE";
const BRAND_DARK = "#2D1A3E";

interface LandingData {
  valid: boolean;
  reason?: string;
  toolType?: string;
  title?: string;
  summary?: string;
  payload?: unknown;
  sharerName?: string;
  createdAt?: string;
  invite?: { ref: string; ts: string; sig: string } | null;
  landing?: {
    androidDownloadEnabled: boolean;
    webContinueEnabled: boolean;
    iosStoreEnabled: boolean;
    iosStoreUrl?: string;
    androidUrl: string;
    downloadPage: string;
    registerUrl: string;
    complianceText: string;
  };
}

type Device = "android" | "ios" | "windows" | "mac" | "other";

function detectDevice(): Device {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("android")) return "android";
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (ua.includes("windows")) return "windows";
  if (ua.includes("macintosh") || ua.includes("mac os")) return "mac";
  return "other";
}

const TOOL_LABELS: Record<string, string> = {
  liuyao: "六爻排盘",
  ziwei: "紫微斗数",
  bazi: "八字排盘",
  qimen: "奇门遁甲",
  meihua: "梅花易数",
  daliuren: "大六壬",
  xiaoliuren: "小六壬",
  tarot: "塔罗牌",
  astro: "占星",
  hehun: "合婚",
  name: "姓名测算",
  huangli: "黄历",
  wuxing: "五行",
  phone: "手机号测算",
  carplate: "车牌测算",
  baziwuxing: "八字五行",
};

/** 从payload提取可展示的摘要行（各工具统一约定 summaryLines，或退化为顶层字符串字段） */
function extractLines(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") return [];
  const p = payload as Record<string, unknown>;
  if (Array.isArray(p.summaryLines)) {
    return p.summaryLines.filter((x): x is string => typeof x === "string").slice(0, 30);
  }
  return Object.entries(p)
    .filter(([, v]) => typeof v === "string" || typeof v === "number")
    .slice(0, 12)
    .map(([k, v]) => `${k}：${String(v)}`);
}

export default function ShareResultPage() {
  const router = useRouter();
  const [data, setData] = useState<LandingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [device, setDevice] = useState<Device>("other");
  const [token, setToken] = useState("");

  useEffect(() => {
    setDevice(detectDevice());
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token") || "";
    setToken(t);
    if (!t) {
      setError("分享链接无效");
      setLoading(false);
      return;
    }
    fetch(`/api/share/result/${encodeURIComponent(t)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json && json.success && json.data) {
          setData(json.data);
        } else {
          setError("分享内容加载失败");
        }
      })
      .catch(() => setError("网络错误，请重试"))
      .finally(() => setLoading(false));
  }, []);

  const registerUrl = useCallback(() => {
    const inv = data?.invite;
    if (inv && inv.ref && inv.ts && inv.sig) {
      return `/register?ref=${encodeURIComponent(inv.ref)}&ts=${encodeURIComponent(inv.ts)}&sig=${encodeURIComponent(inv.sig)}`;
    }
    return "/register";
  }, [data]);

  const openApp = useCallback(() => {
    // Android：intent拉起APP（未安装回落下载页）；iOS：App未上架暂不拉起
    if (device === "android") {
      const fallback = encodeURIComponent(data?.landing?.downloadPage || "/download");
      window.location.href =
        `intent://share/result?token=${token}#Intent;scheme=yandaoguoxue;package=com.yandao.guoxue;S.browser_fallback_url=${fallback};end`;
    } else {
      window.location.href = data?.landing?.downloadPage || "/download";
    }
  }, [device, token, data]);

  const recordDownload = useCallback(() => {
    try {
      const inv = data?.invite;
      fetch("/api/share/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: inv ? inv.ref : "", platform: device }),
      }).catch(() => {});
    } catch { /* ignore */ }
  }, [data, device]);

  const lines = data ? extractLines(data.payload) : [];
  const landing = data?.landing;
  const toolLabel = (data?.toolType && TOOL_LABELS[data.toolType]) || data?.toolType || "排盘结果";

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200" style={{ borderTopColor: BRAND }} />
          <p className="text-sm text-gray-500">正在加载分享内容...</p>
        </div>
      </main>
    );
  }

  if (error || !data || !data.valid) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ backgroundColor: BRAND + "15" }}>
          <span className="text-3xl">🧭</span>
        </div>
        <h1 className="text-lg font-bold text-gray-800">分享内容已失效</h1>
        <p className="mt-2 text-center text-sm text-gray-500">{error || "该分享链接不存在或已过期（有效期7天）"}</p>
        <button
          onClick={() => router.push("/")}
          className="mt-6 w-56 rounded-xl py-3 text-sm font-semibold text-white"
          style={{ backgroundColor: BRAND }}
        >
          进入言道国学
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-10">
      {/* 品牌头 */}
      <header className="px-5 pb-6 pt-10 text-center" style={{ background: `linear-gradient(180deg, ${BRAND}14, transparent)` }}>
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: BRAND }}>
          <span className="text-2xl font-bold text-white">言</span>
        </div>
        <h1 className="text-xl font-bold" style={{ color: BRAND_DARK }}>言道国学</h1>
        <p className="mt-1 text-xs text-gray-500">传统文化 · 排盘工具 · 学习社区</p>
      </header>

      {/* 分享内容卡片 */}
      <section className="mx-4 rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <span className="rounded-full px-2.5 py-1 text-[10px] font-medium" style={{ backgroundColor: BRAND + "15", color: BRAND }}>
            {toolLabel}
          </span>
          {data.sharerName && (
            <span className="text-xs text-gray-400">{data.sharerName} 分享于 {data.createdAt ? data.createdAt.slice(0, 10) : ""}</span>
          )}
        </div>
        <h2 className="text-base font-bold text-gray-800">{data.title}</h2>
        {data.summary && <p className="mt-2 text-sm leading-6 text-gray-600">{data.summary}</p>}

        {lines.length > 0 && (
          <div className="mt-4 rounded-xl bg-gray-50 p-4">
            <div className={`space-y-1.5 ${expanded ? "" : "max-h-48 overflow-hidden"}`}>
              {lines.map((line, i) => (
                <p key={i} className="whitespace-pre-wrap text-[13px] leading-5 text-gray-700">{line}</p>
              ))}
            </div>
            {lines.length > 6 && (
              <button onClick={() => setExpanded(!expanded)} className="mt-3 text-xs font-medium" style={{ color: BRAND }}>
                {expanded ? "收起 ▲" : "查看完整内容 ▼"}
              </button>
            )}
          </div>
        )}

        <button
          onClick={() => setExpanded(true)}
          className="mt-4 w-full rounded-xl border py-2.5 text-sm font-medium"
          style={{ borderColor: BRAND, color: BRAND }}
        >
          继续查看{toolLabel}
        </button>
      </section>

      {/* 行动区 */}
      <section className="mx-4 mt-4 rounded-2xl bg-white p-5 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-gray-800">开始使用</p>

        {/* Android：下载APP */}
        {device === "android" && landing?.androidDownloadEnabled !== false && (
          <a
            href={landing?.androidUrl || "/download"}
            onClick={recordDownload}
            className="mb-2 block w-full rounded-xl py-3 text-center text-sm font-semibold text-white"
            style={{ backgroundColor: BRAND }}
          >
            下载Android APP
          </a>
        )}

        {/* iPhone：上架前网页版继续，上架后App Store */}
        {device === "ios" && (
          landing?.iosStoreEnabled ? (
            <a
              href={landing.iosStoreUrl || landing?.downloadPage || "/download"}
              onClick={recordDownload}
              className="mb-2 block w-full rounded-xl py-3 text-center text-sm font-semibold text-white"
              style={{ backgroundColor: BRAND }}
            >
              App Store 下载
            </a>
          ) : (
            <button
              onClick={() => router.push("/")}
              className="mb-2 w-full rounded-xl py-3 text-center text-sm font-semibold text-white"
              style={{ backgroundColor: BRAND }}
            >
              网页版继续使用
            </button>
          )
        )}

        {/* Windows/Mac：Web入口 */}
        {(device === "windows" || device === "mac") && (
          <button
            onClick={() => router.push("/")}
            className="mb-2 w-full rounded-xl py-3 text-center text-sm font-semibold text-white"
            style={{ backgroundColor: BRAND }}
          >
            进入网页版
          </button>
        )}

        <div className="flex gap-2">
          <button
            onClick={openApp}
            className="flex-1 rounded-xl border py-3 text-sm font-medium"
            style={{ borderColor: BRAND + "55", color: BRAND }}
          >
            打开APP
          </button>
          <a
            href={registerUrl()}
            className="flex-1 rounded-xl border py-3 text-center text-sm font-medium"
            style={{ borderColor: BRAND + "55", color: BRAND }}
          >
            注册/登录
          </a>
        </div>

        {(device === "windows" || device === "mac") && landing?.androidDownloadEnabled !== false && (
          <p className="mt-3 text-center text-[11px] text-gray-400">手机扫码访问本页可直接下载APP</p>
        )}
      </section>

      {/* 合规文案 */}
      <footer className="mt-6 px-6 text-center">
        <p className="text-[10px] leading-5 text-gray-400">{landing?.complianceText || "内容仅供传统文化学习参考，不构成任何决策建议。"}</p>
        <p className="mt-1 text-[10px] text-gray-300">分享内容有效期7天 · 言道国学</p>
      </footer>
    </main>
  );
}
