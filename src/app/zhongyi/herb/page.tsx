"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { HERBS_DB, searchHerbs, getHerbById, getHerbCategories, getHerbsByCategory, loadFullHerbsDatabase, searchFullHerbs } from "@/algorithm-core/modules/tcm/herbs";
import { searchFormulasByHerb, loadFullFormulasDatabase } from "@/algorithm-core/modules/tcm/formulas";
import { addRecentItem } from "@/lib/tcmRecent";
import type { TcmHerb } from "@/algorithm-core/types/tcm";
import { useToolBack } from "@/lib/useToolBack";

const BRAND = "#7B2FBE";
const BRAND_LIGHT = "#9B5ECF";
const COMPLIANCE_TEXT = "本APP内容仅供传统文化研究参考，不构成医疗建议。如有身体不适，请及时就医。";
const TOXIC_WARNING = "⚠️ 有毒，需专业医师指导使用";

// 分类标签颜色配置
const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  "解表药": { bg: "#E3F2FD", text: "#1565C0" },
  "清热药": { bg: "#FFEBEE", text: "#C62828" },
  "泻下药": { bg: "#FFF3E0", text: "#E65100" },
  "祛风湿药": { bg: "#F3E5F5", text: "#6A1B9A" },
  "化湿药": { bg: "#E8F5E9", text: "#2E7D32" },
  "利水渗湿药": { bg: "#E0F7FA", text: "#00695C" },
  "温里药": { bg: "#FBE9E7", text: "#BF360C" },
  "理气药": { bg: "#F1F8E9", text: "#33691E" },
  "消食药": { bg: "#FFF8E1", text: "#F57F17" },
  "驱虫药": { bg: "#EFEBE9", text: "#4E342E" },
  "止血药": { bg: "#FFEBEE", text: "#B71C1C" },
  "活血化瘀药": { bg: "#FCE4EC", text: "#AD1457" },
  "化痰止咳平喘药": { bg: "#E8EAF6", text: "#283593" },
  "安神药": { bg: "#EDE7F6", text: "#4527A0" },
  "平肝熄风药": { bg: "#E0F2F1", text: "#00695C" },
  "开窍药": { bg: "#FFF9C4", text: "#F57F17" },
  "补虚药": { bg: "#E8F5E9", text: "#2E7D32" },
  "收涩药": { bg: "#F5F5F5", text: "#424242" },
  "其他": { bg: "#F5F5F5", text: "#616161" },
};

function getCategoryColor(cat: string) {
  return CATEGORY_COLORS[cat] || CATEGORY_COLORS["其他"];
}

// 性味颜色
function getNatureColor(nature: string): string {
  if (/寒|凉/.test(nature)) return "#1565C0";
  if (/热|温/.test(nature)) return "#C62828";
  if (/平/.test(nature)) return "#2E7D32";
  return "#666";
}

// ==================== 列表页 ====================
function HerbListPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [dbLoaded, setDbLoaded] = useState(false);

  useEffect(() => {
    loadFullHerbsDatabase().then(() => setDbLoaded(true));
  }, []);

  const categories = useMemo(() => {
    if (dbLoaded) {
      const allHerbs = searchFullHerbs('');
      const cats = new Set(allHerbs.map(h => h.category));
      return Array.from(cats).sort();
    }
    return getHerbCategories();
  }, [dbLoaded]);

  const totalCount = useMemo(() => searchFullHerbs('').length, [dbLoaded]);

  const filteredHerbs = useMemo(() => {
    let herbs: TcmHerb[];
    if (searchQuery.trim()) {
      herbs = dbLoaded ? searchFullHerbs(searchQuery) : searchHerbs(searchQuery);
    } else if (activeCategory) {
      const allHerbs = searchFullHerbs('');
      herbs = allHerbs.filter(h => h.category === activeCategory);
    } else {
      herbs = searchFullHerbs('');
    }
    return herbs;
  }, [searchQuery, activeCategory, dbLoaded]);

  const handleHerbClick = (herb: TcmHerb) => {
    addRecentItem({ type: "herb", id: herb.id, name: herb.name, category: herb.category });
    router.push(`/zhongyi/herb?id=${herb.id}`);
  };

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f8f5fc", paddingBottom: "80px" }}>
      {/* 顶部导航 */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_LIGHT} 100%)`, padding: "12px 16px", color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          
          <div>
            <h1 style={{ fontSize: "18px", fontWeight: "bold", margin: 0 }}>中药库</h1>
          
            <p style={{ fontSize: "11px", opacity: 0.8, margin: 0 }}>共 {totalCount} 味常用中药材</p>
          </div>
        </div>

        {/* 搜索框 */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "white", borderRadius: "20px", padding: "8px 14px" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setActiveCategory(null); }}
            placeholder="搜索药材名、别名、功效..."
            style={{ flex: 1, border: "none", outline: "none", fontSize: "14px", background: "transparent" }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} style={{ background: "none", border: "none", color: "#999", cursor: "pointer" }}>✕</button>
          )}
        </div>
      </div>

      {/* 分类标签 */}
      <div style={{ padding: "12px", overflowX: "auto", whiteSpace: "nowrap" }}>
        <button
          onClick={() => setActiveCategory(null)}
          style={{
            display: "inline-block", padding: "6px 14px", borderRadius: "20px", fontSize: "12px", marginRight: "8px",
            border: "none", cursor: "pointer",
            backgroundColor: !activeCategory ? BRAND : "white",
            color: !activeCategory ? "white" : "#666",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          全部
        </button>
        {categories.map((cat) => {
          const cc = getCategoryColor(cat);
          const active = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => { setActiveCategory(cat); setSearchQuery(""); }}
              style={{
                display: "inline-block", padding: "6px 14px", borderRadius: "20px", fontSize: "12px", marginRight: "8px",
                border: "none", cursor: "pointer",
                backgroundColor: active ? BRAND : "white",
                color: active ? "white" : cc.text,
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* 药材卡片列表 */}
      <div style={{ padding: "0 12px" }}>
        {filteredHerbs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#999" }}>
            <p style={{ fontSize: "14px" }}>未找到相关药材</p>
          </div>
        ) : (
          filteredHerbs.map((herb) => {
            const cc = getCategoryColor(herb.category);
            return (
              <button
                key={herb.id}
                onClick={() => handleHerbClick(herb)}
                style={{
                  width: "100%", display: "block", background: "white", borderRadius: "14px", padding: "14px",
                  marginBottom: "10px", border: "none", textAlign: "left", cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)", position: "relative",
                }}
              >
                {herb.toxic && (
                  <span style={{ position: "absolute", top: "10px", right: "10px", fontSize: "10px", padding: "2px 6px", borderRadius: "4px", backgroundColor: "#FFEBEE", color: "#C62828", fontWeight: "bold" }}>
                    有毒
                  </span>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "16px", fontWeight: "bold", color: "#333" }}>{herb.name}</span>
                  {herb.pinyin && <span style={{ fontSize: "11px", color: "#999" }}>{herb.pinyin}</span>}
                  <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", backgroundColor: cc.bg, color: cc.text, marginLeft: "auto" }}>{herb.category}</span>
                </div>
                <div style={{ display: "flex", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
                  {herb.nature && <span style={{ fontSize: "11px", color: getNatureColor(herb.nature) }}>【{herb.nature}】</span>}
                  {herb.taste && <span style={{ fontSize: "11px", color: "#666" }}>味{herb.taste}</span>}
                  {herb.meridian && <span style={{ fontSize: "11px", color: "#666" }}>归{herb.meridian}</span>}
                </div>
                <p style={{ fontSize: "12px", color: "#666", margin: 0, lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {herb.efficacy}
                </p>
              </button>
            );
          })
        )}
      </div>

      {/* 底部合规提示 */}
      <div style={{ marginTop: "20px", left: 0, right: 0, padding: "8px 12px", background: "rgba(255,248,225,0.95)", borderTop: "1px solid #ffecb3",  }}>
        <p style={{ margin: 0, fontSize: "11px", color: "#f57f17", textAlign: "center" }}>⚠️ {COMPLIANCE_TEXT}</p>
      </div>
    </div>
  );
}

// ==================== 详情页 ====================
function HerbDetailPage({ herbId }: { herbId: string }) {
  const router = useRouter();
  const [dbLoaded, setDbLoaded] = useState(false);
  const [formulasLoaded, setFormulasLoaded] = useState(false);

  useEffect(() => {
    loadFullHerbsDatabase().then(() => setDbLoaded(true));
  }, []);

  useEffect(() => {
    loadFullFormulasDatabase().then(() => setFormulasLoaded(true));
  }, []);

  const herb = useMemo(() => {
    const found = getHerbById(herbId);
    if (found) return found;
    return searchFullHerbs('').find(h => h.id === herbId);
  }, [herbId, dbLoaded]);

  const relatedFormulas = useMemo(() => {
    if (!herb || !formulasLoaded) return [];
    return searchFormulasByHerb(herb.name);
  }, [herb, formulasLoaded]);

  useEffect(() => {
    if (herb) {
      addRecentItem({ type: "herb", id: herb.id, name: herb.name, category: herb.category });
    }
  }, [herb]);

  if (!herb) {
    return (
      <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f8f5fc", padding: "80px 20px", textAlign: "center" }}>
        <p style={{ color: "#999", marginBottom: "20px" }}>未找到该药材</p>
        <button onClick={() => router.back()} style={{ padding: "8px 20px", borderRadius: "20px", backgroundColor: BRAND, color: "white", border: "none", cursor: "pointer" }}>返回列表</button>
      </div>
    );
  }

  const cc = getCategoryColor(herb.category);

  // 字段模块渲染（缺失则隐藏）
  const sections: { label: string; content: string | string[] | undefined; highlight?: boolean }[] = [
    { label: "正名", content: herb.name },
    { label: "别名", content: herb.alias.length > 0 ? herb.alias.join("、") : undefined },
    { label: "性味", content: herb.taste && herb.nature ? `${herb.taste}，${herb.nature}` : (herb.nature || herb.taste) },
    { label: "归经", content: herb.meridian },
    { label: "功效", content: herb.efficacy, highlight: true },
    { label: "典籍记载", content: herb.indications ? `典籍记载：${herb.indications}` : undefined },
    { label: "典籍出处", content: herb.source },
    { label: "用法用量", content: herb.dosage },
    { label: "使用禁忌", content: herb.contraindications },
  ];

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f8f5fc", paddingBottom: "120px" }}>
      {/* 顶部导航 */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_LIGHT} 100%)`, padding: "12px 16px", color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          
          <h1 style={{ fontSize: "16px", fontWeight: "bold", margin: 0, flex: 1 }}>{herb.name}</h1>
          <span style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "4px", backgroundColor: "rgba(255,255,255,0.2)" }}>{herb.category}</span>
        </div>
      </div>

      {/* 毒性警示（如果有毒） */}
      {herb.toxic && (
        <div style={{ margin: "12px", padding: "10px 14px", backgroundColor: "#FFEBEE", borderRadius: "10px", border: "1px solid #FFCDD2" }}>
          <p style={{ margin: 0, fontSize: "12px", color: "#C62828", fontWeight: "bold", textAlign: "center" }}>{TOXIC_WARNING}</p>
        </div>
      )}

      {/* 药材信息卡片 */}
      <div style={{ margin: "12px", background: "white", borderRadius: "16px", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        {/* 头部 */}
        <div style={{ padding: "16px", background: `linear-gradient(135deg, ${cc.bg} 0%, white 100%)`, borderBottom: "1px solid #f0f0f0" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
            <span style={{ fontSize: "24px", fontWeight: "bold", color: "#333" }}>{herb.name}</span>
            {herb.pinyin && <span style={{ fontSize: "12px", color: "#999" }}>{herb.pinyin}</span>}
          </div>
          {herb.alias.length > 0 && (
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#999" }}>别名：{herb.alias.join("、")}</p>
          )}
        </div>

        {/* 字段内容（固定顺序，缺失隐藏） */}
        {sections.filter(s => s.content).map((section, i) => (
          <div key={section.label} style={{ padding: "12px 16px", borderBottom: i < sections.filter(s => s.content).length - 1 ? "1px solid #f5f5f5" : "none" }}>
            <div style={{ fontSize: "12px", color: "#999", marginBottom: "4px", fontWeight: section.highlight ? "bold" : "normal" }}>{section.label}</div>
            <div style={{ fontSize: "14px", color: section.highlight ? cc.text : "#333", lineHeight: 1.7, fontWeight: section.highlight ? "500" : "normal" }}>
              {typeof section.content === "string" ? section.content : (section.content as string[]).join("、")}
            </div>
          </div>
        ))}
      </div>

      {/* 包含此药的方剂 */}
      {relatedFormulas.length > 0 && (
        <div style={{ margin: "12px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "bold", color: "#333", marginBottom: "8px" }}>包含此药的方剂</h3>
          {relatedFormulas.map((formula) => (
            <button
              key={formula.id}
              onClick={() => router.push(`/zhongyi/formula?id=${formula.id}`)}
              style={{
                width: "100%", display: "block", background: "white", borderRadius: "12px", padding: "12px 14px",
                marginBottom: "8px", border: "none", textAlign: "left", cursor: "pointer",
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "14px", fontWeight: "bold", color: "#333" }}>{formula.name}</span>
                <span style={{ fontSize: "11px", color: "#999" }}>{formula.category}</span>
              </div>
              <p style={{ fontSize: "12px", color: "#666", margin: "4px 0 0", lineHeight: 1.5 }}>{formula.efficacy}</p>
            </button>
          ))}
        </div>
      )}

      {/* 返回按钮 */}
      <div style={{ padding: "0 12px" }}>
        <button
          onClick={() => router.back()}
          style={{ width: "100%", padding: "12px", borderRadius: "12px", border: "none", fontSize: "14px", cursor: "pointer", backgroundColor: BRAND_BG, color: BRAND, fontWeight: "500" }}
        >
          返回药材列表
        </button>
      </div>

      {/* 底部合规提示 */}
      <div style={{ marginTop: "20px", left: 0, right: 0, padding: "8px 12px", background: "rgba(255,248,225,0.95)", borderTop: "1px solid #ffecb3",  }}>
        <p style={{ margin: 0, fontSize: "11px", color: "#f57f17", textAlign: "center" }}>⚠️ {COMPLIANCE_TEXT}</p>
      </div>
    </div>
  );
}

// ==================== 主组件 ====================
function HerbPageInner() {
  const searchParams = useSearchParams();
  const herbId = searchParams.get("id");
  const herbName = searchParams.get("name");
  const [dbLoaded, setDbLoaded] = useState(false);

  useEffect(() => {
    loadFullHerbsDatabase().then(() => setDbLoaded(true));
  }, []);

  // 支持按名称查找
  const targetId = useMemo(() => {
    if (herbId) return herbId;
    if (herbName) {
      let found = HERBS_DB.find(h => h.name === herbName);
      if (!found && dbLoaded) {
        found = searchFullHerbs('').find(h => h.name === herbName);
      }
      return found?.id || null;
    }
    return null;
  }, [herbId, herbName, dbLoaded]);

  return targetId ? <HerbDetailPage herbId={targetId} /> : <HerbListPage />;
}

export default function HerbPage() {
  useToolBack({ pageKey: "zhongyi_herb", eventName: "zhongyi-back", globalFlag: "__zhongyiBackHandled" });
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA' }}>
        <div style={{ textAlign: 'center', color: '#7B1FA2' }}>加载中...</div>
      </div>
    }>
      <HerbPageInner />
    </Suspense>
  );
}

const BRAND_BG = "#F3EDF7";

