"use client";

// 七政四余排盘工具页 - NICHE-TOOLS v25.0.68 / 断语面板 v25.0.71 / 历史盘Profile v25.0.82
// ============================================================================
// 功能：出生信息排盘（今制/恒星制）、真太阳时校正、十二人事宫、二十八宿宿度、
//       十一曜（七政四余）宫度分布、命宫命度/身宫身度、洞微大限行限查询、
//       客户记录保存、统一分享、AI 解读。
// 盘面：Moira 式圆盘（外圈二十八宿 → 十二地支宫 → 内区星曜；0° 黄经在上，
//       顺时针展开；命度/身度以红/蓝标于外缘）。
// 断语：v25.0.71 接入断语引擎（qizheng-duanyu，果老星宗八卷知识库），
//       六节断语（垣殿/化曜/神煞/格局/十二宫断/歌赋），逐条标注出处；
//       后台「系统功能开关」七项断语开关（总开关+六节）经 /api/public/feature-flags
//       镜像控制展示，关闭的节不渲染、不进 AI 上下文。
// 协议：排盘数据与判读口径由算法层输出；断语由知识库引擎输出并受后台开关管控。
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ClientSelector from "@/components/ClientSelector";
import { ShareButton } from "@/components/ShareButton";
import { trackToolEvent } from "@/lib/toolAnalytics";
import AIInterpretButton from "@/components/AIInterpretButton";
import { DatePicker } from "@/components/shared";
import { saveRecord, getPrefillData, clearPrefillData } from "@/lib/clientStore";
import type { Client } from "@/lib/clientStore";
import {
  calcQizhengChart,
  xianDuAtAge,
  QIZHENG_ENGINE_VERSION,
  type QizhengInput,
  type QizhengResult,
  type StarPosition,
  type MingGongMode,
  type StarFrame,
} from "@/algorithm-core/modules/qizheng";
import {
  calcQizhengDuanyu,
  DUANYU_ENGINE_VERSION,
  huayaoStarKeysForGan,
  type DuanyuItem,
  type DuanyuSectionKey,
} from "@/algorithm-core/modules/qizheng-duanyu";
import {
  computeQizhengLayers,
  LAYER_DEFS,
  type LayerKey,
  type LayerLine,
} from "@/algorithm-core/modules/qizheng-layers";
import { computeQizhengLiunian } from "@/algorithm-core/modules/qizheng-liunian";
import { fetchFeatureFlags, flagOn } from "@/lib/featureFlags";
import SharedBirthLocationSelector, { type RegionIndices, regionAt, nearestRegion } from "@/components/shared/region-selector";
import { applyChinaDstCorrection } from "@/algorithm-core/common/dst";
import { useIOSLearningRedirect } from "@/components/IOSLearningRedirect";

const BRAND = "#7B2FBE";
const RAD = Math.PI / 180;
const C = 180;

// SVG 极坐标（0° 黄经在正上，顺时针）
function px(r: number, a: number): [number, number] {
  return [C + r * Math.sin(a * RAD), C - r * Math.cos(a * RAD)];
}
function pt(r: number, a: number): string {
  const [x, y] = px(r, a);
  return `${x.toFixed(2)},${y.toFixed(2)}`;
}
function sectorPath(r1: number, r2: number, a1: number, a2: number): string {
  const large = a2 - a1 > 180 ? 1 : 0;
  return `M ${pt(r2, a1)} A ${r2},${r2} 0 ${large} 1 ${pt(r2, a2)} L ${pt(r1, a2)} A ${r1},${r1} 0 ${large} 0 ${pt(r1, a1)} Z`;
}

const PAN_BG = "#f5ecd7";
const PAN_LINE = "#8a6d3b";
const PAN_DARK = "#14100b";
const GOLD = "#e8c96a";
const STAR_AREA = "#0e1526";

// ===== v25.0.84 P1-3（GAP H1）：五圈层半径（内→外：命理核心/十二地支/星曜/二十八宿/十二人事宫） =====
const R_EDGE = 179;       // 外缘
const R_RENSHI_OUT = 177;  // 第五圈层·十二人事宫（最外）
const R_RENSHI_IN = 154;
const R_XIU_OUT = 152;     // 第四圈层·二十八宿
const R_XIU_IN = 124;
const R_GONG_OUT = 122;    // 第二圈层·十二地支宫
const R_GONG_IN = 94;      // 星曜区边界
const R_STAR_IN = 89;      // 星区内刻度内圈
const R_CORE = 30;         // 第一圈层·命理核心

// ===== v25.0.84 P1-3（GAP H2）：五行配色星曜 + 四余分色 =====
// 七政按五行：金白/木绿/火红/土黄/水蓝（参考口径，深底可读微调；日火月水沿引擎约定）
const WUXING_STAR_COLOR: Record<string, string> = {
  "金": "#f5f5f5", "木": "#66bb6a", "水": "#4fc3f7", "火": "#ef5350", "土": "#e0b64a",
};
// 四余分色：紫炁紫 / 罗睺虹红 / 计都蓝灰 / 月孛青白
const YU_STAR_COLOR: Record<string, string> = {
  qi: "#ce93d8", luo: "#ff7043", ji: "#90a4ae", bei: "#26c6da",
};
/** 星曜取色：四余优先按 key 分色，七政按五行（星盘与流年星同口径） */
function starColor(s: { key: string; wuxing: string }): string {
  return YU_STAR_COLOR[s.key] ?? WUXING_STAR_COLOR[s.wuxing] ?? GOLD;
}
// 二十八宿环内宿名按宿主五行着色（米底深色系，强化信息密度）
const XIU_TEXT_COLOR: Record<string, string> = {
  "木": "#2e7d32", "火": "#c62828", "土": "#8d6e2f", "金": "#455a64", "水": "#1565c0",
};

/** 断语分级徽标样式 */
const DUANYU_LEVEL_META: Record<DuanyuItem["level"], { label: string; badge: string }> = {
  ji: { label: "吉", badge: "bg-emerald-100 text-emerald-700" },
  xiong: { label: "凶", badge: "bg-red-100 text-red-600" },
  zhong: { label: "中性", badge: "bg-gray-100 text-gray-500" },
};

const HOURS = ["00:00-01:00", "01:00-03:00", "03:00-05:00", "05:00-07:00", "07:00-09:00", "09:00-11:00",
  "11:00-13:00", "13:00-15:00", "15:00-17:00", "17:00-19:00", "19:00-21:00", "21:00-23:00", "23:00-24:00"];

const PAIPAN_KEY = "yandao_qizheng_input";

export default function QizhengPage() {
  useIOSLearningRedirect("qizheng"); // IOS-4.3B：iOS 壳内旧排盘深链接 → 易学学习中心
  const [mounted, setMounted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [result, setResult] = useState<QizhengResult | null>(null);
  const [name, setName] = useState("");
  const [regionIdx, setRegionIdx] = useState<RegionIndices>({ p: 0, c: 0, d: 0 });
  const [frame, setFrame] = useState<StarFrame>("tropical");
  const [mingMode, setMingMode] = useState<MingGongMode>("mao");
  const [dongweiStart, setDongweiStart] = useState<9 | 10>(10);
  const [xianAge, setXianAge] = useState<number | "">("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [toast, setToast] = useState("");
  const [savedCount, setSavedCount] = useState(0);
  const [lastInput, setLastInput] = useState<QizhengInput | null>(null);
  /** v25.0.82: 历史盘恢复标识（客户档案"查看"回填，非空=当前盘为历史盘） */
  const [histMeta, setHistMeta] = useState<{
    starSystem: string; mingMode: string; dongweiStart: number; algorithmVersion: string;
  } | null>(null);
  /** v25.0.82 (GAP C4): 夏令时校正信息（勾选夏令时减 1 小时的盘面显示） */
  const [dstInfo, setDstInfo] = useState<{ clock: string; crossedDay: boolean } | null>(null);
  /** v25.0.84 P1-4（GAP F3）：星盘缩放/全屏/复位 */
  const [chartScale, setChartScale] = useState(1);
  const [chartFull, setChartFull] = useState(false);
  const chartViewRef = useRef<HTMLDivElement | null>(null);
  const pinchRef = useRef<{ dist: number; scale: number } | null>(null);
  /** 手势闭包内的最新比例（避免原生监听器读到过期 state） */
  const chartScaleRef = useRef(1);
  const clampScale = (v: number) => Math.min(3, Math.max(1, Math.round(v * 100) / 100));
  const applyScale = (v: number) => {
    const c = clampScale(v);
    chartScaleRef.current = c;
    setChartScale(c);
  };
  const zoomBy = (d: number) => {
    applyScale(chartScaleRef.current + d);
    trackToolEvent("qizheng", "dial_zoom", { delta: d });
  };
  const resetChart = () => {
    applyScale(1);
    chartViewRef.current?.scrollTo(0, 0);
    trackToolEvent("qizheng", "dial_zoom", { reset: true });
  };
  const toggleChartFull = () => {
    setChartFull((v) => {
      if (v) applyScale(1); // 退出全屏复位缩放
      return !v;
    });
    trackToolEvent("qizheng", "dial_zoom", { fullscreen: !chartFull });
  };
  // 双指 pinch 缩放：原生 passive:false 绑定（React onTouchMove 为 passive，
  // preventDefault 无效，页面会跟随滚动/整页缩放）
  useEffect(() => {
    const el = chartViewRef.current;
    if (!el) return;
    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchRef.current = { dist: Math.hypot(dx, dy) || 1, scale: chartScaleRef.current };
      } else {
        pinchRef.current = null;
      }
    };
    const onMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        applyScale(pinchRef.current.scale * (Math.hypot(dx, dy) / pinchRef.current.dist));
      }
    };
    el.addEventListener("touchstart", onStart, { passive: false });
    el.addEventListener("touchmove", onMove, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
    };
  }, [result]);
  // 桌面端 Esc 退出全屏
  useEffect(() => {
    if (!chartFull) return;
    const onKey = (ev: KeyboardEvent) => { if (ev.key === "Escape") setChartFull(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chartFull]);

  /** v25.0.84 P1-5（GAP F5/F6）：高清星盘导出（可配置字段 + 隐私隐藏） */
  const svgWrapRef = useRef<SVGSVGElement | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportHd, setExportHd] = useState(true);
  const [exportCfg, setExportCfg] = useState({
    title: true,     // 标题（含姓名）
    birth: true,     // 出生时间/地点/性别
    trueSolar: true, // 真太阳时/时辰/昼夜
    profile: true,   // 星制/命宫定法/童限
    yaolue: true,    // 命身要略
    detail: true,    // 十一曜明细表
    version: true,   // 引擎版本水印（合规可追溯）
    privacy: false,  // 隐私模式：隐藏姓名/出生时间/地点
  });

  /** 组装导出 SVG（克隆当前盘面 + 可配置信息区），矢量级清晰 */
  const buildExportSvg = (): { svg: string; w: number; h: number } | null => {
    const svgEl = svgWrapRef.current;
    if (!svgEl || !result) return null;
    const SRC = svgEl.cloneNode(true) as SVGSVGElement;
    SRC.removeAttribute("width");
    SRC.removeAttribute("height");
    SRC.removeAttribute("style");
    SRC.removeAttribute("class");

    const W = exportHd ? 1440 : 1080;
    const CHART = W - 160;
    const PAD = 60;
    const parts: string[] = [];
    let y = PAD;

    const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const T = (x: number, yy: number, text: string, size: number, opts?: { bold?: boolean; fill?: string; anchor?: string }) =>
      `<text x="${x}" y="${yy}" text-anchor="${opts?.anchor ?? "start"}" font-family="'PingFang SC','Microsoft YaHei',sans-serif" font-size="${size}"${opts?.bold ? ' font-weight="700"' : ""} fill="${opts?.fill ?? "#333"}">${esc(text)}</text>`;

    // 标题
    if (exportCfg.title) {
      parts.push(T(W / 2, y + 30, exportCfg.privacy ? "七政四余星盘" : `${name ? name + " · " : ""}七政四余星盘`, 34, { bold: true, anchor: "middle", fill: "#1a2a5e" }));
      y += 54;
    }
    // 出生 / 真太阳时 / 口径（隐私模式隐藏出生行）
    const birthLine = exportCfg.privacy ? "" : `${birthText} · ${result.input.placeName}${result.input.gender === "male" ? " · 男" : result.input.gender === "female" ? " · 女" : ""}`;
    if (exportCfg.birth && birthLine) {
      parts.push(T(W / 2, y + 18, birthLine, 18, { anchor: "middle", fill: "#666" }));
      y += 30;
    }
    if (exportCfg.trueSolar) {
      const ts = `真太阳时 ${result.trueSolar.trueSolarTime} · ${result.hour.name}（${result.hour.branch}时） · ${result.dayNight.isDay ? "昼生" : "夜生"}`;
      parts.push(T(W / 2, y + 18, ts, 16, { anchor: "middle", fill: "#666" }));
      y += 28;
    }
    if (exportCfg.profile) {
      const pf = `${frameText} · ${mingMode === "sunrise" ? "日出定命" : "遇卯安命"} · 童限 ${dongweiStart} 岁起`;
      parts.push(T(W / 2, y + 18, pf, 16, { anchor: "middle", fill: "#666" }));
      y += 28;
    }
    y += 14;

    // 星盘（当前盘面状态：含已开图层/流年标记，所见即所得）
    parts.push(`<g transform="translate(${(W - CHART) / 2},${y}) scale(${CHART / 360})">${new XMLSerializer().serializeToString(SRC)}</g>`);
    y += CHART + 24;

    // 命身要略
    if (exportCfg.yaolue) {
      parts.push(T(W / 2, y + 20, `命宫 ${result.mingGong.branch} · 命度 ${result.mingDu.xiuFullName}${result.mingDu.xiuDegree.toFixed(1)}°（度主 ${result.mingDuZhu}） · 身宫 ${result.shenGong.branch} · 身度 ${result.shenDu.xiuFullName}${result.shenDu.xiuDegree.toFixed(1)}°（度主 ${result.shenDuZhu}）`, 17, { anchor: "middle", fill: "#333" }));
      y += 40;
    }

    // 十一曜明细表（星曜 / 宫度 / 宿度 / 人事宫 / 化曜 / 状态）
    if (exportCfg.detail) {
      const cols = ["星曜", "宫/度", "宿度", "人事宫", "化曜", "状态"];
      const colX = [PAD, PAD + 150, PAD + 350, PAD + 560, PAD + 720, PAD + 900];
      parts.push(`<rect x="${PAD - 14}" y="${y}" width="${W - (PAD - 14) * 2}" height="34" fill="#f5f0fa" rx="6"/>`);
      cols.forEach((c, i) => parts.push(T(colX[i], y + 23, c, 17, { bold: true, fill: "#555" })));
      y += 34;
      result.stars.forEach((s) => {
        parts.push(T(colX[0], y + 24, `${s.name}（${s.wuxing}）`, 17, { fill: starColor(s) }));
        parts.push(T(colX[1], y + 24, `${s.palaceBranch}宫${s.palaceDegree.toFixed(1)}°`, 17));
        parts.push(T(colX[2], y + 24, `${s.xiuFullName}${s.xiuDegree.toFixed(1)}°`, 17));
        parts.push(T(colX[3], y + 24, s.renshiGong, 17));
        parts.push(T(colX[4], y + 24, (hyMap[s.key] ?? []).join("、") || "--", 17, { fill: "#7B2FBE" }));
        parts.push(T(colX[5], y + 24, `${s.retrograde ? "逆" : "顺"}${s.inYuan ? " 入垣" : ""}${s.shengDian ? " 升殿" : ""}`, 17));
        y += 36;
      });
      y += 12;
    }

    // 引擎版本水印（合规可追溯）
    if (exportCfg.version) {
      const ver = `${result.engineVersion}｜${DUANYU_ENGINE_VERSION}${histMeta ? "｜历史盘复现" : ""}`;
      parts.push(T(W / 2, y + 16, ver, 12, { anchor: "middle", fill: "#aaa" }));
      y += 26;
    }

    const H = y + PAD;
    return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#fff"/>${parts.join("")}</svg>`, w: W, h: H };
  };

  /** SVG → 高清 PNG 下载（Canvas 2x 抗锯齿栅格化） */
  const exportChartPng = async () => {
    const built = buildExportSvg();
    if (!built) return;
    setExportBusy(true);
    try {
      const blob = new Blob([built.svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej(new Error("SVG 栅格化失败"));
        img.src = url;
      });
      const DPR = 2;
      const canvas = document.createElement("canvas");
      canvas.width = built.w * DPR;
      canvas.height = built.h * DPR;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 不可用");
      ctx.scale(DPR, DPR);
      ctx.drawImage(img, 0, 0, built.w, built.h);
      URL.revokeObjectURL(url);
      const pngBlob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
      if (!pngBlob) throw new Error("PNG 编码失败");
      const a = document.createElement("a");
      const d = new Date();
      const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
      a.href = URL.createObjectURL(pngBlob);
      a.download = `七政四余星盘_${exportCfg.privacy ? "脱敏" : name || "命例"}_${stamp}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      trackToolEvent("qizheng", "tool_export", { privacy: exportCfg.privacy, hd: exportHd, detail: exportCfg.detail });
      setToast("星盘已导出（高清 PNG）");
      setTimeout(() => setToast(""), 2000);
    } catch (e) {
      setToast(`导出失败：${e instanceof Error ? e.message : "未知错误"}`);
      setTimeout(() => setToast(""), 2600);
      trackToolEvent("qizheng", "tool_error", { step: "export" });
    } finally {
      setExportBusy(false);
    }
  };

  useEffect(() => {
    trackToolEvent("qizheng", "tool_open");
    setMounted(true);
    try {
      const raw = localStorage.getItem(PAIPAN_KEY);
      if (raw) {
        const s = JSON.parse(raw) as { regionIdx?: RegionIndices; frame?: StarFrame; mingMode?: MingGongMode; dongweiStart?: 9 | 10 };
        if (s.regionIdx && typeof s.regionIdx.p === "number") setRegionIdx(s.regionIdx);
        if (s.frame === "sidereal" || s.frame === "tropical") setFrame(s.frame);
        if (s.mingMode === "mao" || s.mingMode === "sunrise") setMingMode(s.mingMode);
        if (s.dongweiStart === 9 || s.dongweiStart === 10) setDongweiStart(s.dongweiStart);
      }
    } catch { /* ignore */ }

    // v25.0.82 (GAP B2/F8): 历史盘恢复——客户档案记录点击"查看"后 prefill 回填，
    // 按【当时 Profile】（star_system/calculation_profile，兜底 input）恢复表单并重排，
    // 而非用当前默认参数；恢复后在盘面标注当时引擎版本，保证历史盘可追溯、可复现。
    const prefill = getPrefillData("qizheng");
    if (prefill) {
      try {
        const histInput = prefill.input as QizhengInput | undefined;
        const histProfile = (prefill.calculation_profile ?? {}) as {
          ming_mode?: MingGongMode; dongwei_start?: 9 | 10;
        };
        const histFrame: StarFrame | undefined =
          prefill.star_system === "sidereal" || prefill.star_system === "tropical"
            ? prefill.star_system
            : histInput?.frame;
        const histMing: MingGongMode | undefined = histProfile.ming_mode ?? histInput?.mingGongMode;
        const histDw: 9 | 10 | undefined = histProfile.dongwei_start ?? histInput?.dongweiStart;

        if (histFrame === "sidereal" || histFrame === "tropical") setFrame(histFrame);
        if (histMing === "mao" || histMing === "sunrise") setMingMode(histMing);
        if (histDw === 9 || histDw === 10) setDongweiStart(histDw);
        if (histInput?.lon != null) setRegionIdx(nearestRegion(histInput.lon));

        if (histInput) {
          const restoredFrame: StarFrame = histFrame ?? "tropical";
          const restoredMing: MingGongMode = histMing ?? "mao";
          const restoredDw: 9 | 10 = histDw ?? 10;
          const res = calcQizhengChart({
            ...histInput,
            frame: restoredFrame,
            mingGongMode: restoredMing,
            dongweiStart: restoredDw,
          });
          setResult(res);
          setLastInput({ ...histInput, frame: restoredFrame, mingGongMode: restoredMing, dongweiStart: restoredDw });
          setShowForm(false);
          setDstInfo(null); // input 已是当时校正后标准时间，历史盘恢复无需二次 DST
          setHistMeta({
            starSystem: restoredFrame,
            mingMode: restoredMing,
            dongweiStart: restoredDw,
            algorithmVersion: typeof prefill.algorithm_version === "string" ? prefill.algorithm_version : res.engineVersion,
          });
          trackToolEvent("qizheng", "history_restore", {
            star_system: restoredFrame, ming_mode: restoredMing, dongwei_start: restoredDw,
          });
        }
      } catch (e) {
        console.error("七政历史盘恢复失败:", e);
      } finally {
        clearPrefillData("qizheng");
      }
    }
  }, []);

  // 排盘参数变更埋点（跳过挂载首拍）
  const profileTouched = useRef(false);
  useEffect(() => {
    if (mounted) {
      if (profileTouched.current) {
        trackToolEvent("qizheng", "profile_used", { frame, mingMode, dongweiStart });
      }
      profileTouched.current = true;
    }
  }, [mounted, frame, mingMode, dongweiStart]);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(PAIPAN_KEY, JSON.stringify({ regionIdx, frame, mingMode, dongweiStart }));
    } catch { /* ignore */ }
  }, [mounted, regionIdx, frame, mingMode, dongweiStart]);

  // 出生地：省→市→区县三级联动（与八字同一数据源 src/data/regions.ts）
  const region = regionAt(regionIdx);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2400);
  }, []);

  const handleSubmit = useCallback((
    dateVal: { year: number; month: number; day: number; hour: number; minute: number },
    opts: { gender: "male" | "female"; xiaLing?: boolean },
  ) => {
    // v25.0.82 (GAP C4): 中国历史夏令时（1986-1991）——勾选"夏令时"即声明录入的是
    // 当时钟面时间，先减 1 小时得北京标准时间再进排盘引擎；跨日/跨月/跨年回退
    // 由公共模块 applyChinaDstCorrection 的 Date 运算保证。保存的 input 即校正后
    // 标准时间，历史盘恢复直接复用无需二次校正。
    const dstApplied = opts.xiaLing === true;
    const dst = applyChinaDstCorrection(dateVal.year, dateVal.month, dateVal.day, dateVal.hour, dateVal.minute, dstApplied);
    const input: QizhengInput = {
      year: dst.corrected.year, month: dst.corrected.month, day: dst.corrected.day,
      hour: dst.corrected.hour, minute: dst.corrected.minute,
      lat: region.lat ?? 39.9042, lon: region.lng, tzOffset: 8,
      placeName: `${region.province}${region.city ? region.city : ""}${region.district ? region.district : ""}`,
      gender: opts.gender,
      frame, mingGongMode: mingMode, dongweiStart,
    };
    try {
      const res = calcQizhengChart(input);
      setResult(res);
      setLastInput(input);
      setDstInfo(
        dst.applied
          ? { clock: `${dateVal.year}-${dateVal.month}-${dateVal.day} ${String(dateVal.hour).padStart(2, "0")}:${String(dateVal.minute).padStart(2, "0")}`, crossedDay: dst.crossedDay }
          : null,
      );
      setShowForm(false);
      setHistMeta(null); // 新排盘清除历史盘标识
      trackToolEvent("qizheng", "chart_generated", {
        frame,
        mingMode,
        dongweiStart,
        lat: region.lat != null ? Math.round(region.lat * 10) / 10 : 0,
      });
      trackToolEvent("qizheng", "tool_calculate");
      // v25.0.74: 未选客户也保存（用户反馈排盘记录不能保存）；clientId 留空挂"未指定"
      // v25.0.82 (GAP B2): data 增补 star_system/calculation_profile/algorithm_version，
      // 历史盘恢复按当时 Profile 复现，不随全局默认漂移
      try {
        saveRecord({
          clientId: selectedClient ? selectedClient.id : "", type: "qizheng",
          data: {
            input,
            star_system: res.frame,
            calculation_profile: {
              ming_mode: res.input.mingGongMode,
              dongwei_start: res.dongwei.startBase,
              zhen_ta: true,
              dst: dstApplied,
            },
            algorithm_version: res.engineVersion,
            mingGong: res.mingGong.branch, shenGong: res.shenGong.branch,
            mingDu: `${res.mingDu.xiuFullName}${res.mingDu.xiuDegree.toFixed(1)}°`,
            chuxian: res.dongwei.chuxianText },
          note: "", status: "pending",
        });
        setSavedCount((c) => c + 1);
        showToast(selectedClient ? "排盘结果已保存到客户档案" : "排盘记录已保存");
      } catch { /* 保存失败不阻断排盘 */ }
    } catch (e) {
      trackToolEvent("qizheng", "tool_error", { phase: "calc" });
      showToast(`排盘失败：${e instanceof Error ? e.message : "输入参数异常"}`);
    }
  }, [region, frame, mingMode, dongweiStart, selectedClient, showToast]);

  const xian = useMemo(() => {
    if (!result || xianAge === "" || xianAge < 1 || xianAge > 120) return null;
    return xianDuAtAge(result, xianAge);
  }, [result, xianAge]);

  // ==================== 断语（v25.0.71） ====================
  // 后台「系统功能开关」镜像：总开关 qizheng_duanyu + 六节分开关
  const [featureFlags, setFeatureFlags] = useState<Record<string, string>>({});
  const [dyOpenSections, setDyOpenSections] = useState<Set<DuanyuSectionKey>>(new Set(["yuandian"]));

  useEffect(() => {
    fetchFeatureFlags().then(setFeatureFlags).catch(() => { /* 拉取失败按全开兜底 */ });
  }, []);

  const duanyu = useMemo(() => {
    if (!result) return null;
    try {
      return calcQizhengDuanyu(result);
    } catch {
      return null;
    }
  }, [result]);

  // 十一曜化曜映射（年干起十干化曜，卷一§1.6；明细表"化曜"列与导出共用）
  const hyMap = useMemo(() => {
    const gan = duanyu?.yearGanzhi.gan;
    if (!gan) return {} as Record<string, string[]>;
    const m: Record<string, string[]> = {};
    for (const { huaName, starKey } of huayaoStarKeysForGan(gan)) {
      if (starKey) (m[starKey] ||= []).push(huaName);
    }
    return m;
  }, [duanyu]);

  const duanyuMasterOn = flagOn(featureFlags, "qizheng_duanyu");
  const duanyuMasterMaint = featureFlags.qizheng_duanyu === "MAINTENANCE";
  const visibleDySections = useMemo(() => {
    if (!duanyu || !duanyuMasterOn) return [];
    return duanyu.sections.filter((s) => flagOn(featureFlags, `qizheng_duanyu_${s.key}`));
  }, [duanyu, duanyuMasterOn, featureFlags]);

  const duanyuSummary = useMemo(() => {
    const all = visibleDySections.flatMap((s) => s.items);
    return {
      ji: all.filter((i) => i.level === "ji").length,
      xiong: all.filter((i) => i.level === "xiong").length,
      zhong: all.filter((i) => i.level === "zhong").length,
      total: all.length,
    };
  }, [visibleDySections]);

  const toggleDySection = useCallback((key: DuanyuSectionKey) => {
    setDyOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // 星曜径向避让排布（按黄经排序，近距径向递减；v25.0.84 P1-3 适配五圈层：星区 38-82）
  const starLayout = useMemo(() => {
    if (!result) return [];
    const sorted = [...result.stars].sort((a, b) => a.lon - b.lon);
    const placed: Array<{ s: StarPosition; r: number }> = [];
    for (const s of sorted) {
      let r = 82;
      for (const p of placed) {
        let d = Math.abs(s.lon - p.s.lon);
        if (d > 180) d = 360 - d;
        if (d < 12 && Math.abs(p.r - r) < 14) r = p.r - 17;
      }
      placed.push({ s, r: Math.max(38, r) });
    }
    return placed;
  }, [result]);

  // ==================== 感应图层（v25.0.82 P1-1，GAP E1/H5） ====================
  // 12 项图层开关（守/冲/三方/拱/夹/同经/同络/顶星/顶度/神煞/化曜/大限），
  // 每层 RULE_ID 可追溯（连线 label + source 出知识库/docx 感应方式章节）
  const LAYER_COLORS: Record<LayerKey, string> = {
    shou: "#7B2FBE", chong: "#e53935", sanfang: "#43a047", gong: "#fb8c00", jia: "#b8860b",
    tongjing: "#00acc1", tongluo: "#26a69a", dingxing: "#00bcd4", dingdu: "#4dd0e1",
    shensha: "#d81b60", huayao: "#fbc02d", daxian: "#1e88e5",
  };
  const [layerOn, setLayerOn] = useState<Record<LayerKey, boolean>>({
    shou: false, chong: false, sanfang: false, gong: false, jia: false,
    tongjing: false, tongluo: false, dingxing: false, dingdu: false,
    shensha: false, huayao: false, daxian: false,
  });
  const [layersOpen, setLayersOpen] = useState(false);
  const LAYER_STATE_KEY = "yandao_qizheng_layers";

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LAYER_STATE_KEY);
      if (raw) {
        const s = JSON.parse(raw) as Partial<Record<LayerKey, boolean>>;
        setLayerOn((prev) => ({ ...prev, ...s }));
      }
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(LAYER_STATE_KEY, JSON.stringify(layerOn));
    } catch { /* ignore */ }
  }, [layerOn]);

  const layers = useMemo(() => {
    if (!result) return null;
    return computeQizhengLayers(result, duanyu, xian);
  }, [result, duanyu, xian]);

  const activeLayerEntries = useMemo(() => {
    if (!layers) return [] as Array<{ key: LayerKey; line: LayerLine }>;
    return layers.layers
      .filter((l) => layerOn[l.key])
      .flatMap((l) => l.lines.map((line) => ({ key: l.key, line })));
  }, [layers, layerOn]);

  const layerHitCount = useCallback(
    (key: LayerKey): number => layers?.layers.find((l) => l.key === key)?.lines.length ?? 0,
    [layers],
  );

  // ==================== 流年模式（v25.0.83 P1-2，GAP E2/E3/F4） ====================
  // 年份选择 → 流年盘（立春日天象落本命盘，原流相并）+ 太岁 + 流年神煞/化曜/顶星；
  // 小限/划度/月限无知识库算法表，挂起待源（GAP MATRIX 同口径，不造假）。
  const [liunianOn, setLiunianOn] = useState(false);
  const [liunianYear, setLiunianYear] = useState<number>(new Date().getFullYear());
  const liunian = useMemo(() => {
    if (!result || !liunianOn) return null;
    try {
      return computeQizhengLiunian(result, liunianYear);
    } catch {
      return null;
    }
  }, [result, liunianOn, liunianYear]);
  const liunianTaiSuiPalace = useMemo(() => {
    if (!liunian || !result) return null;
    return result.palaces.find((p) => p.branch === liunian.ganzhi.zhi) ?? null;
  }, [liunian, result]);

  const birthText = result
    ? `${result.input.year}年${result.input.month}月${result.input.day}日 ${String(result.input.hour).padStart(2, "0")}:${String(result.input.minute).padStart(2, "0")}`
    : "";
  const frameText = result?.frame === "sidereal" ? "恒星制（郑氏星案）" : "黄道回归今制";

  const aiContext = useMemo(() => {
    if (!result) return "";
    const lines = [
      `星制：${frameText}`,
      `出生：${birthText}（${result.input.placeName}）`,
      `真太阳时：${result.trueSolar.trueSolarTime}（校正 ${result.trueSolar.totalOffsetMin.toFixed(1)} 分钟）`,
      `时辰：${result.hour.name}（${result.hour.branch}时）｜${result.dayNight.isDay ? "昼生" : "夜生"}`,
      `命宫：${result.mingGong.branch}宫｜命度：${result.mingDu.xiuFullName}${result.mingDu.xiuDegree.toFixed(1)}°｜命度主：${result.mingDuZhu}`,
      `身宫：${result.shenGong.branch}宫｜身度：${result.shenDu.xiuFullName}${result.shenDu.xiuDegree.toFixed(1)}°｜身度主：${result.shenDuZhu}`,
      `命元五行：${result.mingYuanWuxing}`,
      `洞微大限：出限 ${result.dongwei.chuxianText}`,
      "十一曜：",
      ...result.stars.map((s) =>
        `${s.name}（${s.wuxing}）${s.palaceBranch}宫${s.palaceDegree.toFixed(1)}° ${s.xiuFullName}${s.xiuDegree.toFixed(1)}° ${s.renshiGong}宫 ${s.retrograde ? "逆行" : "顺行"}${s.inYuan ? " 入垣" : ""}${s.shengDian ? " 升殿" : ""}`),
      "洞微行限：",
      ...result.dongwei.rows.map((r) => `${r.renshiGong}（${r.palaceBranch}宫）${r.startAge}-${Math.ceil(r.endAge) - 1}岁 共${r.years}年${r.isTongxian ? "（童限）" : ""}`),
    ];
    // v25.0.71：可见断语（受后台开关管控，关闭的节不进 AI 上下文）
    if (visibleDySections.length > 0) {
      lines.push("知识库断语（果老星宗八卷，逐条含出处）：");
      for (const sec of visibleDySections) {
        lines.push(`【${sec.name}】`);
        for (const it of sec.items) {
          lines.push(`[${DUANYU_LEVEL_META[it.level].label}] ${it.title}：${it.text}（${it.source}）`);
        }
      }
    }
    // v25.0.83：流年模式（开启时进 AI 上下文）
    if (liunian) {
      lines.push(`流年（${liunian.ganzhi.gan}${liunian.ganzhi.zhi}年 · ${liunian.year}，立春${liunian.lichun.text}，立春日午正天象落本命盘）：`);
      lines.push(`太岁：${liunian.taiSui.text}（${liunian.taiSui.source}）`);
      if (liunian.dingXing.length > 0) {
        lines.push(`流年顶星：${liunian.dingXing.map((d) => `${d.starName}钓命度（差${d.diffDeg.toFixed(2)}°）`).join("、")}`);
      }
      lines.push("流年神煞（流年干支起）：");
      for (const s of liunian.shensha) {
        lines.push(`${s.name}在${s.branch}宫（${s.renshiGong}）${s.onMing ? "·坐命宫" : s.onShen ? "·坐身宫" : s.chongMing ? "·冲命宫" : ""}`);
      }
      lines.push("流年化曜（流年干起）：");
      for (const h of liunian.huayao) {
        lines.push(`${h.huaName}＝${h.starName}，守${h.palaceBranch}宫（${h.renshiGong}）${h.onMing ? "·坐命宫" : h.onShen ? "·坐身宫" : ""}`);
      }
      lines.push("原流相并（本命 → 流年）：");
      for (const s of liunian.stars) {
        lines.push(`${s.name}：本命${s.benmingPalaceBranch}宫 → 流年${s.palaceBranch}宫${s.palaceDegree.toFixed(1)}° ${s.xiuFullName}${s.xiuDegree.toFixed(1)}°`);
      }
    }
    return lines.join("\n");
  }, [result, frameText, birthText, visibleDySections, liunian]);

  // ==================== 未排盘：介绍页 ====================
  if (!result) {
    return (
      <div className="mx-auto w-full bg-[#ededed]" style={{ maxWidth: "420px", minHeight: "100vh" }}>
        <div className="bg-white px-4 py-6">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold text-white" style={{ backgroundColor: "#1a2a5e" }}>
            政
          </div>
          <h1 className="text-center text-lg font-bold text-gray-800">七政四余排盘</h1>
          <p className="mt-2 text-center text-xs leading-relaxed text-gray-500">
            七政（日月五星）四余（炁罗计孛）星命古法，以二十八宿宿度定经、十二宫定域，
            洞微大限推行限。
          </p>
          <div className="mt-4 space-y-2 rounded-xl bg-[#f5f0fa] p-3 text-[11px] leading-relaxed text-gray-600">
            <p>· 天文层：Astronomy Engine（MIT）日月行星黄经，与 JPL 对拍验证</p>
            <p>· 今制/恒星制双星制可选，真太阳时按出生地经度校正</p>
            <p>· 命宫（遇卯安命/日出定命）、命度、身度、度主全链路</p>
            <p>· 洞微大限行限表与任意虚岁行限度查询</p>
            <p>· 断语六节（垣殿/化曜/神煞/格局/十二宫断/歌赋），逐条标注古籍出处</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="mt-5 w-full rounded-full py-3 text-sm font-semibold text-white active:scale-[0.98]"
            style={{ backgroundColor: BRAND }}
          >
            开始排盘
          </button>
        </div>
        <DatePicker
          show={showForm}
          onClose={() => setShowForm(false)}
          onSubmit={handleSubmit}
          submitText="立即排盘"
          title="七政四余排盘"
          extraOptions={
            <div className="mt-3 space-y-3">
              <div>
                <div className="mb-1.5 text-xs text-gray-500">出生地点（省/市/区县三级 · 与八字同一数据源，供经纬度与日出日落解算）</div>
                <SharedBirthLocationSelector
                  lng={region.lng}
                  indices={regionIdx}
                  onIndicesChange={setRegionIdx}
                  label="出生地"
                />
              </div>
              <div>
                <div className="mb-1.5 text-xs text-gray-500">星制</div>
                <div className="flex rounded-full border border-gray-200 p-0.5">
                  {([["tropical", "黄道回归今制"], ["sidereal", "恒星制（郑案）"]] as Array<[StarFrame, string]>).map(([k, label]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setFrame(k)}
                      className={`flex-1 rounded-full py-1.5 text-xs font-medium ${frame === k ? "text-white" : "text-gray-500"}`}
                      style={frame === k ? { backgroundColor: BRAND } : {}}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1.5 text-xs text-gray-500">命宫定法</div>
                <div className="flex rounded-full border border-gray-200 p-0.5">
                  {([["mao", "遇卯安命（古法）"], ["sunrise", "日出定命"]] as Array<[MingGongMode, string]>).map(([k, label]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setMingMode(k)}
                      className={`flex-1 rounded-full py-1.5 text-xs font-medium ${mingMode === k ? "text-white" : "text-gray-500"}`}
                      style={mingMode === k ? { backgroundColor: BRAND } : {}}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1.5 text-xs text-gray-500">童限起岁</div>
                <div className="flex rounded-full border border-gray-200 p-0.5">
                  {([10, 9] as Array<9 | 10>).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setDongweiStart(k)}
                      className={`flex-1 rounded-full py-1.5 text-xs font-medium ${dongweiStart === k ? "text-white" : "text-gray-500"}`}
                      style={dongweiStart === k ? { backgroundColor: BRAND } : {}}
                    >
                      {k} 岁起（{k === 10 ? "通行古法" : "师传早一年"}）
                    </button>
                  ))}
                </div>
              </div>
            </div>
          }
        />
        <div className="mx-3 mt-3 rounded-lg border border-red-100 bg-red-50/50 p-3">
          <p className="text-xs leading-relaxed text-gray-500">
            <strong>免责声明：</strong>本工具仅供传统文化学习与参考，不构成任何人生决策建议。星曜释义为通行天文口径描述。
          </p>
        </div>
        {toast && (
          <div className="fixed left-1/2 top-16 z-50 -translate-x-1/2 rounded-full bg-black/80 px-4 py-2 text-xs text-white">{toast}</div>
        )}
      </div>
    );
  }

  // ==================== 已排盘：盘面 ====================
  const sun = result.stars.find((s) => s.key === "sun");
  const moon = result.stars.find((s) => s.key === "moon");

  return (
    <div className="mx-auto w-full bg-[#ededed]" style={{ maxWidth: "420px", minHeight: "100vh" }}>
      {/* 基本信息 */}
      <div className="bg-white px-3 py-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold text-gray-800">
            {name ? `${name} · ` : ""}七政四余星盘
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="rounded-full border px-3 py-1 text-[11px] font-medium active:scale-95"
            style={{ borderColor: "#d9c7ee", color: BRAND }}
          >
            重新排盘
          </button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          <div><span className="text-gray-500">出生：</span><span className="font-medium">{birthText}</span></div>
          <div><span className="text-gray-500">地点：</span><span className="font-medium">{result.input.placeName}</span></div>
          <div><span className="text-gray-500">真太阳时：</span><span className="font-medium">{result.trueSolar.trueSolarTime}</span></div>
          <div><span className="text-gray-500">时辰：</span><span className="font-medium">{result.hour.name}（{result.hour.branch}时）</span></div>
          <div><span className="text-gray-500">昼夜：</span><span className="font-medium">{result.dayNight.isDay ? "昼生" : "夜生"}</span></div>
          <div><span className="text-gray-500">星制：</span><span className="font-medium">{frameText}</span></div>
        </div>
        <p className="mt-1.5 text-[10px] text-gray-400">
          真太阳时校正：经度差 {result.trueSolar.longitudeOffsetMin.toFixed(1)} 分 + 均时差 {result.trueSolar.equationOfTimeMin.toFixed(1)} 分
        </p>
        {dstInfo && (
          <p className="mt-1 text-[10px] text-amber-700">
            夏令时校正：录入钟面 {dstInfo.clock} 已减 1 小时（北京标准时间）后排盘
            {dstInfo.crossedDay ? "，校正跨日回退" : ""}
          </p>
        )}
        {histMeta && (
          <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5">
            <p className="text-[11px] leading-relaxed text-amber-800">
              <strong>历史盘</strong> · 已按保存时口径复现：星制
              {histMeta.starSystem === "sidereal" ? "恒星制" : "黄道回归今制"}｜命宫
              {histMeta.mingMode === "sunrise" ? "日出定命" : "遇卯安命"}｜童限
              {histMeta.dongweiStart} 岁起
            </p>
            <p className="mt-0.5 text-[10px] text-amber-700 break-all">当时引擎：{histMeta.algorithmVersion}</p>
          </div>
        )}
      </div>

      {/* 星盘（v25.0.84 P1-4：缩放/全屏/复位，双指 pinch + 按钮控制） */}
      <div className={chartFull ? "fixed inset-0 z-[70] flex flex-col bg-[#0e1526]" : "mt-2 bg-white px-2 py-3"}>
        <div className={chartFull ? "flex items-center justify-between gap-2 px-3 py-2" : "flex items-center justify-between gap-2 px-1 pb-1.5"}>
          <span className={`text-[10px] ${chartFull ? "text-gray-300" : "text-gray-400"}`}>
            星盘{chartFull ? " · 全屏" : ""} · {Math.round(chartScale * 100)}%
            {chartScale > 1 ? "（可拖动查看）" : "（双指捏合缩放）"}
          </span>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => zoomBy(-0.25)} disabled={chartScale <= 1}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-sm font-bold text-gray-600 active:scale-95 disabled:opacity-40">−</button>
            <button type="button" onClick={() => zoomBy(0.25)} disabled={chartScale >= 3}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-sm font-bold text-gray-600 active:scale-95 disabled:opacity-40">＋</button>
            <button type="button" onClick={resetChart} disabled={chartScale === 1}
              className="rounded-full border border-gray-200 px-2.5 py-1 text-[10px] font-medium text-gray-600 active:scale-95 disabled:opacity-40">复位</button>
            <button type="button" onClick={toggleChartFull}
              className="rounded-full border px-2.5 py-1 text-[10px] font-medium active:scale-95"
              style={{ borderColor: "#d9c7ee", color: BRAND }}>
              {chartFull ? "退出全屏" : "全屏"}
            </button>
            <button type="button" onClick={() => setExportOpen(true)}
              className="rounded-full border border-gray-200 px-2.5 py-1 text-[10px] font-medium text-gray-600 active:scale-95">
              导出
            </button>
          </div>
        </div>
        <div
          ref={chartViewRef}
          className={chartFull ? "flex-1 overflow-auto overscroll-contain" : "overflow-auto overscroll-contain"}
          style={chartFull ? undefined : { maxHeight: 380 }}
        >
        <div
          className="mx-auto"
          style={
            {
              "--qz-base": chartFull ? "min(96vw, calc(100vh - 80px))" : "344px",
              width: `calc(var(--qz-base) * ${chartScale})`,
              height: `calc(var(--qz-base) * ${chartScale})`,
            } as React.CSSProperties
          }
        >
        <div
          style={
            {
              width: "var(--qz-base)",
              height: "var(--qz-base)",
              transform: `scale(${chartScale})`,
              transformOrigin: "top left",
            } as React.CSSProperties
          }
        >
          <svg ref={svgWrapRef} viewBox="0 0 360 360" width="100%" height="100%">
            {/* 外圈底 */}
            <circle cx={C} cy={C} r={R_EDGE} fill={PAN_BG} stroke={PAN_LINE} strokeWidth={2} />
            {/* 第五圈层·十二人事宫（最外，v25.0.84 P1-3 重排外圈化） */}
            {result.palaces.map((p) => {
              const mid = p.startLon + p.width / 2;
              const [tx, ty] = px((R_RENSHI_IN + R_RENSHI_OUT) / 2, mid);
              const flip = mid > 90 && mid < 270;
              return (
                <g key={`rs-${p.branch}`}>
                  <path d={sectorPath(R_RENSHI_IN, R_RENSHI_OUT, p.startLon, p.startLon + p.width)} fill="#f6eed9" stroke={PAN_LINE} strokeWidth={0.6} />
                  <text x={tx} y={ty} textAnchor="middle" dominantBaseline="central"
                    fontSize={10.5} fill="#5a4526" fontWeight={700}
                    transform={`rotate(${flip ? mid + 180 : mid} ${tx} ${ty})`}>
                    {flip ? p.renshiGong.split("").reverse().join("") : p.renshiGong}
                  </text>
                </g>
              );
            })}
            {/* 命宫/身宫高亮（人事宫环同扇区，紫/蓝） */}
            <path d={sectorPath(R_RENSHI_IN, R_RENSHI_OUT, result.mingGong.startLon, result.mingGong.startLon + result.mingGong.width)}
              fill="rgba(123,47,190,0.18)" stroke="#7B2FBE" strokeWidth={1.2} />
            <path d={sectorPath(R_RENSHI_IN, R_RENSHI_OUT, result.palaces[result.shenGong.branchIndex].startLon, result.palaces[result.shenGong.branchIndex].startLon + result.palaces[result.shenGong.branchIndex].width)}
              fill="rgba(33,150,243,0.14)" stroke="#2196F3" strokeWidth={1} />
            {/* 第四圈层·二十八宿（宿名按宿主五行着色） */}
            {result.mansions.map((m) => {
              const a1 = m.startLon;
              const a2 = m.startLon + m.width;
              const mid = a1 + m.width / 2;
              const [tx, ty] = px((R_XIU_IN + R_XIU_OUT) / 2, mid);
              return (
                <g key={m.name}>
                  <path d={sectorPath(R_XIU_IN, R_XIU_OUT, a1, a2)} fill="#efe4c8" stroke={PAN_LINE} strokeWidth={0.5} />
                  <text x={tx} y={ty} textAnchor="middle" dominantBaseline="central"
                    fontSize={10} fill={XIU_TEXT_COLOR[m.wuxing] ?? "#5a4526"} fontWeight={600}
                    transform={`rotate(${mid} ${tx} ${ty})`}>
                    {m.name}
                  </text>
                </g>
              );
            })}
            {/* 第二圈层·十二地支宫（地支 + 宫主） */}
            {result.palaces.map((p) => {
              const mid = p.startLon + p.width / 2;
              const [bx, by] = px((R_GONG_IN + R_GONG_OUT) / 2 + 3, mid);
              const [rx, ry] = px(R_GONG_IN + 5.5, mid);
              const flip = mid > 90 && mid < 270;
              return (
                <g key={p.branch}>
                  <path d={sectorPath(R_GONG_IN, R_GONG_OUT, p.startLon, p.startLon + p.width)} fill={PAN_BG} stroke={PAN_LINE} strokeWidth={0.8} />
                  <text x={bx} y={by} textAnchor="middle" dominantBaseline="central"
                    fontSize={17} fill="#3a2d18" fontWeight={700}
                    transform={`rotate(${mid} ${bx} ${by})`}>
                    {p.branch}
                  </text>
                  <text x={rx} y={ry} textAnchor="middle" dominantBaseline="central"
                    fontSize={7.5} fill="#a08a5f"
                    transform={`rotate(${flip ? mid + 180 : mid} ${rx} ${ry})`}>
                    {flip ? `主${p.owner}`.split("").reverse().join("") : `主${p.owner}`}
                  </text>
                </g>
              );
            })}
            {/* 星区 */}
            <circle cx={C} cy={C} r={R_GONG_IN} fill={STAR_AREA} stroke={PAN_LINE} strokeWidth={1.5} />
            <circle cx={C} cy={C} r={R_STAR_IN} fill="none" stroke="#31406b" strokeWidth={0.7} />
            {/* 度刻度（星区内缘每 15°） */}
            {Array.from({ length: 24 }, (_, i) => {
              const a = i * 15;
              const [x1, y1] = px(R_GONG_IN, a);
              const [x2, y2] = px(R_STAR_IN, a);
              return <line key={`k${a}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#31406b" strokeWidth={0.6} />;
            })}
            {/* 感应图层连线（v25.0.82 P1-1）：星→目标二次贝塞尔弧，悬停 title 显示规则与出处；
                v25.0.84 P1-3 视觉整改：端点让位地支字/星符，近对冲改走刻度环弧线避让核心文字区 */}
            {layers?.layers.filter((l) => layerOn[l.key] && l.lines.length > 0).map((l) => {
              const color = LAYER_COLORS[l.key];
              const dashed = l.key === "tongjing" || l.key === "tongluo" || l.key === "daxian";
              // 神煞用点线（第二区分通道：与冲同为暖色系时不混淆）
              const dash = dashed ? "4 3" : l.key === "shensha" ? "1.5 2.5" : undefined;
              return (
                <g key={`ly-${l.key}`} opacity={0.8}>
                  {l.lines.map((ln, i) => {
                    const fromR = ln.starKey ? 88 : 96;
                    const toR = ln.target === "mingDu" ? 150 : 96;
                    const delta = ((ln.toLon - ln.fromLon + 540) % 360) - 180;
                    // 近对冲（>150°）沿 r=90 刻度环大弧行进，避免贝塞尔曲线下坠穿核心圈
                    const d = Math.abs(delta) > 150
                      ? `M ${pt(90, ln.fromLon)} A 90,90 0 0 ${delta > 0 ? 1 : 0} ${pt(90, ln.toLon)} L ${pt(toR, ln.toLon)}`
                      : `M ${pt(fromR, ln.fromLon)} Q ${pt(34, ln.fromLon + delta / 2)} ${pt(toR, ln.toLon)}`;
                    const [ex, ey] = px(toR, ln.toLon);
                    return (
                      <g key={`${ln.ruleId}-${i}`}>
                        <path d={d} fill="none" stroke={color} strokeWidth={1.3} strokeDasharray={dash}>
                          <title>{`${ln.label}｜规则 ${ln.ruleId}｜出处 ${ln.source}`}</title>
                        </path>
                        <circle cx={ex} cy={ey} r={1.5} fill={color} />
                      </g>
                    );
                  })}
                </g>
              );
            })}
            {/* 流年模式（v25.0.83 P1-2）：太岁宫虚线描边 + 流年星空心标记（原流相并）；
                v25.0.84 P1-3 视觉整改：描边加浓、标记带底衬与星符，避让本命星符（87.5 外缘） */}
            {liunianTaiSuiPalace && (
              <path
                d={sectorPath(R_GONG_IN, R_GONG_OUT, liunianTaiSuiPalace.startLon, liunianTaiSuiPalace.startLon + liunianTaiSuiPalace.width)}
                fill="rgba(230,81,0,0.14)" stroke="#e65100" strokeWidth={1.5} strokeDasharray="4 2.5"
              />
            )}
            {liunian?.stars.map((s) => {
              const [x, y] = px(90.5, s.lon);
              const color = starColor(s);
              const sym = result.stars.find((b) => b.key === s.key)?.symbol ?? "";
              return (
                <g key={`ln-${s.key}`}>
                  <circle cx={x} cy={y} r={3.2} fill="rgba(14,21,38,0.6)" stroke={color} strokeWidth={1.4} />
                  <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={5.5} fill={color} fontWeight={700}>{sym}</text>
                  <title>
                    {`流年${s.name}：${s.palaceBranch}宫${s.palaceDegree.toFixed(1)}° ${s.xiuFullName}${s.xiuDegree.toFixed(1)}°（本命${s.benmingPalaceBranch}宫 ${s.benmingXiu}）｜${liunian.ganzhi.gan}${liunian.ganzhi.zhi}年`}
                  </title>
                </g>
              );
            })}
            {/* 星曜（七政五行配色 + 四余分色，v25.0.84 P1-3 H2） */}
            {starLayout.map(({ s, r }) => {
              const [x, y] = px(r, s.lon);
              const color = starColor(s);
              return (
                <g key={s.key}>
                  <text x={x} y={y - 5} textAnchor="middle" dominantBaseline="central"
                    fontSize={11} fill={color} fontWeight={700}>
                    {s.kind === "zheng" ? s.symbol : s.name}
                  </text>
                  <text x={x} y={y + 6} textAnchor="middle" dominantBaseline="central"
                    fontSize={7.5} fill="#c9d4ee">
                    {s.name}
                  </text>
                  {s.retrograde && (
                    <text x={x} y={y + 15} textAnchor="middle" fontSize={7} fill="#ff8a80">逆</text>
                  )}
                </g>
              );
            })}
            {/* 天心十字 */}
            <line x1={C} y1={C - 93} x2={C} y2={C + 93} stroke="rgba(232,201,106,0.4)" strokeWidth={0.8} />
            <line x1={C - 93} y1={C} x2={C + 93} y2={C} stroke="rgba(232,201,106,0.4)" strokeWidth={0.8} />
            {/* 命度 / 身度标记（跨十二人事宫环外缘，v25.0.84 P1-3 收于 viewBox 内） */}
            <g>
              <line x1={px(R_RENSHI_IN, result.mingDu.lon)[0]} y1={px(R_RENSHI_IN, result.mingDu.lon)[1]}
                x2={px(R_RENSHI_OUT, result.mingDu.lon)[0]} y2={px(R_RENSHI_OUT, result.mingDu.lon)[1]}
                stroke="#e53935" strokeWidth={2} />
              <circle cx={px(175, result.mingDu.lon)[0]} cy={px(175, result.mingDu.lon)[1]} r={3} fill="#e53935" />
            </g>
            <g>
              <line x1={px(R_RENSHI_IN, result.shenDu.lon)[0]} y1={px(R_RENSHI_IN, result.shenDu.lon)[1]}
                x2={px(R_RENSHI_OUT, result.shenDu.lon)[0]} y2={px(R_RENSHI_OUT, result.shenDu.lon)[1]}
                stroke="#4fc3f7" strokeWidth={2} />
              <circle cx={px(175, result.shenDu.lon)[0]} cy={px(175, result.shenDu.lon)[1]} r={3} fill="#4fc3f7" />
            </g>
            {/* 第一圈层·命理核心（v25.0.84 P1-3：加命度/身度宿度，提升信息密度） */}
            <circle cx={C} cy={C} r={R_CORE} fill={PAN_DARK} stroke={PAN_LINE} strokeWidth={1} />
            <text x={C} y={C - 13} textAnchor="middle" fontSize={7} fill="#bfa76a">七政四余</text>
            <text x={C} y={C - 3.5} textAnchor="middle" fontSize={8.5} fill={GOLD} fontWeight={700}>{result.mingGong.branch}宫立命</text>
            <text x={C} y={C + 5.5} textAnchor="middle" fontSize={7} fill="#bfa76a">{result.shenGong.branch}宫安身</text>
            <text x={C} y={C + 14} textAnchor="middle" fontSize={5.5} fill="#ff8a80">命度·{result.mingDu.xiuName}{result.mingDu.xiuDegree.toFixed(0)}°</text>
            <text x={C} y={C + 21.5} textAnchor="middle" fontSize={5.5} fill="#81d4fa">身度·{result.shenDu.xiuName}{result.shenDu.xiuDegree.toFixed(0)}°</text>
          </svg>
        </div>
        </div>
        <div className={`mt-1 flex flex-wrap justify-center gap-2 text-[10px] ${chartFull ? "text-gray-300" : "text-gray-500"}`}>
          <span><span className="mr-0.5 inline-block h-2 w-2 rounded-full align-middle" style={{ backgroundColor: "#e53935" }} />命度</span>
          <span><span className="mr-0.5 inline-block h-2 w-2 rounded-full align-middle" style={{ backgroundColor: "#4fc3f7" }} />身度</span>
          <span><span className="mr-0.5 inline-block h-2 w-2 rounded-full align-middle" style={{ backgroundColor: "rgba(123,47,190,0.55)" }} />命宫</span>
          <span><span className="mr-0.5 inline-block h-2 w-2 rounded-full align-middle" style={{ backgroundColor: "rgba(33,150,243,0.5)" }} />身宫</span>
          {liunian && (
            <>
              <span><span className="mr-0.5 inline-block h-2 w-2 rounded-full border align-middle" style={{ borderColor: "#e65100" }} />太岁宫</span>
              <span><span className="mr-0.5 inline-block h-2 w-2 rounded-full border-2 align-middle" style={{ borderColor: "#8a6d3b" }} />流年星</span>
            </>
          )}
          <span>盘面：0° 黄经在上顺时针（今制＝黄道分点起量）</span>
        </div>
        {/* 五行配色图例（v25.0.84 P1-3 H2：七政五行 + 四余分色，由内到外五圈层） */}
        <div className={`mt-1 flex flex-wrap justify-center gap-x-2.5 gap-y-0.5 pb-2 text-[9px] ${chartFull ? "text-gray-300" : "text-gray-500"}`}>
          {([
            ["金", "venus"], ["木", "jupiter"], ["水", "mercury"], ["火", "mars"], ["土", "saturn"],
            ["炁", "qi"], ["罗", "luo"], ["计", "ji"], ["孛", "bei"],
          ] as const).map(([label, key]) => (
            <span key={key} className="inline-flex items-center gap-0.5">
              <span className="inline-block h-2 w-2 rounded-full border border-gray-300 align-middle" style={{ backgroundColor: starColor({ key, wuxing: "" }) }} />{label}
            </span>
          ))}
          <span className="text-gray-400">五圈层：核心→地支→星曜→宿→人事宫</span>
        </div>
        </div>
      </div>

      {/* 感应图层（v25.0.82 P1-1：12 项开关 + 连线绘制，RULE_ID 可追溯） */}
      <div className="mt-2 bg-white px-3 py-3">
        <button
          type="button"
          onClick={() => setLayersOpen((o) => !o)}
          className="flex w-full items-center justify-between active:opacity-70"
        >
          <span className="flex items-center gap-1.5">
            <span className="text-sm font-bold" style={{ color: BRAND }}>感应图层</span>
            <span className="rounded-full bg-[#f5f0fa] px-1.5 py-0.5 text-[9px] text-gray-500">
              已开 {Object.values(layerOn).filter(Boolean).length}/12 · 连线 {activeLayerEntries.length}
            </span>
          </span>
          <span className="text-xs text-gray-400">{layersOpen ? "收起 ▲" : "展开 ▼"}</span>
        </button>
        {layersOpen && (
          <>
            <p className="mt-2 text-[10px] leading-relaxed text-gray-400">
              宫位/度数感应为盘面几何呈现（中性提示）；神煞/化曜分级继承断语引擎。悬停盘面连线可查看规则 ID 与出处。
            </p>
            <div className="mt-2 space-y-2">
              {(["宫位感应", "度数感应", "断语层", "限流层"] as const).map((g) => (
                <div key={g}>
                  <div className="mb-1 text-[10px] text-gray-400">{g}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {LAYER_DEFS.filter((d) => d.group === g).map((d) => {
                      const on = layerOn[d.key];
                      const hits = layerHitCount(d.key);
                      return (
                        <button
                          key={d.key}
                          type="button"
                          onClick={() => {
                            setLayerOn((p) => ({ ...p, [d.key]: !p[d.key] }));
                            trackToolEvent("qizheng", "layer_toggle", { layer: d.key, on: !on });
                          }}
                          className={`flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-medium active:scale-95 ${on ? "text-white" : "text-gray-500"}`}
                          style={on
                            ? { backgroundColor: LAYER_COLORS[d.key], borderColor: LAYER_COLORS[d.key] }
                            : { borderColor: "#e5e0ec" }}
                        >
                          <span
                            className="inline-block h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: on ? "#fff" : LAYER_COLORS[d.key] }}
                          />
                          {d.name}
                          <span className={on ? "opacity-80" : "text-gray-400"}>{hits}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {activeLayerEntries.length > 0 ? (
              <div className="mt-3 divide-y divide-gray-100">
                {activeLayerEntries.map(({ key, line }, i) => (
                  <div key={`${line.ruleId}-${i}`} className="py-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: LAYER_COLORS[key] }} />
                      <span className="flex-1 text-[11px] leading-snug text-gray-700">{line.label}</span>
                      {line.level !== "zhong" && (
                        <span className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-semibold ${DUANYU_LEVEL_META[line.level].badge}`}>
                          {DUANYU_LEVEL_META[line.level].label}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 pl-3 text-[9px] leading-relaxed text-gray-400">{line.ruleId} · {line.source}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-lg bg-[#f5f0fa] p-2.5 text-center text-[11px] text-gray-500">
                未开启任何图层，或本盘当前无命中
              </div>
            )}
            <p className="mt-1.5 text-[9px] text-gray-400">图层引擎：{layers?.engineVersion}</p>
          </>
        )}
      </div>

      {/* 流年模式（v25.0.83 P1-2：年份选择/原流相并/太岁/流年神煞化曜） */}
      <div className="mt-2 bg-white px-3 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold" style={{ color: BRAND }}>流年模式</span>
          <button
            type="button"
            onClick={() => {
              const next = !liunianOn;
              setLiunianOn(next);
              trackToolEvent("qizheng", "liunian_used", { year: liunianYear, on: next });
            }}
            className="rounded-full border px-3 py-1 text-[11px] font-medium active:scale-95"
            style={liunianOn
              ? { backgroundColor: BRAND, borderColor: BRAND, color: "#fff" }
              : { borderColor: "#d9c7ee", color: BRAND }}
          >
            {liunianOn ? "关闭流年" : "开启流年"}
          </button>
        </div>
        {liunianOn && liunian && (
          <>
            {/* 年份选择 */}
            <div className="mt-2 flex items-center gap-2">
              <div className="flex items-center rounded-full border border-gray-200">
                <button
                  type="button"
                  onClick={() => setLiunianYear((y) => Math.max(1900, y - 1))}
                  className="h-7 w-7 rounded-full text-sm text-gray-500 active:bg-gray-100"
                >
                  −
                </button>
                <input
                  type="number"
                  min={1900}
                  max={2100}
                  value={liunianYear}
                  onChange={(e) => {
                    const v = Math.floor(Number(e.target.value));
                    if (!Number.isNaN(v) && v >= 1900 && v <= 2100) setLiunianYear(v);
                  }}
                  className="w-14 bg-transparent text-center text-sm font-semibold text-gray-800 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setLiunianYear((y) => Math.min(2100, y + 1))}
                  className="h-7 w-7 rounded-full text-sm text-gray-500 active:bg-gray-100"
                >
                  ＋
                </button>
              </div>
              <div className="flex-1 text-[11px] leading-tight text-gray-600">
                <span className="font-semibold">{liunian.ganzhi.gan}{liunian.ganzhi.zhi}年</span>
                <span className="text-gray-400">（立春{liunian.lichun.month}月{liunian.lichun.day}日交节，当日午正天象落本命盘）</span>
              </div>
            </div>
            {/* 太岁 */}
            <div className={`mt-2 rounded-lg border p-2.5 ${liunian.taiSui.zuoMing || liunian.taiSui.chongMing ? "border-amber-200 bg-amber-50" : "border-gray-100 bg-[#faf7f0]"}`}>
              <div className="text-[11px] leading-relaxed text-gray-700">
                <span className="font-semibold" style={{ color: "#e65100" }}>太岁</span>
                ：{liunian.taiSui.text}
              </div>
              <p className="mt-0.5 text-[9px] text-gray-400">{liunian.taiSui.source}</p>
            </div>
            {/* 流年顶星 */}
            {liunian.dingXing.length > 0 && (
              <div className="mt-2 rounded-lg border border-cyan-100 bg-cyan-50/60 p-2.5">
                <div className="text-[11px] leading-relaxed text-gray-700">
                  <span className="font-semibold text-cyan-700">流年顶星</span>
                  ：{liunian.dingXing.map((d) => `${d.starName}钓命度（差${d.diffDeg.toFixed(2)}°）`).join("、")}
                </div>
                <p className="mt-0.5 text-[9px] text-gray-400">{liunian.dingXing[0].source}</p>
              </div>
            )}
            {/* 流年神煞 */}
            <div className="mt-2">
              <div className="mb-1 text-[10px] text-gray-400">流年神煞（流年{liunian.ganzhi.gan}{liunian.ganzhi.zhi}干支起，落本命盘宫）</div>
              <div className="flex flex-wrap gap-1.5">
                {liunian.shensha.map((s) => (
                  <span
                    key={s.id}
                    title={`${s.text}（${s.source}）`}
                    className={`rounded-full border px-2 py-0.5 text-[10px] ${
                      s.onMing || s.onShen || s.chongMing
                        ? "border-red-200 bg-red-50 font-semibold text-red-600"
                        : s.level === "ji"
                          ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                          : "border-gray-200 bg-gray-50 text-gray-500"
                    }`}
                  >
                    {s.name}·{s.branch}宫
                    {s.onMing ? "（坐命）" : s.onShen ? "（坐身）" : s.chongMing ? "（冲命）" : ""}
                  </span>
                ))}
              </div>
              <p className="mt-1 text-[9px] text-gray-400">悬停查看煞义与出处；坐命/坐身/冲命之煞红色高亮（提示口径，非绝对断言）</p>
            </div>
            {/* 流年化曜 */}
            <div className="mt-2">
              <div className="mb-1 text-[10px] text-gray-400">流年化曜（流年{liunian.ganzhi.gan}干起，卷一§1.6 十干化曜）</div>
              <div className="flex flex-wrap gap-1.5">
                {liunian.huayao.map((h) => (
                  <span
                    key={h.huaName}
                    className={`rounded-full border px-2 py-0.5 text-[10px] ${
                      h.onMing || h.onShen
                        ? "border-amber-200 bg-amber-50 font-semibold text-amber-700"
                        : h.level === "ji"
                          ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                          : h.level === "xiong"
                            ? "border-red-100 bg-red-50 text-red-600"
                            : "border-gray-200 bg-gray-50 text-gray-500"
                    }`}
                  >
                    {h.huaName}={h.starName}·{h.palaceBranch}宫{h.onMing ? "（坐命）" : h.onShen ? "（坐身）" : ""}
                  </span>
                ))}
              </div>
            </div>
            {/* 原流相并 */}
            <div className="mt-3">
              <div className="mb-1.5 text-[10px] text-gray-400">原流相并（本命盘 → 流年盘，十一曜对照）</div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-gray-500">
                      <th className="py-1 text-left font-medium">星曜</th>
                      <th className="py-1 text-left font-medium">本命</th>
                      <th className="py-1 text-left font-medium">流年</th>
                      <th className="py-1 text-left font-medium">移度</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liunian.stars.map((s) => (
                      <tr key={s.key} className={`border-t border-gray-50 ${s.dingMingDu ? "bg-cyan-50/50" : ""}`}>
                        <td className="py-1">
                          <span className="inline-block h-2 w-2 rounded-full border border-gray-300 align-middle" style={{ backgroundColor: starColor(s) }} />{" "}
                          <span className="font-semibold">{s.name}</span>
                        </td>
                        <td className="py-1 tabular-nums">{s.benmingPalaceBranch}宫 · {s.benmingXiu}</td>
                        <td className="py-1 tabular-nums">{s.palaceBranch}宫{s.palaceDegree.toFixed(1)}° · {s.xiuFullName}{s.xiuDegree.toFixed(1)}°</td>
                        <td className="py-1 tabular-nums">
                          {s.moveDeg.toFixed(1)}°
                          {s.dingMingDu && <span className="ml-1 rounded bg-cyan-100 px-1 py-0.5 text-[9px] text-cyan-700">顶命度</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-1 text-[9px] text-gray-400">移度＝流年星与本命星黄经环形最短差（逆行者以负向计）</p>
            </div>
            <p className="mt-2 text-[9px] text-gray-400">
              流年引擎：{liunian.engineVersion} · 小限/划度/月限暂无知识库算法依据，挂起待源不造假
            </p>
          </>
        )}
        {liunianOn && !liunian && (
          <div className="mt-2 rounded-lg bg-[#f5f0fa] p-2.5 text-center text-[11px] text-gray-500">
            流年计算异常，请检查年份
          </div>
        )}
      </div>

      {/* 命身要略 */}
      <div className="mt-2 bg-white px-3 py-3">
        <div className="mb-2 text-sm font-bold" style={{ color: BRAND }}>命身要略</div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-[#f5f0fa] p-2.5">
            <div className="text-[10px] text-gray-500">命宫 / 命度</div>
            <div className="mt-0.5 text-sm font-bold text-gray-800">{result.mingGong.branch}宫 · {result.mingDu.xiuFullName}{result.mingDu.xiuDegree.toFixed(1)}°</div>
            <div className="mt-0.5 text-[11px] text-gray-600">命度主：{result.mingDuZhu}｜命元：{result.mingYuanWuxing}</div>
          </div>
          <div className="rounded-lg bg-[#eff6fd] p-2.5">
            <div className="text-[10px] text-gray-500">身宫 / 身度</div>
            <div className="mt-0.5 text-sm font-bold text-gray-800">{result.shenGong.branch}宫 · {result.shenDu.xiuFullName}{result.shenDu.xiuDegree.toFixed(1)}°</div>
            <div className="mt-0.5 text-[11px] text-gray-600">身度主：{result.shenDuZhu}</div>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-gray-100 p-2">
            <span className="text-gray-500">太阳：</span><span className="font-semibold">{sun ? `${sun.palaceBranch}宫${sun.palaceDegree.toFixed(1)}° ${sun.xiuFullName}${sun.xiuDegree.toFixed(1)}°` : "--"}</span>
          </div>
          <div className="rounded-lg border border-gray-100 p-2">
            <span className="text-gray-500">太阴：</span><span className="font-semibold">{moon ? `${moon.palaceBranch}宫${moon.palaceDegree.toFixed(1)}° ${moon.xiuFullName}${moon.xiuDegree.toFixed(1)}°` : "--"}</span>
          </div>
        </div>
      </div>

      {/* 十一曜明细 */}
      <div className="mt-2 bg-white px-3 py-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-bold" style={{ color: BRAND }}>十一曜宫度（七政四余）</span>
          <span className="text-[10px] text-gray-400">化曜：{duanyu?.yearGanzhi.gan ?? "--"}干起（卷一§1.6）</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-gray-500">
                <th className="py-1.5 text-left font-medium">星曜</th>
                <th className="py-1.5 text-left font-medium">宫/度</th>
                <th className="py-1.5 text-left font-medium">宿度</th>
                <th className="py-1.5 text-left font-medium">人事宫</th>
                <th className="py-1.5 text-left font-medium">化曜</th>
                <th className="py-1.5 text-left font-medium">状态</th>
              </tr>
            </thead>
            <tbody>
              {result.stars.map((s) => (
                <tr key={s.key} className="border-t border-gray-50">
                  <td className="py-1.5">
                    <span className="inline-block h-2 w-2 rounded-full border border-gray-300 align-middle" style={{ backgroundColor: starColor(s) }} />{" "}
                    <span className="font-semibold">{s.name}</span>
                    <span className="ml-0.5 text-[9px] text-gray-400">{s.wuxing}</span>
                  </td>
                  <td className="py-1.5 tabular-nums">{s.palaceBranch}宫{s.palaceDegree.toFixed(1)}°</td>
                  <td className="py-1.5 tabular-nums">{s.xiuName}{s.xiuDegree.toFixed(1)}°</td>
                  <td className="py-1.5">{s.renshiGong}</td>
                  <td className="py-1.5">
                    {(hyMap[s.key] ?? []).length > 0 ? (
                      <span className="font-medium" style={{ color: BRAND }}>{(hyMap[s.key] ?? []).join("、")}</span>
                    ) : (
                      <span className="text-gray-300">--</span>
                    )}
                  </td>
                  <td className="py-1.5">
                    <span className={s.retrograde ? "text-red-500" : "text-gray-400"}>{s.retrograde ? "逆" : "顺"}</span>
                    {s.inYuan && <span className="ml-1 rounded bg-amber-100 px-1 py-0.5 text-[9px] text-amber-700">入垣</span>}
                    {s.shengDian && <span className="ml-1 rounded bg-emerald-100 px-1 py-0.5 text-[9px] text-emerald-700">升殿</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-1.5 text-[10px] text-gray-400">
          入垣＝星居宫主之宫；升殿＝星居宿主之宿；化曜＝年干起十干化曜（天禄…天权），一星可兼多化曜。迟速：{result.stars.map((s) => `${s.name}${s.retrograde ? "逆" : "顺"}`).slice(0, 11).join("、")}
        </p>
      </div>

      {/* 洞微大限 */}
      <div className="mt-2 bg-white px-3 py-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-bold" style={{ color: BRAND }}>洞微大限</span>
          <span className="text-[11px] text-gray-500">童限 {result.dongwei.startBase} 岁起 · 出限 {result.dongwei.chuxianText}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-gray-500">
                <th className="py-1.5 text-left font-medium">人事宫</th>
                <th className="py-1.5 text-left font-medium">限宫</th>
                <th className="py-1.5 text-left font-medium">虚岁</th>
                <th className="py-1.5 text-left font-medium">管限</th>
              </tr>
            </thead>
            <tbody>
              {result.dongwei.rows.map((r, i) => (
                <tr key={i} className={`border-t border-gray-50 ${r.isTongxian ? "bg-amber-50/50" : ""}`}>
                  <td className="py-1.5">{r.renshiGong}{r.isTongxian && <span className="ml-1 text-[9px] text-amber-700">童限</span>}</td>
                  <td className="py-1.5">{r.palaceBranch}宫</td>
                  <td className="py-1.5 tabular-nums">{r.startAge}-{Math.ceil(r.endAge) - 1}岁</td>
                  <td className="py-1.5 tabular-nums">{r.years}年</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* 行限查询 */}
        <div className="mt-3 rounded-lg bg-[#f5f0fa] p-3">
          <div className="mb-2 text-xs font-medium text-gray-700">行限查询（输入虚岁）</div>
          <div className="flex items-center gap-2">
            <input
              type="number" min={1} max={120} placeholder="如 36"
              value={xianAge}
              onChange={(e) => setXianAge(e.target.value === "" ? "" : Math.floor(Number(e.target.value)))}
              className="w-24 rounded-lg border border-gray-200 px-3 py-1.5 text-center text-sm outline-none focus:border-[#7B2FBE]"
            />
            <div className="flex-1 text-[11px] leading-relaxed">
              {xianAge === "" ? (
                <span className="text-gray-400">查询该岁所在大限与行限度</span>
              ) : xian ? (
                <>
                  <span className="text-gray-600">{xian.row.renshiGong}限（{xian.row.palaceBranch}宫，{xian.row.startAge}-{Math.ceil(xian.row.endAge) - 1}岁）</span>
                  <br />
                  <span className="font-semibold" style={{ color: BRAND }}>行限 {xian.xiuFullName}{xian.xiuDegree.toFixed(1)}°</span>
                </>
              ) : (
                <span className="text-gray-400">虚岁超出行限范围</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 断语解读（v25.0.71 果老星宗八卷知识库，受后台七项开关管控） */}
      {duanyu && (duanyuMasterOn || duanyuMasterMaint) && (
        <div className="mt-2 bg-white px-3 py-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-bold" style={{ color: BRAND }}>断语解读（果老星宗）</span>
            <span className="flex items-center gap-2">
              {duanyuMasterOn && (
                <span className="text-[10px] text-gray-500">
                  {duanyu.yearGanzhi.gan}{duanyu.yearGanzhi.zhi}年 · 共{duanyuSummary.total}条
                </span>
              )}
              {/* v25.0.72：跳转易学学习区·七政四余类目（八卷135知识点+141题，可追溯出处） */}
              <Link
                href="/academy/learn?track=yixue&category=%E4%B8%83%E6%94%BF%E5%9B%9B%E4%BD%99"
                className="rounded-full border px-2 py-0.5 text-[10px] active:opacity-70"
                style={{ borderColor: BRAND + "44", color: BRAND }}
              >
                查看学习资料
              </Link>
            </span>
          </div>
          {duanyuMasterMaint ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center text-xs text-amber-700">
              断语功能维护中，稍后再试（后台开关：MAINTENANCE）
            </div>
          ) : visibleDySections.length === 0 ? (
            <div className="rounded-lg bg-[#f5f0fa] p-3 text-center text-xs text-gray-500">
              本盘暂无命中的可见断语
            </div>
          ) : (
            <>
              <div className="mb-2 flex flex-wrap gap-2 text-[10px]">
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">吉 {duanyuSummary.ji}</span>
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-600">凶 {duanyuSummary.xiong}</span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-500">中性 {duanyuSummary.zhong}</span>
                <span className="text-gray-400">分级为古籍通行口径提示，非绝对祸福断言</span>
              </div>
              <div className="divide-y divide-gray-100">
                {visibleDySections.map((sec) => {
                  const open = dyOpenSections.has(sec.key);
                  return (
                    <div key={sec.key} className="py-1">
                      <button
                        type="button"
                        onClick={() => toggleDySection(sec.key)}
                        className="flex w-full items-center justify-between py-2 text-left active:opacity-70"
                      >
                        <span className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-gray-800">{sec.name}</span>
                          <span className="rounded-full bg-[#f5f0fa] px-1.5 py-0.5 text-[9px] text-gray-500">{sec.items.length}</span>
                        </span>
                        <span className="text-xs text-gray-400">{open ? "收起 ▲" : "展开 ▼"}</span>
                      </button>
                      {open && (
                        <div className="space-y-2 pb-2">
                          <p className="text-[10px] leading-relaxed text-gray-400">{sec.desc}</p>
                          {sec.items.map((it) => {
                            const meta = DUANYU_LEVEL_META[it.level];
                            return (
                              <div key={it.id} className="rounded-lg border border-gray-100 p-2.5">
                                <div className="flex items-center gap-1.5">
                                  <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${meta.badge}`}>{meta.label}</span>
                                  <span className="text-xs font-semibold text-gray-800">{it.title}</span>
                                </div>
                                <p className="mt-1.5 text-[11px] leading-relaxed text-gray-600">{it.text}</p>
                                {it.verse && (
                                  <p className="mt-1.5 rounded bg-[#faf6ec] p-2 text-[10px] leading-relaxed text-[#8a6d3b]">
                                    「{it.verse}」
                                  </p>
                                )}
                                <p className="mt-1.5 text-[9px] text-gray-400">出处：{it.source}</p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
          <p className="mt-1.5 text-[9px] text-gray-400">
            断语引擎：{DUANYU_ENGINE_VERSION} · 逐条标注知识库卷节出处，仅供传统文化学习参考
          </p>
        </div>
      )}

      {/* AI 解读 */}
      <div className="mt-2 bg-white px-3 py-3">
        <AIInterpretButton
          toolName="七政四余"
          scope="整体解读"
          contextData={aiContext}
          buttonText="AI 解读星盘"
        />
      </div>

      {/* 客户记录 */}
      <div className="mt-2 bg-white px-3 py-3">
        <div className="mb-2 text-xs text-gray-500">客户排盘记录（可选）</div>
        <ClientSelector selectedClient={selectedClient} onSelect={setSelectedClient} />
        <button
          onClick={() => {
            if (!selectedClient) { showToast("请先选择客户"); return; }
            if (!lastInput) { showToast("无排盘数据"); return; }
            try {
              saveRecord({
                clientId: selectedClient.id, type: "qizheng",
                data: {
                  input: lastInput,
                  star_system: result.frame,
                  calculation_profile: {
                    ming_mode: result.input.mingGongMode,
                    dongwei_start: result.dongwei.startBase,
                    zhen_ta: true,
                    dst: dstInfo != null,
                  },
                  algorithm_version: result.engineVersion,
                  mingGong: result.mingGong.branch, shenGong: result.shenGong.branch,
                  mingDu: `${result.mingDu.xiuFullName}${result.mingDu.xiuDegree.toFixed(1)}°`,
                  chuxian: result.dongwei.chuxianText },
                note: "", status: "pending",
              });
              trackToolEvent("qizheng", "tool_save");
              setSavedCount((c) => c + 1);
              showToast("排盘记录已保存到客户档案");
            } catch { showToast("保存失败，请重试"); }
          }}
          disabled={!selectedClient}
          className="mt-2 w-full rounded-full border py-2.5 text-sm font-semibold active:scale-[0.98] disabled:opacity-40"
          style={{ borderColor: "#d9c7ee", color: BRAND, backgroundColor: "#f5f0fa" }}
        >
          保存排盘到客户档案{savedCount > 0 ? `（已存 ${savedCount} 条）` : ""}
        </button>
      </div>

      {/* 分享 */}
      <div className="px-3 py-2">
        <ShareButton
          type="tool"
          title="七政四余排盘结果"
          description="七政四余星命排盘"
          variant="block"
          label="分享排盘结果"
          onShared={() => trackToolEvent("qizheng", "tool_share")}
          shareData={{
            toolType: "qizheng",
            title: `七政四余：${result.mingGong.branch}宫立命 · ${result.mingDu.xiuFullName}`,
            summary: `${frameText} · 命宫${result.mingGong.branch} · 身宫${result.shenGong.branch}`,
            payload: {
              summaryLines: [
                `出生：${birthText}（${result.input.placeName}）`,
                `真太阳时：${result.trueSolar.trueSolarTime}｜时辰：${result.hour.name}`,
                `星制：${frameText}｜命宫定法：${result.input.mingGongMode === "sunrise" ? "日出定命" : "遇卯安命"}`,
                `命宫：${result.mingGong.branch}宫｜命度：${result.mingDu.xiuFullName}${result.mingDu.xiuDegree.toFixed(1)}°｜命度主：${result.mingDuZhu}`,
                `身宫：${result.shenGong.branch}宫｜身度：${result.shenDu.xiuFullName}${result.shenDu.xiuDegree.toFixed(1)}°｜身度主：${result.shenDuZhu}`,
                `命元五行：${result.mingYuanWuxing}`,
                `太阳：${sun ? `${sun.palaceBranch}宫${sun.palaceDegree.toFixed(1)}°` : "--"}｜太阴：${moon ? `${moon.palaceBranch}宫${moon.palaceDegree.toFixed(1)}°` : "--"}`,
                `洞微大限：童限${result.dongwei.startBase}岁起，出限${result.dongwei.chuxianText}`,
                `引擎：${QIZHENG_ENGINE_VERSION}`,
              ],
            },
          }}
        />
      </div>

      {/* 免责声明 */}
      <div className="mx-3 mt-2 rounded-lg border border-red-100 bg-red-50/50 p-3">
        <p className="text-xs leading-relaxed text-gray-500">
          <strong>免责声明：</strong>本页面内容仅供传统文化学习与参考，不构成任何人生决策建议。星盘基于天文历算引擎（MIT 协议）计算，四余（炁罗计孛）为古典虚拟曜口径。
        </p>
        <p className="mt-1 text-[10px] text-gray-400">引擎：{QIZHENG_ENGINE_VERSION}</p>
      </div>
      <div style={{ height: "20px" }} />

      {/* 重排弹窗 */}
      <DatePicker
        show={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleSubmit}
        submitText="重新排盘"
        title="七政四余排盘"
        showXiaLing
        initialDate={lastInput ? { year: lastInput.year, month: lastInput.month, day: lastInput.day, hour: lastInput.hour, minute: lastInput.minute } : undefined}
        extraOptions={
          <div className="mt-3 space-y-3">
            <div>
              <div className="mb-1.5 text-xs text-gray-500">出生地点（省/市/区县三级）</div>
              <SharedBirthLocationSelector
                lng={region.lng}
                indices={regionIdx}
                onIndicesChange={setRegionIdx}
                label="出生地"
                showQuickCities={false}
              />
            </div>
            <div className="flex rounded-full border border-gray-200 p-0.5">
              {([["tropical", "今制"], ["sidereal", "恒星制"]] as Array<[StarFrame, string]>).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setFrame(k)}
                  className={`flex-1 rounded-full py-1.5 text-xs font-medium ${frame === k ? "text-white" : "text-gray-500"}`}
                  style={frame === k ? { backgroundColor: BRAND } : {}}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {/* v25.0.84 P1-5：高清导出配置面板（可配置字段 + 隐私隐藏） */}
      {exportOpen && (
        <div className="fixed inset-0 z-[80] flex items-end bg-black/40" onClick={() => setExportOpen(false)}>
          <div
            className="mx-auto w-full rounded-t-2xl bg-white px-4 pb-5 pt-4"
            style={{ maxWidth: "420px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold" style={{ color: BRAND }}>导出星盘（高清 PNG）</span>
              <button type="button" onClick={() => setExportOpen(false)}
                className="h-6 w-6 rounded-full bg-gray-100 text-xs text-gray-500 active:scale-95">✕</button>
            </div>
            <p className="mt-1 text-[10px] text-gray-400">矢量栅格化导出：星盘为当前盘面状态（含已开图层/流年标记，所见即所得）</p>
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
              {([
                ["title", "标题（含姓名）"],
                ["birth", "出生时间/地点"],
                ["trueSolar", "真太阳时/时辰"],
                ["profile", "星制/命宫/童限"],
                ["yaolue", "命身要略"],
                ["detail", "十一曜明细表"],
                ["version", "引擎版本水印"],
              ] as Array<[keyof typeof exportCfg, string]>).map(([k, label]) => (
                <label key={k} className="flex items-center gap-1.5 text-[11px] text-gray-600">
                  <input
                    type="checkbox"
                    checked={exportCfg[k]}
                    onChange={(e) => setExportCfg((c) => ({ ...c, [k]: e.target.checked }))}
                    className="h-3.5 w-3.5 accent-[#7B2FBE]"
                  />
                  {label}
                </label>
              ))}
            </div>
            <label className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] font-medium text-amber-800">
              <input
                type="checkbox"
                checked={exportCfg.privacy}
                onChange={(e) => setExportCfg((c) => ({ ...c, privacy: e.target.checked }))}
                className="h-3.5 w-3.5 accent-amber-600"
              />
              隐私模式（隐藏姓名、出生时间与地点）
            </label>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[11px] text-gray-500">清晰度</span>
              <div className="flex rounded-full border border-gray-200 p-0.5">
                {([[false, "标准 1080"], [true, "高清 1440"]] as Array<[boolean, string]>).map(([k, label]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setExportHd(k)}
                    className={`rounded-full px-3 py-1 text-[11px] font-medium ${exportHd === k ? "text-white" : "text-gray-500"}`}
                    style={exportHd === k ? { backgroundColor: BRAND } : {}}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setExportOpen(false); void exportChartPng(); }}
              disabled={exportBusy}
              className="mt-4 w-full rounded-full py-2.5 text-sm font-bold text-white active:scale-[0.98] disabled:opacity-50"
              style={{ backgroundColor: BRAND }}
            >
              {exportBusy ? "导出中…" : "导出 PNG"}
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed left-1/2 top-16 z-50 -translate-x-1/2 rounded-full bg-black/80 px-4 py-2 text-xs text-white">{toast}</div>
      )}
    </div>
  );
}
