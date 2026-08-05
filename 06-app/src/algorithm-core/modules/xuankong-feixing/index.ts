/**
 * ============================================================================
 * 玄空飞星算法模块
 * ============================================================================
 *
 * 原始来源：从 src/app/yixue/xuankong-feixing/page.tsx 提取
 * 提取日期：2026-08-06
 * 版本：v1.0.0
 * 算法依据：《沈氏玄空学》《玄空紫白诀》
 * ============================================================================
 */

// 二十四山（坐山）
const ER_SHI_SI_SHAN = [
  "壬", "子", "癸", "丑", "艮", "寅",
  "甲", "卯", "乙", "辰", "巽", "巳",
  "丙", "午", "丁", "未", "坤", "申",
  "庚", "酉", "辛", "戌", "乾", "亥",
];

// 二十四山对应方位和阴阳
const SHAN_INFO: Record<string, { direction: string; yinYang: "阴" | "阳"; wuxing: string }> = {
  "壬": { direction: "北偏西", yinYang: "阳", wuxing: "水" },
  "子": { direction: "正北", yinYang: "阳", wuxing: "水" },
  "癸": { direction: "北偏东", yinYang: "阴", wuxing: "水" },
  "丑": { direction: "东北偏北", yinYang: "阴", wuxing: "土" },
  "艮": { direction: "东北", yinYang: "阳", wuxing: "土" },
  "寅": { direction: "东北偏东", yinYang: "阳", wuxing: "木" },
  "甲": { direction: "东偏北", yinYang: "阳", wuxing: "木" },
  "卯": { direction: "正东", yinYang: "阴", wuxing: "木" },
  "乙": { direction: "东偏南", yinYang: "阴", wuxing: "木" },
  "辰": { direction: "东南偏东", yinYang: "阳", wuxing: "土" },
  "巽": { direction: "东南", yinYang: "阴", wuxing: "木" },
  "巳": { direction: "东南偏南", yinYang: "阴", wuxing: "火" },
  "丙": { direction: "南偏东", yinYang: "阳", wuxing: "火" },
  "午": { direction: "正南", yinYang: "阳", wuxing: "火" },
  "丁": { direction: "南偏西", yinYang: "阴", wuxing: "火" },
  "未": { direction: "西南偏南", yinYang: "阴", wuxing: "土" },
  "坤": { direction: "西南", yinYang: "阳", wuxing: "土" },
  "申": { direction: "西南偏西", yinYang: "阳", wuxing: "金" },
  "庚": { direction: "西偏南", yinYang: "阳", wuxing: "金" },
  "酉": { direction: "正西", yinYang: "阴", wuxing: "金" },
  "辛": { direction: "西偏北", yinYang: "阴", wuxing: "金" },
  "戌": { direction: "西北偏西", yinYang: "阳", wuxing: "土" },
  "乾": { direction: "西北", yinYang: "阳", wuxing: "金" },
  "亥": { direction: "西北偏北", yinYang: "阴", wuxing: "水" },
};

// 九宫排列（洛书）
const LUOSHU_ORDER = [4, 9, 2, 3, 5, 7, 8, 1, 6]; // 巽离坤震中兑艮坎乾
const GONG_NAMES: Record<number, { name: string; bagua: string; direction: string }> = {
  1: { name: "坎", bagua: "坎", direction: "北" },
  2: { name: "坤", bagua: "坤", direction: "西南" },
  3: { name: "震", bagua: "震", direction: "东" },
  4: { name: "巽", bagua: "巽", direction: "东南" },
  5: { name: "中", bagua: "中", direction: "中宫" },
  6: { name: "乾", bagua: "乾", direction: "西北" },
  7: { name: "兑", bagua: "兑", direction: "西" },
  8: { name: "艮", bagua: "艮", direction: "东北" },
  9: { name: "离", bagua: "离", direction: "南" },
};

// 九宫对应的卦名（用于挨星）
const GONG_TO_GUA: Record<number, string> = {
  1: "坎", 2: "坤", 3: "震", 4: "巽", 5: "中", 6: "乾", 7: "兑", 8: "艮", 9: "离",
};

// 飞星名称
const STAR_NAMES = ["", "一白", "二黑", "三碧", "四绿", "五黄", "六白", "七赤", "八白", "九紫"];
const STAR_FULL = ["", "一白贪狼", "二黑巨门", "三碧禄存", "四绿文曲", "五黄廉贞", "六白武曲", "七赤破军", "八白左辅", "九紫右弼"];

// 九星五行
const STAR_WUXING: Record<number, string> = {
  1: "水", 2: "土", 3: "木", 4: "木", 5: "土", 6: "金", 7: "金", 8: "土", 9: "火",
};

// 三元九运
function getYunFromYear(year: number): number {
  if (year >= 1864 && year <= 1883) return 1;
  if (year >= 1884 && year <= 1903) return 2;
  if (year >= 1904 && year <= 1923) return 3;
  if (year >= 1924 && year <= 1943) return 4;
  if (year >= 1944 && year <= 1963) return 5;
  if (year >= 1964 && year <= 1983) return 6;
  if (year >= 1984 && year <= 2003) return 7;
  if (year >= 2004 && year <= 2023) return 8;
  if (year >= 2024 && year <= 2043) return 9;
  if (year >= 2044 && year <= 2063) return 1;
  return 9;
}

function getYunName(yun: number): string {
  const names = ["", "上元一运", "上元二运", "上元三运", "中元四运", "中元五运", "中元六运", "下元七运", "下元八运", "下元九运"];
  return names[yun] || "下元九运";
}

// 二十四山在九宫中的位置（每个宫有三山：天元龙、地元龙、人元龙）
const SHAN_TO_GONG: Record<string, number> = {
  "壬": 1, "子": 1, "癸": 1,
  "丑": 8, "艮": 8, "寅": 8,
  "甲": 3, "卯": 3, "乙": 3,
  "辰": 4, "巽": 4, "巳": 4,
  "丙": 9, "午": 9, "丁": 9,
  "未": 2, "坤": 2, "申": 2,
  "庚": 7, "酉": 7, "辛": 7,
  "戌": 6, "乾": 6, "亥": 6,
};

// 二十四山对应的元龙（天/地/人）和阴阳（决定顺逆飞）
const SHAN_LONG: Record<string, { long: "天" | "地" | "人"; yinYang: "顺" | "逆" }> = {
  // 坎宫
  "壬": { long: "地", yinYang: "逆" }, "子": { long: "天", yinYang: "顺" }, "癸": { long: "人", yinYang: "逆" },
  // 艮宫
  "丑": { long: "地", yinYang: "逆" }, "艮": { long: "天", yinYang: "顺" }, "寅": { long: "人", yinYang: "顺" },
  // 震宫
  "甲": { long: "地", yinYang: "顺" }, "卯": { long: "天", yinYang: "逆" }, "乙": { long: "人", yinYang: "逆" },
  // 巽宫
  "辰": { long: "地", yinYang: "顺" }, "巽": { long: "天", yinYang: "逆" }, "巳": { long: "人", yinYang: "逆" },
  // 离宫
  "丙": { long: "地", yinYang: "逆" }, "午": { long: "天", yinYang: "顺" }, "丁": { long: "人", yinYang: "逆" },
  // 坤宫
  "未": { long: "地", yinYang: "逆" }, "坤": { long: "天", yinYang: "顺" }, "申": { long: "人", yinYang: "顺" },
  // 兑宫
  "庚": { long: "地", yinYang: "顺" }, "酉": { long: "天", yinYang: "逆" }, "辛": { long: "人", yinYang: "逆" },
  // 乾宫
  "戌": { long: "地", yinYang: "顺" }, "乾": { long: "天", yinYang: "逆" }, "亥": { long: "人", yinYang: "逆" },
};

// 洛书飞星轨迹（顺飞：中→乾→兑→艮→离→坎→坤→震→巽）
const FEIXING_PATH_SHUN = [5, 6, 7, 8, 9, 1, 2, 3, 4];
const FEIXING_PATH_NI = [5, 4, 3, 2, 1, 9, 8, 7, 6];

// 将洛书路径索引映射到显示顺序
const DISPLAY_POS_TO_LUOSHU = [4, 9, 2, 3, 5, 7, 8, 1, 6]; // 显示位置索引→洛书宫号

/**
 * 根据入中星和顺逆，分配九星到各宫
 */
function feixing(centerStar: number, isShun: boolean): Record<number, number> {
  const result: Record<number, number> = {};
  const path = isShun ? FEIXING_PATH_SHUN : FEIXING_PATH_NI;
  for (let i = 0; i < 9; i++) {
    const palace = path[i];
    result[palace] = ((centerStar + i - 1) % 9) + 1;
  }
  return result;
}

/**
 * 根据坐山和元运，找出山星和向星入中数，并确定顺逆飞
 * 简化版玄空飞星算法
 */
export function calcXuankong(zuoShan: string, xiangShan: string, yun: number, floor: number) {
  // 1. 运星盘：运星入中顺飞
  const yunPan = feixing(yun, true);

  // 2. 找到坐山和向方所在宫位
  const zuoGong = SHAN_TO_GONG[zuoShan];
  const xiangGong = SHAN_TO_GONG[xiangShan];

  // 3. 山星：坐山所在宫位的运星数字入中，根据坐山阴阳决定顺逆
  const shanStarCenter = yunPan[zuoGong];
  const zuoLongInfo = SHAN_LONG[zuoShan];
  const shanShun = zuoLongInfo?.yinYang === "顺";
  const shanPan = feixing(shanStarCenter, shanShun);

  // 4. 向星：向方所在宫位的运星数字入中，根据向首山的阴阳决定顺逆
  const xiangStarCenter = yunPan[xiangGong];
  const xiangLongInfo = SHAN_LONG[xiangShan];
  const xiangShun = xiangLongInfo?.yinYang === "顺";
  const xiangPan = feixing(xiangStarCenter, xiangShun);

  // 5. 楼层五行（简化：楼层数 mod 5，1水2火3木4金5土，循环）
  const floorWuxingMap = ["水", "火", "木", "金", "土"];
  const floorWuxing = floorWuxingMap[(floor - 1) % 5];

  // 6. 宅命图数据
  const zhaiMingData: Record<number, { yun: number; shan: number; xiang: number }> = {};
  for (let i = 1; i <= 9; i++) {
    zhaiMingData[i] = {
      yun: yunPan[i] || 5,
      shan: shanPan[i] || 5,
      xiang: xiangPan[i] || 5,
    };
  }

  // 7. 判断各宫吉凶组合
  const gongAnalysis: Record<number, {
    shanStar: number; xiangStar: number;
    jiXiong: "旺" | "生" | "退" | "煞" | "死" | "平";
    desc: string;
  }> = {};

  for (let i = 1; i <= 9; i++) {
    const ss = shanPan[i] || 5;
    const xs = xiangPan[i] || 5;
    let jiXiong: "旺" | "生" | "退" | "煞" | "死" | "平" = "平";
    let desc = "";

    // 旺山旺向：当运星到山到向
    if (ss === yun && xs === yun) {
      jiXiong = "旺"; desc = "旺山旺向，丁财两旺，大吉之局";
    }
    // 双星会向：山星向星都在向方且为当运
    else if (i === xiangGong && ss === yun && xs === yun) {
      jiXiong = "旺"; desc = "双星会向，旺财旺丁";
    }
    // 上山下水：山星到向、向星到山，损丁破财
    else if (i === xiangGong && ss === yun && i === zuoGong && xs === yun) {
      jiXiong = "死"; desc = "上山下水，损丁破财，大凶之局";
    }
    // 吉星组合
    else if ([1, 6, 8, 9].includes(ss) && [1, 6, 8, 9].includes(xs)) {
      jiXiong = "生"; desc = "吉星组合，主吉利旺运";
    }
    // 凶星组合
    else if ([2, 5, 7].includes(ss) && [2, 5, 7].includes(xs)) {
      jiXiong = "煞"; desc = "凶星组合，需防疾病是非";
    }
    // 三碧是非
    else if (ss === 3 || xs === 3) {
      jiXiong = "煞"; desc = "三碧是非，主口舌官非";
    }
    // 退运
    else if (ss < yun && xs < yun) {
      jiXiong = "退"; desc = "退气之宫，运势渐退";
    }
    else {
      jiXiong = "平"; desc = "平宫，吉凶参半";
    }

    gongAnalysis[i] = { shanStar: ss, xiangStar: xs, jiXiong, desc };
  }

  // 8. 坐向信息
  const zuoInfo = SHAN_INFO[zuoShan];
  const xiangInfo = SHAN_INFO[xiangShan];
  // 获取对宫名称（坐→向）
  const oppositeShan = ER_SHI_SI_SHAN[(ER_SHI_SI_SHAN.indexOf(zuoShan) + 12) % 24];

  return {
    yun, yunName: getYunName(yun),
    zuoShan, xiangShan: oppositeShan,
    zuoInfo, xiangInfo: SHAN_INFO[oppositeShan],
    floor, floorWuxing,
    yunPan, shanPan, xiangPan,
    zhaiMingData, gongAnalysis,
    zuoGong, xiangGong,
    shanStarCenter, xiangStarCenter,
    shanShun, xiangShun,
  };
}