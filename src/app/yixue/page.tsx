"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { solarToLunar, getLunarDateString } from "@/lib/lunar";
import { solarToBazi, GAN, ZHI } from "@/algorithm-core";
import { isIOSNative } from "@/lib/platformGate";

// 五行颜色映射
const WUXING_COLOR: Record<string, string> = {
  "金": "text-[#ffa500]",
  "木": "text-[#00a879]",
  "水": "text-[#0074e4]",
  "火": "text-[#9B5ECF]",
  "土": "text-[#a64b00]",
};

// 天干五行
const GAN_WUXING_MAP: Record<string, string> = {
  "甲": "木", "乙": "木", "丙": "火", "丁": "火", "戊": "土",
  "己": "土", "庚": "金", "辛": "金", "壬": "水", "癸": "水",
};

// 地支五行
const ZHI_WUXING_MAP: Record<string, string> = {
  "子": "水", "丑": "土", "寅": "木", "卯": "木", "辰": "土", "巳": "火",
  "午": "火", "未": "土", "申": "金", "酉": "金", "戌": "土", "亥": "水",
};

// 对标 jishiyu 的 15 个工具（按原顺序）
const TOOLS = [
  { href: "/yixue/bazi", label: "八字排盘", icon: "bazi" },
  { href: "/yixue/qimen", label: "奇门遁甲", icon: "qimen" },
  { href: "/yixue/ziwei", label: "紫微斗数", icon: "ziwei" },
  { href: "/yixue/liuyao", label: "六爻", icon: "6yao" },
  { href: "/yixue/meihua", label: "梅花易数", icon: "meihua" },
  { href: "/yixue/daliuren", label: "大六壬", icon: "6ren" },
  { href: "/yixue/xiaoliuren", label: "小六壬", icon: "x6ren" },
  { href: "/yixue/taiyi-sanshi", label: "太乙三式", icon: "qimen3shi" },
  { href: "/yixue/xuankong-feixing", label: "玄空飞星", icon: "xuankong" },
  { href: "/yixue/compass", label: "专业罗盘", icon: "compass" },
  { href: "/yixue/qizheng", label: "七政四余", icon: "qizheng" },
  { href: "/yixue/liji", label: "立极尺", icon: "liji" },
  { href: "/yixue/luban", label: "鲁班尺", icon: "luban" },
  { href: "/yixue/yizhangjing", label: "达摩一掌经", icon: "yizhangjing" },
  { href: "/yixue/wannianli", label: "万年历", icon: "gongli" },
  { href: "/yixue/huangli", label: "老黄历", icon: "huangli" },
  { href: "/yixue/hehun", label: "八字合婚", icon: "hehun" },
  { href: "/yixue/name", label: "姓名解析", icon: "name" },
  { href: "/yixue/qiming", label: "智能起名", icon: "qiming" },
  { href: "/yixue/phone", label: "手机号码解析", icon: "mobile" },
  { href: "/yixue/carplate", label: "车牌号民俗解读", icon: "car" },
  { href: "/yixue/zeri", label: "择日", icon: "zeri" },
  { href: "/yixue/astro", label: "占星术", icon: "astro" },
  { href: "/yixue/tarot", label: "塔罗牌", icon: "tarot" },
  { href: "/yixue/jiemeng", label: "周公解梦", icon: "meng" },
  { href: "/yixue/jieqi", label: "二十四节气", icon: "jieqi" },
];

// ============ IOS-4.3B-RECOVERY：iOS 版易学学习中心 ============
// iOS 正式产品 Profile：易学板块定位为「易学学习中心」（COURSE/KNOWLEDGE/REFERENCE/QUIZ），
// 不提供排盘/预测工具入口。九大学科 + 历法工具 + 学习闭环，全部为真实学习功能。
// Web/Android 保持完整排盘工具版，完全不变。

const IOS_SUBJECTS = [
  { key: "yixue_basic", name: "易学基础", desc: "阴阳五行 · 太极两仪 · 河图洛书 · 易经源流", icon: "易" },
  { key: "bazi", name: "八字基础", desc: "天干地支 · 四柱结构 · 十神 · 排盘原理", icon: "八" },
  { key: "ziwei", name: "紫微斗数基础", desc: "十二宫 · 十四主星 · 辅星 · 四化", icon: "紫" },
  { key: "qizheng", name: "七政四余", desc: "七政四余 · 星曜 · 二十八宿 · 十二宫位", icon: "政" },
  { key: "qimen", name: "奇门基础", desc: "九宫八卦 · 八门九星 · 三奇六仪", icon: "奇" },
  { key: "liuyao", name: "六爻基础", desc: "卦象装纳 · 六亲世应 · 用神", icon: "爻" },
  { key: "meihua", name: "梅花易数基础", desc: "体用生克 · 卦气旺衰 · 断卦步骤", icon: "梅" },
  { key: "daliuren", name: "大六壬基础", desc: "四课三传 · 神将 · 课体结构", icon: "壬" },
  { key: "calendar", name: "传统历法", desc: "农历节气 · 干支纪年 · 岁时节令", icon: "历" },
];

const IOS_TOOLS = [
  { href: "/yixue/wannianli", label: "万年历", icon: "历" },
  { href: "/yixue/huangli", label: "老黄历", icon: "黄" },
  { href: "/yixue/jieqi", label: "二十四节气", icon: "节" },
  { href: "/yixue/compass", label: "专业罗盘", icon: "罗" },
  { href: "/yixue/liji", label: "立极尺", icon: "极" },
  { href: "/yixue/luban", label: "鲁班尺", icon: "鲁" },
];

const IOS_STUDY_LOOP = [
  { href: "/academy/learn?track=yixue", label: "章节学习", icon: "📖", desc: "知识点 · 打卡进度" },
  { href: "/academy/question-bank?track=yixue", label: "章节练习", icon: "✏️", desc: "单选 · 多选 · 判断" },
  { href: "/academy/wrong-book", label: "错题复习", icon: "📝", desc: "错题重练 · 巩固" },
  { href: "/academy/favorites", label: "我的收藏", icon: "⭐", desc: "收藏知识点与题目" },
];

// 简化图标（用文字替代图标，后续第二步替换为真实图标）
function ToolIcon({ icon }: { icon: string }) {
  const iconMap: Record<string, string> = {
    bazi: "八",
    mingli: "命",
    yinpan: "阴",
    qimen: "奇",
    ziwei: "紫",
    "6yao": "爻",
    meihua: "梅",
    "6ren": "壬",
    x6ren: "小",
    qimen6ren: "穿",
    qimen3shi: "式",
    shanxiang: "山",
    xuankong: "玄",
    compass: "罗",
    qizheng: "政",
    liji: "极",
    luban: "鲁",
    yizhangjing: "经",
    gongli: "历",
    huangli: "黄",
    hehun: "合",
    name: "姓",
    qiming: "起",
    mobile: "号",
    car: "车",
    zeri: "日",
    astro: "星",
    tarot: "塔",
    meng: "梦",
    jieqi: "节",
  };
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#7B2FBE] text-xs font-bold text-white">
      {iconMap[icon] || "?"}
    </div>
  );
}

export default function YixueHome() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const iosProfile = mounted && isIOSNative();

  const todayData = useMemo(() => {
    const now = mounted ? new Date() : new Date(2026, 0, 1, 12, 0, 0);
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const hour = now.getHours();

    const gongliStr = `${year}年${month}月`;
    const dayNum = day;
    const weekDays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
    const weekDay = weekDays[now.getDay()];

    // 农历
    const lunar = solarToLunar(year, month, day);
    const nongliStr = getLunarDateString(lunar);

    // 四柱
    let yearGan = "甲", yearZhi = "子", monthGan = "甲", monthZhi = "子",
      dayGan = "甲", dayZhi = "子", hourGan = "甲", hourZhi = "子";
    let dayPillars = "";

    try {
      const bz = solarToBazi({ year, month, day, hour, gender: "male" });
      if (bz && bz.pillars) {
        yearGan = bz.pillars[0]?.gan || "甲";
        yearZhi = bz.pillars[0]?.zhi || "子";
        monthGan = bz.pillars[1]?.gan || "甲";
        monthZhi = bz.pillars[1]?.zhi || "子";
        dayGan = bz.pillars[2]?.gan || "甲";
        dayZhi = bz.pillars[2]?.zhi || "子";
        hourGan = bz.pillars[3]?.gan || "甲";
        hourZhi = bz.pillars[3]?.zhi || "子";
        dayPillars = bz.pillars.map((p: { ganzhi: string }) => p.ganzhi).join(" ");
      }
    } catch {
      const ganIdx = (year - 4) % 10;
      const zhiIdx = (year - 4) % 12;
      yearGan = GAN[ganIdx >= 0 ? ganIdx : ganIdx + 10] || "甲";
      yearZhi = ZHI[zhiIdx >= 0 ? zhiIdx : zhiIdx + 12] || "子";
    }

    const pillars = [
      { label: "年", gan: yearGan, zhi: yearZhi },
      { label: "月", gan: monthGan, zhi: monthZhi },
      { label: "日", gan: dayGan, zhi: dayZhi },
      { label: "时", gan: hourGan, zhi: hourZhi },
    ];

    return {
      gongliStr,
      dayNum,
      weekDay,
      nongliStr,
      pillars,
    };
  }, [mounted]);

  const { gongliStr, dayNum, weekDay, nongliStr, pillars } = todayData;

  // ============ iOS 版：易学学习中心 ============
  if (iosProfile) {
    return (
      <div className="mx-auto w-full" style={{ maxWidth: "420px" }}>
        {/* 今日干支（传统历法数据，仅展示，不链接排盘） */}
        <div
          className="grid w-full bg-[#eee] px-2 py-1.5"
          style={{
            gridTemplateColumns: "50% 12.5% 12.5% 12.5% 12.5%",
            height: "80px",
          }}
        >
          <div className="grid h-full" style={{ gridTemplateColumns: "35% 65%" }}>
            <div className="flex flex-col items-center justify-center">
              <span className="text-xs text-gray-500">今日</span>
              <span
                className="text-[45px] font-bold leading-[50px]"
                style={{ color: "#7B2FBE" }}
              >
                {dayNum}
              </span>
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-xs text-gray-500">{gongliStr}</span>
              <span className="text-[15px] font-medium">{nongliStr}</span>
              <span className="text-[15px]">{weekDay}</span>
            </div>
          </div>
          {pillars.map((p, i) => (
            <div
              key={i}
              className="flex flex-col items-center justify-center"
            >
              <span className="text-xs text-gray-500">{p.label}</span>
              <span className={`text-[15px] font-bold ${WUXING_COLOR[GAN_WUXING_MAP[p.gan] || ""] || ""}`}>
                {p.gan}
              </span>
              <span className={`text-[15px] font-bold ${WUXING_COLOR[ZHI_WUXING_MAP[p.zhi] || ""] || ""}`}>
                {p.zhi}
              </span>
            </div>
          ))}
        </div>

        <div className="overflow-hidden bg-[#f5f5f5] px-4 py-1.5">
          <p className="text-center text-xs text-gray-500">
            易学启蒙 · 系统学习传统文化
          </p>
        </div>

        {/* 学科目录 */}
        <div className="px-3 pt-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-800">易学学习中心</h2>
            <Link href="/academy" className="text-xs" style={{ color: "#7B2FBE" }}>
              全部学堂 ›
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {IOS_SUBJECTS.map((s) => (
              <Link
                key={s.key}
                href={`/academy/yixue/${s.key}`}
                className="flex items-center gap-2.5 rounded-2xl bg-white p-3 shadow-sm active:opacity-90"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-bold text-white" style={{ backgroundColor: "#7B2FBE" }}>
                  {s.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{s.name}</p>
                  <p className="truncate text-[10px] text-gray-500">{s.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 学习闭环 */}
        <div className="px-3 pt-4">
          <h2 className="mb-2 text-base font-bold text-gray-800">学习闭环</h2>
          <div className="grid grid-cols-4 gap-2">
            {IOS_STUDY_LOOP.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                className="flex flex-col items-center gap-1 rounded-2xl bg-white py-3 shadow-sm active:opacity-90"
              >
                <span className="text-xl">{it.icon}</span>
                <span className="text-xs font-medium text-gray-700">{it.label}</span>
                <span className="px-1 text-center text-[9px] leading-tight text-gray-400">{it.desc}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* 传统历法与工具 */}
        <div className="px-3 pt-4 pb-2">
          <h2 className="mb-2 text-base font-bold text-gray-800">传统历法与工具</h2>
          <div className="flex flex-wrap justify-center gap-1.5 px-0 py-1">
            {IOS_TOOLS.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="flex w-[70px] flex-col items-center gap-1 rounded-[15px] bg-[#eee] py-2.5 text-center shadow-[0_2px_5px_#888888] transition-all active:scale-[0.96] active:shadow-sm"
              >
                <ToolIcon icon={tool.icon} />
                <span className="text-xs font-medium text-gray-700">{tool.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* 免责声明 */}
        <div className="mt-4 px-4 pb-4 text-center text-[11px] text-gray-400">
          <p>易学学习中心提供课程、典籍、术语与练习，供传统文化学习研究。</p>
          <p className="mt-1">言道 · 传承中华智慧</p>
        </div>
      </div>
    );
  }

  // ============ Web/Android 版：完整排盘工具版（保持不变） ============
  return (
    <div className="mx-auto w-full" style={{ maxWidth: "420px" }}>
      {/* 对标 jishiyu app-day-info: 5列 grid */}
      <div
        className="grid w-full bg-[#eee] px-2 py-1.5"
        style={{
          gridTemplateColumns: "50% 12.5% 12.5% 12.5% 12.5%",
          height: "80px",
        }}
      >
        {/* 左侧：今日日期 */}
        <div className="grid h-full" style={{ gridTemplateColumns: "35% 65%" }}>
          <div className="flex flex-col items-center justify-center">
            <span className="text-xs text-gray-500">今日</span>
            <span
              className="text-[45px] font-bold leading-[50px]"
              style={{ color: "#7B2FBE" }}
            >
              {dayNum}
            </span>
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-xs text-gray-500">{gongliStr}</span>
            <span className="text-[15px] font-medium">{nongliStr}</span>
            <span className="text-[15px]">{weekDay}</span>
          </div>
        </div>

        {/* 右侧4列：干支 */}
        {pillars.map((p, i) => (
          <Link
            key={i}
            href="/yixue/bazi"
            className="flex flex-col items-center justify-center"
          >
            <span className="text-xs text-gray-500">{p.label}</span>
            <span className={`text-[15px] font-bold ${WUXING_COLOR[GAN_WUXING_MAP[p.gan] || ""] || ""}`}>
              {p.gan}
            </span>
            <span className={`text-[15px] font-bold ${WUXING_COLOR[ZHI_WUXING_MAP[p.zhi] || ""] || ""}`}>
              {p.zhi}
            </span>
          </Link>
        ))}
      </div>

      {/* 对标 jishiyu Banner 通知栏 */}
      <div className="overflow-hidden bg-[#f5f5f5] px-4 py-1.5">
        <p className="text-center text-xs text-gray-500">
          一卦知天命，数理定乾坤
        </p>
      </div>

      {/* 对标 jishiyu 排盘按钮面板：18个工具 */}
      <div className="flex flex-wrap justify-center gap-1.5 px-2 py-3">
        {TOOLS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="flex w-[70px] flex-col items-center gap-1 rounded-[15px] bg-[#eee] py-2.5 text-center shadow-[0_2px_5px_#888888] transition-all active:scale-[0.96] active:shadow-sm"
          >
            <ToolIcon icon={tool.icon} />
            <span className="text-xs font-medium text-gray-700">{tool.label}</span>
          </Link>
        ))}
      </div>

      

      {/* 免责声明（对标 jishiyu 底部） */}
      <div className="mt-4 px-4 pb-4 text-center text-[11px] text-gray-400">
        <p>本页面内容仅供传统文化学习与参考，不构成任何人生决策建议。</p>
        <p className="mt-1">言道 · 传承中华智慧</p>
      </div>
    </div>
  );
}
