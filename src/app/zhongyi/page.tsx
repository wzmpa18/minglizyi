"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { searchHerbs as searchHerbsFn } from "@/algorithm-core/modules/tcm/herbs";
import { searchFormulas as searchFormulasFn } from "@/algorithm-core/modules/tcm/formulas";

const BRAND = "#7B2FBE";
const BRAND_LIGHT = "#9B5ECF";
const BRAND_BG = "#F3EDF7";
const COMPLIANCE_TEXT = "本APP内容仅供传统文化研究参考，不构成医疗建议。如有身体不适，请及时就医。";

// v25.0.46：全资料域搜索结果项
interface SearchItem {
  type: "中药" | "方剂" | "穴位" | "经络" | "典籍" | "养生" | "伤寒";
  name: string;
  href: string;
  category?: string;
  desc?: string;
}

// v25.0.46：各资料域标签配色
const TYPE_META: Record<string, { bg: string; fg: string }> = {
  中药: { bg: "#E8F5E9", fg: "#2E7D32" },
  方剂: { bg: "#FFEBEE", fg: "#C62828" },
  穴位: { bg: "#E3F2FD", fg: "#1565C0" },
  经络: { bg: "#E1F5FE", fg: "#0277BD" },
  典籍: { bg: "#F3E5F5", fg: "#6A1B9A" },
  养生: { bg: "#FFF3E0", fg: "#E65100" },
  伤寒: { bg: "#FBE9E7", fg: "#BF360C" },
};

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
  type: "herb" | "formula" | "meridian" | "classic" | "yangsheng";
  id: string;
  name: string;
  category?: string;
  time: string;
}

const RECENT_KEY = "yandao_zhongyi_recent_items";

function getRecentItems(): RecentItem[] {
  if (typeof window === "undefined") return [];
  try {
    const OLD_KEY = "zhongyi_recent_items";
    let raw = localStorage.getItem(RECENT_KEY);
    // 兼容旧键名迁移（zhongyi_recent_items → yandao_zhongyi_recent_items）
    if (!raw) {
      const oldData = localStorage.getItem(OLD_KEY);
      if (oldData) {
        raw = oldData;
        localStorage.setItem(RECENT_KEY, oldData);
        localStorage.removeItem(OLD_KEY);
      }
    }
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
  {
    key: "bianzheng",
    title: "辨证学",
    desc: "八纲·脏腑·六经·智能问诊",
    href: "/zhongyi/bianzheng",
    color: "#E65100",
    bgColor: "#FFF3E0",
    Icon: BianZhengIcon,
  },
  // 智能问诊已合并到辨证学中，移除独立入口
  // {
  //   key: "wenzhen",
  //   title: "智能问诊",
  //   desc: "（学习）历代名家医案AI模拟辨证",
  //   href: "/zhongyi/wenzhen",
  //   color: "#7B2FBE",
  //   bgColor: "#F3EDF7",
  //   Icon: WenzhenIcon,
  // },
  {
    key: "yangsheng",
    title: "养生",
    desc: "上古之道·传承千年养生智慧",
    href: "/zhongyi/yangsheng",
    color: "#2E7D32",
    bgColor: "#E8F5E9",
    Icon: YangshengIcon,
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

function BianZhengIcon({ color }: { color: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M2 12h20" />
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

function WenzhenIcon({ color }: { color: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" />
      <path d="M15 11h3a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-3" />
      <path d="M9 3v6M15 3v6" />
      <path d="M12 11v2a3 3 0 0 0 3 3h3" />
      <circle cx="20" cy="16" r="2" />
      <path d="M12 16v4a2 2 0 0 1-2 2H8" />
    </svg>
  );
}

function YangshengIcon({ color }: { color: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C8 6 6 8 6 12c0 3.31 2.69 6 6 6s6-2.69 6-6c0-4-2-6-6-10z" />
      <path d="M12 8c-1.5 1.5-2 3-2 4.5" />
      <path d="M9 15c-1 1-2 2-3 5" />
      <path d="M15 15c1 1 2 2 3 5" />
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
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [dailyHerb] = useState(() => getDailyItem(DAILY_HERBS));
  const [dailyYangsheng] = useState(() => getDailyItem(DAILY_YANGSHENG));

  useEffect(() => {
    setRecentItems(getRecentItems());
  }, []);

  // v25.0.46：全资料域搜索——中药/方剂/穴位/经络/典籍/养生功法/伤寒证型
  // 250ms 防抖 + 动态 import（典籍等大数据仅在搜索时按需加载，不拖慢首屏）
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setSearching(false);
      setShowResults(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    setShowResults(true);
    const timer = setTimeout(async () => {
      const results: SearchItem[] = [];

      // 1. 中药（同步，包体小）
      try {
        for (const h of searchHerbsFn(q).slice(0, 8)) {
          results.push({ type: "中药", name: h.name, href: `/zhongyi/herb?id=${h.id}`, category: h.category });
        }
      } catch { /* ignore */ }

      // 2. 方剂（同步）
      try {
        for (const f of searchFormulasFn(q).slice(0, 6)) {
          results.push({ type: "方剂", name: f.name, href: `/zhongyi/formula?id=${f.id}`, category: f.category });
        }
      } catch { /* ignore */ }
      if (cancelled) return;
      setSearchResults([...results]);

      // 3. 穴位 + 经络（动态加载）
      try {
        const { searchAcupoints, searchMeridians } = await import("@/algorithm-core/modules/tcm/meridians");
        if (cancelled) return;
        for (const pt of searchAcupoints(q).slice(0, 8)) {
          results.push({
            type: "穴位",
            name: pt.name,
            href: `/zhongyi/meridian?acupoint=${encodeURIComponent(pt.name)}`,
            category: `${pt.meridian} · ${pt.code}`,
            desc: pt.function,
          });
        }
        for (const m of searchMeridians(q).slice(0, 4)) {
          results.push({
            type: "经络",
            name: m.name,
            href: `/zhongyi/meridian?meridian=${encodeURIComponent(m.name)}`,
            category: m.category,
            desc: `循行：${m.pathway.slice(0, 40)}…`,
          });
        }
        setSearchResults([...results]);
      } catch { /* ignore */ }

      // 4. 典籍全文检索（动态加载，四大经典章节标题+正文）
      try {
        const { searchClassics } = await import("@/algorithm-core/modules/tcm/classics");
        if (cancelled) return;
        for (const c of searchClassics(q).slice(0, 5)) {
          results.push({
            type: "典籍",
            name: c.chapterTitle,
            href: `/zhongyi/classic?book=${c.bookId}&chapter=${c.chapterId}`,
            category: c.bookName,
            desc: `…${c.snippet}…`,
          });
        }
        setSearchResults([...results]);
      } catch { /* ignore */ }

      // 5. 养生功法（动态加载）
      try {
        const { searchGongfa } = await import("@/data/yangsheng_data");
        if (cancelled) return;
        for (const g of searchGongfa(q).slice(0, 4)) {
          results.push({
            type: "养生",
            name: g.name,
            href: `/zhongyi/yangsheng/detail?id=${encodeURIComponent(g.id)}`,
            category: g.category,
            desc: g.intro.slice(0, 50),
          });
        }
        setSearchResults([...results]);
      } catch { /* ignore */ }

      // 6. 伤寒六经辨证证型（动态加载）
      try {
        const { SHANGHAN_SYNDROMES } = await import("@/algorithm-core/modules/tcm/shanghan");
        if (cancelled) return;
        const kw = q.toLowerCase();
        for (const s of SHANGHAN_SYNDROMES.filter(
          (x) => x.name.toLowerCase().includes(kw) || x.description.toLowerCase().includes(kw) || x.symptoms.some((y) => y.includes(q))
        ).slice(0, 4)) {
          results.push({
            type: "伤寒",
            name: s.name,
            href: "/zhongyi/shanghan",
            category: "六经辨证",
            desc: s.description.slice(0, 50),
          });
        }
        setSearchResults([...results]);
      } catch { /* ignore */ }

      if (!cancelled) setSearching(false);
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const handleSearchItemClick = (item: SearchItem) => {
    let recentType: RecentItem["type"] = "yangsheng";
    let recentId = item.name;
    if (item.type === "中药") {
      recentType = "herb";
      recentId = item.href.split("id=")[1] || item.name;
    } else if (item.type === "方剂") {
      recentType = "formula";
      recentId = item.href.split("id=")[1] || item.name;
    } else if (item.type === "穴位" || item.type === "经络") {
      recentType = "meridian";
      recentId = item.name;
    } else if (item.type === "典籍") {
      recentType = "classic";
      const book = item.href.match(/book=([^&]+)/)?.[1] || "";
      const chapter = item.href.match(/chapter=([^&]+)/)?.[1] || "";
      recentId = chapter ? `${decodeURIComponent(book)}/${decodeURIComponent(chapter)}` : decodeURIComponent(book) || item.name;
    } else {
      recentType = "yangsheng";
      recentId = decodeURIComponent(item.href.split("id=")[1] || item.name);
    }
    addRecentItem({ type: recentType, id: recentId, name: item.name, category: item.category });
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
                color: "#333",
                caretColor: "#333",
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

          {/* 搜索结果下拉（v25.0.46：全资料域） */}
          {showResults && (
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
                maxHeight: "360px",
                overflowY: "auto",
                zIndex: 200,
              }}
            >
              {searchResults.length === 0 ? (
                <div style={{ padding: "18px 14px", textAlign: "center" }}>
                  <p style={{ margin: 0, fontSize: "13px", color: searching ? "#999" : "#bbb" }}>
                    {searching ? "正在搜索中药、方剂、穴位、经络、典籍、养生…" : `未找到与「${searchQuery.trim()}」相关的资料`}
                  </p>
                  {!searching && (
                    <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#ccc" }}>
                      可尝试：药名（当归）、方名（桂枝汤）、穴名（足三里）、经名（督脉）、条文关键词
                    </p>
                  )}
                </div>
              ) : (
                searchResults.map((r, i) => {
                  const meta = TYPE_META[r.type] || { bg: "#eee", fg: "#666" };
                  return (
                    <button
                      key={i}
                      onClick={() => handleSearchItemClick(r)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "flex-start",
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
                          backgroundColor: meta.bg,
                          color: meta.fg,
                          flexShrink: 0,
                          marginTop: "2px",
                        }}
                      >
                        {r.type}
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "14px", color: "#333", fontWeight: 500 }}>{r.name}</span>
                          {r.category && <span style={{ fontSize: "11px", color: "#999", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.category}</span>}
                        </span>
                        {r.desc && (
                          <span
                            style={{
                              display: "block",
                              fontSize: "11px",
                              color: "#aaa",
                              marginTop: "2px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {r.desc}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })
              )}
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
                : item.type === "yangsheng" ? { bg: "#FFF3E0", text: "#E65100", label: "养生" }
                : { bg: "#F3E5F5", text: "#6A1B9A", label: "典籍" };
              const getHref = () => {
                if (item.type === "herb") return `/zhongyi/herb?id=${item.id}`;
                if (item.type === "formula") return `/zhongyi/formula?id=${item.id}`;
                if (item.type === "yangsheng") return `/zhongyi/yangsheng/detail?id=${encodeURIComponent(item.id)}`;
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
