"use client";

// 专业罗盘多圈层渲染器（LUOPAN_PROFILE_ENGINE UI 层）- NICHE-TOOLS-08 v25.0.69
// ============================================================================
// 与 CompassDial（三元简式 3 圈）不同，本组件按 LuopanProfile 动态渲染门派圈层：
//   - 圈层布局：可见圈层按权重瓜分 [外缘178, 天池] 环带，权重/上下限按圈层类别
//     配置；隐藏圈层（Ring Visibility）后空间自动重分配给其余圈层。
//   - 扇区绘制：边界线合并为单条 path（稠密圈层 120 分金也只 1 节点）；
//     标签按弧宽自适应「切向排布」（宽弧）或「径向叠字」（窄弧，如分金/穿山）。
//   - 读数高亮：天心十道顶点（0° 盘面位）命中扇区红色高亮，命中判定走引擎
//     findSector（按角度而非标签，同圈层标签可重复）。
//   - 度数圈：2°/10°/30° 分级刻度 + 30° 整位数字（与简式盘同口径）。
//   - 天池：磁针指盘面北位；overlay 模式（立极尺叠加）改空心中心标记。
// 物理口径：盘组旋转角 = −航向（连续角累积，跨零不反转），与 CompassDial 一致。
// 协议：纯渲染组件，不含吉凶断语文案；旺相/空亡仅为通行分类着色。
// ============================================================================

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { angleDiff, type InterferenceLevel } from "@/algorithm-core/modules/compass";
import { findSector, type LuopanProfile, type LuopanRing, type RingKind, type RingSector } from "@/algorithm-core/modules/luopan-profile";

const RAD = Math.PI / 180;
const C = 180; // 圆心（viewBox 360×360）
const OUTER_R = 178; // 盘面外缘半径
const TIANCHI_MIN = 36; // 天池最小半径

const BRASS_LINE = "#8a6d3b";
const BONE = "#f5ecd7";
const GOLD_TEXT = "#e8c96a";
const DARK = "#221c14";
const RED_TEXT = "#8c2f24";

// 极坐标（0°=正北，顺时针）→ SVG 坐标
function px(r: number, a: number): [number, number] {
  return [C + r * Math.sin(a * RAD), C - r * Math.cos(a * RAD)];
}
function pt(r: number, a: number): string {
  const [x, y] = px(r, a);
  return `${x.toFixed(2)},${y.toFixed(2)}`;
}
/** 扇环路径（a1→a2 顺时针） */
function sectorPath(r1: number, r2: number, a1: number, a2: number): string {
  const span = a2 - a1;
  const large = span > 180 ? 1 : 0;
  return `M ${pt(r2, a1)} A ${r2},${r2} 0 ${large} 1 ${pt(r2, a2)} L ${pt(r1, a2)} A ${r1},${r1} 0 ${large} 0 ${pt(r1, a1)} Z`;
}

/** 各圈层类别布局配置：权重 / 带高上下限 / 文字色 */
const RING_CFG: Record<RingKind, { weight: number; max: number; min: number; textFill: string }> = {
  degree: { weight: 0, max: 0, min: 0, textFill: "#5a4526" },
  shan24: { weight: 2.0, max: 30, min: 8, textFill: GOLD_TEXT },
  fenjin120: { weight: 1.4, max: 20, min: 5, textFill: "#5a4526" },
  long72: { weight: 1.4, max: 18, min: 5, textFill: "#5a4526" },
  long60: { weight: 1.4, max: 18, min: 5, textFill: "#5a4526" },
  xiu28: { weight: 1.6, max: 22, min: 6, textFill: "#5a4526" },
  jieqi24: { weight: 1.6, max: 22, min: 6, textFill: "#5a4526" },
  bagua8: { weight: 2.4, max: 26, min: 8, textFill: "#5a4526" },
  bowuxing24: { weight: 1.6, max: 22, min: 6, textFill: "#5a4526" },
};

interface Band { r1: number; r2: number }

/** 可见圈层环带布局（外→内）；度数圈固定带高，其余按权重瓜分并做上下限钳制重分配 */
function layoutBands(rings: LuopanRing[]): Band[] {
  const nonDegree = rings.filter((r) => r.kind !== "degree");
  const degH = Math.min(18, Math.max(10, (OUTER_R - TIANCHI_MIN) * 0.13));
  const rest = Math.max(20, OUTER_R - TIANCHI_MIN - degH);
  const W = nonDegree.reduce((s, r) => s + RING_CFG[r.kind].weight, 0);
  let h = rings.map((r) => (r.kind === "degree" ? degH : W > 0 ? (rest * RING_CFG[r.kind].weight) / W : rest / Math.max(1, nonDegree.length)));
  // 钳制 + 盈余重分配（3 轮）
  for (let pass = 0; pass < 3; pass++) {
    let surplus = 0;
    const capped: boolean[] = [];
    h = h.map((hh, i) => {
      const ring = rings[i];
      if (ring.kind === "degree") { capped.push(true); return hh; }
      const cfg = RING_CFG[ring.kind];
      if (hh > cfg.max) { surplus += hh - cfg.max; capped.push(true); return cfg.max; }
      if (hh < cfg.min) { surplus -= cfg.min - hh; capped.push(true); return cfg.min; }
      capped.push(false);
      return hh;
    });
    if (Math.abs(surplus) < 0.01) break;
    const openW = rings.reduce((s, r, i) => s + (capped[i] ? 0 : RING_CFG[r.kind].weight), 0);
    if (openW <= 0) break;
    h = h.map((hh, i) => (capped[i] ? hh : hh + (surplus * RING_CFG[rings[i].kind].weight) / openW));
  }
  let rO = OUTER_R;
  return h.map((hh) => { const b = { r1: rO - hh, r2: rO }; rO -= hh; return b; });
}

function toneFill(sec: RingSector, ring: LuopanRing): string {
  if (sec.tone === "wang") return RED_TEXT;
  if (sec.tone === "blank") return "#9a9a9a";
  // 地盘正针为全盘基准，用朱红以示区别（通行罗盘地盘红字制式）
  return ring.id === "dipan24" ? RED_TEXT : RING_CFG[ring.kind].textFill;
}

/** 单圈层静态内容（扇区边界 + 标签）；memo 隔离航向更新 */
const RingLayer = memo(function RingLayer({ ring, r1, r2 }: { ring: LuopanRing; r1: number; r2: number }) {
  const h = r2 - r1;

  // 度数刻度圈：分级刻度 + 30° 数字（合并为单 path / 少量 text）
  if (ring.kind === "degree") {
    let ticks = "";
    for (let i = 0; i < 180; i++) {
      const a = i * 2;
      const major30 = a % 30 === 0;
      const major10 = a % 10 === 0;
      const len = major30 ? h * 0.62 : major10 ? h * 0.42 : h * 0.22;
      const [x1, y1] = px(r2 - len, a);
      const [x2, y2] = px(r2, a);
      ticks += `M ${x1.toFixed(2)},${y1.toFixed(2)} L ${x2.toFixed(2)},${y2.toFixed(2)} `;
    }
    const fs = Math.max(5, h * 0.42);
    return (
      <g>
        <path d={ticks} stroke="#7a6240" strokeWidth={0.6} fill="none" opacity={0.85} />
        {Array.from({ length: 12 }, (_, i) => {
          const a = i * 30;
          const rN = r1 + h * 0.3;
          const [x, y] = px(rN, a);
          return (
            <text key={`d${a}`} x={x} y={y} textAnchor="middle" dominantBaseline="central"
              fontSize={fs} fill="#5a4526" fontWeight={600}
              transform={`rotate(${a} ${x.toFixed(2)} ${y.toFixed(2)})`}>
              {a}
            </text>
          );
        })}
      </g>
    );
  }

  // 扇区边界线：合并为单 path（稠密圈层细线淡显）
  const dense = ring.sectors.length > 48;
  let bounds = "";
  for (const s of ring.sectors) {
    const [x1, y1] = px(r1, s.start);
    const [x2, y2] = px(r2, s.start);
    bounds += `M ${x1.toFixed(2)},${y1.toFixed(2)} L ${x2.toFixed(2)},${y2.toFixed(2)} `;
  }

  // 标签：弧宽足够→切向排布；弧窄→径向叠字（真盘分金/穿山式）
  const labels: React.ReactNode[] = [];
  for (let i = 0; i < ring.sectors.length; i++) {
    const s = ring.sectors[i];
    const a = (s.start + s.end) / 2;
    const rMid = (r1 + r2) / 2;
    const arcPx = ((s.end - s.start) * RAD * rMid);
    if (arcPx < 3.2) continue; // 极窄扇区（如觜宿0.5古度）不绘字，读数面板可查
    let chars = Array.from(s.label);
    if (ring.kind === "xiu28" && h < 11) chars = chars.slice(0, 1); // 窄带只标宿名
    if (chars.length === 0) continue;
    const n = chars.length;
    const fill = toneFill(s, ring);
    const opacity = s.tone === "blank" ? 0.8 : 1;
    if (arcPx / n > h * 0.9) {
      // 切向：字沿弧排布，各自旋转到所在角
      const fs = Math.min(h * 0.85, (arcPx / n) * 0.72);
      const dAng = ((fs + 0.6) / rMid) / RAD;
      for (let j = 0; j < n; j++) {
        const aa = a + (j - (n - 1) / 2) * dAng;
        const [x, y] = px(rMid, aa);
        labels.push(
          <text key={`${i}-${j}`} x={x} y={y} textAnchor="middle" dominantBaseline="central"
            fontSize={fs} fill={fill} opacity={opacity}
            transform={`rotate(${aa.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)})`}>
            {chars[j]}
          </text>,
        );
      }
    } else {
      // 径向叠字：首字在外缘，向心排布（顶位自上而下读）
      const fs = Math.max(2.6, Math.min((h / n) * 0.9, arcPx * 0.6));
      for (let j = 0; j < n; j++) {
        const rr = r2 - (j + 0.5) * (h / n);
        const [x, y] = px(rr, a);
        labels.push(
          <text key={`${i}-${j}`} x={x} y={y} textAnchor="middle" dominantBaseline="central"
            fontSize={fs} fill={fill} opacity={opacity}
            transform={`rotate(${a.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)})`}>
            {chars[j]}
          </text>,
        );
      }
    }
  }

  return (
    <g>
      <path d={bounds} stroke={BRASS_LINE} strokeWidth={dense ? 0.28 : 0.55} fill="none" opacity={dense ? 0.4 : 0.6} />
      {labels}
    </g>
  );
});

const DOT_COLOR: Record<InterferenceLevel, string> = {
  ok: "#3fbf5a",
  warn: "#f0a020",
  bad: "#e53935",
  unknown: "#9e9e9e",
};

const GUA_SYMBOL: Record<string, string> = {
  "坎": "☵", "艮": "☶", "震": "☳", "巽": "☴",
  "离": "☲", "坤": "☷", "兑": "☱", "乾": "☰",
};

export interface LuopanDialProps {
  /** 门派 Profile（来自 luopan-profile 引擎 getProfile） */
  profile: LuopanProfile;
  /** 显示航向（度，按北基准换算后）；null=无读数（盘面暗化） */
  heading: number | null;
  /** 可见圈层 id 集；null=全部可见（Ring Visibility 开关由上层管理） */
  visibleRingIds?: Set<string> | null;
  /** 北基准标识（角标显示） */
  northMode?: "magnetic" | "true";
  /** 磁场干扰级别（状态灯） */
  interference?: InterferenceLevel;
  /** 渲染尺寸（px） */
  size?: number;
  /** 立极尺叠加模式：隐藏磁针/状态灯/北基准角标，中心改空心标记 */
  overlay?: boolean;
}

export function LuopanDial({
  profile,
  heading,
  visibleRingIds = null,
  northMode = "magnetic",
  interference = "unknown",
  size = 344,
  overlay = false,
}: LuopanDialProps) {
  const [displayAngle, setDisplayAngle] = useState(0);
  const prevHeading = useRef<number | null>(null);

  // 连续角累积：盘组旋转角 = −航向（最短路径增量，跨零不反转）
  useEffect(() => {
    if (heading == null) return;
    const prev = prevHeading.current;
    if (prev == null) {
      prevHeading.current = heading;
      setDisplayAngle(-heading);
      return;
    }
    const delta = angleDiff(heading, prev);
    prevHeading.current = heading;
    setDisplayAngle((a) => a - delta);
  }, [heading]);

  const visibleRings = useMemo(
    () => profile.rings.filter((r) => !visibleRingIds || visibleRingIds.has(r.id)),
    [profile, visibleRingIds],
  );
  const bands = useMemo(() => layoutBands(visibleRings), [visibleRings]);
  const tianChiR = Math.max(TIANCHI_MIN, OUTER_R - bands.reduce((s, b) => s + (b.r2 - b.r1), 0));

  // 天心十道顶点（盘面 0°）命中扇区 → 高亮
  const activeSectors = useMemo(() => {
    if (heading == null) return [] as Array<{ band: Band; sec: RingSector }>;
    const out: Array<{ band: Band; sec: RingSector }> = [];
    visibleRings.forEach((r, i) => {
      const sec = findSector(r, heading);
      if (sec) out.push({ band: bands[i], sec });
    });
    return out;
  }, [heading, visibleRings, bands]);

  return (
    <div className="relative mx-auto select-none" style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 360 360"
        width={size}
        height={size}
        style={{ opacity: heading == null ? 0.55 : 1, transition: "opacity 0.3s" }}
      >
        {/* ============ 盘组（随航向反向旋转） ============ */}
        <g
          style={{
            transform: `rotate(${displayAngle}deg)`,
            transformOrigin: "180px 180px",
            transition: "transform 120ms linear",
          }}
        >
          {/* 各圈层底板（外→内叠压成环带）+ 边界 */}
          <circle cx={C} cy={C} r={OUTER_R} fill={BONE} stroke={BRASS_LINE} strokeWidth={2} />
          {bands.map((b, i) => (
            <circle key={`bg${i}`} cx={C} cy={C} r={b.r2} fill={BONE} />
          ))}
          {bands.map((b, i) => (
            <circle key={`ln${i}`} cx={C} cy={C} r={b.r2} fill="none" stroke={BRASS_LINE} strokeWidth={0.7} />
          ))}

          {/* 圈层静态内容（memo：航向更新不重渲染） */}
          {visibleRings.map((r, i) => (
            <RingLayer key={r.id} ring={r} r1={bands[i].r1} r2={bands[i].r2} />
          ))}

          {/* 命中扇区高亮（读数位=盘面 0° 方向的扇区） */}
          {activeSectors.map(({ band, sec }, i) => (
            <path key={`hl${i}`} d={sectorPath(band.r1, band.r2, sec.start, sec.end)} fill="rgba(229,57,53,0.30)" />
          ))}

          {/* 八卦卦符（八卦圈内层叠符号线条，径向排布） */}
          {visibleRings.some((r) => r.kind === "bagua8") && (() => {
            const idx = visibleRings.findIndex((r) => r.kind === "bagua8");
            const b = bands[idx];
            const rMid = (b.r1 + b.r2) / 2;
            const fs = Math.min((b.r2 - b.r1) * 0.8, 18);
            return [0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
              const [x, y] = px(rMid, a);
              const gua = ["坎", "艮", "震", "巽", "离", "坤", "兑", "乾"][a / 45];
              return (
                <text key={`gua${a}`} x={x} y={y} textAnchor="middle" dominantBaseline="central"
                  fontSize={fs} fill="#5a4526" opacity={0.55}
                  transform={`rotate(${a} ${x.toFixed(2)} ${y.toFixed(2)})`}>
                  {GUA_SYMBOL[gua]}
                </text>
              );
            });
          })()}

          {/* 天池 */}
          <circle cx={C} cy={C} r={tianChiR} fill="#14100b" stroke={BRASS_LINE} strokeWidth={1.5} />
          <circle cx={C} cy={C} r={tianChiR - 4} fill="none" stroke="#5a4526" strokeWidth={0.8} opacity={0.7} />
          {overlay ? (
            <>
              <circle cx={C} cy={C} r={Math.min(30, tianChiR * 0.6)} fill="rgba(20,16,11,0.25)" stroke={BRASS_LINE} strokeWidth={1} />
              <circle cx={C} cy={C} r={5} fill="none" stroke="#e8c96a" strokeWidth={1.6} />
            </>
          ) : (
            <>
              <polygon points={`${C},${C - tianChiR + 6} ${C - 5},${C} ${C + 5},${C}`} fill="#cfe4f5" stroke="#7fa8c9" strokeWidth={0.8} />
              <polygon points={`${C},${C + tianChiR - 6} ${C - 5},${C} ${C + 5},${C}`} fill="#e53935" stroke="#a02725" strokeWidth={0.8} />
              <circle cx={C} cy={C} r={5.5} fill="#e8c96a" stroke="#8a6d3b" strokeWidth={1} />
              <circle cx={C} cy={C - tianChiR + 3} r={3} fill="#ff5252" />
            </>
          )}
        </g>

        {/* ============ 覆盖层（固定不转）：天心十道 + 角标 ============ */}
        <line x1={C} y1={6} x2={C} y2={354} stroke="#ff2d2d" strokeWidth={1.8} opacity={0.9} />
        <line x1={6} y1={C} x2={354} y2={C} stroke="rgba(232,201,106,0.5)" strokeWidth={0.9} />
        <polygon points={`${C - 5},${4} ${C + 5},${4} ${C},${13}`} fill="#ff2d2d" />

        {!overlay && (
          <g>
            <rect x={6} y={6} width={44} height={18} rx={4} fill="rgba(34,28,20,0.82)" />
            <text x={28} y={15.5} textAnchor="middle" dominantBaseline="central"
              fontSize={10} fill={GOLD_TEXT} fontWeight={600}>
              {northMode === "true" ? "真北" : "磁北"}
            </text>
            <circle cx={338} cy={22} r={5.5} fill={DOT_COLOR[interference]} stroke="rgba(255,255,255,0.5)" strokeWidth={1} />
          </g>
        )}
      </svg>
    </div>
  );
}
