"use client";

import { useState } from "react";
import { getYearGanZhi, hourToZhi } from "@/algorithm-core";
import type { Gender } from "@/algorithm-core";

// ============================================================================
// 称骨数据
// ============================================================================

// 年骨重 (按干支)
const YEAR_WEIGHT: Record<string, string> = {
  "甲子": "1两2钱", "乙丑": "9钱", "丙寅": "6钱", "丁卯": "7钱",
  "戊辰": "1两2钱", "己巳": "5钱", "庚午": "9钱", "辛未": "8钱",
  "壬申": "7钱", "癸酉": "8钱", "甲戌": "1两5钱", "乙亥": "9钱",
  "丙子": "1两6钱", "丁丑": "8钱", "戊寅": "8钱", "己卯": "1两9钱",
  "庚辰": "1两2钱", "辛巳": "6钱", "壬午": "8钱", "癸未": "7钱",
  "甲申": "5钱", "乙酉": "1两5钱", "丙戌": "6钱", "丁亥": "1两6钱",
  "戊子": "1两5钱", "己丑": "7钱", "庚寅": "9钱", "辛卯": "1两2钱",
  "壬辰": "1两", "癸巳": "6钱", "甲午": "1两5钱", "乙未": "6钱",
  "丙申": "5钱", "丁酉": "1两4钱", "戊戌": "1两4钱", "己亥": "9钱",
  "庚子": "7钱", "辛丑": "7钱", "壬寅": "9钱", "癸卯": "1两2钱",
  "甲辰": "8钱", "乙巳": "7钱", "丙午": "1两3钱", "丁未": "5钱",
  "戊申": "1两4钱", "己酉": "5钱", "庚戌": "9钱", "辛亥": "1两7钱",
  "壬子": "5钱", "癸丑": "7钱", "甲寅": "1两2钱", "乙卯": "8钱",
  "丙辰": "8钱", "丁巳": "6钱", "戊午": "1两9钱", "己未": "6钱",
  "庚申": "8钱", "辛酉": "1两6钱", "壬戌": "1两", "癸亥": "6钱",
};

// 月骨重 (农历月份, 1-12)
const MONTH_WEIGHT: Record<number, string> = {
  1: "6钱", 2: "7钱", 3: "1两8钱", 4: "9钱",
  5: "5钱", 6: "1两6钱", 7: "9钱", 8: "1两5钱",
  9: "1两8钱", 10: "8钱", 11: "9钱", 12: "5钱",
};

// 日骨重 (农历日期, 初一到三十)
const DAY_WEIGHT: Record<number, string> = {
  1: "5钱", 2: "1两", 3: "8钱", 4: "1两5钱", 5: "1两6钱",
  6: "1两5钱", 7: "8钱", 8: "1两6钱", 9: "8钱", 10: "1两6钱",
  11: "9钱", 12: "1两7钱", 13: "8钱", 14: "1两7钱", 15: "1两",
  16: "8钱", 17: "9钱", 18: "1两8钱", 19: "5钱", 20: "1两5钱",
  21: "1两", 22: "9钱", 23: "8钱", 24: "9钱", 25: "1两5钱",
  26: "1两8钱", 27: "7钱", 28: "8钱", 29: "1两6钱", 30: "6钱",
};

// 时骨重 (地支时辰)
const HOUR_WEIGHT: Record<string, string> = {
  "子": "1两6钱", "丑": "6钱", "寅": "7钱", "卯": "1两",
  "辰": "9钱", "巳": "1两6钱", "午": "1两", "未": "8钱",
  "申": "8钱", "酉": "9钱", "戌": "6钱", "亥": "6钱",
};

// 称骨批语
const CHENGGU_PIYU: Record<string, { male: string; female: string }> = {
  "2.1": {
    male: "短命非业谓大凶，平生灾难事重重，凶祸频临限逆境，终世困苦事不成。",
    female: "生身此命运不通，乌云盖月黑朦胧，莫向故园载花木，可来幽地种青松。",
  },
  "2.2": {
    male: "身寒骨冷苦伶仃，此命推来行乞人，劳劳碌碌无度日，中年打拱过平生。",
    female: "此命孤冷落清闺，自幼命薄苦难依，六亲骨肉皆无靠，劳碌奔波度日饥。",
  },
  "2.3": {
    male: "此命推来骨肉轻，求谋作事事难成，妻儿兄弟应难许，别处他乡作散人。",
    female: "此命推来骨气轻，兴家立业总难成，六亲骨肉皆无靠，外乡作客过平生。",
  },
  "2.4": {
    male: "此命推来福禄无，门庭困苦总难荣，六亲骨肉皆无靠，流浪他乡作老翁。",
    female: "此命推来福不轻，自立家计苦经营，中年渐有盈余积，晚景安然百事兴。",
  },
  "2.5": {
    male: "此命推来祖业微，门庭营度似稀奇，六亲骨肉如冰炭，一世勤劳自把持。",
    female: "此命推来祖业微，家计辛勤自把持，中年衣食虽无缺，晚景还须自护持。",
  },
  "2.6": {
    male: "平生衣禄苦中求，独自营谋事不休，离祖出门宜早计，晚来衣禄自无忧。",
    female: "此命推来福禄深，自立家计苦经营，终身衣禄皆前定，晚景安康享太平。",
  },
  "2.7": {
    male: "一生作事少商量，难靠祖宗作主张，独马单枪空做去，早年晚岁总无长。",
    female: "此命推来性情刚，为人作事有主张，中年还有逍遥福，不比前番事不祥。",
  },
  "2.8": {
    male: "一生行事似飘蓬，祖宗产业在梦中，若不过房并改姓，也当移徙二三通。",
    female: "此命推来福不轻，家业兴隆百事成，中年还有逍遥福，不比前番目下荣。",
  },
  "2.9": {
    male: "初年运限未曾亨，纵有功名在后成，须过四旬方可以，移居改姓使为良。",
    female: "此命推来福不轻，一生衣禄自然成，中年还有逍遥福，不比前番目下荣。",
  },
  "3.0": {
    male: "劳劳碌碌苦中求，东走西奔何日休，若使终身勤与俭，老来稍可免忧愁。",
    female: "此命推来运不穷，为人作事有才能，中年还有逍遥福，晚景荣华百事通。",
  },
  "3.1": {
    male: "忙忙碌碌苦中求，何日云开见日头，难得祖基家可立，中年衣食渐无忧。",
    female: "此命推来运渐通，为人作事有才能，一生衣禄皆前定，晚景安然百事通。",
  },
  "3.2": {
    male: "初年运蹇事难谋，渐有财源如水流，到得中年衣食旺，那时名利一齐收。",
    female: "时来运转吉气发，多年枯木又开花，枝叶重生多茂盛，几人见了几人夸。",
  },
  "3.3": {
    male: "早年作事事难成，百计徒劳枉费心，半世自如流水去，后来运到得黄金。",
    female: "此命推来运不通，劳碌奔波一世中，六亲骨肉皆无靠，到老还须自费功。",
  },
  "3.4": {
    male: "此命福气果如何，僧道门中衣禄多，离祖出家方得妙，终朝拜佛念弥陀。",
    female: "此命推来福气深，一生衣禄自然成，家业兴隆多吉庆，晚景荣华享太平。",
  },
  "3.5": {
    male: "生平福量不周全，祖业根基觉少传，营事生涯宜守旧，时来衣食胜从前。",
    female: "此命推来品格清，丈夫儿女有前程，一生衣禄皆平稳，晚景荣华百事成。",
  },
  "3.6": {
    male: "不须劳碌过平生，独自成家福不轻，早有福星常照命，任君行去百般成。",
    female: "此命推来福不轻，一生衣禄自然成，家业兴隆多吉庆，晚景荣华享太平。",
  },
  "3.7": {
    male: "此命般般事不成，弟兄少力自孤行，虽然祖业须微有，来得明时去不明。",
    female: "此命推来运不通，一生劳碌在命中，六亲骨肉皆无靠，到晚还须自费功。",
  },
  "3.8": {
    male: "一身骨肉最清高，早入簧门姓氏标，待到年将三十六，蓝衫脱去换红袍。",
    female: "此命推来品格清，丈夫儿女有前程，一生衣禄皆平稳，晚景荣华百事成。",
  },
  "3.9": {
    male: "此命终身运不通，劳劳作事尽皆空，苦心竭力成家计，到得那时在梦中。",
    female: "此命推来福不轻，家业兴隆百事成，中年还有逍遥福，不比前番目下荣。",
  },
  "4.0": {
    male: "平生衣禄是绵长，件件心中自主张，前面风霜都受过，从来必定享安泰。",
    female: "此命推来福禄深，家业兴隆百事成，一生衣禄皆前定，晚景荣华享太平。",
  },
  "4.1": {
    male: "此命推来事不同，为人能干异凡庸，中年还有逍遥福，不比前番运未通。",
    female: "此命推来运不同，为人能干胜凡庸，中年自有逍遥福，不比前番运未通。",
  },
  "4.2": {
    male: "得宽怀处且宽怀，何用双眉皱不开，若使中年命运济，那时名利一齐来。",
    female: "此命推来福不轻，家业兴隆百事成，中年还有逍遥福，不比前番目下荣。",
  },
  "4.3": {
    male: "为人心性最聪明，作事轩昂近贵人，衣禄一生天数定，不须劳碌是丰亨。",
    female: "此命推来福不轻，为人聪慧有才能，一生衣禄皆平稳，晚景荣华百事成。",
  },
  "4.4": {
    male: "万事由天莫苦求，须知福禄命里收，少壮名利随些过，晚景安然百不忧。",
    female: "此命推来福不轻，家业兴隆百事成，一生衣禄皆前定，晚景荣华享太平。",
  },
  "4.5": {
    male: "名利推求竟若何，前番辛苦后奔波，命中难养男与女，骨肉扶持也不多。",
    female: "此命推来福禄深，早年辛苦受艰辛，中年渐有盈余积，晚景安然百事兴。",
  },
  "4.6": {
    male: "东西南北尽皆通，出姓移居更觉隆，衣禄无亏天数定，中年晚景一般同。",
    female: "此命推来福不轻，一生衣禄自然成，家业兴隆多吉庆，晚景荣华享太平。",
  },
  "4.7": {
    male: "此命推来旺末年，妻荣子贵自怡然，平生原有滔滔福，可卜财源若水泉。",
    female: "此命推来福禄深，一生衣禄自然成，家业兴隆多吉庆，晚景荣华享太平。",
  },
  "4.8": {
    male: "初年运道未曾通，几许蹉跎命亦穷，兄弟六亲无有靠，一生事业晚来隆。",
    female: "此命推来福不轻，家业兴隆百事成，一生衣禄皆平稳，晚景荣华享太平。",
  },
  "4.9": {
    male: "此命推来福不轻，自成自立显门庭，从来富贵人钦敬，使婢差奴过一生。",
    female: "此命推来福不轻，家业兴隆百事成，一生衣禄皆前定，晚景荣华享太平。",
  },
  "5.0": {
    male: "为利为名终日劳，中年福禄也多遭，老来是有财星照，不比前番目下高。",
    female: "此命推来福不轻，一生衣禄自然成，家业兴隆多吉庆，晚景荣华享太平。",
  },
  "5.1": {
    male: "一世荣华事事通，不须劳碌自亨通，兄弟叔侄皆如意，家业成时福禄宏。",
    female: "此命推来福不轻，家业兴隆百事成，一生衣禄皆平稳，晚景荣华享太平。",
  },
  "5.2": {
    male: "一世亨通事事能，不须劳思自然成，宗族欣然心皆好，家业丰亨自称心。",
    female: "此命推来福禄深，一生衣禄自然成，家业兴隆多吉庆，晚景荣华享太平。",
  },
  "5.3": {
    male: "此格推来气象真，兴家发达在其中，一生福禄安排定，却是人间一富翁。",
    female: "此命推来福不轻，家业兴隆百事成，一生衣禄皆平稳，晚景荣华享太平。",
  },
  "5.4": {
    male: "此命推来厚且清，诗书满腹看功成，丰衣足食自然稳，正是人间有福人。",
    female: "此命推来福不轻，家业兴隆百事成，一生衣禄皆前定，晚景荣华享太平。",
  },
  "5.5": {
    male: "走马扬鞭争利名，少年作事费筹论，一朝福禄源源至，富贵荣华显六亲。",
    female: "此命推来福不轻，家业兴隆百事成，一生衣禄皆平稳，晚景荣华享太平。",
  },
  "5.6": {
    male: "此格推来礼义通，一身福禄用无穷，甜酸苦辣皆尝过，滚滚财源稳且丰。",
    female: "此命推来福不轻，家业兴隆百事成，一生衣禄皆平稳，晚景荣华享太平。",
  },
  "5.7": {
    male: "福禄丰盈万事全，一身荣耀乐天年，名扬威震人争羡，此世逍遥宛似仙。",
    female: "此命推来福不轻，家业兴隆百事成，一生衣禄皆平稳，晚景荣华享太平。",
  },
  "5.8": {
    male: "平生衣食自然来，名利双全富贵偕，金榜题名登甲第，紫袍玉带走金阶。",
    female: "此命推来福不轻，家业兴隆百事成，一生衣禄皆平稳，晚景荣华享太平。",
  },
  "5.9": {
    male: "细推此格妙且清，必定才高礼义更，甲第之中应有分，扬鞭走马显威荣。",
    female: "此命推来福不轻，家业兴隆百事成，一生衣禄皆平稳，晚景荣华享太平。",
  },
  "6.0": {
    male: "一朝金榜快题名，显祖荣宗立大勋，衣食定然原裕足，田园财帛更丰盈。",
    female: "此命推来福不轻，家业兴隆百事成，一生衣禄皆平稳，晚景荣华享太平。",
  },
  "6.1": {
    male: "不作朝中金榜客，定为世上大财翁，聪明天赋经书熟，名显高科自是荣。",
    female: "此命推来福不轻，家业兴隆百事成，一生衣禄皆平稳，晚景荣华享太平。",
  },
  "6.2": {
    male: "此命生来福不穷，读书必定显亲宗，紫衣金带为卿相，富贵荣华皆可同。",
    female: "此命推来福不轻，家业兴隆百事成，一生衣禄皆平稳，晚景荣华享太平。",
  },
  "6.3": {
    male: "命主为官福禄长，得来富贵定非常，名题金塔传金榜，定中高科天下扬。",
    female: "此命推来福不轻，家业兴隆百事成，一生衣禄皆平稳，晚景荣华享太平。",
  },
  "6.4": {
    male: "此格威权不可当，紫袍金带坐高堂，荣华富贵谁能及，积玉堆金满储仓。",
    female: "此命推来福不轻，家业兴隆百事成，一生衣禄皆平稳，晚景荣华享太平。",
  },
  "6.5": {
    male: "细推此命福非轻，定国安邦极品人，文绣雕梁徵富贵，威声照耀四方闻。",
    female: "此命推来福不轻，家业兴隆百事成，一生衣禄皆平稳，晚景荣华享太平。",
  },
  "6.6": {
    male: "此格人间一福人，堆金积玉满堂春，从来富贵由天定，正笏垂绅谒圣君。",
    female: "此命推来福不轻，家业兴隆百事成，一生衣禄皆平稳，晚景荣华享太平。",
  },
  "6.7": {
    male: "此命生来福自宏，田园家业最高隆，平生衣禄丰盈足，一世荣华万事通。",
    female: "此命推来福不轻，家业兴隆百事成，一生衣禄皆平稳，晚景荣华享太平。",
  },
  "6.8": {
    male: "富贵由天莫苦求，万金家计不须谋，十年不比前番事，祖业根基水上舟。",
    female: "此命推来福不轻，家业兴隆百事成，一生衣禄皆平稳，晚景荣华享太平。",
  },
  "6.9": {
    male: "君是人间衣禄星，一生富贵众人钦，纵然福禄由天定，安享荣华过一生。",
    female: "此命推来福不轻，家业兴隆百事成，一生衣禄皆平稳，晚景荣华享太平。",
  },
  "7.0": {
    male: "此命推来福不轻，不须愁虑苦劳心，一生天定衣与禄，富贵荣华过一生。",
    female: "此命推来福不轻，家业兴隆百事成，一生衣禄皆平稳，晚景荣华享太平。",
  },
  "7.1": {
    male: "此命生成大不同，公侯卿相在其中，一生自有逍遥福，富贵荣华极品隆。",
    female: "此命推来福不轻，家业兴隆百事成，一生衣禄皆平稳，晚景荣华享太平。",
  },
  "7.2": {
    male: "此格世界罕有生，十代积善产此人，天上紫微来照命，统治万民乐太平。",
    female: "此命推来福不轻，家业兴隆百事成，一生衣禄皆平稳，晚景荣华享太平。",
  },
};

// 月份名称
const MONTH_NAMES = ["正月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];

// 时辰选项
const SHICHEN_OPTIONS = [
  { value: "子", label: "子时 (23:00-01:00)" },
  { value: "丑", label: "丑时 (01:00-03:00)" },
  { value: "寅", label: "寅时 (03:00-05:00)" },
  { value: "卯", label: "卯时 (05:00-07:00)" },
  { value: "辰", label: "辰时 (07:00-09:00)" },
  { value: "巳", label: "巳时 (09:00-11:00)" },
  { value: "午", label: "午时 (11:00-13:00)" },
  { value: "未", label: "未时 (13:00-15:00)" },
  { value: "申", label: "申时 (15:00-17:00)" },
  { value: "酉", label: "酉时 (17:00-19:00)" },
  { value: "戌", label: "戌时 (19:00-21:00)" },
  { value: "亥", label: "亥时 (21:00-23:00)" },
];

// ============================================================================
// 算法函数
// ============================================================================

/** 将重量字符串转换为钱数 */
function weightToQian(weight: string): number {
  if (!weight || weight === "N/A") return 0;
  let total = 0;
  const liangMatch = weight.match(/(\d+)两/);
  if (liangMatch) total += parseInt(liangMatch[1]) * 10;

  const qianMatch = weight.match(/(\d+)钱/);
  if (qianMatch) total += parseInt(qianMatch[1]);

  return total;
}

/** 将钱数转换为重量字符串 */
function qianToWeight(qian: number): string {
  const liang = Math.floor(qian / 10);
  const remainingQian = qian % 10;
  if (liang === 0) return `${remainingQian}钱`;
  if (remainingQian === 0) return `${liang}两`;
  return `${liang}两${remainingQian}钱`;
}

/** 将钱数转换为小数格式的key */
function qianToKey(qian: number): string {
  return (qian / 10).toFixed(1);
}

/** 获取批语 */
function getPiyu(totalQian: number, gender: Gender): string {
  const key = qianToKey(totalQian);
  const entry = CHENGGU_PIYU[key];
  if (!entry) return "暂无此骨重的批语记录。";

  return gender === "male" ? entry.male : entry.female;
}

// ============================================================================
// 组件
// ============================================================================

export default function ChengguPage() {
  const [year, setYear] = useState(1990);
  const [month, setMonth] = useState(1);
  const [day, setDay] = useState(1);
  const [shichen, setShichen] = useState("子");
  const [gender, setGender] = useState<Gender>("male");
  const [result, setResult] = useState<{
    yearGz: string;
    yearWeight: string;
    monthWeight: string;
    dayWeight: string;
    hourWeight: string;
    totalQian: number;
    totalWeight: string;
    piyu: string;
  } | null>(null);

  const handleCalculate = () => {
    const yearGz = getYearGanZhi(year);
    const yearWeight = YEAR_WEIGHT[yearGz] ?? "N/A";
    const monthWeight = MONTH_WEIGHT[month] ?? "N/A";
    const dayWeight = DAY_WEIGHT[day] ?? "N/A";
    const hourWeight = HOUR_WEIGHT[shichen] ?? "N/A";

    const yearQian = weightToQian(yearWeight);
    const monthQian = weightToQian(monthWeight);
    const dayQian = weightToQian(dayWeight);
    const hourQian = weightToQian(hourWeight);

    const totalQian = yearQian + monthQian + dayQian + hourQian;
    const totalWeight = qianToWeight(totalQian);
    const piyu = getPiyu(totalQian, gender);

    setResult({
      yearGz,
      yearWeight,
      monthWeight,
      dayWeight,
      hourWeight,
      totalQian,
      totalWeight,
      piyu,
    });
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-center">称骨算命</h1>
      <p className="text-center text-sm text-muted-foreground">
        称骨算命法，又称袁天罡称骨法，相传为唐代著名相士袁天罡所创。根据出生年、月、日、时对应的骨重来推算命运。
      </p>

      {/* 输入区域 */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold mb-3">输入出生信息</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">出生年份</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value) || 1990)}
              className="w-full rounded-lg border px-3 py-2 text-center"
              placeholder="如 1990"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">出生月份 (农历)</label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="w-full rounded-lg border px-3 py-2"
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={i + 1} value={i + 1}>{name} ({MONTH_WEIGHT[i + 1]})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">出生日期 (农历)</label>
            <select
              value={day}
              onChange={(e) => setDay(parseInt(e.target.value))}
              className="w-full rounded-lg border px-3 py-2"
            >
              {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  初{d} ({DAY_WEIGHT[d] ?? "?"})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">出生时辰</label>
            <select
              value={shichen}
              onChange={(e) => setShichen(e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
            >
              {SHICHEN_OPTIONS.map((sc) => (
                <option key={sc.value} value={sc.value}>
                  {sc.label} ({HOUR_WEIGHT[sc.value] ?? "?"})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-muted-foreground mb-2">性别</label>
          <div className="flex gap-4">
            <button
              onClick={() => setGender("male")}
              className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${gender === "male" ? "bg-blue-100 text-blue-800 border-blue-300" : "bg-background hover:bg-accent"
                }`}
            >
              男
            </button>
            <button
              onClick={() => setGender("female")}
              className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${gender === "female" ? "bg-pink-100 text-pink-800 border-pink-300" : "bg-background hover:bg-accent"
                }`}
            >
              女
            </button>
          </div>
        </div>

        <button
          onClick={handleCalculate}
          className="w-full rounded-lg bg-primary py-3 text-primary-foreground font-medium hover:opacity-90 transition-opacity"
        >
          开始称骨
        </button>
      </div>

      {/* 结果展示 */}
      {result && (
        <div className="space-y-4">
          {/* 骨重明细 */}
          <div className="rounded-xl border bg-card p-5">
            <h2 className="font-semibold mb-4">骨重明细</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">年骨重</p>
                    <p className="text-xs text-muted-foreground">{result.yearGz}年</p>
                  </div>
                  <p className="text-xl font-bold text-primary">{result.yearWeight}</p>
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">月骨重</p>
                    <p className="text-xs text-muted-foreground">{MONTH_NAMES[month - 1]}</p>
                  </div>
                  <p className="text-xl font-bold text-primary">{result.monthWeight}</p>
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">日骨重</p>
                    <p className="text-xs text-muted-foreground">初{day}</p>
                  </div>
                  <p className="text-xl font-bold text-primary">{result.dayWeight}</p>
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">时骨重</p>
                    <p className="text-xs text-muted-foreground">{shichen}时</p>
                  </div>
                  <p className="text-xl font-bold text-primary">{result.hourWeight}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 p-4 rounded-lg bg-primary/10 text-center">
              <p className="text-sm text-muted-foreground">总骨重</p>
              <p className="text-3xl font-bold text-primary">{result.totalWeight}</p>
              <p className="text-xs text-muted-foreground mt-1">({result.totalQian}钱 / {(result.totalQian / 10).toFixed(1)}两)</p>
            </div>
          </div>

          {/* 称骨批语 */}
          <div className="rounded-xl border bg-card p-5">
            <h2 className="font-semibold mb-3">称骨批语</h2>
            <div className="flex items-center gap-2 mb-3">
              <span className={`inline-block rounded-full px-3 py-1 text-xs border ${gender === "male" ? "bg-blue-100 text-blue-800 border-blue-300" : "bg-pink-100 text-pink-800 border-pink-300"
                }`}>
                {gender === "male" ? "男命" : "女命"}
              </span>
              <span className="text-sm text-muted-foreground">{result.totalWeight} 批语</span>
            </div>
            <div className="rounded-lg border p-4 bg-muted/10">
              <p className="text-sm leading-relaxed whitespace-pre-line">{result.piyu}</p>
            </div>
          </div>

          {/* 骨重对照表 */}
          <details className="rounded-xl border bg-card p-5">
            <summary className="font-semibold cursor-pointer">称骨批语对照表 (部分)</summary>
            <div className="mt-3 space-y-2 max-h-96 overflow-y-auto">
              {Object.entries(CHENGGU_PIYU).slice(0, 20).map(([key, value]) => {
                const qian = parseFloat(key) * 10;
                return (
                  <div key={key} className={`rounded-lg border p-3 ${(result.totalQian / 10).toFixed(1) === key ? "border-primary bg-primary/5" : ""}`}>
                    <p className="text-xs font-bold text-primary">{qianToWeight(qian)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {gender === "male" ? value.male : value.female}
                    </p>
                  </div>
                );
              })}
              <p className="text-xs text-muted-foreground text-center py-2">
                以上为部分批语对照，完整批语涵盖 2两1 至 7两2，共约50条。
              </p>
            </div>
          </details>
        </div>
      )}

      {/* 免责声明 */}
      <div className="mt-8 rounded-lg border border-muted-foreground/20 bg-muted/30 p-4 text-center text-xs text-muted-foreground">
        <p className="font-medium mb-1">免责声明</p>
        <p>
          本工具仅供传统文化学习与娱乐参考，不构成任何形式的预测或建议。
          称骨算命法源于唐代袁天罡，属于传统民俗文化的一部分。
          结果仅供参考，请勿用于任何重要决策。使用者应理性看待算命结果，所有行为后果由使用者自行承担。
        </p>
      </div>
    </div>
  );
}