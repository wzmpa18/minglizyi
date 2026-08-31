"use client";

// 罗盘圈层渲染器 - NICHE-TOOLS-08 v25.0.68
// ============================================================================
// 传统三元盘式圈层（自外向内）：
//   1) 360° 度数刻度圈（2°/10°/30° 分级刻度，30° 整位数字）
//   2) 二十四山圈（每山 15°，字符径向排布，当前山高亮 + 骑缝兼向带）
//   3) 后天八卦圈（八方位 45°，卦符径向排布）
//   4) 天池（磁针：针尖永指盘面北位；盘随航向反向旋转）
//   覆盖层（不随盘转）：天心十道（红十字线，顶边读数位）+ 磁场状态灯
// 物理口径：盘组旋转角 = -航向（连续角累积，杜绝 359°→0° 反转动画）；
//   磁针属盘面坐标（指向盘面 0° 北位），与真罗盘行为一致。
// 协议：纯渲染组件，不含吉凶断语文案。
// ============================================================================

import { useEffect, useRef, useState } from "react";
import { SHAN_24, angleDiff, type ShanReading } from "@/algorithm-core/modules/compass";
import type { InterferenceLevel } from "@/algorithm-core/modules/compass";

const RAD = Math.PI / 180;
const C = 180; // 圆心

// 极坐标（0°=正北，顺时针）→ SVG 坐标
function px(r: number, a: number): [number, number] {
  return [C + r * Math.sin(a * RAD), C - r * Math.cos(a * RAD)];
}
function pt(r: number, a: number): string {
  const [x, y] = px(r, a);
  return `${x.toFixed(2)},${y.toFixed(2)}`;
}
/** 扇环路径（a1→a2 顺时针，外半径 r2、内半径 r1） */
function sectorPath(r1: number, r2: number, a1: number, a2: number): string {
  const large = a2 - a1 > 180 ? 1 : 0;
  return `M ${pt(r2, a1)} A ${r2},${r2} 0 ${large} 1 ${pt(r2, a2)} L ${pt(r1, a2)} A ${r1},${r1} 0 ${large} 0 ${pt(r1, a1)} Z`;
}

// 后天八卦卦符（按 BAGUA_8 方位）
const GUA_SYMBOL: Record<string, string> = {
  "坎": "☵", "艮": "☶", "震": "☳", "巽": "☴",
  "离": "☲", "坤": "☷", "兑": "☱", "乾": "☰",
};
const GUA_LIST: Array<{ name: string; center: number }> = [
  { name: "坎", center: 0 }, { name: "艮", center: 45 },
  { name: "震", center: 90 }, { name: "巽", center: 135 },
  { name: "离", center: 180 }, { name: "坤", center: 225 },
  { name: "兑", center: 270 }, { name: "乾", center: 315 },
];

const BRASS_LINE = "#8a6d3b";
const BONE = "#f5ecd7";
const GOLD_TEXT = "#e8c96a";
const DARK = "#221c14";

export interface CompassDialProps {
  /** 显示航向（度，按北基准模式换算后）；null=无读数（盘面暗化） */
  heading: number | null;
  /** 当前向山判读（用于高亮与兼向带） */
  shanReading: ShanReading | null;
  /** 北基准标识（角标显示） */
  northMode: "magnetic" | "true";
  /** 磁场干扰级别（状态灯） */
  interference: InterferenceLevel;
  /** 渲染尺寸（px） */
  size?: number;
  /** 立极尺叠加模式：隐藏磁针/状态灯/北基准角标（叠加盘无实时航向语义），中心改空心标记 */
  overlay?: boolean;
  /** simple=仅二十四山圈（立极尺简易叠加）；full=度数+二十四山+八卦（默认） */
  variant?: "full" | "simple";
}

const DOT_COLOR: Record<InterferenceLevel, string> = {
  ok: "#3fbf5a",
  warn: "#f0a020",
  bad: "#e53935",
  unknown: "#9e9e9e",
};

export function CompassDial({
  heading,
  shanReading,
  northMode,
  interference,
  size = 340,
  overlay = false,
  variant = "full",
}: CompassDialProps) {
  const [displayAngle, setDisplayAngle] = useState(0);
  const prevHeading = useRef<number | null>(null);

  // 连续角累积：盘组旋转角 = -航向（最短路径增量，跨零不反转）
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

  // 当前山高亮（盘面坐标固定角）
  const activeShan = shanReading?.shan ?? null;
  const shanEntry = SHAN_24.find((s) => s.name === activeShan);
  // 兼向骑缝带（山界两侧各 3°）
  const jianStart = shanReading?.isJian
    ? shanReading.offsetInShan > 0
      ? shanEntry!.center + 7.5 - 3
      : shanEntry!.center - 7.5 - 3
    : null;

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
          {/* 1) 度数刻度圈 */}
          <circle cx={C} cy={C} r={178} fill={BONE} stroke={BRASS_LINE} strokeWidth={2} />
          <circle cx={C} cy={C} r={150} fill={DARK} stroke={BRASS_LINE} strokeWidth={1.5} />
          {Array.from({ length: 180 }, (_, i) => {
            const a = i * 2;
            const major30 = a % 30 === 0;
            const major10 = a % 10 === 0;
            const r2 = 178;
            const r1 = major30 ? 166 : major10 ? 170 : 173.5;
            const [x1, y1] = px(r1, a);
            const [x2, y2] = px(r2, a);
            return (
              <line
                key={`t${a}`}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={major30 ? "#5a4526" : "#7a6240"}
                strokeWidth={major30 ? 1.6 : major10 ? 1 : 0.6}
              />
            );
          })}
          {variant === "full" && Array.from({ length: 12 }, (_, i) => {
            const a = i * 30;
            const [x, y] = px(160, a);
            return (
              <text
                key={`d${a}`}
                x={x} y={y}
                textAnchor="middle" dominantBaseline="central"
                fontSize={11} fill="#5a4526" fontWeight={600}
                transform={`rotate(${a} ${x} ${y})`}
              >
                {a}
              </text>
            );
          })}

          {/* 2) 二十四山圈 */}
          {activeShan && shanEntry && (
            <path
              d={sectorPath(114, 149, shanEntry.center - 7.5, shanEntry.center + 7.5)}
              fill="rgba(229,57,53,0.28)"
            />
          )}
          {/* 山界细线 */}
          {Array.from({ length: 24 }, (_, i) => {
            const a = i * 15;
            const [x1, y1] = px(113, a);
            const [x2, y2] = px(149, a);
            return (
              <line key={`b${a}`} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={BRASS_LINE} strokeWidth={0.6} opacity={0.55} />
            );
          })}
          {/* 兼向骑缝带 */}
          {jianStart != null && (
            <path
              d={sectorPath(118, 145, jianStart, jianStart + 6)}
              fill="rgba(255,45,45,0.5)"
            />
          )}
          {SHAN_24.map((s) => {
            const [x, y] = px(131.5, s.center);
            const active = s.name === activeShan;
            return (
              <text
                key={s.name}
                x={x} y={y}
                textAnchor="middle" dominantBaseline="central"
                fontSize={active ? 16 : 13}
                fontWeight={active ? 700 : 500}
                fill={active ? "#ff5252" : GOLD_TEXT}
                transform={`rotate(${s.center} ${x} ${y})`}
              >
                {s.name}
              </text>
            );
          })}
          <circle cx={C} cy={C} r={112} fill={BONE} stroke={BRASS_LINE} strokeWidth={1.5} />

          {/* 3) 后天八卦圈 */}
          {variant === "full" && GUA_LIST.map((g) => {
            const [x, y] = px(97, g.center);
            return (
              <text
                key={g.name}
                x={x} y={y}
                textAnchor="middle" dominantBaseline="central"
                fontSize={17} fill="#5a4526"
                transform={`rotate(${g.center} ${x} ${y})`}
              >
                {GUA_SYMBOL[g.name]}
              </text>
            );
          })}
          {variant === "full" && Array.from({ length: 8 }, (_, i) => {
            const a = i * 45;
            const [x1, y1] = px(83, a);
            const [x2, y2] = px(111, a);
            return (
              <line key={`g${a}`} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={BRASS_LINE} strokeWidth={0.6} opacity={0.5} />
            );
          })}

          {/* 4) 天池 */}
          <circle cx={C} cy={C} r={82} fill="#14100b" stroke={BRASS_LINE} strokeWidth={1.5} />
          <circle cx={C} cy={C} r={78} fill="none" stroke="#5a4526" strokeWidth={0.8} opacity={0.7} />
          <circle cx={C} cy={C} r={72} fill="none" stroke="#5a4526" strokeWidth={0.5} opacity={0.35} />
          {/* 磁针：北端浅色（指盘面北位）、南端红，正对盘面 0°；叠加模式改空心中心 */}
          {overlay ? (
            <>
              <circle cx={C} cy={C} r={30} fill="rgba(20,16,11,0.25)" stroke={BRASS_LINE} strokeWidth={1} />
              <circle cx={C} cy={C} r={5} fill="none" stroke="#e8c96a" strokeWidth={1.6} />
            </>
          ) : (
            <>
              <polygon points={`${C},${C - 70} ${C - 5},${C} ${C + 5},${C}`} fill="#cfe4f5" stroke="#7fa8c9" strokeWidth={0.8} />
              <polygon points={`${C},${C + 70} ${C - 5},${C} ${C + 5},${C}`} fill="#e53935" stroke="#a02725" strokeWidth={0.8} />
              <circle cx={C} cy={C} r={5.5} fill="#e8c96a" stroke="#8a6d3b" strokeWidth={1} />
              {/* 盘面北位标记（0° 处小红点，与针尖对应） */}
              <circle cx={C} cy={C - 74} r={3} fill="#ff5252" />
            </>
          )}
        </g>

        {/* ============ 覆盖层（固定不转） ============ */}
        {/* 天心十道：红十字竖线（顶边读数位）+ 横线 */}
        <line x1={C} y1={6} x2={C} y2={C - 84} stroke="#ff2d2d" strokeWidth={1.8} />
        <polygon points={`${C - 5},${4} ${C + 5},${4} ${C},${13}`} fill="#ff2d2d" />
        <line x1={C - 84} y1={C} x2={C + 84} y2={C} stroke="rgba(232,201,106,0.55)" strokeWidth={0.9} />
        <line x1={C} y1={C + 84} x2={C} y2={C - 84} stroke="rgba(232,201,106,0.35)" strokeWidth={0.9} />

        {/* 状态角标：北基准 + 磁场灯（叠加模式隐藏） */}
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
