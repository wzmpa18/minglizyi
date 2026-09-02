"use client";

// 立极尺工具页 - NICHE-TOOLS-08 v25.0.69
// ============================================================================
// 功能：户型图导入（相册/相机，EXIF 方向自适应+降采样防 OOM）、透明罗盘叠加
//       （简易盘与专业门派盘可切换，专业盘与电子罗盘共用 LUOPAN_PROFILE_ENGINE
//       圈层体系：三合/三元/玄空 Profile + 圈层可见性开关）、立极点点选/拖动、
//       盘面拖动/缩放/旋转/锁定、±0.1°±1° 精调、参考向线对齐（R = D − H）、
//       一键居中、透明度滑杆、点测山向判读、高清导出、本地工程保存、统一分享。
// 隐私：户型图全程本地处理（§72），分享仅文本结果，不上传图纸（§73）。
// 协议：几何换算全部走 liji 引擎层；山向判读复用 compass 口径；本页不输出吉凶断语。
// ============================================================================

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CompassDial } from "@/components/CompassDial";
import { LuopanDial } from "@/components/LuopanDial";
import { ShareButton } from "@/components/ShareButton";
import { captureDomToDataUrl } from "@/lib/posterCapture";
import { saveDataUrl } from "@/lib/saveImage";
import { saveRecord } from "@/lib/clientStore";
import type { Client } from "@/lib/clientStore";
import ClientSelector from "@/components/ClientSelector";
import { trackToolEvent } from "@/lib/toolAnalytics";
import {
  LIJI_ENGINE_VERSION,
  angleFromCenter,
  diagonalCenter,
  distFromCenter,
  rotationForFacing,
  screenToHeading,
} from "@/algorithm-core/modules/liji";
import {
  COMPASS_ENGINE_VERSION,
  SHAN_24,
  buildCompassReading,
} from "@/algorithm-core/modules/compass";
import type { CompassReadingResult } from "@/algorithm-core/modules/compass";
import {
  LUOPAN_PROFILE_ENGINE_VERSION,
  SCHOOL_OPTIONS,
  getProfile,
  type LuopanSchool,
} from "@/algorithm-core/modules/luopan-profile";

const BRAND = "#B8860B";
const PROJECT_KEY = "yandao_liji_project_v1";

const MemoDial = memo(function MemoDial({
  heading,
  size,
  variant,
}: {
  heading: number;
  size: number;
  variant: "simple" | "full";
}) {
  return (
    <CompassDial
      heading={heading}
      shanReading={null}
      northMode="magnetic"
      interference="unknown"
      size={size}
      overlay
      variant={variant}
    />
  );
});

/** 专业门派盘叠加（与电子罗盘共用 LUOPAN_PROFILE_ENGINE 圈层体系） */
const MemoProDial = memo(function MemoProDial({
  heading,
  size,
  school,
  hiddenRings,
}: {
  heading: number;
  size: number;
  school: LuopanSchool;
  hiddenRings: string[];
}) {
  const profile = useMemo(() => getProfile(school), [school]);
  const visibleRingIds = useMemo(() => {
    const hidden = new Set(hiddenRings);
    return new Set(profile.rings.filter((r) => !hidden.has(r.id)).map((r) => r.id));
  }, [profile, hiddenRings]);
  return (
    <LuopanDial
      profile={profile}
      heading={heading}
      visibleRingIds={visibleRingIds}
      size={size}
      overlay
    />
  );
});

type ClickMode = "none" | "center" | "facing" | "measure";

interface ProjectSnapshot {
  imgSrc: string;
  fitW: number;
  fitH: number;
  center: { x: number; y: number };
  dial: { x: number; y: number };
  dialSize: number;
  rotation: number;
  opacity: number;
  variant: "simple" | "full";
  /** 专业盘门派（v25.0.69 起保存；旧工程缺省为三合） */
  school?: LuopanSchool;
  /** 专业盘隐藏圈层 id（v25.0.69 起保存） */
  hiddenRings?: string[];
  facingPoint: { x: number; y: number } | null;
  facingShan: string;
  savedAt: string;
}

type Gesture =
  | { type: "idle" }
  | { type: "pan"; startPanX: number; startPanY: number; startX: number; startY: number; moved: number }
  | { type: "dial"; startFitX: number; startFitY: number; dialX: number; dialY: number; moved: number }
  | { type: "center"; startFitX: number; startFitY: number; cx: number; cy: number; moved: number }
  | {
      type: "pinch";
      dist: number;
      midX: number;
      midY: number;
      zoom: number;
      panX: number;
      panY: number;
    };

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** 文件 → EXIF 方向自适应 + 降采样 JPEG dataURL（防大图 OOM） */
async function fileToPlanDataUrl(file: File): Promise<{ dataUrl: string; w: number; h: number }> {
  const MAX_DIM = 1600;
  let w = 0;
  let h = 0;
  let src: CanvasImageSource;
  let revoke: string | null = null;

  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    w = bmp.width;
    h = bmp.height;
    src = bmp;
  } catch {
    const url = URL.createObjectURL(file);
    revoke = url;
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("图片解码失败"));
      i.src = url;
    });
    w = img.naturalWidth;
    h = img.naturalHeight;
    src = img;
  }

  if (!w || !h) throw new Error("图片尺寸异常");
  const scale = Math.min(1, MAX_DIM / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("画布创建失败");
  ctx.drawImage(src, 0, 0, cw, ch);
  if (revoke) URL.revokeObjectURL(revoke);
  return { dataUrl: canvas.toDataURL("image/jpeg", 0.85), w, h };
}

export default function LijiPage() {
  // 图面状态
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [fitW, setFitW] = useState(394);
  const [fitH, setFitH] = useState(300);
  const [srcW, setSrcW] = useState(0);
  const [srcH, setSrcH] = useState(0);

  // 视图（平移/缩放）
  const [view, setView] = useState({ panX: 0, panY: 0, zoom: 1 });
  const viewRef = useRef(view);
  const applyView = useCallback((next: { panX: number; panY: number; zoom: number }) => {
    viewRef.current = next;
    setView(next);
  }, []);

  // 立极点 / 罗盘叠加
  const [center, setCenter] = useState({ x: 197, y: 150 });
  const [dial, setDial] = useState({ x: 197, y: 150 });
  const [dialSize, setDialSize] = useState(240);
  const [rotation, setRotation] = useState(0);
  const [opacity, setOpacity] = useState(0.75);
  const [variant, setVariant] = useState<"simple" | "full">("full");
  const [locked, setLocked] = useState(false);
  const [clickMode, setClickMode] = useState<ClickMode>("none");

  // 专业盘：门派 Profile + 圈层可见性（与电子罗盘同引擎同口径）
  const [school, setSchool] = useState<LuopanSchool>("sanhe");
  const [hiddenRings, setHiddenRings] = useState<string[]>([]);
  const [showRingPanel, setShowRingPanel] = useState(false);

  // 对齐参考（向线）
  const [facingPoint, setFacingPoint] = useState<{ x: number; y: number } | null>(null);
  const [facingShan, setFacingShan] = useState("");
  const [measure, setMeasure] = useState<{ x: number; y: number; reading: CompassReadingResult } | null>(null);

  const [toast, setToast] = useState("");
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [hasProject, setHasProject] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const stageWrapRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const exportRootRef = useRef<HTMLDivElement>(null);
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const gesture = useRef<Gesture>({ type: "idle" });

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2400);
  }, []);

  useEffect(() => {
    trackToolEvent("liji", "tool_open");
    try {
      const raw = localStorage.getItem(PROJECT_KEY);
      if (raw) setHasProject(true);
    } catch { /* ignore */ }
    return () => {
      pointers.current.clear();
      gesture.current = { type: "idle" };
    };
  }, []);

  // ============ 图片导入 ============
  const loadPlan = useCallback((dataUrl: string, w: number, h: number) => {
    const areaW = stageWrapRef.current?.clientWidth || 394;
    const fw = areaW;
    const fh = Math.max(1, Math.round((h / w) * fw));
    const c = diagonalCenter(0, 0, fw, fh);
    setImgSrc(dataUrl);
    setSrcW(w);
    setSrcH(h);
    setFitW(fw);
    setFitH(fh);
    setCenter({ x: c.cx, y: c.cy });
    setDial({ x: c.cx, y: c.cy });
    setDialSize(Math.round(Math.min(260, Math.min(fw, fh) * 0.8)));
    setRotation(0);
    setOpacity(0.75);
    setLocked(false);
    setClickMode("center");
    setFacingPoint(null);
    setFacingShan("");
    setMeasure(null);
    applyView({ panX: 0, panY: 0, zoom: 1 });
  }, [applyView]);

  const importFile = useCallback(async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("请选择图片文件（户型图照片/截图）");
      return;
    }
    setImporting(true);
    try {
      const { dataUrl, w, h } = await fileToPlanDataUrl(file);
      loadPlan(dataUrl, w, h);
      trackToolEvent("liji", "image_import", { megapixels: Math.round((w * h) / 1e5) / 10 });
      showToast("户型图已导入，请点击图面设立极点");
    } catch (e) {
      trackToolEvent("liji", "tool_error", { phase: "import" });
      showToast(e instanceof Error ? e.message : "导入失败，请更换图片重试");
    } finally {
      setImporting(false);
    }
  }, [loadPlan, showToast]);

  const onFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    importFile(e.target.files?.[0]);
    e.target.value = "";
  }, [importFile]);

  const saveProject = useCallback(() => {
    if (!imgSrc) return;
    try {
      const snap: ProjectSnapshot = {
        imgSrc, fitW, fitH, center, dial, dialSize, rotation, opacity, variant,
        school, hiddenRings,
        facingPoint, facingShan, savedAt: new Date().toISOString(),
      };
      localStorage.setItem(PROJECT_KEY, JSON.stringify(snap));
      setSavedAt(snap.savedAt);
      setHasProject(true);
      trackToolEvent("liji", "tool_save");
      showToast("工程已保存到本机（图纸不上传服务器）");
    } catch {
      showToast("保存失败：本机存储空间不足");
    }
  }, [imgSrc, fitW, fitH, center, dial, dialSize, rotation, opacity, variant, school, hiddenRings, facingPoint, facingShan, showToast]);

  const restoreProject = useCallback(() => {
    try {
      const raw = localStorage.getItem(PROJECT_KEY);
      if (!raw) { showToast("未找到已保存工程"); return; }
      const p = JSON.parse(raw) as ProjectSnapshot;
      if (!p.imgSrc) { showToast("工程数据损坏，请重新导入"); return; }
      setImgSrc(p.imgSrc);
      setFitW(p.fitW);
      setFitH(p.fitH);
      setCenter(p.center);
      setDial(p.dial);
      setDialSize(p.dialSize);
      setRotation(p.rotation);
      setOpacity(p.opacity);
      setVariant(p.variant);
      if (p.school === "sanhe" || p.school === "sanyuan" || p.school === "xuankong") setSchool(p.school);
      setHiddenRings(Array.isArray(p.hiddenRings) ? p.hiddenRings : []);
      setFacingPoint(p.facingPoint);
      setFacingShan(p.facingShan);
      setMeasure(null);
      setSavedAt(p.savedAt);
      applyView({ panX: 0, panY: 0, zoom: 1 });
      setClickMode("none");
      showToast("已恢复上次工程");
    } catch {
      showToast("恢复失败：工程数据损坏");
    }
  }, [applyView, showToast]);

  // ============ 坐标换算 ============
  const screenToImage = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const rect = containerRef.current?.getBoundingClientRect();
      const v = viewRef.current;
      if (!rect) return { x: 0, y: 0 };
      const cx = fitW / 2;
      const cy = fitH / 2;
      const sx = clientX - rect.left;
      const sy = clientY - rect.top;
      return { x: (sx - cx - v.panX) / v.zoom + cx, y: (sy - cy - v.panY) / v.zoom + cy };
    },
    [fitW, fitH],
  );

  // ============ 指针手势 ============
  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.current.size === 2) {
        const [p1, p2] = [...pointers.current.values()];
        const v = viewRef.current;
        gesture.current = {
          type: "pinch",
          dist: Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1,
          midX: (p1.x + p2.x) / 2,
          midY: (p1.y + p2.y) / 2,
          zoom: v.zoom,
          panX: v.panX,
          panY: v.panY,
        };
        return;
      }

      const fit = screenToImage(e.clientX, e.clientY);
      const onDial =
        clickMode === "none" && !locked &&
        distFromCenter(dial.x, dial.y, fit.x, fit.y) < dialSize / 2;
      const onCenter =
        clickMode === "none" && !locked &&
        distFromCenter(center.x, center.y, fit.x, fit.y) < 26 / viewRef.current.zoom;

      if (onDial) {
        gesture.current = { type: "dial", startFitX: fit.x, startFitY: fit.y, dialX: dial.x, dialY: dial.y, moved: 0 };
      } else if (onCenter) {
        gesture.current = { type: "center", startFitX: fit.x, startFitY: fit.y, cx: center.x, cy: center.y, moved: 0 };
      } else if (clickMode === "none") {
        gesture.current = { type: "pan", startPanX: viewRef.current.panX, startPanY: viewRef.current.panY, startX: e.clientX, startY: e.clientY, moved: 0 };
      } else {
        gesture.current = { type: "idle" };
      }
    },
    [clickMode, locked, dial, dialSize, center, screenToImage],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const pt = pointers.current.get(e.pointerId);
      if (!pt) return;
      pt.x = e.clientX;
      pt.y = e.clientY;
      const g = gesture.current;

      if (g.type === "pinch" && pointers.current.size >= 2) {
        const [p1, p2] = [...pointers.current.values()];
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const newZoom = clamp(g.zoom * (dist / g.dist), 0.4, 8);
          const cx = fitW / 2;
          const cy = fitH / 2;
          const ax = (g.midX - rect.left - cx - g.panX) / g.zoom + cx;
          const ay = (g.midY - rect.top - cy - g.panY) / g.zoom + cy;
          applyView({
            panX: midX - rect.left - ((ax - cx) * newZoom + cx),
            panY: midY - rect.top - ((ay - cy) * newZoom + cy),
            zoom: newZoom,
          });
        }
        return;
      }

      if (g.type === "pan") {
        g.moved += Math.hypot(e.clientX - pt.x, e.clientY - pt.y);
        applyView({
          panX: g.startPanX + (e.clientX - g.startX),
          panY: g.startPanY + (e.clientY - g.startY),
          zoom: viewRef.current.zoom,
        });
      } else if (g.type === "dial") {
        const fit = screenToImage(e.clientX, e.clientY);
        g.moved += 1;
        setDial({ x: g.dialX + (fit.x - g.startFitX), y: g.dialY + (fit.y - g.startFitY) });
      } else if (g.type === "center") {
        const fit = screenToImage(e.clientX, e.clientY);
        g.moved += 1;
        setCenter({ x: g.cx + (fit.x - g.startFitX), y: g.cy + (fit.y - g.startFitY) });
      }
    },
    [applyView, screenToImage, fitW, fitH],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const g = gesture.current;
      const moved = g.type === "pan" ? g.moved : g.type === "idle" ? 0 : g.type === "pinch" ? 999 : g.moved;
      pointers.current.delete(e.pointerId);

      // 点选类操作：位移极小视为点击（拖拽/双指不触发）
      if (pointers.current.size === 0 && moved < 6) {
        const fit = screenToImage(e.clientX, e.clientY);
        if (clickMode === "center") {
          setCenter(fit);
          trackToolEvent("liji", "center_set");
          setClickMode("none");
          showToast("立极点已设定（可拖动十字标记微调）");
        } else if (clickMode === "facing") {
          setFacingPoint(fit);
          showToast("参考向点已标记，请选择该向的罗盘山向后对齐");
        } else if (clickMode === "measure") {
          const phi = angleFromCenter(center.x, center.y, fit.x, fit.y);
          const h = screenToHeading(phi, rotation);
          const reading = buildCompassReading(h, 0, "magnetic");
          setMeasure({ x: fit.x, y: fit.y, reading });
          trackToolEvent("liji", "tool_calculate", { heading: Math.round(h) });
        }
      }
      if (pointers.current.size === 0) gesture.current = { type: "idle" };
    },
    [clickMode, center, rotation, screenToImage, showToast],
  );

  // ============ 对齐 ============
  const D = useMemo(
    () => (facingPoint ? angleFromCenter(center.x, center.y, facingPoint.x, facingPoint.y) : null),
    [facingPoint, center],
  );
  const facingShanEntry = SHAN_24.find((s) => s.name === facingShan) || null;

  const alignDial = useCallback(() => {
    if (D == null || !facingShanEntry) {
      showToast("请先标记参考向点并选择对应山向");
      return;
    }
    const R = rotationForFacing(facingShanEntry.center, D);
    setRotation(R);
    trackToolEvent("liji", "tool_calculate", { aligned: true });
    showToast(`盘面已对齐：旋转角 ${R.toFixed(1)}°`);
  }, [D, facingShanEntry, showToast]);

  const fineRotate = useCallback((delta: number) => {
    setRotation((r) => {
      const next = (r + delta + 360) % 360;
      return Math.round(next * 10) / 10;
    });
  }, []);

  const centerDial = useCallback(() => {
    setDial({ ...center });
    showToast("罗盘已居中于立极点");
  }, [center, showToast]);

  const toggleLock = useCallback(() => {
    setLocked((lk) => {
      trackToolEvent("liji", "overlay_locked", { locked: !lk });
      return !lk;
    });
  }, []);

  // ============ 导出 ============
  const doExport = useCallback(async () => {
    if (!imgSrc || !exportRootRef.current) return;
    setExporting(true);
    try {
      await new Promise((r) => setTimeout(r, 80));
      const dataUrl = await captureDomToDataUrl(exportRootRef.current, 2);
      const res = await saveDataUrl(dataUrl, `yandao_liji_${Date.now()}.png`);
      trackToolEvent("liji", "tool_export");
      showToast(res.message);
    } catch {
      trackToolEvent("liji", "tool_error", { phase: "export" });
      showToast("导出失败，请重试");
    } finally {
      setExporting(false);
    }
  }, [imgSrc, showToast]);

  // ============ 客户记录 ============
  const saveToClient = useCallback(() => {
    if (!selectedClient) { showToast("请先选择客户"); return; }
    if (!imgSrc) { showToast("尚未导入户型图"); return; }
    try {
      saveRecord({
        clientId: selectedClient.id,
        type: "liji",
        data: {
          rotation,
          variant,
          school: variant === "full" ? school : null,
          hiddenRings: variant === "full" ? hiddenRings : [],
          centerRatio: {
            x: Math.round((center.x / fitW) * 1000) / 1000,
            y: Math.round((center.y / fitH) * 1000) / 1000,
          },
          reference: facingPoint && facingShanEntry ? {
            facingShan: facingShanEntry.name,
            screenAngle: D,
            rotation,
          } : null,
          measure: measure ? {
            shan: measure.reading.facing.shan,
            zuoXiang: measure.reading.zuoXiang,
            heading: measure.reading.heading,
          } : null,
          note: "立极尺定向记录（图纸仅本地保存，未上传）",
          measuredAt: new Date().toISOString(),
          engine: `${LIJI_ENGINE_VERSION} / ${variant === "full" ? LUOPAN_PROFILE_ENGINE_VERSION : COMPASS_ENGINE_VERSION}`,
        },
        note: "",
        status: "pending",
      });
      trackToolEvent("liji", "tool_save");
      showToast("定向记录已保存到客户档案");
    } catch {
      showToast("保存失败，请重试");
    }
  }, [selectedClient, imgSrc, rotation, center, fitW, fitH, facingPoint, facingShanEntry, D, measure, showToast]);

  // ============ 渲染几何 ============
  const dialHeading = useMemo(() => ((-rotation % 360) + 360) % 360, [rotation]);
  const northLen = Math.min(fitW, fitH) * 0.46;
  const northEnd = useMemo(() => ({
    x: center.x + northLen * Math.sin((rotation * Math.PI) / 180),
    y: center.y - northLen * Math.cos((rotation * Math.PI) / 180),
  }), [center, northLen, rotation]);

  const measurePhi = measure ? angleFromCenter(center.x, center.y, measure.x, measure.y) : null;

  const modeLabel: Record<ClickMode, string> = {
    none: "自由操作（拖图面/拖罗盘）",
    center: "点击图面设定立极点",
    facing: "点击建筑向方（大门/阳台方向）",
    measure: "点击图面任一点测其山向",
  };

  return (
    <div className="mx-auto w-full bg-[#ededed]" style={{ maxWidth: "420px", minHeight: "100vh" }}>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />

      {/* 引擎徽标 */}
      <div className="flex items-center justify-between bg-white px-3 py-2">
        <div className="text-xs text-gray-500">
          几何层：<span className="font-semibold" style={{ color: BRAND }}>{LIJI_ENGINE_VERSION.split("（")[0]}</span>
        </div>
        <div className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium" style={{ color: BRAND }}>
          户型图本地处理
        </div>
      </div>

      {/* 画布区 */}
      <div ref={stageWrapRef} className="bg-white px-3 pt-3 pb-2">
        <div ref={exportRootRef} className="rounded-xl bg-[#f7f2e7] p-1.5">
          <div
            ref={containerRef}
            className="relative select-none overflow-hidden bg-[#e8e2d2]"
            style={{
              width: imgSrc ? fitW : "100%",
              height: imgSrc ? fitH : 260,
              touchAction: "none",
              cursor: clickMode === "none" ? "grab" : "crosshair",
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {imgSrc ? (
              <div
                className="absolute left-0 top-0"
                style={{
                  width: fitW,
                  height: fitH,
                  transform: `translate(${view.panX}px, ${view.panY}px) scale(${view.zoom})`,
                  transformOrigin: "50% 50%",
                }}
              >
                {/* Layer 1 户型图 */}
                <img
                  src={imgSrc}
                  alt="户型图"
                  draggable={false}
                  style={{ width: fitW, height: fitH, userSelect: "none", pointerEvents: "none" }}
                />

                {/* Layer 4 北线 / 参考向线（SVG，不接事件） */}
                <svg
                  width={fitW}
                  height={fitH}
                  viewBox={`0 0 ${fitW} ${fitH}`}
                  style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}
                >
                  {/* 北线（盘面北位：屏幕角 = R） */}
                  <line
                    x1={center.x} y1={center.y} x2={northEnd.x} y2={northEnd.y}
                    stroke="#2f7bd4" strokeWidth={2} strokeDasharray="7 4" opacity={0.85}
                  />
                  <circle cx={northEnd.x} cy={northEnd.y} r={4} fill="#2f7bd4" />
                  <text
                    x={northEnd.x} y={northEnd.y - 8}
                    textAnchor="middle" fontSize={12} fontWeight={700} fill="#2f7bd4"
                    style={{ paintOrder: "stroke", stroke: "#ffffff", strokeWidth: 3 }}
                  >
                    北
                  </text>

                  {/* 参考向线 */}
                  {facingPoint && (
                    <>
                      <line
                        x1={center.x} y1={center.y} x2={facingPoint.x} y2={facingPoint.y}
                        stroke="#e07820" strokeWidth={2} strokeDasharray="2 3" opacity={0.9}
                      />
                      <circle cx={facingPoint.x} cy={facingPoint.y} r={5} fill="#e07820" />
                      <text
                        x={(center.x + facingPoint.x) / 2}
                        y={(center.y + facingPoint.y) / 2 - 7}
                        textAnchor="middle" fontSize={11} fontWeight={700} fill="#b35c10"
                        style={{ paintOrder: "stroke", stroke: "#ffffff", strokeWidth: 3 }}
                      >
                        {facingShanEntry ? `${facingShanEntry.name}向` : `D ${D?.toFixed(0)}°`}
                      </text>
                    </>
                  )}

                  {/* 点测标记 */}
                  {measure && (
                    <>
                      <circle cx={measure.x} cy={measure.y} r={5.5} fill="none" stroke="#c62828" strokeWidth={2} />
                      <circle cx={measure.x} cy={measure.y} r={1.8} fill="#c62828" />
                      <text
                        x={measure.x} y={measure.y - 9}
                        textAnchor="middle" fontSize={11} fontWeight={700} fill="#c62828"
                        style={{ paintOrder: "stroke", stroke: "#ffffff", strokeWidth: 3 }}
                      >
                        {measure.reading.facing.shan}
                      </text>
                    </>
                  )}
                </svg>

                {/* Layer 3 立极中心标记（可拖动手柄） */}
                <div
                  style={{
                    position: "absolute",
                    left: center.x,
                    top: center.y,
                    width: 44,
                    height: 44,
                    transform: "translate(-50%, -50%)",
                    pointerEvents: "none",
                    opacity: 0.95,
                  }}
                >
                  <svg viewBox="0 0 44 44" width={44} height={44}>
                    <line x1={22} y1={2} x2={22} y2={42} stroke="#c62828" strokeWidth={1.6} />
                    <line x1={2} y1={22} x2={42} y2={22} stroke="#c62828" strokeWidth={1.6} />
                    <circle cx={22} cy={22} r={8} fill="rgba(255,235,238,0.85)" stroke="#c62828" strokeWidth={2} />
                    <circle cx={22} cy={22} r={2.5} fill="#c62828" />
                  </svg>
                </div>

                {/* Layer 2 罗盘叠加（拖动/缩放/旋转/锁定；简易盘或专业门派盘） */}
                <div
                  style={{
                    position: "absolute",
                    left: dial.x,
                    top: dial.y,
                    width: dialSize,
                    height: dialSize,
                    transform: "translate(-50%, -50%)",
                    opacity,
                    pointerEvents: "none",
                    filter: locked ? "drop-shadow(0 0 6px rgba(184,134,11,0.45))" : undefined,
                  }}
                >
                  {variant === "full" ? (
                    <MemoProDial heading={dialHeading} size={dialSize} school={school} hiddenRings={hiddenRings} />
                  ) : (
                    <MemoDial heading={dialHeading} size={dialSize} variant={variant} />
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                <svg viewBox="0 0 64 64" width={56} height={56}>
                  <rect x={6} y={12} width={52} height={44} rx={4} fill="none" stroke="#b9a37a" strokeWidth={2.5} />
                  <path d="M18 34 L27 34 L30 26 L34 40 L37 34 L46 34" fill="none" stroke="#b9a37a" strokeWidth={2.5} strokeLinejoin="round" />
                  <circle cx={32} cy={8} r={3.5} fill="#B8860B" />
                </svg>
                <p className="text-sm font-medium text-gray-600">导入户型图开始立极定向</p>
                <p className="text-[11px] leading-relaxed text-gray-400">
                  支持 JPG/PNG；自动读取拍照方向并压缩，图纸全程在本机处理，不上传服务器
                </p>
                <div className="mt-1 flex w-full max-w-[280px] flex-col gap-2">
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={importing}
                    className="rounded-full py-2.5 text-sm font-semibold text-white active:scale-[0.98] disabled:opacity-50"
                    style={{ backgroundColor: BRAND }}
                  >
                    {importing ? "导入中…" : "从相册导入"}
                  </button>
                  <button
                    onClick={() => camRef.current?.click()}
                    disabled={importing}
                    className="rounded-full border border-amber-200 bg-amber-50 py-2.5 text-sm font-semibold active:scale-[0.98] disabled:opacity-50"
                    style={{ color: BRAND }}
                  >
                    拍照导入
                  </button>
                  {hasProject && (
                    <button
                      onClick={restoreProject}
                      className="rounded-full border border-gray-200 bg-gray-50 py-2 text-xs font-medium text-gray-500 active:scale-[0.98]"
                    >
                      恢复上次保存的工程
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 导出信息条（导出时随图合成） */}
          {imgSrc && exporting && (
            <div className="mt-1 flex items-center justify-between rounded-lg bg-white px-3 py-2">
              <div className="text-[11px] leading-relaxed text-gray-700">
                <div className="font-bold" style={{ color: BRAND }}>言道国学 · 立极尺</div>
                <div>盘旋转角 R = {rotation.toFixed(1)}° · 北线 = 图面上方偏转 {rotation.toFixed(1)}°</div>
                <div>
                  {facingPoint && facingShanEntry
                    ? `参考对齐：${facingShanEntry.name}向（D ${D?.toFixed(1)}°）`
                    : "未设定参考向线"}
                  {measure ? ` · 点测：${measure.reading.zuoXiang}` : ""}
                </div>
                <div className="text-gray-400">
                  {new Date().toLocaleString("zh-CN")} · {LIJI_ENGINE_VERSION.split("（")[0]}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 模式与操作按钮 */}
        {imgSrc && (
          <>
            <div className="mt-2 flex items-center gap-1.5">
              {([
                { m: "center", label: "设立极点" },
                { m: "facing", label: "标向线" },
                { m: "measure", label: "点测山向" },
                { m: "none", label: "自由拖动" },
              ] as Array<{ m: ClickMode; label: string }>).map((b) => (
                <button
                  key={b.m}
                  onClick={() => { setClickMode(b.m); if (b.m === "none") setMeasure(null); }}
                  className={`flex-1 rounded-full py-2 text-xs font-medium transition-all ${
                    clickMode === b.m ? "text-white" : "border border-gray-200 bg-gray-50 text-gray-600"
                  }`}
                  style={clickMode === b.m ? { backgroundColor: BRAND } : {}}
                >
                  {b.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-center text-[10px] text-gray-400">{modeLabel[clickMode]}</p>

            <div className="mt-2 flex items-center gap-1.5">
              <button
                onClick={toggleLock}
                className={`flex-1 rounded-full py-2 text-xs font-semibold ${
                  locked ? "text-white" : "border border-amber-200 bg-amber-50"
                }`}
                style={locked ? { backgroundColor: "#8d6708" } : { color: BRAND }}
              >
                {locked ? "已锁定（点此解锁）" : "锁定罗盘"}
              </button>
              <button
                onClick={centerDial}
                disabled={locked}
                className="flex-1 rounded-full border border-amber-200 bg-amber-50 py-2 text-xs font-semibold active:scale-[0.98] disabled:opacity-40"
                style={{ color: BRAND }}
              >
                一键居中
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="flex-1 rounded-full border border-gray-200 bg-gray-50 py-2 text-xs font-semibold text-gray-600 active:scale-[0.98]"
              >
                换图
              </button>
            </div>
          </>
        )}
      </div>

      {imgSrc && (
        <>
          {/* 旋转角精调 */}
          <div className="mt-2 bg-white px-3 py-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-gray-500">盘面旋转角 R（山向判读 = 屏幕角 − R）</span>
              <span className="text-xs font-bold tabular-nums" style={{ color: BRAND }}>
                {rotation.toFixed(1)}°
              </span>
            </div>
            <input
              type="range" min={0} max={359.9} step={0.1}
              value={rotation}
              disabled={locked}
              onChange={(e) => setRotation(parseFloat(e.target.value))}
              className="w-full accent-[#B8860B] disabled:opacity-40"
            />
            <div className="mt-1 flex justify-between text-[10px] text-gray-400">
              <span>0°</span><span>90°</span><span>180°</span><span>270°</span><span>360°</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              {[-1, -0.1, 0.1, 1].map((d) => (
                <button
                  key={d}
                  onClick={() => fineRotate(d)}
                  disabled={locked}
                  className="flex-1 rounded-full border border-gray-200 bg-gray-50 py-1.5 text-xs font-semibold text-gray-600 active:scale-[0.98] disabled:opacity-40"
                >
                  {d > 0 ? `+${d}°` : `${d}°`}
                </button>
              ))}
              <input
                type="number" min={0} max={359.9} step={0.1}
                value={Math.round(rotation * 10) / 10}
                disabled={locked}
                onChange={(e) => setRotation(clamp(parseFloat(e.target.value) || 0, 0, 359.9))}
                className="w-20 rounded-lg border border-gray-200 px-2 py-1.5 text-center text-xs outline-none focus:border-[#B8860B] disabled:opacity-40"
              />
            </div>
          </div>

          {/* 参考向线对齐 */}
          <div className="mt-2 bg-white px-3 py-3">
            <div className="mb-1 text-sm font-bold" style={{ color: BRAND }}>参考向线对齐（已知向山 → 自动定 R）</div>
            <p className="mb-2 text-[10px] leading-relaxed text-gray-400">
              适用于已知建筑朝向的户型图：先「标向线」点击图中该向（如大门方向），再选其罗盘山向，
              点「对齐盘面」即 R = D − H，图面北位随之标出（蓝色虚线）。
            </p>
            <div className="mb-2 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg bg-amber-50/60 p-2">
                <div className="text-[10px] text-gray-500">图面向线 D</div>
                <div className="mt-0.5 text-sm font-bold text-gray-700">
                  {D != null ? `${D.toFixed(1)}°` : "未标记"}
                </div>
              </div>
              <div className="rounded-lg bg-amber-50/60 p-2">
                <div className="text-[10px] text-gray-500">已选山向 H</div>
                <div className="mt-0.5 text-sm font-bold text-gray-700">
                  {facingShanEntry ? `${facingShanEntry.name}（${facingShanEntry.center}°）` : "未选择"}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-8 gap-1">
              {SHAN_24.map((s) => (
                <button
                  key={s.name}
                  onClick={() => setFacingShan(s.name)}
                  className={`rounded py-1.5 text-xs font-medium transition-all ${
                    facingShan === s.name ? "text-white" : "bg-gray-100 text-gray-600 active:bg-gray-200"
                  }`}
                  style={facingShan === s.name ? { backgroundColor: BRAND } : {}}
                >
                  {s.name}
                </button>
              ))}
            </div>
            <div className="mt-2 flex gap-1.5">
              <button
                onClick={alignDial}
                disabled={locked}
                className="flex-1 rounded-full py-2.5 text-sm font-semibold text-white active:scale-[0.98] disabled:opacity-40"
                style={{ backgroundColor: BRAND }}
              >
                对齐盘面
              </button>
              <button
                onClick={() => { setFacingPoint(null); setFacingShan(""); setMeasure(null); }}
                className="rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-500 active:scale-[0.98]"
              >
                清除
              </button>
            </div>
          </div>

          {/* 罗盘叠加属性 */}
          <div className="mt-2 bg-white px-3 py-3">
            <div className="mb-2 text-xs text-gray-500">罗盘叠加属性</div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-gray-600">透明度</span>
              <span className="font-semibold tabular-nums" style={{ color: BRAND }}>{Math.round(opacity * 100)}%</span>
            </div>
            <input
              type="range" min={0.2} max={1} step={0.05}
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="w-full accent-[#B8860B]"
            />
            <div className="mt-2 mb-1 flex items-center justify-between text-xs">
              <span className="text-gray-600">盘面尺寸</span>
              <span className="font-semibold tabular-nums" style={{ color: BRAND }}>{dialSize}px</span>
            </div>
            <input
              type="range" min={100} max={560} step={4}
              value={dialSize}
              onChange={(e) => setDialSize(parseInt(e.target.value, 10))}
              className="w-full accent-[#B8860B]"
            />
            <div className="mt-2 flex rounded-full border border-gray-200 p-0.5">
              {(["simple", "full"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setVariant(v)}
                  className={`flex-1 rounded-full py-2 text-sm font-medium ${variant === v ? "text-white" : "text-gray-500"}`}
                  style={variant === v ? { backgroundColor: BRAND } : {}}
                >
                  {v === "simple" ? "简易二十四山" : "专业门派盘"}
                </button>
              ))}
            </div>
            {variant === "full" && (
              <div className="mt-2 rounded-lg bg-gray-50 p-2">
                <div className="mb-1.5 text-[11px] font-medium text-gray-600">门派与圈层（{getProfile(school).rings.length - hiddenRings.length}/{getProfile(school).rings.length} 圈层显示）</div>
                <div className="flex rounded-full border border-gray-200 bg-white p-0.5">
                  {SCHOOL_OPTIONS.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => {
                        setSchool(o.id);
                        setHiddenRings([]);
                        trackToolEvent("liji", "profile_switch", { school: o.id });
                      }}
                      className={`flex-1 rounded-full py-1.5 text-[11px] font-medium ${school === o.id ? "text-white" : "text-gray-500"}`}
                      style={school === o.id ? { backgroundColor: BRAND } : {}}
                    >
                      {o.name}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowRingPanel((v) => !v)}
                  className="mt-1.5 flex w-full items-center justify-between px-0.5 text-[10px] text-gray-500"
                >
                  <span>圈层开关</span>
                  <span className="text-gray-400">{showRingPanel ? "收起 ▲" : "展开 ▼"}</span>
                </button>
                {showRingPanel && (
                  <div className="mt-1 grid grid-cols-2 gap-1">
                    {getProfile(school).rings.map((r) => {
                      const on = !hiddenRings.includes(r.id);
                      return (
                        <button
                          key={r.id}
                          onClick={() => {
                            setHiddenRings((prev) => {
                              const cur = getProfile(school).rings.filter((x) => !prev.includes(x.id)).length;
                              if (prev.includes(r.id)) return prev.filter((x) => x !== r.id);
                              if (cur <= 1) return prev;
                              return [...prev, r.id];
                            });
                            trackToolEvent("liji", "ring_toggle", { ringId: r.id });
                          }}
                          className={`flex items-center justify-between rounded border px-1.5 py-1 text-left text-[10px] ${
                            on ? "border-amber-200 bg-amber-50/70 text-gray-700" : "border-gray-200 bg-white text-gray-400"
                          }`}
                        >
                          <span className="truncate">{r.name}</span>
                          <span
                            className="ml-1 inline-block h-3 w-3 shrink-0 rounded-full border"
                            style={{
                              backgroundColor: on ? BRAND : "#e5e5e5",
                              borderColor: on ? BRAND : "#d0d0d0",
                            }}
                          />
                        </button>
                      );
                    })}
                  </div>
                )}
                <p className="mt-1.5 text-[10px] leading-relaxed text-gray-400">
                  专业盘与电子罗盘共用 {LUOPAN_PROFILE_ENGINE_VERSION.split("（")[0]}，圈层口径一致；隐藏圈层后剩余环带自动放宽。
                </p>
              </div>
            )}
            <p className="mt-1.5 text-[10px] leading-relaxed text-gray-400">
              简易＝仅二十四山圈，看清户型优先；专业＝门派多圈层盘（三合12圈/三元/玄空）。缩放：双指捏合或按钮，
              图面与罗盘同组缩放；拖动罗盘需在「自由拖动」模式且未锁定。
            </p>
          </div>

          {/* 点测判读 */}
          {measure && measurePhi != null && (
            <div className="mt-2 bg-white px-3 py-3">
              <div className="mb-2 text-sm font-bold" style={{ color: BRAND }}>点测山向判读</div>
              <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3 text-center">
                <div className="text-lg font-bold text-gray-800">{measure.reading.zuoXiang}</div>
                <div className="mt-1 text-xs text-gray-500">
                  罗盘航向 {measure.reading.heading.toFixed(1)}°（屏幕角 {measurePhi.toFixed(1)}° − R {rotation.toFixed(1)}°）
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                <div><span className="text-gray-500">向山：</span><span className="font-semibold">{measure.reading.facing.shan}（{measure.reading.facing.direction}）</span></div>
                <div><span className="text-gray-500">坐山：</span><span className="font-semibold">{measure.reading.sittingShan}</span></div>
                <div><span className="text-gray-500">八卦：</span><span className="font-semibold">{measure.reading.bagua.name}（{measure.reading.bagua.direction}）</span></div>
                <div><span className="text-gray-500">山内偏移：</span><span className="font-semibold">{measure.reading.facing.offsetInShan > 0 ? "+" : ""}{measure.reading.facing.offsetInShan}°</span></div>
              </div>
              {measure.reading.facing.isJian && (
                <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-[11px] text-red-600">
                  该点落于山界骑缝带（±3°）：{measure.reading.facing.jianText}
                </p>
              )}
            </div>
          )}

          {/* 客户记录 */}
          <div className="mt-2 bg-white px-3 py-3">
            <div className="mb-2 text-xs text-gray-500">客户定向记录（可选）</div>
            <ClientSelector selectedClient={selectedClient} onSelect={setSelectedClient} />
            <div className="mt-2 flex gap-1.5">
              <button
                onClick={saveToClient}
                disabled={!selectedClient}
                className="flex-1 rounded-full border border-amber-200 py-2.5 text-sm font-semibold active:scale-[0.98] disabled:opacity-40"
                style={{ color: BRAND, backgroundColor: "#fdf6e3" }}
              >
                保存定向记录
              </button>
              <button
                onClick={saveProject}
                className="flex-1 rounded-full border border-gray-200 bg-gray-50 py-2.5 text-sm font-semibold text-gray-600 active:scale-[0.98]"
              >
                保存本机工程
              </button>
            </div>
            {savedAt && (
              <p className="mt-1.5 text-[10px] text-gray-400">上次工程保存：{new Date(savedAt).toLocaleString("zh-CN")}</p>
            )}
          </div>

          {/* 导出与分享 */}
          <div className="mt-2 px-3 py-2">
            <button
              onClick={doExport}
              disabled={exporting}
              className="w-full rounded-full py-2.5 text-sm font-semibold text-white active:scale-[0.98] disabled:opacity-50"
              style={{ backgroundColor: BRAND }}
            >
              {exporting ? "正在合成高清图…" : "导出定向图（含罗盘与角度信息）"}
            </button>
            <div className="mt-2">
              <ShareButton
                type="tool"
                title="立极尺定向结果"
                description="户型图立极尺工具"
                variant="block"
                label="分享定向结果"
                onShared={() => trackToolEvent("liji", "tool_share")}
                shareData={{
                  toolType: "liji",
                  title: `立极尺定向：盘旋转角 ${rotation.toFixed(1)}°`,
                  summary: `R ${rotation.toFixed(1)}°${facingShanEntry ? ` · ${facingShanEntry.name}向对齐` : ""}${measure ? ` · 点测${measure.reading.zuoXiang}` : ""}`,
                  payload: {
                    summaryLines: [
                      `盘旋转角 R：${rotation.toFixed(1)}°`,
                      `北线方向：图面上方顺时针 ${rotation.toFixed(1)}°`,
                      facingPoint && facingShanEntry
                        ? `参考对齐：${facingShanEntry.name}向（D ${D?.toFixed(1)}° → H ${facingShanEntry.center}°）`
                        : "参考对齐：未设定",
                      measure
                        ? `点测判读：${measure.reading.zuoXiang}（${measure.reading.facing.shan}向 ${measure.reading.heading.toFixed(1)}°）`
                        : "点测判读：未测",
                      `原始图纸：${srcW}×${srcH}px（仅本机处理，未上传）`,
                      `叠加盘：${variant === "full" ? `${SCHOOL_OPTIONS.find((o) => o.id === school)?.name ?? school}（专业门派盘）` : "简易二十四山盘"}`,
                      `引擎：${LIJI_ENGINE_VERSION} / ${variant === "full" ? LUOPAN_PROFILE_ENGINE_VERSION : `山向口径：${COMPASS_ENGINE_VERSION.split("（")[0]}（与电子罗盘同源）`}`,
                    ],
                  },
                }}
              />
            </div>
          </div>
        </>
      )}

      {/* 免责声明 */}
      <div className="mx-3 mt-4 rounded-lg border border-red-100 bg-red-50/50 p-3">
        <p className="text-xs leading-relaxed text-gray-500">
          <strong>免责声明：</strong>本工具仅提供户型图立极定位与方位标注功能，不作玄学论断、财位或化解建议，
          不构成任何决策依据。定向精度取决于图纸比例与对齐操作的严谨程度，重要堪峦作业请以现场实测复核。
        </p>
        <p className="mt-1 text-xs text-gray-400">
          隐私说明：户型图导入、压缩、叠加与导出均在设备本地完成，未经您主动分享不会上传任何服务器。
        </p>
      </div>
      <div style={{ height: "20px" }} />

      {toast && (
        <div className="fixed left-1/2 top-16 z-50 -translate-x-1/2 rounded-full bg-black/80 px-4 py-2 text-xs text-white">
          {toast}
        </div>
      )}
    </div>
  );
}
