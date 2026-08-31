/**
 * ============================================================================
 * 立极尺（户型立极定向）纯数学层
 * ============================================================================
 *
 * 功能：户型图平面坐标 ↔ 罗盘航向 的换算，供立极尺叠加罗盘、点测定向使用。
 *
 * 坐标系约定：
 *   - 屏幕角 φ：以立极点为原点，从屏幕正上方（12点方向）起顺时针为正（0-360°），
 *     与罗盘航向同向（上=北），符合直觉。
 *   - 盘旋转角 R：二十四山盘整体顺时针旋转的角度。山盘上山向 h 的文字绘制在
 *     屏幕角 h + R 处；因此屏幕角 φ 处的山向读数 = φ − R。
 *   - 对齐公式：已知建筑「向」的罗盘航向 H 与其在户型图上的屏幕方向 D 时，
 *     R = D − H（如：向午 H=180°，门画在图纸下方 D=180°，则 R=0，即图面北朝上）。
 *
 * 山向判读复用 compass 模块（二十四山与玄空飞星同源口径），本层只做几何换算。
 *
 * 版本：LIJI_ENGINE_VERSION
 * ============================================================================
 */

import { normalizeDeg } from "../compass";

export const LIJI_ENGINE_VERSION = "liji-engine-v1.0.0（立极尺·平面定向几何层）";

/** 屏幕角 → 罗盘航向（度，0-360，磁北/真北口径由上层选定） */
export function screenToHeading(screenAngle: number, rotation: number): number {
  return normalizeDeg(screenAngle - rotation);
}

/** 罗盘航向 → 屏幕角（度，0-360） */
export function headingToScreen(heading: number, rotation: number): number {
  return normalizeDeg(heading + rotation);
}

/** 已知向山航向与其图面方向，求盘旋转角 R = D − H */
export function rotationForFacing(facingHeading: number, facingScreenAngle: number): number {
  return normalizeDeg(facingScreenAngle - facingHeading);
}

/** 立极点 → 点击点 的屏幕角（度，0-360，屏幕上方起顺时针；屏幕 y 轴向下） */
export function angleFromCenter(cx: number, cy: number, px: number, py: number): number {
  return normalizeDeg((Math.atan2(px - cx, -(py - cy)) * 180) / Math.PI);
}

/** 立极点 → 点击点 距离（像素） */
export function distFromCenter(cx: number, cy: number, px: number, py: number): number {
  return Math.hypot(px - cx, py - cy);
}

/** 户型图对角线交点（默认立极点：几何中心） */
export function diagonalCenter(x0: number, y0: number, x1: number, y1: number): { cx: number; cy: number } {
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}
