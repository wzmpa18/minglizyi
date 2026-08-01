"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HERBS_DB, searchHerbs as searchHerbsFn } from "@/algorithm-core/modules/tcm/herbs";
import { FORMULAS_DB, searchFormulas as searchFormulasFn } from "@/algorithm-core/modules/tcm/formulas";
import type { TcmHerb, TcmFormula } from "@/algorithm-core/types/tcm";

const BRAND = "#7B2FBE";
const BRAND_LIGHT = "#9B5ECF";
const BRAND_BG = "#F3EDF7";
const COMPLIANCE_TEXT = "内容仅供中医学习参考，不作为诊疗依据";

// ==================== 每日推荐数据 ====================
const DAILY_HERBS = [
  { name: "人参", pinyin: "rén shēn", tag: "大补元气", desc: "味甘、微苦，微温。归脾、肺、心、肾经。大补元气，复脉固脱，补脾益肺，生津养血，安神益智。" },
  { name: "黄芪", pinyin: "huáng qí", tag: "补气升阳", desc: "味甘，微温。归肺、脾经。补气升阳，固表止汗，利水消肿，生津养血，行滞通痹，托毒排脓，敛疮生肌。" },
  { name: "当归", pinyin: "dāng guī", tag: "补血活血", desc: "味甘、辛，温。归肝、心、脾经。补血活血，调经止痛，润肠通便。为补血之圣药。" },
  { name: "枸杞", pinyin: "gǒu qǐ", tag: "滋补肝肾", desc: "味甘，平。归肝、肾经。滋补肝肾，益精明目。用于虚劳精亏，腰膝酸痛，眩晕耳鸣，阳萎遗精，内热消渴，血虚萎黄，目昏不明。" },
  { name: "金银花", pinyin: "jīn yín huā", tag: "清热解毒", desc: "味甘，寒。归肺、心、胃经。清热解毒，疏散风热。用于痈肿疔疮，喉痹，丹毒，热毒血痢，风热感冒，温病发热。" },
  { name: "甘草", pinyin: "gān cǎo", tag: "调和诸药", desc: "味甘，平。归心、肺、脾、胃经。补脾益气，清热解毒，祛痰止咳，缓急止痛，调和诸药。" },
  { name: "白术", pinyin: "bái zhú", tag: "健脾益气", desc: "味苦、甘，温。归脾、胃经。健脾益气，燥湿利水，止汗，安胎。为脾脏补气健脾第一要药。" },
  { name: "茯苓", pinyin: "fú líng", tag: "利水渗湿", desc: "味甘、淡，平。归心、肺、脾、肾经。利水渗湿，健脾，宁心。为利水渗湿之要药。" },
];

const DAILY_YANGSHENG = [
  { title: "春季养生", content: "春三月，此谓发陈，天地俱生，万物以荣。夜卧早起，广步于庭，被发缓形，以使志生。——《黄帝内经·素问》" },
  { title: "夏季养生", content: "夏三月，此谓蕃秀，天地气交，万物华实。夜卧早起，无厌于日，使志无怒，使华英成秀。——《黄帝内经·素问》" },
  { title: "秋季养生", content: "秋三月，此谓容平，天气以急，地气以明。早卧早起，与鸡俱兴，使志安宁，以缓秋刑。——《黄帝内经·素问》" },
  { title: "冬季养生", content: "冬三月，此谓闭藏，水冰地坼，无扰乎阳。早卧晚起，必待日光，使志若伏若匿，若有私意。——《黄帝内经·素问》" },
  { title: "饮食有节", content: "饮食自倍，肠胃乃伤。——《黄帝内经·素问》。食饮有节，起居有常，不妄作劳，故能形与神俱，而尽终其天年。" },
  { title: "情志调养", content: "恬淡虚无，真气从之，精神内守，病安从来。——《黄帝内经·素问》。志闲而少欲，心安而不惧，形劳而不倦。" },
  { title: "子午觉", content: "子时大睡，午时小憩。子时（23:00-1:00）胆经当令，宜熟睡；午时（11:00-13:00）心经当令，宜小憩30分钟。" },
];

function getDailyItem<T>(arr: T[], dayOffset: number = 0): T {
  const now = new Date();
  const dayIndex = (now.getFullYear() * 366 + now.getMonth() * 31 + now.getDate() + dayOffset) % arr.length;
  return arr[dayIndex];
}

// ==================== 最近浏览 ====================
interface RecentItem {
  type: "herb" | "formula" | "meridian" | "classic";
  id: string;
  name: string;
  category?: string;
  time: string;
}

const RECENT_KEY = "zhongyi_recent_items";

function getRecentItems(): RecentItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addRecentItem(item: Omit<RecentItem, "time">) {
  if (typeof window === "undefined") return;
  try {
    let items = getRecentItems();
    items = items.filter((i) => !(i.type === item.type && i.id === item.id));
    items.unshift({ ...item, time: new Date().toISOString() });
    items = items.slice(0, 20);
    localStorage.setItem(RECENT_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

// ==================== 四大入口卡片 ====================
const ENTRIES = [
  {
    key: "herb",
    title: "中药库",
    desc: "550味常用药材",
    href: "/zhongyi/herb",
    color: "#2E7D32",
    bgColor: "#E8F5E9",
    Icon: HerbIcon,
  },
  {
    key: "formula",
    title: "方剂库",
    desc: "316首经典方剂",
    href: "/zhongyi/formula",
    color: "#C62828",
    bgColor: "#FFEBEE",
    Icon: FormulaIcon,
  },
  {
    key: "meridian",
    title: "经络穴位",
    desc: "十四经·361穴",
    href: "/zhongyi/meridian",
    color: "#1565C0",
    bgColor: "#E3F2FD",
    Icon: MeridianIcon,
  },
  {
    key: "classic",
    title: "典籍原文",
    desc: "四大经典学习",
    href: "/zhongyi/classic",
    color: "#6A1B9A",
    bgColor: "#F3E5F5",
    Icon: ClassicIcon,
  },
];

function HerbIcon({ color }: { color: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C8 6 6 10 6 14c0 3.31 2.69 6 6 6s6-2.69 6-6c0-4-2-8-6-12z" />
      <path d="M12 8v12" />
      <path d="M8 12h8" />
    </svg>
  );
}

function FormulaIcon({ color }: { color: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M4 10h16" />
      <path d="M10 4v16" />
    </svg>
  );
}

function MeridianIcon({ color }: { color: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
      <path d="M12 7v3" />
      <path d="M12 14v3" />
      <path d="M7 12h3" />
      <path d="M14 12h3" />
    </svg>
  );
}

function ClassicIcon({ color }: { color: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M8 7h8" />
      <path d="M8 11h6" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

// ==================== 主组件 ====================
export default function ZhongyiHome() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ type: string; name: string; href: string; category?: string }[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [dailyHerb] = useState(() => getDailyItem(DAILY_HERBS));
  const [dailyYangsheng] = useState(() => getDailyItem(DAILY_YANGSHENG));

  useEffect(() => {
    setRecentItems(getRecentItems());
  }, []);

  // 搜索逻辑
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    const q = searchQuery;
    const results: { type: string; name: string; href: string; category?: string }[] = [];

    try {
      // 搜索中药
      const herbs = searchHerbsFn(q);
      for (const h of herbs) {
        results.push({ type: "中药", name: h.name, href: `/zhongyi/herb?id=${h.id}`, category: h.category });
        if (results.length >= 8) break;
      }
      // 搜索方剂
      const formulas = searchFormulasFn(q);
      for (const f of formulas) {
        results.push({ type: "方剂", name: f.name, href: `/zhongyi/formula?id=${f.id}`, category: f.category });
        if (results.length >= 10) break;
      }
    } catch (e) {
      console.error("Search error:", e);
    }

    setSearchResults(results);
    setShowResults(true);
  }, [searchQuery]);

  const handleSearchItemClick = (item: { type: string; name: string; href: string; category?: string }) => {
    addRecentItem({ type: item.type as any, id: item.href.split("=")[1] || item.name, name: item.name, category: item.category });
    router.push(item.href);
    setShowResults(false);
    setSearchQuery("");
  };

  return (
    <div
      style={{
        maxWidth: "420px",
        margin: "0 auto",
        minHeight: "100vh",
        backgroundColor: "#f8f5fc",
        paddingBottom: "80px",
      }}
    >
      {/* 顶部导航 */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_LIGHT} 100%)`,
          padding: "12px 16px",
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="8" y="14" width="8" height="8" rx="2" />
              <path d="M12 2v6" />
              <path d="M10 6h4" />
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: "18px", fontWeight: "bold", margin: 0 }}>中医学习</h1>
            <p style={{ fontSize: "11px", opacity: 0.8, margin: 0 }}>传承岐黄，精研医术</p>
          </div>
        </div>

        {/* 搜索栏 */}
        <div style={{ position: "relative" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "white",
              borderRadius: "20px",
              padding: "8px 14px",
            }}
          >
            <SearchIcon />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索中药、方剂、穴位、典籍..."
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                fontSize: "14px",
                background: "transparent",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setShowResults(false); }}
                style={{ background: "none", border: "none", color: "#999", cursor: "pointer", padding: "2px" }}
              >
                ✕
              </button>
            )}
          </div>

          {/* 搜索结果下拉 */}
          {showResults && searchResults.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                marginTop: "6px",
                background: "white",
                borderRadius: "12px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                maxHeight: "300px",
                overflowY: "auto",
                zIndex: 200,
              }}
            >
              {searchResults.map((r, i) => (
                <button
                  key={i}
                  onClick={() => handleSearchItemClick(r)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 14px",
                    border: "none",
                    background: i % 2 === 0 ? "white" : "#fafafa",
                    textAlign: "left",
                    cursor: "pointer",
                    borderBottom: i < searchResults.length - 1 ? "1px solid #f0f0f0" : "none",
                  }}
                >
                  <span
                    style={{
                      fontSize: "10px",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      backgroundColor: r.type === "中药" ? "#E8F5E9" : r.type === "方剂" ? "#FFEBEE" : "#E3F2FD",
                      color: r.type === "中药" ? "#2E7D32" : r.type === "方剂" ? "#C62828" : "#1565C0",
                      flexShrink: 0,
                    }}
                  >
                    {r.type}
                  </span>
                  <span style={{ flex: 1, fontSize: "14px", color: "#333" }}>{r.name}</span>
                  {r.category && <span style={{ fontSize: "11px", color: "#999" }}>{r.category}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 四大入口卡片 */}
      <div style={{ padding: "16px 12px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          {ENTRIES.map((e) => (
            <Link
              key={e.key}
              href={e.href}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                padding: "16px",
                borderRadius: "16px",
                backgroundColor: "white",
                textDecoration: "none",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                transition: "transform 0.15s",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  backgroundColor: e.bgColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <e.Icon color={e.color} />
              </div>
              <div>
                <div style={{ fontSize: "16px", fontWeight: "bold", color: "#333" }}>{e.title}</div>
                <div style={{ fontSize: "12px", color: "#999", marginTop: "2px" }}>{e.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 每日推荐区 */}
      <div style={{ padding: "0 12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
          <h2 style={{ fontSize: "15px", fontWeight: "bold", color: "#333", margin: 0 }}>📅 每日推荐</h2>
          <span style={{ fontSize: "11px", color: "#999" }}>{new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric" })}</span>
        </div>

        {/* 每日一药 */}
        <Link
          href={`/zhongyi/herb?name=${encodeURIComponent(dailyHerb.name)}`}
          style={{
            display: "block",
            background: "white",
            borderRadius: "16px",
            padding: "14px",
            marginBottom: "10px",
            textDecoration: "none",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                backgroundColor: "#E8F5E9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: "20px" }}>🌿</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <span style={{ fontSize: "16px", fontWeight: "bold", color: "#2E7D32" }}>{dailyHerb.name}</span>
                <span style={{ fontSize: "11px", color: "#999" }}>{dailyHerb.pinyin}</span>
                <span
                  style={{
                    fontSize: "10px",
                    padding: "1px 6px",
                    borderRadius: "4px",
                    backgroundColor: "#E8F5E9",
                    color: "#2E7D32",
                  }}
                >
                  {dailyHerb.tag}
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "#666", lineHeight: 1.6, margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {dailyHerb.desc}
              </p>
            </div>
            <ChevronRight />
          </div>
        </Link>

        {/* 今日养生 */}
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "14px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                backgroundColor: "#FFF3E0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: "20px" }}>☯️</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "14px", fontWeight: "bold", color: "#E65100", marginBottom: "4px" }}>
                {dailyYangsheng.title}
              </div>
              <p style={{ fontSize: "12px", color: "#666", lineHeight: 1.7, margin: 0, fontStyle: "italic" }}>
                {dailyYangsheng.content}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 快捷入口：医考、AI助手、体质测评 */}
      <div style={{ padding: "0 12px 16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
          <Link
            href="/zhongyi/exam"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "6px",
              padding: "14px 8px",
              borderRadius: "16px",
              background: "white",
              textDecoration: "none",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              textAlign: "center",
            }}
          >
            <div style={{ width: "40px", height: "40px", borderRadius: "10px", backgroundColor: "#E3F2FD", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>
              📝
            </div>
            <div style={{ fontSize: "13px", fontWeight: "bold", color: "#333" }}>医考题库</div>
            <div style={{ fontSize: "10px", color: "#999" }}>1447题·5科目</div>
          </Link>
          <Link
            href="/zhongyi/ai"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "6px",
              padding: "14px 8px",
              borderRadius: "16px",
              background: "white",
              textDecoration: "none",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              textAlign: "center",
            }}
          >
            <div style={{ width: "40px", height: "40px", borderRadius: "10px", backgroundColor: BRAND_BG, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>
              🤖
            </div>
            <div style={{ fontSize: "13px", fontWeight: "bold", color: BRAND }}>AI助手</div>
            <div style={{ fontSize: "10px", color: "#999" }}>学习辅助问答</div>
          </Link>
          <Link
            href="/zhongyi/constitution"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "6px",
              padding: "14px 8px",
              borderRadius: "16px",
              background: "white",
              textDecoration: "none",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              textAlign: "center",
            }}
          >
            <div style={{ width: "40px", height: "40px", borderRadius: "10px", backgroundColor: "#F3E5F5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>
              🧬
            </div>
            <div style={{ fontSize: "13px", fontWeight: "bold", color: "#6A1B9A" }}>体质测评</div>
            <div style={{ fontSize: "10px", color: "#999" }}>九种体质辨识</div>
          </Link>
        </div>
      </div>

      {/* 最近浏览 */}
      {recentItems.length > 0 && (
        <div style={{ padding: "0 12px 16px" }}>
          <h2 style={{ fontSize: "15px", fontWeight: "bold", color: "#333", margin: "0 0 10px" }}>🕐 最近浏览</h2>
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "4px 0",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            {recentItems.slice(0, 5).map((item, i) => {
              const typeColor = item.type === "herb" ? { bg: "#E8F5E9", text: "#2E7D32", label: "中药" }
                : item.type === "formula" ? { bg: "#FFEBEE", text: "#C62828", label: "方剂" }
                : item.type === "meridian" ? { bg: "#E3F2FD", text: "#1565C0", label: "经络" }
                : { bg: "#F3E5F5", text: "#6A1B9A", label: "典籍" };
              const getHref = () => {
                if (item.type === "herb") return `/zhongyi/herb?id=${item.id}`;
                if (item.type === "formula") return `/zhongyi/formula?id=${item.id}`;
                if (item.type === "meridian") return `/zhongyi/meridian?acupoint=${encodeURIComponent(item.id)}`;
                // 典籍格式: bookId/chapterId
                const parts = item.id.split('/');
                if (parts.length === 2) return `/zhongyi/classic?book=${parts[0]}&chapter=${parts[1]}`;
                return `/zhongyi/classic?book=${item.id}`;
              };
              const href = getHref();
              return (
                <Link
                  key={item.time + i}
                  href={href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 14px",
                    textDecoration: "none",
                    borderBottom: i < Math.min(recentItems.length, 5) - 1 ? "1px solid #f5f5f5" : "none",
                  }}
                >
                  <span
                    style={{
                      fontSize: "10px",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      backgroundColor: typeColor.bg,
                      color: typeColor.text,
                      flexShrink: 0,
                    }}
                  >
                    {typeColor.label}
                  </span>
                  <span style={{ flex: 1, fontSize: "14px", color: "#333" }}>{item.name}</span>
                  <ChevronRight />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* 底部合规提示 */}
      <div
        style={{
          margin: "8px 12px 0",
          padding: "10px 14px",
          backgroundColor: "#fff8e1",
          borderRadius: "12px",
          border: "1px solid #ffecb3",
        }}
      >
        <p style={{ margin: 0, fontSize: "11px", color: "#f57f17", textAlign: "center", lineHeight: 1.5 }}>
          ⚠️ {COMPLIANCE_TEXT}
        </p>
      </div>
    </div>
  );
}
