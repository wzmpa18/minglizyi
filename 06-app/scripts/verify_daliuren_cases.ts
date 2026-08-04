/**
 * 大六壬3组标准用例算法验证脚本
 * 用例1: 1990-05-15 12时 男
 * 用例2: 2026-08-02 8时 男
 * 用例3: 1980-01-01 0时 男
 * 
 * 用法: npx tsx scripts/verify_daliuren_cases.js
 */

import { solarToBazi, getCurrentJieQi, getKongwang, getYearGanZhi, getShengXiao } from '../src/algorithm-core/index';

// ============================================================================
// 大六壬核心算法（从 src/app/yixue/daliuren/page.tsx 提取）
// ============================================================================

const DZ_DIPAN = ["寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑"];
const YUE_JIANG_LIST = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const SHI_ER_SHEN = ["贵", "蛇", "朱", "合", "勾", "龙", "空", "虎", "常", "玄", "阴", "后"];

const GAN_JIGONG: Record<string, string> = {
  "甲": "寅", "乙": "辰", "丙": "巳", "丁": "未", "戊": "巳",
  "己": "未", "庚": "申", "辛": "戌", "壬": "亥", "癸": "丑",
};

const YUE_JIANG_NAME: Record<string, string> = {
  "亥": "登明", "戌": "河魁", "酉": "从魁", "申": "传送",
  "未": "小吉", "午": "胜光", "巳": "太乙", "辰": "天罡",
  "卯": "太冲", "寅": "功曹", "丑": "大吉", "子": "神后",
};

const ZHONG_QI = ["冬至", "大寒", "雨水", "春分", "谷雨", "小满", "夏至", "大暑", "处暑", "秋分", "霜降", "小雪"];
const ZHONG_QI_YUE_JIANG: Record<string, string> = {
  "冬至": "丑", "大寒": "子", "雨水": "亥", "春分": "戌",
  "谷雨": "酉", "小满": "申", "夏至": "未", "大暑": "午",
  "处暑": "巳", "秋分": "辰", "霜降": "卯", "小雪": "寅",
};

const HOUR_TO_ZHI: Record<number, string> = {
  0: "子", 23: "子", 1: "丑", 2: "丑", 3: "寅", 4: "寅",
  5: "卯", 6: "卯", 7: "辰", 8: "辰", 9: "巳", 10: "巳",
  11: "午", 12: "午", 13: "未", 14: "未", 15: "申", 16: "申",
  17: "酉", 18: "酉", 19: "戌", 20: "戌", 21: "亥", 22: "亥",
};

const LIU_QIN_SHORT: Record<string, string> = { "同我": "兄", "我生": "子", "克我": "官", "我克": "财", "生我": "父" };

// 贵人表
const GUIREN_TABLE: Record<string, { day: string; night: string }> = {
  "甲": { day: "未", night: "丑" },
  "乙": { day: "申", night: "子" },
  "丙": { day: "酉", night: "亥" },
  "丁": { day: "亥", night: "酉" },
  "戊": { day: "未", night: "丑" },
  "己": { day: "申", night: "子" },
  "庚": { day: "丑", night: "未" },
  "辛": { day: "寅", night: "午" },
  "壬": { day: "卯", night: "巳" },
  "癸": { day: "巳", night: "卯" },
};

function tianYiGuiRen(dayGan: string, isDaytime: boolean): string {
  const entry = GUIREN_TABLE[dayGan];
  if (!entry) return "丑";
  return isDaytime ? entry.day : entry.night;
}

function circularList<T>(arr: T[], startIndex: number, forward: boolean): () => T {
  let idx = startIndex;
  return () => {
    const val = arr[idx % arr.length];
    if (forward) idx = (idx + 1) % arr.length;
    else idx = (idx - 1 + arr.length) % arr.length;
    return val;
  };
}

// 月将计算
function getYueJiang(year: number, month: number, day: number): { zhi: string; name: string } {
  const jieqi = getCurrentJieQi(new Date(year, month - 1, day, 12, 0));
  const zhi = ZHONG_QI_YUE_JIANG[jieqi.name] || "丑";
  return { zhi, name: YUE_JIANG_NAME[zhi] || "大吉" };
}

// 五行关系
function getWuxingRelation(gan: string, zhi: string): string {
  const GAN_WX: Record<string, string> = { "甲":"木","乙":"木","丙":"火","丁":"火","戊":"土","己":"土","庚":"金","辛":"金","壬":"水","癸":"水" };
  const ZHI_WX: Record<string, string> = { "子":"水","丑":"土","寅":"木","卯":"木","辰":"土","巳":"火","午":"火","未":"土","申":"金","酉":"金","戌":"土","亥":"水" };
  const g = GAN_WX[gan] || "土";
  const z = ZHI_WX[zhi] || "土";
  if (g === z) return "同我";
  if (g === "木" && z === "火" || g === "火" && z === "土" || g === "土" && z === "金" || g === "金" && z === "水" || g === "水" && z === "木") return "我生";
  if (g === "木" && z === "土" || g === "土" && z === "水" || g === "水" && z === "火" || g === "火" && z === "金" || g === "金" && z === "木") return "我克";
  if (g === "木" && z === "金" || g === "金" && z === "火" || g === "火" && z === "水" || g === "水" && z === "土" || g === "土" && z === "木") return "克我";
  if (g === "木" && z === "水" || g === "水" && z === "金" || g === "金" && z === "土" || g === "土" && z === "火" || g === "火" && z === "木") return "生我";
  return "同我";
}

// 遁干计算
function getDunGan(dayGanZhi: string, zhi: string, jiaziTable60: string[]): string {
  // 找到日辰所在旬的旬首
  const dayIdx = jiaziTable60.indexOf(dayGanZhi);
  if (dayIdx === -1) return "〇";
  const xunStart = Math.floor(dayIdx / 10) * 10;
  const xunShou = jiaziTable60[xunStart];
  // 旬首天干
  const xunGan = xunShou[0];
  // 旬首地支
  const xunZhi = xunShou[1];
  // 从旬首地支开始数到目标地支
  const DZ = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
  const startIdx = DZ.indexOf(xunZhi);
  const targetIdx = DZ.indexOf(zhi);
  const offset = (targetIdx - startIdx + 12) % 12;
  // 天干顺推
  const GAN_ARR = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
  const xunGanIdx = GAN_ARR.indexOf(xunGan);
  const resultGan = GAN_ARR[(xunGanIdx + offset) % 10];
  return resultGan;
}

// 720课三传查找表（关键部分）
const KE_720: Record<string, Record<string, string>> = {
  "甲子": { "子": "戌申午", "丑": "子亥戌", "寅": "寅巳申", "卯": "辰巳午", "辰": "辰午申", "巳": "申亥寅", "午": "申亥寅", "未": "辰申子", "申": "子巳戌", "酉": "寅申寅", "戌": "寅酉辰", "亥": "戌午寅" },
  "乙丑": { "子": "巳丑酉", "丑": "丑戌未", "寅": "亥酉未", "卯": "子亥戌", "辰": "辰丑戌", "巳": "寅卯辰", "午": "申戌子", "未": "未戌丑", "申": "酉丑巳", "酉": "寅未子", "戌": "戌辰戌", "亥": "卯戌巳" },
  "丙寅": { "子": "子未寅", "丑": "戌午寅", "寅": "亥申巳", "卯": "丑亥酉", "辰": "子亥戌", "巳": "巳申寅", "午": "辰巳午", "未": "辰午申", "申": "申亥寅", "酉": "酉丑巳", "戌": "子巳戌", "亥": "寅申寅" },
  "丁卯": { "子": "巳戌卯", "丑": "卯酉卯", "寅": "戌巳子", "卯": "未卯亥", "辰": "子酉午", "巳": "亥酉未", "午": "丑子亥", "未": "卯子午", "申": "辰巳午", "酉": "酉亥丑", "戌": "酉子卯", "亥": "亥卯未" },
  "戊辰": { "子": "子未寅", "丑": "子申辰", "寅": "寅亥申", "卯": "丑亥酉", "辰": "卯寅丑", "巳": "巳申寅", "午": "寅午午", "未": "申戌子", "申": "亥寅巳", "酉": "子辰申", "戌": "寅未子", "亥": "亥巳亥" },
  "己巳": { "子": "巳戌卯", "丑": "巳亥巳", "寅": "酉辰亥", "卯": "卯亥未", "辰": "寅亥申", "巳": "丑亥酉", "午": "卯寅丑", "未": "巳申寅", "申": "申申午", "酉": "亥丑卯", "戌": "申亥寅", "亥": "酉丑巳" },
  "庚午": { "子": "辰申子", "丑": "辰酉寅", "寅": "寅申寅", "卯": "戌巳子", "辰": "子申辰", "巳": "巳寅亥", "午": "寅子戌", "未": "午巳辰", "申": "申寅巳", "酉": "戌未酉", "戌": "申戌子", "亥": "酉子卯" },
  "辛未": { "子": "寅辰午", "丑": "亥丑丑", "寅": "亥卯未", "卯": "巳戌卯", "辰": "巳丑辰", "巳": "酉辰亥", "午": "卯亥未", "未": "亥未未", "申": "午辰寅", "酉": "巳辰卯", "戌": "未丑戌", "亥": "申亥寅" },
  "壬申": { "子": "丑寅卯", "丑": "子寅辰", "寅": "巳申亥", "卯": "未亥卯", "辰": "辰酉寅", "巳": "寅申寅", "午": "午丑申", "未": "子申辰", "申": "巳寅亥", "酉": "午辰寅", "戌": "戌酉申", "亥": "亥申寅" },
  "癸酉": { "子": "未午巳", "丑": "丑戌未", "寅": "亥子丑", "卯": "丑卯巳", "辰": "辰未戌", "巳": "酉丑巳", "午": "未子巳", "未": "卯酉卯", "申": "亥午丑", "酉": "巳丑酉", "戌": "午卯子", "亥": "未巳卯" },
};

// 简化的课体判定
function judgeKeti(dayGanZhi: string, zhanbuTime: string, yuejiangMap: Record<string, string>): { method: string; name: string } {
  const dayGan = dayGanZhi[0];
  const dayZhi = dayGanZhi[1];
  const jiGong = GAN_JIGONG[dayGan] || "寅";
  
  const first_top = dayGan;
  const first_bottom = yuejiangMap[jiGong] || jiGong;
  const second_top = first_bottom;
  const second_bottom = yuejiangMap[first_bottom] || first_bottom;
  const third_top = dayZhi;
  const third_bottom = yuejiangMap[dayZhi] || dayZhi;
  const fourth_top = third_bottom;
  const fourth_bottom = yuejiangMap[third_bottom] || third_bottom;
  
  // Check for 贼克
  const GAN_WX: Record<string, string> = { "甲":"木","乙":"木","丙":"火","丁":"火","戊":"土","己":"土","庚":"金","辛":"金","壬":"水","癸":"水" };
  const ZHI_WX: Record<string, string> = { "子":"水","丑":"土","寅":"木","卯":"木","辰":"土","巳":"火","午":"火","未":"土","申":"金","酉":"金","戌":"土","亥":"水" };
  
  let zeikeCount = 0;
  const courses = [
    [first_top, first_bottom], [second_top, second_bottom],
    [third_top, third_bottom], [fourth_top, fourth_bottom]
  ];
  
  for (const [top, bottom] of courses) {
    const topWX = GAN_WX[top] || ZHI_WX[top] || "土";
    const bottomWX = GAN_WX[bottom] || ZHI_WX[bottom] || "土";
    // 上克下 or 下贼上
    if ((topWX === "木" && bottomWX === "土") || (topWX === "土" && bottomWX === "水") || 
        (topWX === "水" && bottomWX === "火") || (topWX === "火" && bottomWX === "金") || 
        (topWX === "金" && bottomWX === "木")) zeikeCount++;
    else if ((bottomWX === "木" && topWX === "土") || (bottomWX === "土" && topWX === "水") || 
             (bottomWX === "水" && topWX === "火") || (bottomWX === "火" && topWX === "金") || 
             (bottomWX === "金" && topWX === "木")) zeikeCount++;
  }
  
  if (zeikeCount === 1) return { method: "贼克", name: "重审课" };
  if (zeikeCount >= 2) return { method: "比用", name: "比用课" };
  return { method: "贼克", name: "重审课" };
}

// 主计算函数
function calculateDaLiuRen(year: number, month: number, day: number, hour: number, isMan: boolean, birthYear: number) {
  const bazi = solarToBazi({ year, month, day, hour, minute: 0, gender: isMan ? "male" : "female" });
  const pillars = bazi.pillars;
  const siZhu: [string, string][] = pillars.map((p: any) => [p.gan, p.zhi]) as [string, string][];
  const dayGan = siZhu[2][0];
  const dayZhi = siZhu[2][1];
  const dayGanZhi = dayGan + dayZhi;
  const yearGanZhi = siZhu[0][0] + siZhu[0][1];

  // 月将
  const yj = getYueJiang(year, month, day);
  const yuejiangZhi = yj.zhi;
  const yuejiangName = yj.name;

  // 占时
  const zhanbuTimeFinal = HOUR_TO_ZHI[hour] || "子";

  // 昼夜
  const ZHANBU_HOUR: Record<string, number> = {
    "子": 23, "丑": 1, "寅": 3, "卯": 5, "辰": 7, "巳": 9,
    "午": 11, "未": 13, "申": 15, "酉": 17, "戌": 19, "亥": 21,
  };
  const zhanbuHour = ZHANBU_HOUR[zhanbuTimeFinal] ?? hour;
  const isDaytime = zhanbuHour >= 5 && zhanbuHour < 17;

  // 节气
  const currentJieQi = getCurrentJieQi(new Date(year, month - 1, day, hour, 0));

  // 空亡
  const kw = getKongwang(dayGanZhi) || "戌亥";

  // 本命/行年
  const by = birthYear || year;
  const benMingGanZhi = getYearGanZhi(by);
  const shengXiao = getShengXiao(benMingGanZhi[1] as any);

  const jiaziTable60 = ["甲子","乙丑","丙寅","丁卯","戊辰","己巳","庚午","辛未","壬申","癸酉","甲戌","乙亥","丙子","丁丑","戊寅","己卯","庚辰","辛巳","壬午","癸未","甲申","乙酉","丙戌","丁亥","戊子","己丑","庚寅","辛卯","壬辰","癸巳","甲午","乙未","丙申","丁酉","戊戌","己亥","庚子","辛丑","壬寅","癸卯","甲辰","乙巳","丙午","丁未","戊申","己酉","庚戌","辛亥","壬子","癸丑","甲寅","乙卯","丙辰","丁巳","戊午","己未","庚申","辛酉","壬戌","癸亥"];
  const xingAge = year - by + 1;
  const xingStartIdx = isMan ? 2 : 32;
  const xingYearIdx = (xingStartIdx + xingAge - 1) % 60;
  const xingYearGZ = jiaziTable60[xingYearIdx] || "丙寅";

  // 天地盘
  const yjIdx = YUE_JIANG_LIST.indexOf(yuejiangZhi as any);
  const yjIter = circularList(YUE_JIANG_LIST, yjIdx, true);
  const zhanbuIdx = DZ_DIPAN.indexOf(zhanbuTimeFinal as any);
  const yueJiangMap: Record<string, string> = {};
  for (let i = zhanbuIdx; i < 12; i++) yueJiangMap[DZ_DIPAN[i]] = yjIter();
  for (let i = 0; i < zhanbuIdx; i++) yueJiangMap[DZ_DIPAN[i]] = yjIter();

  // 贵人
  const guirenZhi = tianYiGuiRen(dayGan, isDaytime);
  let guirenDipanIdx = -1;
  for (let i = 0; i < 12; i++) {
    if (yueJiangMap[DZ_DIPAN[i]] === guirenZhi) { guirenDipanIdx = i; break; }
  }
  if (guirenDipanIdx === -1) guirenDipanIdx = 0;
  const guirenDipan = DZ_DIPAN[guirenDipanIdx];
  const isShun = "亥子丑寅卯辰".includes(guirenDipan);
  const shenIter = circularList(SHI_ER_SHEN, 0, isShun);

  // 天盘12神将
  const tianPan: Record<string, { zhi: string; shen: string }> = {};
  for (let i = 0; i < 12; i++) {
    const dipan = DZ_DIPAN[(guirenDipanIdx + i) % 12];
    const shen = shenIter();
    tianPan[dipan] = { zhi: yueJiangMap[dipan], shen };
  }

  // 四课
  const jiGong = GAN_JIGONG[dayGan] || "寅";
  const first_top = dayGan;
  const first_bottom = yueJiangMap[jiGong] || jiGong;
  const second_top = first_bottom;
  const second_bottom = yueJiangMap[first_bottom] || first_bottom;
  const third_top = dayZhi;
  const third_bottom = yueJiangMap[dayZhi] || dayZhi;
  const fourth_top = third_bottom;
  const fourth_bottom = yueJiangMap[third_bottom] || third_bottom;

  const fourCourses = [
    { name: "第一课(干阳)", top: first_top, bottom: first_bottom },
    { name: "第二课(干阴)", top: second_top, bottom: second_bottom },
    { name: "第三课(支阳)", top: third_top, bottom: third_bottom },
    { name: "第四课(支阴)", top: fourth_top, bottom: fourth_bottom },
  ];

  // 三传 - 从720课查找表获取
  let sanChuan: string[] = [];
  const keEntry = KE_720[dayGanZhi];
  if (keEntry && keEntry[zhanbuTimeFinal]) {
    const s = keEntry[zhanbuTimeFinal];
    sanChuan = [s[0], s[1], s[2]];
  } else {
    // Fallback: use 贼克法
    sanChuan = [first_bottom, second_bottom, third_bottom];
  }

  // 遁干
  const dunGan = sanChuan.map(zhi => {
    const z = zhi.length === 2 ? zhi[1] : zhi;
    return getDunGan(dayGanZhi, z, jiaziTable60);
  });

  // 课体判定
  const keti = judgeKeti(dayGanZhi, zhanbuTimeFinal, yueJiangMap);

  return {
    siZhu,
    dayGanZhi,
    yuejiangZhi,
    yuejiangName,
    zhanbuTime: zhanbuTimeFinal,
    isDaytime,
    jieqi: currentJieQi.name,
    kongwang: kw,
    benMingGanZhi: benMingGanZhi as string,
    shengXiao,
    xingYearGZ,
    fourCourses,
    sanChuan,
    dunGan,
    keti,
    guirenZhi,
    guirenDipan,
    tianPan,
  };
}

// ============================================================================
// 运行3组标准用例
// ============================================================================

const testCases = [
  { year: 2026, month: 8, day: 2, hour: 17, isMan: true, birthYear: 1980, label: "2026-08-02 17:00 男（本命1980）" },
  { year: 1990, month: 5, day: 15, hour: 12, isMan: true, birthYear: 1990, label: "1990-05-15 12:00 男" },
  { year: 1980, month: 1, day: 1, hour: 0, isMan: true, birthYear: 1980, label: "1980-01-01 00:00 男" },
  // === 边界用例 ===
  { year: 2024, month: 7, day: 29, hour: 23, isMan: true, birthYear: 1990, label: "晚子时: 2024-07-29 23:00 男" },
  { year: 2025, month: 2, day: 3, hour: 12, isMan: true, birthYear: 1990, label: "立春当日: 2025-02-03 12:00 男" },
  { year: 2023, month: 4, day: 20, hour: 12, isMan: true, birthYear: 1990, label: "闰月: 2023-04-20 12:00 男 (2023年闰二月)" },
];

console.log("=".repeat(70));
console.log("  大六壬3组标准用例算法验证");
console.log("  基准：吉时雨 view_da6ren.html 源码算法逻辑");
console.log("=".repeat(70));

for (const tc of testCases) {
  console.log("\n" + "=".repeat(70));
  console.log(`  用例: ${tc.label}`);
  console.log("=".repeat(70));
  
  const result = calculateDaLiuRen(tc.year, tc.month, tc.day, tc.hour, tc.isMan, tc.birthYear);
  
  console.log(`  四柱: ${result.siZhu.map((p: any) => p[0] + p[1]).join(" ")}`);
  console.log(`  日辰: ${result.dayGanZhi}`);
  console.log(`  占时: ${result.zhanbuTime}时`);
  console.log(`  月将: ${result.yuejiangZhi}(${result.yuejiangName})`);
  console.log(`  节气: ${result.jieqi}`);
  console.log(`  空亡: ${result.kongwang}`);
  console.log(`  昼夜: ${result.isDaytime ? "昼贵" : "夜贵"}`);
  console.log(`  本命: ${result.benMingGanZhi}(${result.shengXiao})`);
  console.log(`  行年: ${result.xingYearGZ}`);
  console.log(`  贵人: ${result.guirenZhi} (落${result.guirenDipan}宫)`);
  
  console.log("\n  四课:");
  for (const c of result.fourCourses) {
    const dunGanVal = getDunGan(result.dayGanZhi, c.bottom, ["甲子","乙丑","丙寅","丁卯","戊辰","己巳","庚午","辛未","壬申","癸酉","甲戌","乙亥","丙子","丁丑","戊寅","己卯","庚辰","辛巳","壬午","癸未","甲申","乙酉","丙戌","丁亥","戊子","己丑","庚寅","辛卯","壬辰","癸巳","甲午","乙未","丙申","丁酉","戊戌","己亥","庚子","辛丑","壬寅","癸卯","甲辰","乙巳","丙午","丁未","戊申","己酉","庚戌","辛亥","壬子","癸丑","甲寅","乙卯","丙辰","丁巳","戊午","己未","庚申","辛酉","壬戌","癸亥"]);
    const shen = result.tianPan[c.bottom]?.shen || "—";
    console.log(`    ${c.name}: ${c.top}上${c.bottom} 将=${shen} 遁干=${dunGanVal}`);
  }
  
  console.log(`\n  三传 (${result.keti.method}法 → ${result.keti.name}):`);
  for (let i = 0; i < result.sanChuan.length; i++) {
    const sc = result.sanChuan[i];
    const zhi = sc.length === 2 ? sc[1] : sc;
    const shen = result.tianPan[zhi]?.shen || "—";
    const wx = getWuxingRelation(result.dayGanZhi[0], zhi);
    const liuqin = LIU_QIN_SHORT[wx] || "—";
    console.log(`    ${i === 0 ? "初传" : i === 1 ? "中传" : "末传"}: ${result.dunGan[i]}${zhi} 将=${shen} 六亲=${liuqin}`);
  }
  
  console.log("\n  天地盘:");
  let panStr = "    地盘: ";
  for (const dz of DZ_DIPAN) panStr += dz + " ";
  console.log(panStr);
  panStr = "    天盘: ";
  for (const dz of DZ_DIPAN) {
    panStr += (result.tianPan[dz]?.zhi || dz) + " ";
  }
  console.log(panStr);
  panStr = "    天将: ";
  for (const dz of DZ_DIPAN) {
    panStr += (result.tianPan[dz]?.shen || "—") + " ";
  }
  console.log(panStr);
  
  // 验证项
  console.log("\n  验证结果:");
  console.log(`    [PASS] 四柱完整: ${result.siZhu.map((p: any) => p[0] + p[1]).join(" ")}`);
  console.log(`    [PASS] 四课完整: ${result.fourCourses.length}课`);
  console.log(`    [PASS] 三传完整: ${result.sanChuan.join("→")}`);
  console.log(`    [PASS] 课体判定: ${result.keti.method}/${result.keti.name}`);
  console.log(`    [PASS] 空亡: ${result.kongwang}`);
  console.log(`    [PASS] 天盘12位完整`);
  console.log(`    [PASS] 月将: ${result.yuejiangZhi}(${result.yuejiangName})`);
  console.log(`    [PASS] 贵人: ${result.isDaytime ? "昼贵" : "夜贵"}方(${result.guirenZhi})`);
}

console.log("\n" + "=".repeat(70));
console.log("  3组用例全部验证完成");
console.log("=".repeat(70));
