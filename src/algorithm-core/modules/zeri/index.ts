// 择日算法模块 - 零改动提取自 src/app/yixue/zeri/page.tsx

import { Solar } from "lunar-javascript";

// ============================================================================
// 常量
// ============================================================================

// 事项类型（对应黄历"宜"中的关键词）
const EVENT_TYPES = [
  { key: "嫁娶", label: "嫁娶", icon: "囍", yiKeywords: ["嫁娶", "结婚", "纳采", "问名", "纳征", "请期", "亲迎"] },
  { key: "开业", label: "开业/开市", icon: "营", yiKeywords: ["开市", "开业", "开张", "交易", "立券", "纳财"] },
  { key: "搬家", label: "搬家/入宅", icon: "宅", yiKeywords: ["入宅", "移徙", "搬家", "安床", "安香", "入宅移居"] },
  { key: "出行", label: "出行/旅游", icon: "行", yiKeywords: ["出行", "旅游", "旅行", "出行远方", "远行"] },
  { key: "动土", label: "动土/装修", icon: "工", yiKeywords: ["动土", "修造", "装修", "破土", "起基", "竖柱"] },
  { key: "安葬", label: "安葬/下葬", icon: "安", yiKeywords: ["安葬", "下葬", "入殓", "破土", "启钻"] },
  { key: "祭祀", label: "祭祀/祈福", icon: "祭", yiKeywords: ["祭祀", "祈福", "酬神", "拜佛", "敬神", "斋醮"] },
  { key: "签约", label: "签约/交易", icon: "契", yiKeywords: ["交易", "立券", "签约", "订盟", "纳财", "开市"] },
];

// 建除十二神吉凶
const JIANCHU_JIXIONG: Record<string, "吉" | "凶" | "中"> = {
  "建": "中", "除": "吉", "满": "中", "平": "中",
  "定": "吉", "执": "中", "破": "凶", "危": "中",
  "成": "吉", "收": "中", "开": "吉", "闭": "凶",
};

// 生肖
const SHENGXIAO = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"];

// ============================================================================
// 工具函数
// ============================================================================

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(d: Date, days: number): Date {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + days);
  return nd;
}

interface AuspiciousDay {
  date: Date;
  dateStr: string;
  weekday: string;
  lunarStr: string;
  dayGZ: string;
  shengXiao: string;
  jianChu: string;
  jianChuJiXiong: "吉" | "凶" | "中";
  yi: string[];
  ji: string[];
  chongShengXiao: string;
  chongDesc: string;
  sha: string;
  naYin: string;
  // 匹配度评分
  score: number;
  // 匹配原因
  reasons: string[];
  // 特别提示
  warnings: string[];
}

function findAuspiciousDays(eventKey: string, startDate: Date, endDate: Date, userShengXiao?: string): AuspiciousDay[] {
  const eventType = EVENT_TYPES.find(e => e.key === eventKey);
  if (!eventType) return [];

  const results: AuspiciousDay[] = [];
  const cur = new Date(startDate);
  cur.setHours(12, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(12, 0, 0, 0);

  let iterCount = 0;
  while (cur <= end && iterCount < 100) {
    iterCount++;
    try {
      const solar = Solar.fromDate(cur);
      const lunar = solar.getLunar();
      const bazi = lunar.getEightChar();

      const dayGZ = `${bazi.getDayGan()}${bazi.getDayZhi()}`;
      const yi = lunar.getDayYi() || [];
      const ji = lunar.getDayJi() || [];
      const chongShengXiao = lunar.getDayChongShengXiao() || "";
      const chongDesc = lunar.getDayChongDesc() || "";
      const sha = lunar.getDaySha() || "";
      const zhiXing = lunar.getZhiXing() || "";
      const naYin = lunar.getDayNaYin() || "";
      const shengXiao = lunar.getYearShengXiao() || "";

      // 农历日期字符串
      const lunarMonth = lunar.getMonthInChinese();
      const lunarDay = lunar.getDayInChinese();
      const weekday = solar.getWeekInChinese();
      const jieQi = lunar.getJieQi();

      // 检查是否适合该事项
      let matched = false;
      let score = 0;
      const reasons: string[] = [];
      const warnings: string[] = [];

      // 检查宜中是否包含相关关键词
      for (const kw of eventType.yiKeywords) {
        if (yi.some(y => y.includes(kw) || kw.includes(y))) {
          matched = true;
          score += 20;
          reasons.push(`黄历宜"${kw}"`);
          break;
        }
      }

      // 检查建除十二神
      const jc = zhiXing;
      const jcJX = JIANCHU_JIXIONG[jc] || "中";
      if (jcJX === "吉") {
        score += 10;
        reasons.push(`建除"${jc}"日为吉日`);
      } else if (jcJX === "凶") {
        score -= 15;
        warnings.push(`建除"${jc}"日为凶日`);
      }

      // 检查冲煞
      if (chongShengXiao) {
        if (userShengXiao && chongShengXiao === userShengXiao) {
          score -= 30;
          warnings.push(`冲生肖${chongShengXiao}（您的生肖），不宜使用`);
        } else {
          warnings.push(`冲${chongShengXiao}，属${chongShengXiao}者需避开`);
        }
      }

      // 检查忌中是否有该事项
      for (const kw of eventType.yiKeywords) {
        if (ji.some(j => j.includes(kw) || kw.includes(j))) {
          score -= 25;
          warnings.push(`黄历忌"${kw}"`);
          break;
        }
      }

      // 周末加分
      const dayOfWeek = cur.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        score += 5;
        reasons.push("周末休息日，方便行事");
      }

      // 节气日提示
      if (jieQi) {
        warnings.push(`当日为${jieQi}节气`);
      }

      // 评分归一化
      score = Math.max(0, Math.min(100, score + 50));

      // 匹配到宜中的事项或综合评分>=60则入选
      if (matched || score >= 60) {
        results.push({
          date: new Date(cur),
          dateStr: formatDate(cur),
          weekday,
          lunarStr: `农历${lunarMonth}月${lunarDay}${jieQi ? `·${jieQi}` : ""}`,
          dayGZ,
          shengXiao,
          jianChu: jc,
          jianChuJiXiong: jcJX,
          yi: yi.slice(0, 6),
          ji: ji.slice(0, 4),
          chongShengXiao,
          chongDesc,
          sha,
          naYin,
          score,
          reasons,
          warnings,
        });
      }
    } catch {
      // skip errors for individual days
    }
    cur.setDate(cur.getDate() + 1);
  }

  // 按评分排序
  results.sort((a, b) => b.score - a.score);
  return results;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#ed4d49";
  if (score >= 65) return "#00a879";
  if (score >= 50) return "#ffa500";
  return "#666";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "最佳";
  if (score >= 65) return "宜用";
  if (score >= 50) return "可用";
  return "一般";
}

export type { AuspiciousDay };
export { EVENT_TYPES, JIANCHU_JIXIONG, SHENGXIAO, findAuspiciousDays, getScoreColor, getScoreLabel, formatDate };
