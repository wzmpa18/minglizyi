"use client";

import { useState, useMemo, useEffect } from "react";
import { JIEQI_NAMES, JIE_NAMES, getJieQiDate } from "@/algorithm-core";

import { ShareButton } from "@/components/ShareButton";
const JIE_SET = new Set(JIE_NAMES);

const JIEQI_INFO: Record<string, { season: string; meaning: string }> = {
  '立春': { season: '春', meaning: '春季开始，万物复苏' },
  '雨水': { season: '春', meaning: '降水增多，草木萌动' },
  '惊蛰': { season: '春', meaning: '春雷乍动，蛰虫惊醒' },
  '春分': { season: '春', meaning: '昼夜平分，阴阳平衡' },
  '清明': { season: '春', meaning: '气清景明，万物皆显' },
  '谷雨': { season: '春', meaning: '雨生百谷，播种移苗' },
  '立夏': { season: '夏', meaning: '夏季开始，万物繁茂' },
  '小满': { season: '夏', meaning: '麦类灌浆，小得盈满' },
  '芒种': { season: '夏', meaning: '有芒作物成熟，夏种开始' },
  '夏至': { season: '夏', meaning: '白昼最长，阳极阴生' },
  '小暑': { season: '夏', meaning: '暑气渐盛，尚未极热' },
  '大暑': { season: '夏', meaning: '一年中最热时期' },
  '立秋': { season: '秋', meaning: '秋季开始，暑去凉来' },
  '处暑': { season: '秋', meaning: '暑气消退，秋意渐浓' },
  '白露': { season: '秋', meaning: '天气转凉，露凝而白' },
  '秋分': { season: '秋', meaning: '昼夜平分，秋收时节' },
  '寒露': { season: '秋', meaning: '露水更冷，即将结冰' },
  '霜降': { season: '秋', meaning: '天气渐冷，初霜出现' },
  '立冬': { season: '冬', meaning: '冬季开始，万物收藏' },
  '小雪': { season: '冬', meaning: '开始降雪，雪量不大' },
  '大雪': { season: '冬', meaning: '降雪量增大，积雪可期' },
  '冬至': { season: '冬', meaning: '白昼最短，阴极阳生' },
  '小寒': { season: '冬', meaning: '进入严寒，尚未极冷' },
  '大寒': { season: '冬', meaning: '一年中最冷时期' },
};

const SEASON_COLORS: Record<string, string> = {
  '春': 'bg-emerald-50 border-emerald-300 text-emerald-800',
  '夏': 'bg-red-50 border-red-300 text-red-800',
  '秋': 'bg-amber-50 border-amber-300 text-amber-800',
  '冬': 'bg-blue-50 border-blue-300 text-blue-800',
};

const MONTH_NAMES = ['寅月', '卯月', '辰月', '巳月', '午月', '未月', '申月', '酉月', '戌月', '亥月', '子月', '丑月'];

export default function JieQiPage() {
  const [year, setYear] = useState(2026);
  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  const jieQiList = useMemo(() => {
    return JIEQI_NAMES.map((name, idx) => {
      const date = getJieQiDate(year, idx);
      const isJie = JIE_SET.has(name);
      const info = JIEQI_INFO[name] || { season: '', meaning: '' };
      return {
        index: idx,
        name,
        date,
        isJie,
        season: info.season,
        meaning: info.meaning,
        monthLabel: isJie ? MONTH_NAMES[JIE_NAMES.indexOf(name)] : null,
      };
    });
  }, [year]);

  const jieCount = jieQiList.filter((j) => j.isJie).length;
  const qiCount = jieQiList.filter((j) => !j.isJie).length;

  return (
    <div className="mx-auto max-w-2xl px-4 py-4">
      <h1 className="text-xl font-bold text-primary mb-4">节气查询</h1>

      {/* 年份选择器 */}
      <div className="rounded-xl border bg-card p-4 mb-4">
        <label className="mb-2 block text-sm font-medium text-muted-foreground">选择年份</label>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setYear((y) => Math.max(1900, y - 1))}
            className="rounded-lg border px-3 py-2 text-sm hover:bg-accent transition-colors"
          >
            &lt; 上一年
          </button>
          <input
            type="number"
            min={1900}
            max={2100}
            value={year}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              if (!isNaN(v) && v >= 1900 && v <= 2100) setYear(v);
            }}
            className="w-24 rounded-lg border bg-background px-3 py-2 text-center text-lg font-bold outline-none focus:border-primary/50"
          />
          <button
            onClick={() => setYear((y) => Math.min(2100, y + 1))}
            className="rounded-lg border px-3 py-2 text-sm hover:bg-accent transition-colors"
          >
            下一年 &gt;
          </button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">范围：1900年 - 2100年</p>
      </div>

      {/* 统计概览 */}
      <div className="mb-4 flex gap-3">
        <div className="flex-1 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-center">
          <p className="text-xs text-emerald-600">十二节</p>
          <p className="text-lg font-bold text-emerald-700">{jieCount}</p>
          <p className="text-[10px] text-emerald-600/70">月令分界点</p>
        </div>
        <div className="flex-1 rounded-lg border border-blue-300 bg-blue-50 p-3 text-center">
          <p className="text-xs text-blue-600">十二气</p>
          <p className="text-lg font-bold text-blue-700">{qiCount}</p>
          <p className="text-[10px] text-blue-600/70">节气中点</p>
        </div>
      </div>

      {/* 节气列表 */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="border-b bg-muted/30 px-4 py-2">
          <p className="text-xs font-medium text-muted-foreground">
            {year}年 二十四节气一览
          </p>
        </div>
        <div className="divide-y">
          {jieQiList.map((jq) => {
            const padMonth = String(jq.date.getMonth() + 1).padStart(2, '0');
            const padDay = String(jq.date.getDate()).padStart(2, '0');
            return (
              <div
                key={jq.index}
                className={`flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent/30 ${
                  jq.isJie ? 'border-l-[3px] border-l-rose-400' : ''
                }`}
              >
                {/* 序号 */}
                <span className="w-6 text-center text-xs text-muted-foreground">
                  {jq.index + 1}
                </span>
                {/* 标签 */}
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    jq.isJie
                      ? 'bg-rose-100 text-rose-700 border border-rose-300'
                      : 'bg-sky-100 text-sky-700 border border-sky-300'
                  }`}
                >
                  {jq.isJie ? '节' : '气'}
                </span>
                {/* 名称 */}
                <span className="w-14 font-semibold text-sm">{jq.name}</span>
                {/* 月份标注 */}
                {jq.monthLabel && (
                  <span className="text-[10px] text-rose-500 font-medium min-w-[2rem]">
                    {jq.monthLabel}
                  </span>
                )}
                {!jq.monthLabel && <span className="min-w-[2rem]" />}
                {/* 日期 */}
                <span className="text-sm font-mono text-muted-foreground">
                  {padMonth}/{padDay}
                </span>
                {/* 季节 */}
                <span
                  className={`ml-auto shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${SEASON_COLORS[jq.season] || 'bg-gray-50 border-gray-300 text-gray-600'}`}
                >
                  {jq.season}
                </span>
                {/* 含义 */}
                <span className="hidden sm:inline text-xs text-muted-foreground/60 truncate max-w-[120px]">
                  {jq.meaning}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 节与气的说明 */}
      <div className="mt-4 rounded-xl border bg-card p-4">
        <h3 className="mb-2 text-sm font-semibold">节与气的区别</h3>
        <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
          <p>
            <span className="inline-block rounded bg-rose-100 px-1.5 py-0.5 text-rose-700 font-medium">节</span>
            <strong>（十二节）</strong>：立春、惊蛰、清明、立夏、芒种、小暑、立秋、白露、寒露、立冬、大雪、小寒。节是月令的分界点，在八字命理中，每到一个"节"即进入下一个月份，月柱随之改变。
          </p>
          <p>
            <span className="inline-block rounded bg-sky-100 px-1.5 py-0.5 text-sky-700 font-medium">气</span>
            <strong>（十二气）</strong>：雨水、春分、谷雨、小满、夏至、大暑、处暑、秋分、霜降、小雪、冬至、大寒。气是节气的中点，标志每个节气时段内的气候特征。
          </p>
          <p className="text-muted-foreground/70">
            古人将二十四节气分为"节"与"气"两类，交替排列。在八字推算中，月份的更替以"节"为准，而非农历初一或公历1日。
          </p>
        </div>
      </div>
      {/* 分享排盘结果 */}
      <div className="px-3 py-2">
        <ShareButton
          type="tool"
          title="二十四节气查询结果"
          description="二十四节气"
          variant="block"
          label="分享排盘结果"
        />
      </div>


      {/* 免责声明 */}
      <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
        <p className="text-xs text-muted-foreground leading-relaxed">
          免责声明：本页面内容仅供传统文化学习与参考，不构成任何决策建议。
        </p>
      </div>
    </div>
  );
}