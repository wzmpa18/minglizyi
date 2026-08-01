"use client";

import { useState, useMemo } from "react";
import { SHENSHA_DEFINITIONS } from "@/algorithm-core";
import { BrandHeader } from "@/components/shared";

type CategoryTab = "全部" | "吉" | "凶" | "中性";

const CATEGORY_TABS: CategoryTab[] = ["全部", "吉", "凶", "中性"];

const CATEGORY_STYLES: Record<string, string> = {
  '吉': 'border-emerald-300 bg-emerald-50 text-emerald-700',
  '凶': 'border-red-300 bg-red-50 text-red-700',
  '中性': 'border-amber-300 bg-amber-50 text-amber-700',
};

const TYPE_LABELS: Record<string, string> = {
  'gan': '以天干为基准',
  'zhi': '以地支为基准',
  'zhi_sanhe': '以三合局为基准',
  'month_zhi': '以月支为基准',
  'month_zhi_shift': '以月支为基准（移位）',
  'ganzhi': '以干支组合为基准',
  'season': '以季节为基准',
  'fixed': '固定条件',
  'pattern': '组合模式匹配',
  'gan_combination': '天干组合',
  'calculated': '需计算逻辑',
};

export default function ShenShaPage() {
  const [activeTab, setActiveTab] = useState<CategoryTab>("全部");
  const [searchText, setSearchText] = useState("");

  const allShenSha = useMemo(() => {
    return Object.entries(SHENSHA_DEFINITIONS).map(([name, def]) => {
      // 跳过内部键
      if (name.endsWith('_中性')) return null;
      return {
        name,
        category: def.category as string,
        type: (def as Record<string, unknown>).type as string,
        description: (def as Record<string, unknown>).description as string,
      };
    }).filter(Boolean) as Array<{
      name: string;
      category: string;
      type: string;
      description: string;
    }>;
  }, []);

  const filteredData = useMemo(() => {
    let data = allShenSha;
    if (activeTab !== "全部") {
      data = data.filter((s) => s.category === activeTab);
    }
    if (searchText.trim()) {
      const q = searchText.trim();
      data = data.filter(
        (s) =>
          s.name.includes(q) ||
          s.description.includes(q) ||
          (TYPE_LABELS[s.type] || "").includes(q)
      );
    }
    return data;
  }, [allShenSha, activeTab, searchText]);

  const stats = useMemo(() => {
    const ji = allShenSha.filter((s) => s.category === '吉').length;
    const xiong = allShenSha.filter((s) => s.category === '凶').length;
    const zhong = allShenSha.filter((s) => s.category === '中性').length;
    return { ji, xiong, zhong, total: allShenSha.length };
  }, [allShenSha]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-4">
      <BrandHeader title="神煞查询" showBack={true} backUrl="/yixue" />
      <h1 className="text-xl font-bold text-primary mb-4">神煞查询</h1>

      {/* 统计概览 */}
      <div className="mb-4 grid grid-cols-4 gap-2">
        <div className="rounded-lg border bg-card p-2 text-center">
          <p className="text-[10px] text-muted-foreground">总计</p>
          <p className="text-lg font-bold">{stats.total}</p>
        </div>
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-2 text-center">
          <p className="text-[10px] text-emerald-600">吉神</p>
          <p className="text-lg font-bold text-emerald-700">{stats.ji}</p>
        </div>
        <div className="rounded-lg border border-red-300 bg-red-50 p-2 text-center">
          <p className="text-[10px] text-red-600">凶煞</p>
          <p className="text-lg font-bold text-red-700">{stats.xiong}</p>
        </div>
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-center">
          <p className="text-[10px] text-amber-600">中性</p>
          <p className="text-lg font-bold text-amber-700">{stats.zhong}</p>
        </div>
      </div>

      {/* 分类标签 */}
      <div className="mb-4 flex rounded-lg border bg-muted/30 p-1">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-background shadow-sm text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
            {tab !== "全部" && (
              <span className="ml-1 text-xs text-muted-foreground">
                ({tab === "吉" ? stats.ji : tab === "凶" ? stats.xiong : stats.zhong})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 搜索框 */}
      <div className="mb-4">
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="搜索神煞名称或描述..."
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
        />
      </div>

      {/* 神煞列表 */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="border-b bg-muted/30 px-4 py-2 flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">
            {activeTab === "全部" ? "全部神煞" : `${activeTab}类神煞`}
          </p>
          <p className="text-xs text-muted-foreground">共 {filteredData.length} 个</p>
        </div>
        <div className="divide-y">
          {filteredData.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">未找到匹配的神煞</p>
            </div>
          ) : (
            filteredData.map((shensha) => (
              <div
                key={shensha.name}
                className="px-4 py-3 hover:bg-accent/20 transition-colors"
              >
                <div className="flex items-start gap-2">
                  {/* 名称和标签 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold">{shensha.name}</span>
                      <span
                        className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${
                          CATEGORY_STYLES[shensha.category] || 'bg-gray-50 border-gray-300 text-gray-600'
                        }`}
                      >
                        {shensha.category}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-1">
                      {shensha.description}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60">
                      查法：{TYPE_LABELS[shensha.type] || shensha.type}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 各类型查法说明 */}
      <div className="mt-4 rounded-xl border bg-card p-4">
        <h3 className="mb-2 text-sm font-semibold">神煞查法分类说明</h3>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <p><strong>以天干为基准</strong>：如天乙贵人、文昌贵人等，以日干或年干为基准，在其他柱中查找对应地支。</p>
          <p><strong>以地支为基准</strong>：如红鸾、天喜等，以年支或日支为基准查找。</p>
          <p><strong>以三合局为基准</strong>：如驿马、华盖、将星等，以年支/日支所在的三合局为基准。</p>
          <p><strong>以月支为基准</strong>：如天德贵人、月德贵人等，以出生月支为基准。</p>
          <p><strong>以干支组合为基准</strong>：如魁罡、十恶大败等，直接检查四柱干支是否匹配。</p>
          <p><strong>以季节为基准</strong>：如天赦、四废等，以出生季节为基准。</p>
          <p><strong>模式匹配</strong>：如伏吟、返吟、四正等，检查四柱之间的相互关系。</p>
        </div>
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