"use client";

import { useState, useMemo } from "react";
import {
  GAN, ZHI, KONGWANG_BY_XUN, JIAZI_TABLE,
  getKongwang, calcKongwang, getJiaziIndex,
} from "@/algorithm-core";
import type { TianGan, DiZhi } from "@/algorithm-core";
import EventDivinationPanel from "@/components/EventDivinationPanel";

import { ShareButton } from "@/components/ShareButton";
const XUN_NAMES = ['甲子旬', '甲戌旬', '甲申旬', '甲午旬', '甲辰旬', '甲寅旬'];
const XUN_RANGES = [
  '甲子 → 癸酉', '甲戌 → 癸未', '甲申 → 癸巳',
  '甲午 → 癸卯', '甲辰 → 癸丑', '甲寅 → 癸亥',
];

export default function KongWangPage() {
  const [selectedGan, setSelectedGan] = useState<string>("甲");
  const [selectedZhi, setSelectedZhi] = useState<string>("子");

  const result = useMemo(() => {
    const ganzhi = `${selectedGan}${selectedZhi}`;
    const idx = getJiaziIndex(ganzhi);
    if (idx === -1) {
      return { error: "无效的干支组合（需阳干配阳支、阴干配阴支）" };
    }
    const kw = calcKongwang(selectedGan as TianGan, selectedZhi as DiZhi) || "";
    const xunIndex = Math.floor(idx / 10);
    const xunName = XUN_NAMES[xunIndex];
    const xunRange = XUN_RANGES[xunIndex];
    const kwChars = kw.split("");
    return {
      ganzhi,
      idx,
      kongwang: kw,
      xunName,
      xunRange,
      xunIndex,
      kwZhi1: kwChars[0] || "",
      kwZhi2: kwChars[1] || "",
      error: null,
    };
  }, [selectedGan, selectedZhi]);

  const xunTableData = useMemo(() => {
    return XUN_NAMES.map((name, i) => {
      const startIdx = i * 10;
      const endIdx = startIdx + 9;
      const ganzhiList = JIAZI_TABLE.slice(startIdx, endIdx + 1);
      const kw = KONGWANG_BY_XUN[i] || "";
      return {
        xunName: name,
        range: XUN_RANGES[i],
        ganzhiList,
        kongwang: kw,
        startIdx: startIdx + 1,
        endIdx: endIdx + 1,
      };
    });
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-4">
      <h1 className="text-xl font-bold text-primary mb-4">空亡查询</h1>

      {/* 输入区域 */}
      <div className="rounded-xl border bg-card p-4 mb-4">
        <p className="mb-3 text-sm font-medium text-muted-foreground">选择干支查询空亡</p>
        <div className="flex gap-3 items-end mb-4">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-muted-foreground">天干</label>
            <select
              value={selectedGan}
              onChange={(e) => setSelectedGan(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
            >
              {GAN.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs text-muted-foreground">地支</label>
            <select
              value={selectedZhi}
              onChange={(e) => setSelectedZhi(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
            >
              {ZHI.map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>
        </div>

        {result && (
          <>
            {result.error ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <p className="text-sm text-destructive">{result.error}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  提示：阳干（甲丙戊庚壬）只能配阳支（子寅辰午申戌），阴干（乙丁己辛癸）只能配阴支（丑卯巳未酉亥）。
                </p>
              </div>
            ) : (
              <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">查询干支</span>
                  <span className="text-lg font-bold">{result.ganzhi}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">所属旬</span>
                  <span className="text-sm font-semibold text-primary">{result.xunName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">旬内范围</span>
                  <span className="text-sm text-muted-foreground">{result.xunRange}</span>
                </div>
                <div className="rounded-lg border-2 border-orange-300 bg-orange-50 p-3">
                  <div className="text-center">
                    <p className="text-xs text-orange-600 mb-1">空亡地支</p>
                    <p className="text-2xl font-bold text-orange-700">
                      {result.kongwang}
                    </p>
                    <p className="mt-1 text-xs text-orange-600/70">
                      即{result.kwZhi1}和{result.kwZhi2}为空亡
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 空亡说明 */}
      <div className="rounded-xl border bg-card p-4 mb-4">
        <h3 className="mb-2 text-sm font-semibold">什么是空亡</h3>
        <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
          <p>
            六十甲子每十个干支为一旬，共六旬。每旬中，有两个地支不在该旬内出现，这两个地支即为该旬的"空亡"。
          </p>
          <p>
            空亡表示虚而不实，有若无、实若虚的状态。在八字命理中，空亡所在之柱代表该方面运势较虚、不实，或容易落空。
          </p>
          <p>
            空亡的口诀：<strong>甲子旬空戌亥，甲戌旬空申酉，甲申旬空午未，甲午旬空辰巳，甲辰旬空寅卯，甲寅旬空子丑。</strong>
          </p>
        </div>
      </div>

      {/* 六旬空亡完整表 */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="border-b bg-muted/30 px-4 py-2">
          <p className="text-xs font-medium text-muted-foreground">六旬空亡表</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs">
            <thead>
              <tr className="border-b bg-muted/20">
                <th className="py-2 px-2 text-muted-foreground">旬</th>
                <th className="py-2 px-2 text-muted-foreground">范围</th>
                <th className="py-2 px-2 text-muted-foreground">旬内干支</th>
                <th className="py-2 px-2 text-muted-foreground">空亡</th>
              </tr>
            </thead>
            <tbody>
              {xunTableData.map((xun, i) => (
                <tr key={i} className="border-b hover:bg-accent/20 transition-colors">
                  <td className="py-2 px-2">
                    <span className="font-semibold text-primary">{xun.xunName}</span>
                    <br />
                    <span className="text-[10px] text-muted-foreground">第{xun.startIdx}-{xun.endIdx}位</span>
                  </td>
                  <td className="py-2 px-2 text-muted-foreground">{xun.range}</td>
                  <td className="py-2 px-2">
                    <div className="flex flex-wrap gap-1 justify-center">
                      {xun.ganzhiList.map((gz, j) => (
                        <span key={j} className="text-xs">{gz}</span>
                      ))}
                    </div>
                  </td>
                  <td className="py-2 px-2">
                    <span className="inline-block rounded-full bg-orange-100 border border-orange-300 px-2 py-0.5 text-orange-700 font-bold">
                      {xun.kongwang}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 空亡应用场景 */}
      <div className="mt-4 rounded-xl border bg-card p-4">
        <h3 className="mb-2 text-sm font-semibold">空亡的实际应用</h3>
        <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
          <p><strong>年柱空亡</strong>：祖上根基较浅，或与祖辈缘分淡薄。</p>
          <p><strong>月柱空亡</strong>：父母或兄弟缘薄，青年运势多有不实。</p>
          <p><strong>日柱空亡</strong>：婚姻感情易有波折，夫妻缘薄；日支空亡更为明显。</p>
          <p><strong>时柱空亡</strong>：子女缘薄，晚年运势浮沉。</p>
          <p className="text-muted-foreground/70">注意：空亡亦有"逢空不空"之说，若空亡被合、被冲、被填实，则其虚性减弱。</p>
        </div>
      </div>

      {/* AI智能解读 */}
      {result && !result.error && (
        <EventDivinationPanel
          toolName="空亡查询"
          chartContext={`查询干支: ${result.ganzhi}\n六十甲子序号: 第${(result.idx ?? 0) + 1}位\n所属旬: ${result.xunName}\n旬内范围: ${result.xunRange}\n空亡地支: ${result.kongwang}\n空亡详解: ${result.kwZhi1}和${result.kwZhi2}为空亡，表示虚而不实`}
          isPaidTool={false}
        />
      )}
      {/* 分享排盘结果 */}
      <div className="px-3 py-2">
        <ShareButton
          type="tool"
          title="空亡查询结果"
          description="空亡查询"
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