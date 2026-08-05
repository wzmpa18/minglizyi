"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FORMULAS_DB, searchFormulas, getFormulaById, getFormulaCategories, getFormulasByCategory, loadFullFormulasDatabase, searchFullFormulas } from "@/algorithm-core/modules/tcm/formulas";
import { HERBS_DB, searchFullHerbs, loadFullHerbsDatabase } from "@/algorithm-core/modules/tcm/herbs";
import { addRecentItem } from "@/lib/tcmRecent";
import type { TcmFormula } from "@/algorithm-core/types/tcm";

const BRAND = "#7B2FBE";
const BRAND_LIGHT = "#9B5ECF";
const BRAND_BG = "#F3EDF7";
const COMPLIANCE_TEXT = "经典方剂仅供学习研究，不构成临床用药指导，用药需遵医嘱";

// 分类标签颜色配置
const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  "解表剂": { bg: "#E3F2FD", text: "#1565C0" },
  "清热剂": { bg: "#FFEBEE", text: "#C62828" },
  "泻下剂": { bg: "#FFF3E0", text: "#E65100" },
  "和解剂": { bg: "#F3E5F5", text: "#6A1B9A" },
  "温里剂": { bg: "#FBE9E7", text: "#BF360C" },
  "补益剂": { bg: "#E8F5E9", text: "#2E7D32" },
  "固涩剂": { bg: "#EFEBE9", text: "#4E342E" },
  "安神剂": { bg: "#EDE7F6", text: "#4527A0" },
  "理气剂": { bg: "#F1F8E9", text: "#33691E" },
  "理血剂": { bg: "#FCE4EC", text: "#AD1457" },
  "治风剂": { bg: "#E0F2F1", text: "#00695C" },
  "治燥剂": { bg: "#E0F7FA", text: "#00695C" },
  "祛湿剂": { bg: "#E8F5E9", text: "#1B5E20" },
  "祛痰剂": { bg: "#E8EAF6", text: "#283593" },
  "消导化积剂": { bg: "#FFF8E1", text: "#F57F17" },
  "其他": { bg: "#F5F5F5", text: "#616161" },
};

function getCategoryColor(cat: string) {
  return CATEGORY_COLORS[cat] || CATEGORY_COLORS["其他"];
}

// 查找药材（用于组成药物跳转）
function findHerbByName(name: string) {
  // 精确匹配
  let h = HERBS_DB.find(x => x.name === name);
  if (h) return h;
  // 别名匹配
  h = HERBS_DB.find(x => x.alias.some(a => a === name));
  if (h) return h;
  // 包含匹配
  h = HERBS_DB.find(x => x.name.includes(name) || name.includes(x.name));
  if (h) return h;
  // 在完整数据库中查找
  const fullDb = searchFullHerbs('');
  if (fullDb.length > HERBS_DB.length) {
    h = fullDb.find(x => x.name === name);
    if (h) return h;
    h = fullDb.find(x => x.alias.some(a => a === name));
    if (h) return h;
    h = fullDb.find(x => x.name.includes(name) || name.includes(x.name));
    if (h) return h;
  }
  return h;
}

// ==================== 列表页 ====================
function FormulaListPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [dbLoaded, setDbLoaded] = useState(false);

  useEffect(() => {
    loadFullFormulasDatabase().then(() => setDbLoaded(true));
    loadFullHerbsDatabase(); // 同时预加载药材库，用于详情页组成药物跳转
  }, []);

  const categories = useMemo(() => {
    if (dbLoaded) {
      const allFormulas = searchFullFormulas('');
      const cats = new Set(allFormulas.map(f => f.category));
      return Array.from(cats).sort();
    }
    return getFormulaCategories();
  }, [dbLoaded]);

  const totalCount = useMemo(() => searchFullFormulas('').length, [dbLoaded]);

  const filteredFormulas = useMemo(() => {
    let list: TcmFormula[];
    if (searchQuery.trim()) {
      list = dbLoaded ? searchFullFormulas(searchQuery) : searchFormulas(searchQuery);
    } else if (activeCategory) {
      const allFormulas = searchFullFormulas('');
      list = allFormulas.filter(f => f.category === activeCategory);
    } else {
      list = searchFullFormulas('');
    }
    return list;
  }, [searchQuery, activeCategory, dbLoaded]);

  const handleFormulaClick = (f: TcmFormula) => {
    addRecentItem({ type: "formula", id: f.id, name: f.name, category: f.category });
    router.push(`/zhongyi/formula?id=${f.id}`);
  };

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f8f5fc", paddingBottom: "80px" }}>
      {/* 顶部导航 */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_LIGHT} 100%)`, padding: "12px 16px", color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          <button onClick={() => router.back()} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <div>
            <h1 style={{ fontSize: "18px", fontWeight: "bold", margin: 0 }}>经典方剂库</h1>
          <p style={{ fontSize: "10px", opacity: 0.7, margin: "2px 0 0 0", color: "rgba(255,255,255,0.8)" }}>yandao.vip 分享下载有礼</p>
            <p style={{ fontSize: "11px", opacity: 0.8, margin: 0 }}>共 {totalCount} 首经典方剂</p>
          </div>
        </div>

        {/* 搜索框 */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "white", borderRadius: "20px", padding: "8px 14px" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setActiveCategory(null); }}
            placeholder="搜索方名、功效、组成..."
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

      {/* 古籍剂量提示 */}
      <div style={{ margin: "0 12px 10px", padding: "8px 12px", backgroundColor: "#fff8e1", borderRadius: "8px", border: "1px solid #ffecb3" }}>
        <p style={{ margin: 0, fontSize: "11px", color: "#f57f17", textAlign: "center" }}>古籍记载，非标准化剂量，仅供学习参考</p>
      </div>

      {/* 方剂卡片列表 */}
      <div style={{ padding: "0 12px" }}>
        {filteredFormulas.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#999" }}>
            <p style={{ fontSize: "14px" }}>未找到相关方剂</p>
          </div>
        ) : (
          filteredFormulas.map((f) => {
            const cc = getCategoryColor(f.category);
            return (
              <button
                key={f.id}
                onClick={() => handleFormulaClick(f)}
                style={{
                  width: "100%", display: "block", background: "white", borderRadius: "14px", padding: "14px",
                  marginBottom: "10px", border: "none", textAlign: "left", cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "16px", fontWeight: "bold", color: "#333" }}>{f.name}</span>
                  <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", backgroundColor: cc.bg, color: cc.text, marginLeft: "auto" }}>{f.category}</span>
                </div>
                <div style={{ fontSize: "11px", color: "#999", marginBottom: "4px" }}>出处：{f.source}</div>
                <div style={{ fontSize: "12px", color: "#666", marginBottom: "6px", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  组成：{f.composition.map(c => c.herb).join("、")}
                </div>
                <p style={{ fontSize: "12px", color: cc.text, margin: 0, lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {f.efficacy}
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
function FormulaDetailPage({ formulaId }: { formulaId: string }) {
  const router = useRouter();
  const [dbLoaded, setDbLoaded] = useState(false);

  useEffect(() => {
    loadFullFormulasDatabase().then(() => setDbLoaded(true));
    loadFullHerbsDatabase(); // 同时加载药材库用于组成药物跳转
  }, []);

  const formula = useMemo(() => {
    const found = getFormulaById(formulaId);
    if (found) return found;
    return searchFullFormulas('').find(f => f.id === formulaId);
  }, [formulaId, dbLoaded]);

  useEffect(() => {
    if (formula) {
      addRecentItem({ type: "formula", id: formula.id, name: formula.name, category: formula.category });
    }
  }, [formula]);

  if (!formula) {
    return (
      <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f8f5fc", padding: "80px 20px", textAlign: "center" }}>
        <p style={{ color: "#999", marginBottom: "20px" }}>未找到该方剂</p>
        <button onClick={() => router.back()} style={{ padding: "8px 20px", borderRadius: "20px", backgroundColor: BRAND, color: "white", border: "none", cursor: "pointer" }}>返回列表</button>
      </div>
    );
  }

  const cc = getCategoryColor(formula.category);

  // 字段模块（固定顺序，缺失隐藏）
  const sections: { label: string; content: React.ReactNode }[] = [
    { label: "方名", content: formula.name },
    { label: "出处", content: formula.source },
    { label: "分类", content: formula.category },
    { label: "功用", content: <span style={{ color: cc.text, fontWeight: "500" }}>{formula.efficacy}</span> },
    { label: "主治", content: formula.indications },
  ];

  if (formula.analysis) {
    sections.push({ label: "方义解析", content: formula.analysis });
  }
  if (formula.contraindications) {
    sections.push({ label: "使用禁忌", content: formula.contraindications });
  }

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f8f5fc", paddingBottom: "120px" }}>
      {/* 顶部导航 */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_LIGHT} 100%)`, padding: "12px 16px", color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => router.back()} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <h1 style={{ fontSize: "16px", fontWeight: "bold", margin: 0, flex: 1 }}>{formula.name}</h1>
          <span style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "4px", backgroundColor: "rgba(255,255,255,0.2)" }}>{formula.category}</span>
        </div>
      </div>

      {/* 古籍剂量警示 */}
      <div style={{ margin: "12px", padding: "10px 14px", backgroundColor: "#fff8e1", borderRadius: "10px", border: "1px solid #ffecb3" }}>
        <p style={{ margin: 0, fontSize: "12px", color: "#f57f17", textAlign: "center" }}>⚠️ 古籍记载，非标准化剂量，仅供学习参考</p>
      </div>

      {/* 方剂信息卡片 */}
      <div style={{ margin: "12px", background: "white", borderRadius: "16px", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        {/* 头部 */}
        <div style={{ padding: "16px", background: `linear-gradient(135deg, ${cc.bg} 0%, white 100%)`, borderBottom: "1px solid #f0f0f0" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "4px" }}>
            <span style={{ fontSize: "22px", fontWeight: "bold", color: "#333" }}>{formula.name}</span>
          </div>
          <div style={{ fontSize: "12px", color: "#999" }}>出处：{formula.source}</div>
        </div>

        {/* 组成（单独处理，药物可点击） */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #f5f5f5" }}>
          <div style={{ fontSize: "12px", color: "#999", marginBottom: "6px" }}>组成</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {formula.composition.map((c, i) => {
              const herb = findHerbByName(c.herb);
              return herb ? (
                <button
                  key={i}
                  onClick={() => router.push(`/zhongyi/herb?id=${herb.id}`)}
                  style={{
                    padding: "4px 10px", borderRadius: "6px", fontSize: "12px",
                    backgroundColor: "#E8F5E9", color: "#2E7D32", border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: "4px",
                  }}
                >
                  {c.herb}
                  {c.dosage && <span style={{ color: "#666", fontSize: "11px" }}>{c.dosage}</span>}
                </button>
              ) : (
                <span key={i} style={{ padding: "4px 10px", borderRadius: "6px", fontSize: "12px", backgroundColor: "#f5f5f5", color: "#666" }}>
                  {c.herb}{c.dosage && ` ${c.dosage}`}
                </span>
              );
            })}
          </div>
        </div>

        {/* 其他字段 */}
        {sections.map((section, i) => (
          <div key={section.label} style={{ padding: "12px 16px", borderBottom: i < sections.length - 1 ? "1px solid #f5f5f5" : "none" }}>
            <div style={{ fontSize: "12px", color: "#999", marginBottom: "4px" }}>{section.label}</div>
            <div style={{ fontSize: "14px", color: "#333", lineHeight: 1.7 }}>{section.content}</div>
          </div>
        ))}

        {/* 煎服法 */}
        {formula.preparation && (
          <div style={{ padding: "12px 16px" }}>
            <div style={{ fontSize: "12px", color: "#999", marginBottom: "4px" }}>煎服法</div>
            <div style={{ fontSize: "14px", color: "#333", lineHeight: 1.7 }}>{formula.preparation}</div>
          </div>
        )}
      </div>

      {/* 返回按钮 */}
      <div style={{ padding: "0 12px" }}>
        <button
          onClick={() => router.back()}
          style={{ width: "100%", padding: "12px", borderRadius: "12px", border: "none", fontSize: "14px", cursor: "pointer", backgroundColor: BRAND_BG, color: BRAND, fontWeight: "500" }}
        >
          返回方剂列表
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
function FormulaPageInner() {
  const searchParams = useSearchParams();
  const formulaId = searchParams.get("id");
  const formulaName = searchParams.get("name");

  // 支持 ?name= 参数（从辨证页跳转），通过名称查找方剂ID
  const resolvedId = useMemo(() => {
    if (formulaId) return formulaId;
    if (formulaName) {
      const allFormulas = searchFullFormulas('');
      const found = allFormulas.find(f => f.name === formulaName);
      if (found) return found.id;
      // 模糊匹配
      const fuzzy = allFormulas.find(f => f.name.includes(formulaName) || formulaName.includes(f.name));
      if (fuzzy) return fuzzy.id;
    }
    return null;
  }, [formulaId, formulaName]);

  return resolvedId ? <FormulaDetailPage formulaId={resolvedId} /> : <FormulaListPage />;
}

export default function FormulaPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA' }}>
        <div style={{ textAlign: 'center', color: '#7B1FA2' }}>加载中...</div>
      </div>
    }>
      <FormulaPageInner />
    </Suspense>
  );
}
