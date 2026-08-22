"use client";

import { useState, useMemo } from "react";
import {
  GAN, ZHI, JIAZI_TABLE, NAYIN_TABLE, KONGWANG_BY_XUN,
  getGanIndex, getZhiIndex, getJiaziName, getJiaziIndex,
  getNayinWuxing, getKongwang, calcKongwang, getNayinElement,
} from "@/algorithm-core";
import type { TianGan, DiZhi } from "@/algorithm-core";
import EventDivinationPanel from "@/components/EventDivinationPanel";

import { ShareButton } from "@/components/ShareButton";
const GAN_WUXING_MAP: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
};

const ZHI_WUXING_MAP: Record<string, string> = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
  '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水',
};

const XUN_NAMES = ['甲子旬', '甲戌旬', '甲申旬', '甲午旬', '甲辰旬', '甲寅旬'];

const WUXING_COLORS: Record<string, string> = {
  '金': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  '木': 'bg-green-100 text-green-800 border-green-300',
  '水': 'bg-blue-100 text-blue-800 border-blue-300',
  '火': 'bg-red-100 text-red-800 border-red-300',
  '土': 'bg-amber-100 text-amber-800 border-amber-300',
};

type QueryMode = "ganzhi-to-index" | "index-to-ganzhi";

export default function GanZhiPage() {
  const [mode, setMode] = useState<QueryMode>("ganzhi-to-index");
  const [selectedGan, setSelectedGan] = useState<string>("甲");
  const [selectedZhi, setSelectedZhi] = useState<string>("子");
  const [inputIndex, setInputIndex] = useState<number>(1);

  const mode1Result = useMemo(() => {
    if (mode !== "ganzhi-to-index") return null;
    const ganzhi = `${selectedGan}${selectedZhi}`;
    const idx = getJiaziIndex(ganzhi);
    if (idx === -1) return { error: "无效的干支组合（需阳干配阳支、阴干配阴支）" };
    const nayin = getNayinWuxing(ganzhi) || "";
    const kongwang = calcKongwang(selectedGan as TianGan, selectedZhi as DiZhi) || "";
    const nayinElement = getNayinElement(nayin) || "";
    const xunIndex = Math.floor(idx / 10);
    const ganWx = GAN_WUXING_MAP[selectedGan] || "";
    const zhiWx = ZHI_WUXING_MAP[selectedZhi] || "";
    return {
      idx,
      ganzhi,
      nayin,
      kongwang,
      nayinElement,
      xunName: XUN_NAMES[xunIndex] || "",
      ganWx,
      zhiWx,
      error: null,
    };
  }, [mode, selectedGan, selectedZhi]);

  const mode2Result = useMemo(() => {
    if (mode !== "index-to-ganzhi") return null;
    if (inputIndex < 1 || inputIndex > 60) {
      return { error: "请输入1-60之间的序号" };
    }
    const idx = inputIndex - 1;
    const ganzhi = getJiaziName(idx);
    const nayin = getNayinWuxing(ganzhi) || "";
    const kongwang = getKongwang(ganzhi) || "";
    const nayinElement = getNayinElement(nayin) || "";
    const xunIndex = Math.floor(idx / 10);
    const gan = ganzhi.charAt(0);
    const zhi = ganzhi.charAt(1);
    const ganWx = GAN_WUXING_MAP[gan] || "";
    const zhiWx = ZHI_WUXING_MAP[zhi] || "";
    return {
      idx: idx + 1,
      ganzhi,
      nayin,
      kongwang,
      nayinElement,
      xunName: XUN_NAMES[xunIndex] || "",
      ganWx,
      zhiWx,
      error: null,
    };
  }, [mode, inputIndex]);

  const jiaziTableData = useMemo(() => {
    return JIAZI_TABLE.map((gz, idx) => {
      const nayin = NAYIN_TABLE[gz] || "";
      const xunIndex = Math.floor(idx / 10);
      const kongwang = KONGWANG_BY_XUN[xunIndex] || "";
      return {
        index: idx + 1,
        ganzhi: gz,
        nayin,
        kongwang,
        xunName: XUN_NAMES[xunIndex],
      };
    });
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-4">
      <h1 className="text-xl font-bold text-primary mb-4">干支查询</h1>

      {/* 模式切换 */}
      <div className="mb-4 flex rounded-lg border bg-muted/30 p-1">
        <button
          onClick={() => setMode("ganzhi-to-index")}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            mode === "ganzhi-to-index"
              ? "bg-background shadow-sm text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          按干支查序号
        </button>
        <button
          onClick={() => setMode("index-to-ganzhi")}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            mode === "index-to-ganzhi"
              ? "bg-background shadow-sm text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          按序号查干支
        </button>
      </div>

      {/* 模式一：按干支查序号 */}
      {mode === "ganzhi-to-index" && (
        <div className="rounded-xl border bg-card p-4 mb-4">
          <p className="mb-3 text-sm font-medium text-muted-foreground">选择天干和地支</p>
          <div className="flex gap-3 items-end mb-4">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-muted-foreground">天干</label>
              <select
                value={selectedGan}
                onChange={(e) => setSelectedGan(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
              >
                {GAN.map((g) => (
                  <option key={g} value={g}>{g}（{GAN_WUXING_MAP[g]}）</option>
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
                  <option key={z} value={z}>{z}（{ZHI_WUXING_MAP[z]}）</option>
                ))}
              </select>
            </div>
          </div>

          {mode1Result && (
            <>
              {mode1Result.error ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-sm text-destructive">{mode1Result.error}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    提示：阳干（甲丙戊庚壬）只能配阳支（子寅辰午申戌），阴干（乙丁己辛癸）只能配阴支（丑卯巳未酉亥）。
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">干支组合</span>
                    <span className="text-lg font-bold">{mode1Result.ganzhi}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">六十甲子序号</span>
                    <span className="text-lg font-bold text-primary">第{mode1Result.idx}位</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">天干五行</span>
                    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs ${WUXING_COLORS[mode1Result.ganWx ?? ''] || ''}`}>
                      {selectedGan}（{mode1Result.ganWx}）
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">地支五行</span>
                    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs ${WUXING_COLORS[mode1Result.zhiWx ?? ''] || ''}`}>
                      {selectedZhi}（{mode1Result.zhiWx}）
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">纳音</span>
                    <span className="text-sm font-semibold">{mode1Result.nayin}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">纳音五行</span>
                    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs ${WUXING_COLORS[mode1Result.nayinElement ?? ''] || ''}`}>
                      {mode1Result.nayinElement}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">所属旬</span>
                    <span className="text-sm font-medium">{mode1Result.xunName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">空亡</span>
                    <span className="text-sm font-semibold text-orange-600">{mode1Result.kongwang}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 模式二：按序号查干支 */}
      {mode === "index-to-ganzhi" && (
        <div className="rounded-xl border bg-card p-4 mb-4">
          <p className="mb-3 text-sm font-medium text-muted-foreground">输入六十甲子序号（1-60）</p>
          <div className="mb-4">
            <input
              type="number"
              min={1}
              max={60}
              value={inputIndex}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                if (!isNaN(v)) setInputIndex(v);
              }}
              className="w-full rounded-lg border bg-background px-3 py-2 text-center text-lg font-bold outline-none focus:border-primary/50"
              placeholder="请输入1-60"
            />
          </div>

          {/* 快捷选择按钮 */}
          <div className="mb-4 flex flex-wrap gap-1">
            {[1, 11, 21, 31, 41, 51].map((n) => (
              <button
                key={n}
                onClick={() => setInputIndex(n)}
                className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                  inputIndex === n ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent'
                }`}
              >
                {n}
                {n === 1 ? '（甲子）' : n === 11 ? '（甲戌）' : n === 21 ? '（甲申）' : n === 31 ? '（甲午）' : n === 41 ? '（甲辰）' : '（甲寅）'}
              </button>
            ))}
          </div>

          {mode2Result && (
            <>
              {mode2Result.error ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-sm text-destructive">{mode2Result.error}</p>
                </div>
              ) : (
                <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">六十甲子序号</span>
                    <span className="text-lg font-bold text-primary">第{mode2Result.idx}位</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">干支组合</span>
                    <span className="text-lg font-bold">{mode2Result.ganzhi}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">天干五行</span>
                    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs ${WUXING_COLORS[mode2Result.ganWx ?? ''] || ''}`}>
                      {mode2Result.ganzhi?.charAt(0)}（{mode2Result.ganWx}）
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">地支五行</span>
                    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs ${WUXING_COLORS[mode2Result.zhiWx ?? ''] || ''}`}>
                      {mode2Result.ganzhi?.charAt(1)}（{mode2Result.zhiWx}）
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">纳音</span>
                    <span className="text-sm font-semibold">{mode2Result.nayin}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">纳音五行</span>
                    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs ${WUXING_COLORS[mode2Result.nayinElement ?? ''] || ''}`}>
                      {mode2Result.nayinElement}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">所属旬</span>
                    <span className="text-sm font-medium">{mode2Result.xunName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">空亡</span>
                    <span className="text-sm font-semibold text-orange-600">{mode2Result.kongwang}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 六十甲子完整表 */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="border-b bg-muted/30 px-4 py-2">
          <p className="text-xs font-medium text-muted-foreground">六十甲子表</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs">
            <thead>
              <tr className="border-b bg-muted/20">
                <th className="py-2 px-1 text-muted-foreground">序号</th>
                <th className="py-2 px-1 text-muted-foreground">干支</th>
                <th className="py-2 px-1 text-muted-foreground">纳音</th>
                <th className="py-2 px-1 text-muted-foreground">旬</th>
                <th className="py-2 px-1 text-muted-foreground">空亡</th>
              </tr>
            </thead>
            <tbody>
              {jiaziTableData.map((row, i) => {
                const isXunShou = row.index % 10 === 1;
                return (
                  <tr
                    key={row.index}
                    className={`border-b transition-colors hover:bg-accent/20 ${
                      isXunShou ? 'bg-primary/5' : ''
                    }`}
                  >
                    <td className="py-1.5 px-1 font-mono text-muted-foreground">{row.index}</td>
                    <td className={`py-1.5 px-1 font-semibold ${isXunShou ? 'text-primary' : ''}`}>
                      {row.ganzhi}
                    </td>
                    <td className="py-1.5 px-1">{row.nayin}</td>
                    <td className="py-1.5 px-1 text-muted-foreground">
                      {isXunShou ? row.xunName : ''}
                    </td>
                    <td className="py-1.5 px-1 text-orange-600">
                      {isXunShou ? row.kongwang : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI智能解读 */}
      <EventDivinationPanel
        toolName="干支查询"
        chartContext={mode === "ganzhi-to-index" && mode1Result && !mode1Result.error
          ? `查询模式: 按干支查序号\n干支: ${mode1Result.ganzhi}\n六十甲子序号: 第${mode1Result.idx}位\n天干五行: ${selectedGan}(${mode1Result.ganWx})\n地支五行: ${selectedZhi}(${mode1Result.zhiWx})\n纳音: ${mode1Result.nayin}\n纳音五行: ${mode1Result.nayinElement}\n所属旬: ${mode1Result.xunName}\n空亡: ${mode1Result.kongwang}`
          : mode === "index-to-ganzhi" && mode2Result && !mode2Result.error
            ? `查询模式: 按序号查干支\n六十甲子序号: 第${mode2Result.idx}位\n干支: ${mode2Result.ganzhi}\n天干五行: ${mode2Result.ganzhi?.charAt(0)}(${mode2Result.ganWx})\n地支五行: ${mode2Result.ganzhi?.charAt(1)}(${mode2Result.zhiWx})\n纳音: ${mode2Result.nayin}\n纳音五行: ${mode2Result.nayinElement}\n所属旬: ${mode2Result.xunName}\n空亡: ${mode2Result.kongwang}`
            : "暂无有效查询结果"}
        isPaidTool={false}
      />
      {/* 分享排盘结果 */}
      <div className="px-3 py-2">
        <ShareButton
          type="tool"
          title="干支查询结果"
          description="干支查询"
          variant="block"
          label="分享排盘结果"
          shareData={{
            toolType: "ganzhi",
            title: mode === "ganzhi-to-index" && mode1Result && !mode1Result.error
              ? `干支查询：${mode1Result.ganzhi} · 第${mode1Result.idx}位`
              : mode === "index-to-ganzhi" && mode2Result && !mode2Result.error
              ? `干支查询：第${mode2Result.idx}位 · ${mode2Result.ganzhi}`
              : "干支查询结果",
            summary: mode === "ganzhi-to-index" && mode1Result && !mode1Result.error
              ? `${mode1Result.ganzhi} · 纳音${mode1Result.nayin}`
              : mode === "index-to-ganzhi" && mode2Result && !mode2Result.error
              ? `第${mode2Result.idx}位 · ${mode2Result.ganzhi} · 纳音${mode2Result.nayin}`
              : "干支查询",
            payload: {
              summaryLines: mode === "ganzhi-to-index" && mode1Result && !mode1Result.error
                ? [
                    `查询模式：按干支查序号`,
                    `干支：${mode1Result.ganzhi}`,
                    `六十甲子序号：第${mode1Result.idx}位`,
                    `天干五行：${selectedGan}（${mode1Result.ganWx}）`,
                    `地支五行：${selectedZhi}（${mode1Result.zhiWx}）`,
                    `纳音：${mode1Result.nayin}（${mode1Result.nayinElement}）`,
                    `所属旬：${mode1Result.xunName}`,
                    `空亡：${mode1Result.kongwang}`,
                  ]
                : mode === "index-to-ganzhi" && mode2Result && !mode2Result.error
                ? [
                    `查询模式：按序号查干支`,
                    `六十甲子序号：第${mode2Result.idx}位`,
                    `干支：${mode2Result.ganzhi}`,
                    `纳音：${mode2Result.nayin}（${mode2Result.nayinElement}）`,
                    `所属旬：${mode2Result.xunName}`,
                    `空亡：${mode2Result.kongwang}`,
                  ]
                : ["暂无有效查询结果"],
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