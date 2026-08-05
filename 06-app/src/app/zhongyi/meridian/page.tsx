"use client";

import { useState, useEffect, useMemo, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MERIDIANS_DB, ACUPOINTS_DB,
  searchAcupoints, getAcupointByName, getAcupointsByMeridian,
  loadFullMeridiansDatabase
} from "@/algorithm-core/modules/tcm/meridians";
import {
  DONG_ACUPOINTS_DB, getDongZoneGroups, searchDongAcupoints, getDongAcupointByName
} from "@/algorithm-core/modules/tcm/dong-acupoints";
import { addRecentItem } from "@/lib/tcmRecent";
import { triggerScrape, getCachedAcupointInfo, markForRefetch } from "@/lib/tcmScraper";
import type { TcmMeridian, TcmAcupoint, TcmDongAcupoint } from "@/algorithm-core/types/tcm";
import { useToolBack } from "@/lib/useToolBack";

const BRAND = "#7B2FBE";
const BRAND_LIGHT = "#9B5ECF";
const BRAND_BG = "#F3EDF7";
const COMPLIANCE_TEXT = "本APP内容仅供传统文化研究参考，不构成医疗建议。如有身体不适，请及时就医。";
const PROFESSIONAL_WARNING = "⚠️ 专业操作，请勿自行尝试";

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  "手三阴经": { bg: "#E3F2FD", text: "#1565C0" },
  "手三阳经": { bg: "#FFEBEE", text: "#C62828" },
  "足三阴经": { bg: "#E8F5E9", text: "#2E7D32" },
  "足三阳经": { bg: "#FFF3E0", text: "#E65100" },
  "奇经八脉": { bg: "#F3E5F5", text: "#6A1B9A" },
  "董氏奇穴": { bg: "#FFF8E1", text: "#E65100" },
};

function getCatColor(cat: string) {
  return CATEGORY_COLORS[cat] || { bg: "#F5F5F5", text: "#616161" };
}

// ==================== 经络列表页 ====================
function MeridianListPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [dbLoaded, setDbLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<"standard" | "dong">("standard");

  useEffect(() => {
    loadFullMeridiansDatabase().then(() => setDbLoaded(true));
  }, []);

  const groupedMeridians = useMemo(() => {
    const groups: Record<string, TcmMeridian[]> = {};
    for (const m of MERIDIANS_DB) {
      if (!groups[m.category]) groups[m.category] = [];
      groups[m.category].push(m);
    }
    return groups;
  }, [dbLoaded]);

  const dongZoneGroups = useMemo(() => getDongZoneGroups(), []);

  const filteredAcupoints = useMemo(() => {
    if (!searchQuery.trim()) return [];
    if (activeTab === "dong") return searchDongAcupoints(searchQuery).slice(0, 10);
    return searchAcupoints(searchQuery).slice(0, 10);
  }, [searchQuery, dbLoaded, activeTab]);

  const handleMeridianClick = (m: TcmMeridian) => {
    router.push(`/zhongyi/meridian?meridian=${encodeURIComponent(m.name)}`);
  };

  const handleAcupointClick = (a: TcmAcupoint) => {
    addRecentItem({ type: "meridian", id: a.name, name: a.name, category: a.meridian });
    router.push(`/zhongyi/meridian?acupoint=${encodeURIComponent(a.name)}`);
  };

  const handleDongClick = (a: TcmDongAcupoint) => {
    addRecentItem({ type: "meridian", id: a.name, name: a.name, category: "董氏奇穴" });
    router.push(`/zhongyi/meridian?dong=${encodeURIComponent(a.name)}`);
  };

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f8f5fc", paddingBottom: "80px" }}>
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_LIGHT} 100%)`, padding: "12px 16px", color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          
          <div>
            <h1 style={{ fontSize: "18px", fontWeight: "bold", margin: 0 }}>经络穴位</h1>
            
            <p style={{ fontSize: "11px", opacity: 0.8, margin: 0 }}>十二正经 · {ACUPOINTS_DB.length}穴 + 董氏{DONG_ACUPOINTS_DB.length}穴</p>
          </div>
        </div>

        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "white", borderRadius: "20px", padding: "8px 14px" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === "dong" ? "搜索董氏奇穴..." : "搜索穴位名称..."}
              style={{ flex: 1, border: "none", outline: "none", fontSize: "14px", background: "transparent" }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} style={{ background: "none", border: "none", color: "#999", cursor: "pointer" }}>✕</button>
            )}
          </div>

          {searchQuery && filteredAcupoints.length > 0 && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: "6px", background: "white", borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", maxHeight: "300px", overflowY: "auto", zIndex: 200 }}>
              {activeTab === "dong"
                ? filteredAcupoints.map((a: any, i: number) => (
                    <button key={a.code} onClick={() => handleDongClick(a)}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", border: "none", background: i % 2 === 0 ? "white" : "#fafafa", textAlign: "left", cursor: "pointer", borderBottom: i < filteredAcupoints.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                      <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", backgroundColor: "#FFF8E1", color: "#E65100", flexShrink: 0 }}>{a.zone}</span>
                      <span style={{ flex: 1, fontSize: "14px", color: "#333" }}>{a.name}</span>
                      <span style={{ fontSize: "11px", color: "#999" }}>{a.code}</span>
                    </button>
                  ))
                : filteredAcupoints.map((a: any, i: number) => (
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

        <div style={{ display: "flex", gap: "0", marginTop: "10px", background: "rgba(255,255,255,0.15)", borderRadius: "20px", padding: "3px" }}>
          <button
            onClick={() => { setActiveTab("standard"); setSearchQuery(""); }}
            style={{
              flex: 1, padding: "6px 0", borderRadius: "18px", border: "none",
              fontSize: "13px", fontWeight: "bold", cursor: "pointer",
              background: activeTab === "standard" ? "white" : "transparent",
              color: activeTab === "standard" ? BRAND : "rgba(255,255,255,0.8)",
            }}
          >
            标准经络
          </button>
          <button
            onClick={() => { setActiveTab("dong"); setSearchQuery(""); }}
            style={{
              flex: 1, padding: "6px 0", borderRadius: "18px", border: "none",
              fontSize: "13px", fontWeight: "bold", cursor: "pointer",
              background: activeTab === "dong" ? "white" : "transparent",
              color: activeTab === "dong" ? "#E65100" : "rgba(255,255,255,0.8)",
            }}
          >
            董氏奇穴
          </button>
        </div>
      </div>

      <div style={{ padding: "12px" }}>
        {activeTab === "standard" ? (
          !searchQuery && Object.entries(groupedMeridians).map(([cat, meridians]) => {
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
          })
        ) : (
          !searchQuery && dongZoneGroups.filter(g => g.acupoints.length > 0).map((group) => {
            const cc = getCatColor("董氏奇穴");
            return (
              <div key={group.zoneName} style={{ marginBottom: "16px" }}>
                <h3 style={{ fontSize: "13px", fontWeight: "bold", color: cc.text, margin: "0 0 8px", paddingLeft: "4px" }}>{group.zoneName}</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {group.acupoints.map((a) => (
                    <button key={a.code} onClick={() => handleDongClick(a)}
                      style={{ padding: "12px 10px", borderRadius: "12px", border: "none", cursor: "pointer", background: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", textAlign: "left" }}>
                      <div style={{ fontSize: "14px", fontWeight: "bold", color: "#333", marginBottom: "2px" }}>{a.name}</div>
                      <div style={{ fontSize: "10px", color: "#999", lineHeight: 1.4 }}>{a.function.slice(0, 20)}...</div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div style={{ padding: "12px 12px", background: "rgba(255,248,225,0.95)", borderTop: "1px solid #ffecb3", marginTop: "20px" }}>
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
        <button onClick={() => router.back()} style={{ padding: "8px 20px", borderRadius: "20px", backgroundColor: BRAND, color: "white", border: "none", cursor: "pointer" }}>返回经络列表</button>
      </div>
    );
  }

  const handleAcupointClick = (a: TcmAcupoint) => {
    addRecentItem({ type: "meridian", id: a.name, name: a.name, category: a.meridian });
    router.push(`/zhongyi/meridian?acupoint=${encodeURIComponent(a.name)}`);
  };

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f8f5fc", paddingBottom: "80px" }}>
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_LIGHT} 100%)`, padding: "12px 16px", color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          
          <h1 style={{ fontSize: "16px", fontWeight: "bold", margin: 0, flex: 1 }}>{meridian.name}</h1>
          <span style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "4px", backgroundColor: "rgba(255,255,255,0.2)" }}>{meridian.category}</span>
        </div>
      </div>

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

      <div style={{ margin: "0 12px 10px", padding: "8px 12px", backgroundColor: "#FFEBEE", borderRadius: "8px", border: "1px solid #FFCDD2" }}>
        <p style={{ margin: 0, fontSize: "11px", color: "#C62828", textAlign: "center", fontWeight: "bold" }}>{PROFESSIONAL_WARNING}</p>
      </div>

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

      <div style={{ padding: "12px 12px", background: "rgba(255,248,225,0.95)", borderTop: "1px solid #ffecb3", marginTop: "20px" }}>
        <p style={{ margin: 0, fontSize: "11px", color: "#f57f17", textAlign: "center" }}>⚠️ {COMPLIANCE_TEXT}</p>
      </div>
    </div>
  );
}

// ==================== 穴位详情页（标准经络） ====================
function AcupointDetailPage({ acupointName }: { acupointName: string }) {
  const router = useRouter();
  const [dbLoaded, setDbLoaded] = useState(false);
  const [aiData, setAiData] = useState<any>(null);
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState("");

  useEffect(() => {
    loadFullMeridiansDatabase().then(() => setDbLoaded(true));
  }, []);

  const acupoint = getAcupointByName(acupointName);

  useEffect(() => {
    if (acupoint) {
      addRecentItem({ type: "meridian", id: acupoint.name, name: acupoint.name, category: acupoint.meridian });
      const data = getCachedAcupointInfo(acupoint.name, "acupoint");
        if (data) setAiData(data);

    }
  }, [acupoint]);

  const handleAIScrape = useCallback(async () => {
    if (!acupoint || scraping) return;
    setScraping(true);
    setScrapeError("");
    try {
      const result = triggerScrape(acupoint.name, acupoint.name, acupoint.meridian, "acupoint");
      if (result) {
        setAiData(result);
      } else {
        setScrapeError("AI抓取失败，请稍后重试");
      }
    } catch {
      setScrapeError("网络错误，请检查连接后重试");
    } finally {
      setScraping(false);
    }
  }, [acupoint, scraping]);

  const handleReportError = useCallback(async () => {
    if (!acupoint) return;
    markForRefetch(acupoint.name, "acupoint");
    setAiData(null);
    alert("已标记为需要重新抓取，请再次点击AI抓取按钮");
  }, [acupoint]);

  if (!acupoint) {
    return (
      <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f8f5fc", padding: "80px 20px", textAlign: "center" }}>
        <p style={{ color: "#999", marginBottom: "20px" }}>未找到该穴位</p>
        <button onClick={() => router.back()} style={{ padding: "8px 20px", borderRadius: "20px", backgroundColor: BRAND, color: "white", border: "none", cursor: "pointer" }}>返回列表</button>
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
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_LIGHT} 100%)`, padding: "12px 16px", color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          
          <h1 style={{ fontSize: "16px", fontWeight: "bold", margin: 0, flex: 1 }}>{acupoint.name}</h1>
          <span style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "4px", backgroundColor: "rgba(255,255,255,0.2)" }}>{acupoint.code}</span>
        </div>
      </div>

      <div style={{ margin: "12px", padding: "10px 14px", backgroundColor: "#FFEBEE", borderRadius: "10px", border: "1px solid #FFCDD2" }}>
        <p style={{ margin: 0, fontSize: "12px", color: "#C62828", fontWeight: "bold", textAlign: "center" }}>{PROFESSIONAL_WARNING}</p>
      </div>

      {/* 穴位定位示意图 */}
      <div style={{ margin: "12px", background: "white", borderRadius: "16px", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <div style={{ padding: "10px 16px", borderBottom: "1px solid #f0f0f0", fontSize: "13px", fontWeight: "bold", color: "#333" }}>穴位定位示意图</div>
        <div style={{ display: "flex", justifyContent: "center", padding: "16px", background: "#fafafa" }}>
          <BodyAcupointMap acupoint={acupoint} />
        </div>
        <div style={{ padding: "8px 16px", fontSize: "11px", color: "#999", textAlign: "center", borderTop: "1px solid #f0f0f0" }}>
          示意图仅供参考，实际取穴请以专业医师指导为准
        </div>
      </div>

      {/* 穴位信息卡片 */}
      <div style={{ margin: "12px", background: "white", borderRadius: "16px", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <div style={{ padding: "16px", background: "linear-gradient(135deg, #E3F2FD 0%, white 100%)", borderBottom: "1px solid #f0f0f0" }}>
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

      {/* AI抓取详细定位信息 */}
      <div style={{ margin: "12px", background: "white", borderRadius: "16px", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "14px", fontWeight: "bold", color: "#333" }}>🤖 AI详细定位</span>
            <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", backgroundColor: "#E8F5E9", color: "#2E7D32" }}>AI抓取</span>
          </div>
          {!aiData && !scraping && (
            <button onClick={handleAIScrape}
              style={{ padding: "6px 14px", borderRadius: "16px", border: "none", fontSize: "12px", fontWeight: "bold", cursor: "pointer", background: `linear-gradient(135deg, ${BRAND}, ${BRAND_LIGHT})`, color: "white" }}>
              AI抓取
            </button>
          )}
          {scraping && (
            <span style={{ fontSize: "12px", color: "#999", display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ display: "inline-block", width: "14px", height: "14px", border: "2px solid #ccc", borderTopColor: BRAND, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              抓取中...
            </span>
          )}
        </div>

        {aiData ? (
          <>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f5f5f5" }}>
              <div style={{ fontSize: "12px", color: "#999", marginBottom: "4px" }}>详细定位描述</div>
              <div style={{ fontSize: "14px", color: "#333", lineHeight: 1.7 }}>{aiData.detail}</div>
            </div>
            {aiData.needling_method && (
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #f5f5f5" }}>
                <div style={{ fontSize: "12px", color: "#999", marginBottom: "4px" }}>进针方法</div>
                <div style={{ fontSize: "14px", color: "#333", lineHeight: 1.7, padding: "8px 12px", backgroundColor: "#FFF3E0", borderRadius: "8px", borderLeft: "3px solid #E65100" }}>
                  {aiData.needling_method}
                </div>
              </div>
            )}
            {aiData.image_url && (
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #f5f5f5" }}>
                <div style={{ fontSize: "12px", color: "#999", marginBottom: "8px" }}>定位参考图</div>
                <div style={{ textAlign: "center", background: "#fafafa", borderRadius: "8px", padding: "12px" }}>
                  <img
                    src={aiData.image_url}
                    alt={`${acupoint.name}定位图`}
                    style={{ maxWidth: "100%", maxHeight: "200px", borderRadius: "8px" }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                      (e.target as HTMLImageElement).parentElement!.innerHTML = '<span style="color:#999;font-size:12px">图片加载失败，请稍后重试</span>';
                    }}
                  />
                </div>
              </div>
            )}
            <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px", color: "#999" }}>
              <span>来源：{aiData.source}</span>
              <div style={{ display: "flex", gap: "8px" }}>
                <span>抓取时间：{new Date(aiData.fetched_at).toLocaleDateString()}</span>
                <button onClick={handleReportError}
                  style={{ background: "none", border: "none", color: "#C62828", cursor: "pointer", fontSize: "11px", textDecoration: "underline" }}>
                  反馈错误
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ padding: "20px 16px", textAlign: "center" }}>
            {scrapeError ? (
              <div style={{ color: "#C62828", fontSize: "13px", marginBottom: "8px" }}>{scrapeError}</div>
            ) : (
              <div style={{ color: "#999", fontSize: "13px" }}>
                点击 "AI抓取" 按钮，系统将自动搜索并收录该穴位的详细定位信息、进针方法和参考图片。
                <br /><br />
                <span style={{ fontSize: "11px", color: "#bbb" }}>每个穴位仅需抓取一次，数据将保存到服务器供所有用户使用。</span>
              </div>
            )}
            {scrapeError && (
              <button onClick={handleAIScrape}
                style={{ padding: "6px 14px", borderRadius: "16px", border: "none", fontSize: "12px", cursor: "pointer", background: BRAND, color: "white" }}>
                重试
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{ margin: "0 12px", padding: "10px 14px", backgroundColor: "#fff8e1", borderRadius: "10px", border: "1px solid #ffecb3" }}>
        <p style={{ margin: 0, fontSize: "11px", color: "#f57f17", lineHeight: 1.6 }}>
          本页未提供刺灸法操作细节，针灸操作必须由持有执业医师资格证的专业医师执行，禁止非专业人员自行操作。
        </p>
      </div>

      <div style={{ padding: "12px" }}>
        <button onClick={() => router.push(`/zhongyi/meridian?meridian=${encodeURIComponent(acupoint.meridian)}`)}
          style={{ width: "100%", padding: "12px", borderRadius: "12px", border: "none", fontSize: "14px", cursor: "pointer", backgroundColor: BRAND_BG, color: BRAND, fontWeight: "500", marginBottom: "8px" }}>
          返回{acupoint.meridian}穴位列表
        </button>
      </div>

      <div style={{ padding: "12px 12px", background: "rgba(255,248,225,0.95)", borderTop: "1px solid #ffecb3", marginTop: "20px" }}>
        <p style={{ margin: 0, fontSize: "11px", color: "#f57f17", textAlign: "center" }}>⚠️ {COMPLIANCE_TEXT}</p>
      </div>
    </div>
  );
}

// ==================== 董氏奇穴详情页 ====================
function DongAcupointDetailPage({ acupointName }: { acupointName: string }) {
  const router = useRouter();
  const [aiData, setAiData] = useState<any>(null);
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState("");

  const acupoint = getDongAcupointByName(acupointName);

  useEffect(() => {
    if (acupoint) {
      addRecentItem({ type: "meridian", id: acupoint.name, name: acupoint.name, category: "董氏奇穴" });
      const data = getCachedAcupointInfo(acupoint.name, "dong");
        if (data) setAiData(data);
    }
  }, [acupoint]);

  const handleAIScrape = useCallback(async () => {
    if (!acupoint || scraping) return;
    setScraping(true);
    setScrapeError("");
    try {
      const result = triggerScrape(acupoint.name, acupoint.name, "董氏奇穴", "dong");
      if (result) {
        setAiData(result);
      } else {
        setScrapeError("AI抓取失败，请稍后重试");
      }
    } catch {
      setScrapeError("网络错误，请检查连接后重试");
    } finally {
      setScraping(false);
    }
  }, [acupoint, scraping]);

  const handleReportError = useCallback(async () => {
    if (!acupoint) return;
    markForRefetch(acupoint.name, "dong");
    setAiData(null);
    alert("已标记为需要重新抓取，请再次点击AI抓取按钮");
  }, [acupoint]);

  if (!acupoint) {
    return (
      <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f8f5fc", padding: "80px 20px", textAlign: "center" }}>
        <p style={{ color: "#999", marginBottom: "20px" }}>未找到该董氏奇穴</p>
        <button onClick={() => router.back()} style={{ padding: "8px 20px", borderRadius: "20px", backgroundColor: BRAND, color: "white", border: "none", cursor: "pointer" }}>返回列表</button>
      </div>
    );
  }

  const sections: { label: string; content: string }[] = [
    { label: "所属部位", content: acupoint.zone },
    { label: "定位", content: acupoint.location },
    { label: "详细定位", content: acupoint.location_detail },
    { label: "功效主治", content: acupoint.function },
    { label: "进针方式", content: acupoint.needling_method },
    { label: "针刺深度", content: acupoint.depth },
    { label: "留针时间", content: acupoint.duration },
    { label: "禁忌", content: acupoint.contraindications },
    { label: "文献出处", content: acupoint.literature },
  ];

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f8f5fc", paddingBottom: "120px" }}>
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "linear-gradient(135deg, #E65100 0%, #FF8F00 100%)", padding: "12px 16px", color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          
          <div>
            <h1 style={{ fontSize: "16px", fontWeight: "bold", margin: 0 }}>{acupoint.name}</h1>
            <p style={{ fontSize: "10px", opacity: 0.7, margin: "2px 0 0 0" }}>董氏奇穴 · {acupoint.code}</p>
          </div>
        </div>
      </div>

      <div style={{ margin: "12px", padding: "10px 14px", backgroundColor: "#FFEBEE", borderRadius: "10px", border: "1px solid #FFCDD2" }}>
        <p style={{ margin: 0, fontSize: "12px", color: "#C62828", fontWeight: "bold", textAlign: "center" }}>{PROFESSIONAL_WARNING}</p>
      </div>

      {/* 穴位信息卡片 */}
      <div style={{ margin: "12px", background: "white", borderRadius: "16px", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <div style={{ padding: "16px", background: "linear-gradient(135deg, #FFF8E1 0%, white 100%)", borderBottom: "1px solid #f0f0f0" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
            <span style={{ fontSize: "24px", fontWeight: "bold", color: "#333" }}>{acupoint.name}</span>
            {acupoint.pinyin && <span style={{ fontSize: "12px", color: "#999" }}>{acupoint.pinyin}</span>}
          </div>
          <div style={{ fontSize: "12px", color: "#E65100", marginTop: "4px" }}>董氏奇穴 · {acupoint.zone} · {acupoint.code}</div>
        </div>
        {sections.filter(s => s.content).map((section, i, arr) => (
          <div key={section.label} style={{ padding: "12px 16px", borderBottom: i < arr.length - 1 ? "1px solid #f5f5f5" : "none" }}>
            <div style={{ fontSize: "12px", color: "#999", marginBottom: "4px" }}>{section.label}</div>
            <div style={{ fontSize: "14px", color: "#333", lineHeight: 1.7 }}>{section.content}</div>
          </div>
        ))}
      </div>

      {/* AI抓取补充信息 */}
      <div style={{ margin: "12px", background: "white", borderRadius: "16px", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "14px", fontWeight: "bold", color: "#333" }}>🤖 AI补充信息</span>
            <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", backgroundColor: "#E8F5E9", color: "#2E7D32" }}>AI抓取</span>
          </div>
          {!aiData && !scraping && (
            <button onClick={handleAIScrape}
              style={{ padding: "6px 14px", borderRadius: "16px", border: "none", fontSize: "12px", fontWeight: "bold", cursor: "pointer", background: "linear-gradient(135deg, #E65100, #FF8F00)", color: "white" }}>
              AI抓取
            </button>
          )}
          {scraping && (
            <span style={{ fontSize: "12px", color: "#999", display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ display: "inline-block", width: "14px", height: "14px", border: "2px solid #ccc", borderTopColor: "#E65100", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              抓取中...
            </span>
          )}
        </div>

        {aiData ? (
          <>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f5f5f5" }}>
              <div style={{ fontSize: "12px", color: "#999", marginBottom: "4px" }}>详细定位描述</div>
              <div style={{ fontSize: "14px", color: "#333", lineHeight: 1.7 }}>{aiData.detail}</div>
            </div>
            {aiData.needling_method && (
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #f5f5f5" }}>
                <div style={{ fontSize: "12px", color: "#999", marginBottom: "4px" }}>进针方法补充</div>
                <div style={{ fontSize: "14px", color: "#333", lineHeight: 1.7, padding: "8px 12px", backgroundColor: "#FFF3E0", borderRadius: "8px", borderLeft: "3px solid #E65100" }}>
                  {aiData.needling_method}
                </div>
              </div>
            )}
            {aiData.image_url && (
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #f5f5f5" }}>
                <div style={{ fontSize: "12px", color: "#999", marginBottom: "8px" }}>定位参考图</div>
                <div style={{ textAlign: "center", background: "#fafafa", borderRadius: "8px", padding: "12px" }}>
                  <img
                    src={aiData.image_url}
                    alt={`${acupoint.name}定位图`}
                    style={{ maxWidth: "100%", maxHeight: "200px", borderRadius: "8px" }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                      (e.target as HTMLImageElement).parentElement!.innerHTML = '<span style="color:#999;font-size:12px">图片加载失败</span>';
                    }}
                  />
                </div>
              </div>
            )}
            <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px", color: "#999" }}>
              <span>来源：{aiData.source}</span>
              <button onClick={handleReportError}
                style={{ background: "none", border: "none", color: "#C62828", cursor: "pointer", fontSize: "11px", textDecoration: "underline" }}>
                反馈错误
              </button>
            </div>
          </>
        ) : (
          <div style={{ padding: "20px 16px", textAlign: "center" }}>
            {scrapeError ? (
              <div style={{ color: "#C62828", fontSize: "13px", marginBottom: "8px" }}>{scrapeError}</div>
            ) : (
              <div style={{ color: "#999", fontSize: "13px" }}>
                点击 "AI抓取" 获取更多定位细节和参考图片。
              </div>
            )}
            {scrapeError && (
              <button onClick={handleAIScrape}
                style={{ padding: "6px 14px", borderRadius: "16px", border: "none", fontSize: "12px", cursor: "pointer", background: "#E65100", color: "white" }}>
                重试
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{ padding: "12px" }}>
        <button onClick={() => router.push("/zhongyi/meridian")}
          style={{ width: "100%", padding: "12px", borderRadius: "12px", border: "none", fontSize: "14px", cursor: "pointer", backgroundColor: "#FFF8E1", color: "#E65100", fontWeight: "500" }}>
          返回经络穴位列表
        </button>
      </div>

      <div style={{ padding: "12px 12px", background: "rgba(255,248,225,0.95)", borderTop: "1px solid #ffecb3", marginTop: "20px" }}>
        <p style={{ margin: 0, fontSize: "11px", color: "#f57f17", textAlign: "center" }}>⚠️ {COMPLIANCE_TEXT}</p>
      </div>
    </div>
  );
}

// ==================== 穴位定位示意图组件 ====================
function BodyAcupointMap({ acupoint }: { acupoint: TcmAcupoint }) {
  const getBodyRegion = (): { cx: number; cy: number; label: string } => {
    const loc = (acupoint.location || "").toLowerCase();
    const name = acupoint.name || "";
    if (loc.includes("头") || loc.includes("面") || loc.includes("额") || name.includes("百会") || name.includes("风池") || name.includes("太阳")) {
      return { cx: 150, cy: 40, label: "头部" };
    }
    if (loc.includes("颈") || loc.includes("喉") || name.includes("天突")) {
      return { cx: 150, cy: 85, label: "颈部" };
    }
    if (loc.includes("胸") || loc.includes("乳") || loc.includes("膻") || name.includes("中府") || name.includes("期门")) {
      return { cx: 150, cy: 120, label: "胸部" };
    }
    if (loc.includes("腹") || loc.includes("脐") || name.includes("关元") || name.includes("气海") || name.includes("中脘") || name.includes("天枢")) {
      return { cx: 150, cy: 155, label: "腹部" };
    }
    if (loc.includes("手") || loc.includes("腕") || loc.includes("掌") || loc.includes("指") || name.includes("合谷") || name.includes("内关") || name.includes("列缺") || name.includes("太渊")) {
      return { cx: 80, cy: 220, label: "手部" };
    }
    if (loc.includes("肘") || loc.includes("臂") || name.includes("曲池") || name.includes("尺泽")) {
      return { cx: 80, cy: 180, label: "前臂" };
    }
    if (loc.includes("足") || loc.includes("踝") || loc.includes("趾") || name.includes("太冲") || name.includes("涌泉") || name.includes("太溪") || name.includes("昆仑")) {
      return { cx: 150, cy: 320, label: "足部" };
    }
    if (loc.includes("膝") || loc.includes("腿") || name.includes("足三里") || name.includes("三阴交") || name.includes("阳陵泉") || name.includes("委中")) {
      return { cx: 150, cy: 260, label: "腿部" };
    }
    if (loc.includes("背") || loc.includes("腰") || name.includes("肾俞") || name.includes("命门") || name.includes("大椎") || name.includes("肺俞")) {
      return { cx: 150, cy: 140, label: "背部" };
    }
    if (loc.includes("耳") || name.includes("听宫") || name.includes("翳风")) {
      return { cx: 150, cy: 55, label: "耳部" };
    }
    if (loc.includes("鼻") || name.includes("迎香") || name.includes("水沟")) {
      return { cx: 150, cy: 65, label: "面部" };
    }
    return { cx: 150, cy: 150, label: "躯干" };
  };

  const region = getBodyRegion();

  return (
    <svg width="200" height="360" viewBox="0 0 300 360" style={{ maxWidth: "100%" }}>
      <defs>
        <radialGradient id="glow">
          <stop offset="0%" stopColor="#d93025" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#d93025" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="150" cy="35" rx="32" ry="38" fill="none" stroke="#bbb" strokeWidth="2" />
      <line x1="150" y1="73" x2="150" y2="85" stroke="#bbb" strokeWidth="2" />
      <line x1="118" y1="85" x2="182" y2="85" stroke="#bbb" strokeWidth="2" />
      <rect x="110" y="85" width="80" height="160" rx="20" fill="none" stroke="#bbb" strokeWidth="2" />
      <line x1="150" y1="245" x2="150" y2="280" stroke="#bbb" strokeWidth="2" />
      <line x1="150" y1="245" x2="110" y2="310" stroke="#bbb" strokeWidth="1.5" />
      <line x1="150" y1="245" x2="190" y2="310" stroke="#bbb" strokeWidth="1.5" />
      <line x1="110" y1="140" x2="60" y2="200" stroke="#bbb" strokeWidth="1.5" />
      <line x1="190" y1="140" x2="240" y2="200" stroke="#bbb" strokeWidth="1.5" />
      <line x1="110" y1="310" x2="110" y2="340" stroke="#bbb" strokeWidth="1.5" />
      <line x1="190" y1="310" x2="190" y2="340" stroke="#bbb" strokeWidth="1.5" />

      <circle cx={region.cx} cy={region.cy} r="20" fill="url(#glow)" />
      <circle cx={region.cx} cy={region.cy} r="6" fill="#d93025" stroke="white" strokeWidth="2" />
      <text x={region.cx} y={region.cy - 12} textAnchor="middle" fontSize="11" fill="#d93025" fontWeight="bold">
        {acupoint.name}
      </text>
      <text x={region.cx} y={region.cy + 18} textAnchor="middle" fontSize="9" fill="#999">
        {region.label}
      </text>
    </svg>
  );
}

// ==================== 主组件 ====================
function MeridianPageInner() {
  const searchParams = useSearchParams();
  const meridianName = searchParams.get("meridian");
  const acupointName = searchParams.get("acupoint");
  const dongName = searchParams.get("dong");

  if (dongName) return <DongAcupointDetailPage acupointName={dongName} />;
  if (acupointName) return <AcupointDetailPage acupointName={acupointName} />;
  if (meridianName) return <AcupointListPage meridianName={meridianName} />;
  return <MeridianListPage />;
}

export default function MeridianPage() {
  useToolBack({ pageKey: "zhongyi_meridian", eventName: "zhongyi-back", globalFlag: "__zhongyiBackHandled" });
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


