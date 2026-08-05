/**
 * ============================================================================
 * 达摩一掌经算法模块
 * ============================================================================
 *
 * 原始来源：从 src/app/yixue/yizhangjing/page.tsx 提取
 * 提取日期：2026-08-06
 * 版本：v1.0.0
 * 参考依据：达摩一掌经佛家命理
 * ============================================================================
 */

import { GAN, ZHI } from "../../common/ganzhi";

// ============================================================================
// 一掌经排盘
// ============================================================================
export function calcYizhangJing(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();

  const base = year - 4;
  const yearGanIdx = ((base % 10) + 10) % 10;
  const yearZhiIdx = ((base % 12) + 12) % 12;
  const yearGan = GAN[yearGanIdx];
  const yearZhi = ZHI[yearZhiIdx];

  const monthGanStartMap: Record<string, number> = {
    "甲": 2, "己": 2, "乙": 4, "庚": 4, "丙": 6, "辛": 6, "丁": 8, "壬": 8, "戊": 0, "癸": 0,
  };
  const monthGanIdx = (monthGanStartMap[yearGan] + (month - 1)) % 10;
  const monthZhiIdx = (2 + (month - 1)) % 12;
  const monthGan = GAN[monthGanIdx];
  const monthZhi = ZHI[monthZhiIdx];

  const dayGzIdx = ((year - 1900) * 365 + Math.floor((year - 1900) / 4) + [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334][month - 1] + day + 9) % 60;
  const dayGan = GAN[dayGzIdx % 10];
  const dayZhi = ZHI[dayGzIdx % 12];

  const hourGanStartMap: Record<string, number> = {
    "甲": 0, "己": 0, "乙": 2, "庚": 2, "丙": 4, "辛": 4, "丁": 6, "壬": 6, "戊": 8, "癸": 8,
  };
  const hourZhiIdx = Math.floor(((hour + 1) % 24) / 2);
  const hourGanIdx = (hourGanStartMap[dayGan] + hourZhiIdx) % 10;
  const hourGan = GAN[hourGanIdx];
  const hourZhi = ZHI[hourZhiIdx];

  return {
    pillars: [
      { label: "年柱", gan: yearGan, zhi: yearZhi, ganzhi: yearGan + yearZhi },
      { label: "月柱", gan: monthGan, zhi: monthZhi, ganzhi: monthGan + monthZhi },
      { label: "日柱", gan: dayGan, zhi: dayZhi, ganzhi: dayGan + dayZhi },
      { label: "时柱", gan: hourGan, zhi: hourZhi, ganzhi: hourGan + hourZhi },
    ],
    yearZhi,
    monthZhi,
    dayZhi,
    hourZhi,
  };
}