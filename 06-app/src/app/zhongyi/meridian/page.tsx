"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MERIDIANS_DB, ACUPOINTS_DB,
  searchAcupoints, getAcupointByName, getAcupointsByMeridian,
  loadFullMeridiansDatabase
} from "@/algorithm-core/modules/tcm/meridians";
import { addRecentItem } from "@/lib/tcmRecent";
import type { TcmMeridian, TcmAcupoint } from "@/algorithm-core/types/tcm";

const BRAND = "#7B2FBE";
const BRAND_LIGHT = "#9B5ECF";
const BRAND_BG = "#F3EDF7";
const COMPLIANCE_TEXT = "穴位内容仅供学习参考，针灸操作需由专业医师执行，禁止自行操作";
const PROFESSIONAL_WARNING = "⚠️ 专业操作，请勿自行尝试";

// 经络分类颜色
const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  "手三阴经": { bg: "#E3F2FD", text: "#1565C0" },
  "手三阳经": { bg: "#FFEBEE", text: "#C62828" },
  "足三阴经": { bg: "#E8F5E9", text: "#2E7D32" },
  "足三阳经": { bg: "#FFF3E0", text: "#E65100" },
  "奇经八脉": { bg: "#F3E5F5", text: "#6A1B9A" },
};

function getCatColor(cat: string) {
  return CATEGORY_COLORS[cat] || { bg: "#F5F5F5", text: "#616161" };
}

// ==================== 经络列表页 ====================
function MeridianListPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [dbLoaded, setDbLoaded] = useState(false);

  useEffect(() => {
    loadFullMeridiansDatabase().then(() => setDbLoaded(true));
  }, []);

  // 按分类分组
  const groupedMeridians = useMemo(() => {
    const groups: Record<string, TcmMeridian[]> = {};
    for (const m of MERIDIANS_DB) {
      if (!groups[m.category]) groups[m.category] = [];
      groups[m.category].push(m);
    }
    return groups;
  }, [dbLoaded]);

  const filteredAcupoints = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchAcupoints(searchQuery).slice(0, 10);
  }, [searchQuery, dbLoaded]);

  const handleMeridianClick = (m: TcmMeridian) => {
    router.push(`/zhongyi/meridian?meridian=${encodeURIComponent(m.name)}`);
  };

  const handleAcupointClick = (a: TcmAcupoint) => {
    addRecentItem({ type: "meridian", id: a.name, name: a.name, category: a.meridian });
    router.push(`/zhongyi/meridian?acupoint=${encodeURIComponent(a.name)}`);
  };

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f8f5fc", paddingBottom: "80px" }}>
      {/* 顶部导航 */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_LIGHT} 100%)`, padding: "12px 16px", color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          <button onClick={() => router.push("/zhongyi")} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <div>
            <h1 style={{ fontSize: "18px", fontWeight: "bold", margin: 0 }}>经络穴位</h1>
            <p style={{ fontSize: "11px", opacity: 0.8, margin: 0 }}>十二正经 · {ACUPOINTS_DB.length} 个穴位</p>
          </div>
        </div>

        {/* 搜索框 */}
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "white", borderRadius: "20px", padding: "8px 14px" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索穴位名称..."
              style={{ flex: 1, border: "none", outline: "none", fontSize: "14px", background: "transparent" }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} style={{ background: "none", border: "none", color: "#999", cursor: "pointer" }}>✕</button>
            )}
          </div>

          {/* 搜索结果 */}
          {searchQuery && filteredAcupoints.length > 0 && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: "6px", background: "white", borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", maxHeight: "300px", overflowY: "auto", zIndex: 200 }}>
              {filteredAcupoints.map((a, i) => (
                <button key={a.code} onClick={() => handleAcupointClick(a)}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", border: "none", background: i % 2 === 0 ? "white" : "#fafafa", textAlign: "left", cursor: "pointer", borderBottom: i < filteredAcupoints.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                  <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", backgroundColor: "#E3F2FD", color: "#1565C0", flexShrink: 0 }}>{a.meridian}</span>
                  <span style={{ flex: 1, fontSize: "14px", color: "#333" }}>{a.name}</span>
                  <span style={{ fontSize: "11px", color: "#999" }}>{a.code}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 经络分组列表 */}
      <div style={{ padding: "12px" }}>
        {!searchQuery && Object.entries(groupedMeridians).map(([cat, meridians]) => {
          const cc = getCatColor(cat);
          return (
            <div key={cat} style={{ marginBottom: "16px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: "bold", color: cc.text, margin: "0 0 8px", paddingLeft: "4px" }}>{cat}</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                {meridians.map((m) => (
                  <button key={m.id} onClick={() => handleMeridianClick(m)}
                    style={{ padding: "12px 8px", borderRadius: "12px", border: "none", cursor: "pointer", background: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", textAlign: "center" }}>
                    <div style={{ fontSize: "15px", fontWeight: "bold", color: "#333", marginBottom: "2px" }}>{m.name}</div>
                    <div style={{ fontSize: "10px", color: "#999" }}>{getAcupointsByMeridian(m.name).length}穴</div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* 底部合规提示 */}
      <div style={{ position: "fixed", bottom: "56px", left: 0, right: 0, padding: "8px 12px", background: "rgba(255,248,225,0.95)", backdropFilter: "blur(8px)", borderTop: "1px solid #ffecb3", zIndex: 50 }}>
        <p style={{ margin: 0, fontSize: "11px", color: "#f57f17", textAlign: "center" }}>⚠️ {COMPLIANCE_TEXT}</p>
      </div>
    </div>
  );
}

// ==================== 穴位列表页（单经络） ====================
function AcupointListPage({ meridianName }: { meridianName: string }) {
  const router = useRouter();
  const [dbLoaded, setDbLoaded] = useState(false);

  useEffect(() => {
    loadFullMeridiansDatabase().then(() => setDbLoaded(true));
  }, []);

  const meridian = MERIDIANS_DB.find(m => m.name === meridianName);
  const acupoints = getAcupointsByMeridian(meridianName);
  const cc = meridian ? getCatColor(meridian.category) : getCatColor("其他");

  if (!meridian) {
    return (
      <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f8f5fc", padding: "80px 20px", textAlign: "center" }}>
        <p style={{ color: "#999", marginBottom: "20px" }}>未找到该经络</p>
        <button onClick={() => router.push("/zhongyi/meridian")} style={{ padding: "8px 20px", borderRadius: "20px", backgroundColor: BRAND, color: "white", border: "none", cursor: "pointer" }}>返回经络列表</button>
      </div>
    );
  }

  const handleAcupointClick = (a: TcmAcupoint) => {
    addRecentItem({ type: "meridian", id: a.name, name: a.name, category: a.meridian });
    router.push(`/zhongyi/meridian?acupoint=${encodeURIComponent(a.name)}`);
  };

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f8f5fc", paddingBottom: "80px" }}>
      {/* 顶部导航 */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_LIGHT} 100%)`, padding: "12px 16px", color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => router.push("/zhongyi/meridian")} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <h1 style={{ fontSize: "16px", fontWeight: "bold", margin: 0, flex: 1 }}>{meridian.name}</h1>
          <span style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "4px", backgroundColor: "rgba(255,255,255,0.2)" }}>{meridian.category}</span>
        </div>
      </div>

      {/* 经络信息卡片 */}
      <div style={{ margin: "12px", background: "white", borderRadius: "16px", padding: "14px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <div style={{ fontSize: "12px", color: "#999", marginBottom: "6px" }}>循行路线</div>
        <p style={{ fontSize: "13px", color: "#333", lineHeight: 1.7, margin: 0 }}>{meridian.pathway}</p>
        {meridian.element && (
          <div style={{ marginTop: "8px", display: "flex", gap: "8px", fontSize: "11px", color: "#666" }}>
            <span>五行：{meridian.element}</span>
            <span>阴阳：{meridian.yin_yang}</span>
            <span>表里：{meridian.paired}</span>
          </div>
        )}
      </div>

      {/* 专业操作警示 */}
      <div style={{ margin: "0 12px 10px", padding: "8px 12px", backgroundColor: "#FFEBEE", borderRadius: "8px", border: "1px solid #FFCDD2" }}>
        <p style={{ margin: 0, fontSize: "11px", color: "#C62828", textAlign: "center", fontWeight: "bold" }}>{PROFESSIONAL_WARNING}</p>
      </div>

      {/* 穴位列表 */}
      <div style={{ padding: "0 12px" }}>
        <h3 style={{ fontSize: "13px", fontWeight: "bold", color: cc.text, margin: "0 0 8px", paddingLeft: "4px" }}>{meridian.name}穴位（{acupoints.length}）</h3>
        {acupoints.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#999", fontSize: "13px" }}>该经络穴位数据完善中</div>
        ) : (
          acupoints.map((a) => (
            <button key={a.code} onClick={() => handleAcupointClick(a)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px", marginBottom: "8px", borderRadius: "12px", border: "none", background: "white", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", textAlign: "left" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: cc.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: "11px", fontWeight: "bold", color: cc.text }}>{a.code.replace(/[A-Za-z]/g, '').slice(-2)}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "15px", fontWeight: "bold", color: "#333" }}>{a.name}</div>
                <div style={{ fontSize: "11px", color: "#999" }}>{a.code} · {a.function}</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          ))
        )}
      </div>

      {/* 底部合规提示 */}
      <div style={{ position: "fixed", bottom: "56px", left: 0, right: 0, padding: "8px 12px", background: "rgba(255,248,225,0.95)", backdropFilter: "blur(8px)", borderTop: "1px solid #ffecb3", zIndex: 50 }}>
        <p style={{ margin: 0, fontSize: "11px", color: "#f57f17", textAlign: "center" }}>⚠️ {COMPLIANCE_TEXT}</p>
      </div>
    </div>
  );
}

// ==================== 穴位详情页 ====================
function AcupointDetailPage({ acupointName }: { acupointName: string }) {
  const router = useRouter();
  const [dbLoaded, setDbLoaded] = useState(false);

  useEffect(() => {
    loadFullMeridiansDatabase().then(() => setDbLoaded(true));
  }, []);

  const acupoint = getAcupointByName(acupointName);

  useEffect(() => {
    if (acupoint) {
      addRecentItem({ type: "meridian", id: acupoint.name, name: acupoint.name, category: acupoint.meridian });
    }
  }, [acupoint]);

  if (!acupoint) {
    return (
      <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f8f5fc", padding: "80px 20px", textAlign: "center" }}>
        <p style={{ color: "#999", marginBottom: "20px" }}>未找到该穴位</p>
        <button onClick={() => router.push("/zhongyi/meridian")} style={{ padding: "8px 20px", borderRadius: "20px", backgroundColor: BRAND, color: "white", border: "none", cursor: "pointer" }}>返回列表</button>
      </div>
    );
  }

  const sections: { label: string; content: string | undefined }[] = [
    { label: "归经", content: acupoint.meridian },
    { label: "定位", content: acupoint.location },
    { label: "详细定位", content: acupoint.location_detail },
    { label: "功效", content: acupoint.function },
    { label: "典籍出处", content: acupoint.literature },
  ];

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f8f5fc", paddingBottom: "120px" }}>
      {/* 顶部导航 */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_LIGHT} 100%)`, padding: "12px 16px", color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => router.back()} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <h1 style={{ fontSize: "16px", fontWeight: "bold", margin: 0, flex: 1 }}>{acupoint.name}</h1>
          <span style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "4px", backgroundColor: "rgba(255,255,255,0.2)" }}>{acupoint.code}</span>
        </div>
      </div>

      {/* 专业操作警示 */}
      <div style={{ margin: "12px", padding: "10px 14px", backgroundColor: "#FFEBEE", borderRadius: "10px", border: "1px solid #FFCDD2" }}>
        <p style={{ margin: 0, fontSize: "12px", color: "#C62828", fontWeight: "bold", textAlign: "center" }}>{PROFESSIONAL_WARNING}</p>
      </div>

      {/* 穴位信息卡片 */}
      <div style={{ margin: "12px", background: "white", borderRadius: "16px", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <div style={{ padding: "16px", background: `linear-gradient(135deg, #E3F2FD 0%, white 100%)`, borderBottom: "1px solid #f0f0f0" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
            <span style={{ fontSize: "24px", fontWeight: "bold", color: "#333" }}>{acupoint.name}</span>
            {acupoint.pinyin && <span style={{ fontSize: "12px", color: "#999" }}>{acupoint.pinyin}</span>}
          </div>
          <div style={{ fontSize: "12px", color: "#1565C0", marginTop: "4px" }}>{acupoint.meridian} · {acupoint.code}</div>
        </div>

        {sections.filter(s => s.content).map((section, i, arr) => (
          <div key={section.label} style={{ padding: "12px 16px", borderBottom: i < arr.length - 1 ? "1px solid #f5f5f5" : "none" }}>
            <div style={{ fontSize: "12px", color: "#999", marginBottom: "4px" }}>{section.label}</div>
            <div style={{ fontSize: "14px", color: "#333", lineHeight: 1.7 }}>{section.content}</div>
          </div>
        ))}
      </div>

      {/* 刺灸法警示说明 */}
      <div style={{ margin: "0 12px", padding: "10px 14px", backgroundColor: "#fff8e1", borderRadius: "10px", border: "1px solid #ffecb3" }}>
        <p style={{ margin: 0, fontSize: "11px", color: "#f57f17", lineHeight: 1.6 }}>
          本页未提供刺灸法操作细节，针灸操作必须由持有执业医师资格证的专业医师执行，禁止非专业人员自行操作。
        </p>
      </div>

      {/* 返回按钮 */}
      <div style={{ padding: "12px" }}>
        <button onClick={() => router.push(`/zhongyi/meridian?meridian=${encodeURIComponent(acupoint.meridian)}`)}
          style={{ width: "100%", padding: "12px", borderRadius: "12px", border: "none", fontSize: "14px", cursor: "pointer", backgroundColor: BRAND_BG, color: BRAND, fontWeight: "500", marginBottom: "8px" }}>
          返回{acupoint.meridian}穴位列表
        </button>
      </div>

      {/* 底部合规提示 */}
      <div style={{ position: "fixed", bottom: "56px", left: 0, right: 0, padding: "8px 12px", background: "rgba(255,248,225,0.95)", backdropFilter: "blur(8px)", borderTop: "1px solid #ffecb3", zIndex: 50 }}>
        <p style={{ margin: 0, fontSize: "11px", color: "#f57f17", textAlign: "center" }}>⚠️ {COMPLIANCE_TEXT}</p>
      </div>
    </div>
  );
}

// ==================== 主组件 ====================
function MeridianPageInner() {
  const searchParams = useSearchParams();
  const meridianName = searchParams.get("meridian");
  const acupointName = searchParams.get("acupoint");

  if (acupointName) return <AcupointDetailPage acupointName={acupointName} />;
  if (meridianName) return <AcupointListPage meridianName={meridianName} />;
  return <MeridianListPage />;
}

export default function MeridianPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA' }}>
        <div style={{ textAlign: 'center', color: '#7B1FA2' }}>加载中...</div>
      </div>
    }>
      <MeridianPageInner />
    </Suspense>
  );
}
