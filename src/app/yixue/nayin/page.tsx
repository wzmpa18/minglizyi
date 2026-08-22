"use client";

import { useState, useMemo } from "react";
import {
  GAN, ZHI, JIAZI_TABLE, NAYIN_TABLE,
  getNayinWuxing, calcNayin, getNayinElement, getJiaziIndex,
} from "@/algorithm-core";
import type { TianGan, DiZhi } from "@/algorithm-core";
import EventDivinationPanel from "@/components/EventDivinationPanel";

import { ShareButton } from "@/components/ShareButton";
const WUXING_COLORS: Record<string, string> = {
  '金': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  '木': 'bg-green-100 text-green-800 border-green-300',
  '水': 'bg-blue-100 text-blue-800 border-blue-300',
  '火': 'bg-red-100 text-red-800 border-red-300',
  '土': 'bg-amber-100 text-amber-800 border-amber-300',
};

const NAYIN_GROUP_NAMES = [
  '海中金', '炉中火', '大林木', '路旁土', '剑锋金',
  '山头火', '涧下水', '城头土', '白蜡金', '杨柳木',
  '泉中水', '屋上土', '霹雳火', '松柏木', '长流水',
  '沙中金', '山下火', '平地木', '壁上土', '金箔金',
  '覆灯火', '天河水', '大驿土', '钗钏金', '桑柘木',
  '大溪水', '沙中土', '天上火', '石榴木', '大海水',
];

export default function NaYinPage() {
  const [selectedGan, setSelectedGan] = useState<string>("甲");
  const [selectedZhi, setSelectedZhi] = useState<string>("子");

  const result = useMemo(() => {
    const ganzhi = `${selectedGan}${selectedZhi}`;
    const idx = getJiaziIndex(ganzhi);
    if (idx === -1) {
      return { error: "无效的干支组合（需阳干配阳支、阴干配阴支）" };
    }
    const nayin = calcNayin(selectedGan as TianGan, selectedZhi as DiZhi) || "";
    const nayinElement = getNayinElement(nayin) || "";
    return {
      ganzhi,
      idx,
      nayin,
      nayinElement,
      error: null,
    };
  }, [selectedGan, selectedZhi]);

  const nayinTableData = useMemo(() => {
    // 30行，每行2组干支
    const rows: Array<{
      index: number;
      groupName: string;
      pair1: { ganzhi: string; idx: number };
      pair2: { ganzhi: string; idx: number };
      element: string;
    }> = [];
    for (let i = 0; i < 30; i++) {
      const gz1 = JIAZI_TABLE[i * 2];
      const gz2 = JIAZI_TABLE[i * 2 + 1];
      const nayin = NAYIN_TABLE[gz1] || "";
      const el = getNayinElement(nayin) || "";
      rows.push({
        index: i + 1,
        groupName: nayin,
        pair1: { ganzhi: gz1, idx: i * 2 + 1 },
        pair2: { ganzhi: gz2, idx: i * 2 + 2 },
        element: el,
      });
    }
    return rows;
  }, []);

  const nayinGroups = useMemo(() => {
    return NAYIN_GROUP_NAMES.map((name) => ({
      name,
      element: getNayinElement(name) || "",
    }));
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-4">
      <h1 className="text-xl font-bold text-primary mb-4">纳音查询</h1>

      {/* 输入区域 */}
      <div className="rounded-xl border bg-card p-4 mb-4">
        <p className="mb-3 text-sm font-medium text-muted-foreground">选择干支查询纳音五行</p>
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
                  <span className="text-sm text-muted-foreground">六十甲子序号</span>
                  <span className="text-sm text-muted-foreground">第{(result.idx ?? 0) + 1}位</span>
                </div>
                <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-3">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">纳音</p>
                    <p className="text-xl font-bold text-primary">{result.nayin}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">纳音五行</span>
                  <span className={`inline-block rounded-full border px-2 py-0.5 text-sm font-medium ${WUXING_COLORS[result.nayinElement ?? ''] || ''}`}>
                    {result.nayinElement}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* AI智能解读 */}
      {result && !result.error && (
        <EventDivinationPanel
          toolName="纳音五行"
          chartContext={`查询干支: ${result.ganzhi}\n六十甲子序号: 第${(result.idx ?? 0) + 1}位\n纳音: ${result.nayin}\n纳音五行: ${result.nayinElement}`}
          isPaidTool={false}
        />
      )}

      {/* 纳音说明 */}
      <div className="rounded-xl border bg-card p-4 mb-4">
        <h3 className="mb-2 text-sm font-semibold">什么是纳音</h3>
        <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
          <p>
            纳音是古代五行学说的一种重要应用，将六十甲子与五行、音律相结合，形成六十种纳音。每两个干支共用一个纳音，共三十组。
          </p>
          <p>
            纳音的名称通常由三个字组成，前两字描述事物或场景，第三字为五行属性。例如"海中金"表示深藏于海中的金，"炉中火"表示炉中燃烧的火。
          </p>
          <p>
            在八字命理中，纳音可以用来判断命局的五行属性以及年柱的纳音五行对命局的影响。
          </p>
        </div>
      </div>

      {/* 30组纳音概览 */}
      <div className="rounded-xl border bg-card overflow-hidden mb-4">
        <div className="border-b bg-muted/30 px-4 py-2">
          <p className="text-xs font-medium text-muted-foreground">三十纳音分组</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3">
          {nayinGroups.map((group, i) => (
            <div
              key={i}
              className={`rounded-lg border px-2 py-1.5 text-center ${WUXING_COLORS[group.element] || 'bg-gray-50 border-gray-300'}`}
            >
              <span className="text-xs font-medium">{group.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 六十甲子纳音完整表 */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="border-b bg-muted/30 px-4 py-2">
          <p className="text-xs font-medium text-muted-foreground">六十甲子纳音表</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs">
            <thead>
              <tr className="border-b bg-muted/20">
                <th className="py-2 px-1 text-muted-foreground">组</th>
                <th className="py-2 px-2 text-muted-foreground">纳音</th>
                <th className="py-2 px-2 text-muted-foreground">五行</th>
                <th className="py-2 px-2 text-muted-foreground">干支一</th>
                <th className="py-2 px-2 text-muted-foreground">干支二</th>
              </tr>
            </thead>
            <tbody>
              {nayinTableData.map((row) => (
                <tr key={row.index} className="border-b hover:bg-accent/20 transition-colors">
                  <td className="py-1.5 px-1 text-muted-foreground">{row.index}</td>
                  <td className="py-1.5 px-2 font-medium">{row.groupName}</td>
                  <td className="py-1.5 px-2">
                    <span className={`inline-block rounded-full border px-1.5 py-0.5 text-[10px] ${WUXING_COLORS[row.element] || ''}`}>
                      {row.element}
                    </span>
                  </td>
                  <td className="py-1.5 px-2 font-semibold">{row.pair1.ganzhi}</td>
                  <td className="py-1.5 px-2 font-semibold">{row.pair2.ganzhi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 纳音口诀 */}
      <div className="mt-4 rounded-xl border bg-card p-4">
        <h3 className="mb-2 text-sm font-semibold">纳音记忆口诀</h3>
        <div className="text-xs text-muted-foreground leading-relaxed space-y-1">
          <p>甲子乙丑海中金，丙寅丁卯炉中火，戊辰己巳大林木，庚午辛未路旁土，壬申癸酉剑锋金。</p>
          <p>甲戌乙亥山头火，丙子丁丑涧下水，戊寅己卯城头土，庚辰辛巳白蜡金，壬午癸未杨柳木。</p>
          <p>甲申乙酉泉中水，丙戌丁亥屋上土，戊子己丑霹雳火，庚寅辛卯松柏木，壬辰癸巳长流水。</p>
          <p>甲午乙未沙中金，丙申丁酉山下火，戊戌己亥平地木，庚子辛丑壁上土，壬寅癸卯金箔金。</p>
          <p>甲辰乙巳覆灯火，丙午丁未天河水，戊申己酉大驿土，庚戌辛亥钗钏金，壬子癸丑桑柘木。</p>
          <p>甲寅乙卯大溪水，丙辰丁巳沙中土，戊午己未天上火，庚申辛酉石榴木，壬戌癸亥大海水。</p>
        </div>
      </div>
      {/* 分享排盘结果 */}
      <div className="px-3 py-2">
        <ShareButton
          type="tool"
          title="纳音五行查询结果"
          description="纳音五行查询"
          variant="block"
          label="分享排盘结果"
          shareData={{
            toolType: "nayin",
            title: result.error ? "纳音五行查询" : `纳音查询：${result.ganzhi} · ${result.nayin}`,
            summary: result.error ? "无效的干支组合" : `${result.ganzhi} · 纳音${result.nayin}（${result.nayinElement}）`,
            payload: {
              summaryLines: result.error
                ? [result.error]
                : [
                    `干支：${result.ganzhi}`,
                    `六十甲子序号：第${(result.idx ?? 0) + 1}位`,
                    `纳音：${result.nayin}`,
                    `纳音五行：${result.nayinElement}`,
                  ],
            },
          }}
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