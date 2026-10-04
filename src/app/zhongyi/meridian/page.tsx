"use client";

import { SectionGate } from "@/components/SectionGate";

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
import { callAI, getPermissionStatusFromServer } from "@/lib/aiService";
import { useRequireLogin } from "@/lib/useRequireLogin";
import { LoginPromptModal } from "@/components/LoginPromptModal";
import type { TcmMeridian, TcmAcupoint, TcmDongAcupoint } from "@/algorithm-core/types/tcm";
import { useToolBack } from "@/lib/useToolBack";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { usePopupBackHandler } from "@/hooks/usePopupBackHandler";

const BRAND = "#7B2FBE";
const BRAND_LIGHT = "#9B5ECF";
const BRAND_BG = "#F3EDF7";
const COMPLIANCE_TEXT = "本APP内容仅供传统文化研究参考，不构成医疗建议。如有身体不适，请及时就医。";
const PROFESSIONAL_WARNING = "⚠️ 专业操作，请勿自行尝试";

const MERIDIAN_SLUGS: Record<string, string> = {
  "肺经": "lung", "手太阴肺经": "lung",
  "大肠经": "large-intestine", "手阳明大肠经": "large-intestine",
  "胃经": "stomach", "足阳明胃经": "stomach",
  "脾经": "spleen", "足太阴脾经": "spleen",
  "心经": "heart", "手少阴心经": "heart",
  "小肠经": "small-intestine", "手太阳小肠经": "small-intestine",
  "膀胱经": "bladder", "足太阳膀胱经": "bladder",
  "肾经": "kidney", "足少阴肾经": "kidney",
  "心包经": "pericardium", "手厥阴心包经": "pericardium",
  "三焦经": "triple-energizer", "手少阳三焦经": "triple-energizer",
  "胆经": "gallbladder", "足少阳胆经": "gallbladder",
  "肝经": "liver", "足厥阴肝经": "liver",
  "督脉": "governor-vessel",
  "任脉": "conception-vessel",
};

function meridianChartSources(meridianName: string) {
  const slug = MERIDIAN_SLUGS[meridianName];
  return slug ? {
    acupoints: `/assets/meridians/${slug}.webp`,
    skeleton: `/assets/meridians/skeleton/${slug}.webp`,
  } : null;
}

function MeridianChart({ meridianName, compact = false }: { meridianName: string; compact?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [chartMode, setChartMode] = useState<"acupoints" | "skeleton">("acupoints");
  const sources = meridianChartSources(meridianName);
  if (!sources) return null;
  const src = sources[chartMode];
  const modeLabel = chartMode === "acupoints" ? "人体穴位图" : "骨骼循行图";

  const image = (
    <img
      src={src}
      alt={`${meridianName}${modeLabel}动态图`}
      draggable={false}
      style={{ display: "block", width: `${zoom * 100}%`, maxWidth: "none", height: "auto", margin: "0 auto" }}
    />
  );

  return <>
    <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
      {(["acupoints", "skeleton"] as const).map((mode) => (
        <button key={mode} type="button" onClick={() => { setChartMode(mode); setZoom(1); }}
          style={{ flex: 1, border: "1px solid #D7C9E3", borderRadius: 9, padding: "7px 6px", background: chartMode === mode ? BRAND_BG : "#FFF", color: chartMode === mode ? BRAND : "#777", fontWeight: 700, fontSize: 12 }}>
          {mode === "acupoints" ? "人体穴位图" : "骨骼循行图"}
        </button>
      ))}
    </div>
    <button
      type="button"
      onClick={() => { setZoom(1); setExpanded(true); }}
      style={{ width: "100%", padding: 0, border: "none", borderRadius: "14px", overflow: "hidden", background: "#EEF6F2", cursor: "zoom-in" }}
      aria-label={`放大查看${meridianName}动态图`}
    >
      <img key={src} src={src} alt={`${meridianName}${modeLabel}动态图`} draggable={false} style={{ display: "block", width: "100%", height: compact ? "250px" : "auto", objectFit: "contain" }} />
      <span style={{ display: "block", padding: "7px 10px", fontSize: "11px", color: "#5D6D65", background: "white" }}>点击放大 · {modeLabel} · 可离线查看</span>
    </button>
    {expanded && (
      <div
        onClick={() => setExpanded(false)}
        style={{ position: "fixed", inset: 0, zIndex: 1400, background: "rgba(0,0,0,.88)", display: "flex", flexDirection: "column", padding: "12px" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "white", paddingBottom: "10px" }}>
          <strong style={{ fontSize: "14px" }}>{meridianName} · {modeLabel}</strong>
          <div style={{ display: "flex", gap: "8px" }}>
            <button type="button" onClick={(e) => { e.stopPropagation(); setZoom(v => Math.max(1, v - .5)); }} style={{ width: "38px", height: "34px", border: 0, borderRadius: "17px", fontSize: "20px" }}>−</button>
            <button type="button" onClick={(e) => { e.stopPropagation(); setZoom(v => Math.min(3, v + .5)); }} style={{ width: "38px", height: "34px", border: 0, borderRadius: "17px", fontSize: "20px" }}>＋</button>
            <button type="button" onClick={() => setExpanded(false)} style={{ height: "34px", padding: "0 14px", border: 0, borderRadius: "17px" }}>关闭</button>
          </div>
        </div>
        <div onClick={(e) => e.stopPropagation()} style={{ flex: 1, overflow: "auto", borderRadius: "12px", background: "#EEF6F2", touchAction: "pan-x pan-y pinch-zoom" }}>
          {image}
        </div>
      </div>
    )}
  </>;
}

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

function Anatomy3DEntry({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push("/zhongyi/anatomy3d")}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 12,
        padding: compact ? "10px 12px" : "13px 14px", border: "1px solid #DEC9EC",
        borderRadius: 14, background: "linear-gradient(135deg,#FFF 0%,#F5ECFA 100%)",
        boxShadow: "0 3px 12px rgba(123,47,190,.08)", textAlign: "left", cursor: "pointer",
      }}
    >
      <span style={{ width: 38, height: 38, borderRadius: 12, display: "grid", placeItems: "center", background: "#EADCF4", fontSize: 21 }}>🫀</span>
      <span style={{ flex: 1 }}>
        <strong style={{ display: "block", color: "#4C3260", fontSize: 14 }}>3D人体解剖分层</strong>
        <span style={{ display: "block", color: "#7D6F84", fontSize: 11, marginTop: 3 }}>旋转 · 缩放 · 骨骼/脏腑/肌肉 · 下载后离线使用</span>
      </span>
      <span style={{ color: BRAND, fontSize: 18 }}>›</span>
    </button>
  );
}

// ==================== 穴位定位图模态框 ====================
type BodyArea = "head" | "arms" | "legs" | "torso" | "back" | "hands" | "feet";

const AREA_LABELS: Record<BodyArea, string> = {
  head: "头部",
  arms: "上肢",
  legs: "下肢",
  torso: "躯干（正面）",
  back: "躯干（背面）",
  hands: "手部",
  feet: "足部",
};

function detectBodyArea(name: string, location: string, zone?: string): BodyArea {
  // 优先通过董氏奇穴的部位信息判断
  if (zone) {
    if (/手指|手掌|手背/.test(zone)) return "hands";
    if (/足趾|足掌|足底|足背/.test(zone)) return "feet";
    if (/前臂|上臂|手臂/.test(zone)) return "arms";
    if (/小腿|大腿|腿/.test(zone)) return "legs";
    if (/耳/.test(zone)) return "head";
    if (/头|面/.test(zone)) return "head";
    if (/胸/.test(zone)) return "torso";
    if (/背/.test(zone)) return "back";
  }
  const text = `${name} ${location}`;
  // 手部（先于上肢判断）
  if (/指|掌|拳|手背|虎口|四缝|十宣|少商|商阳|中冲|关冲|少冲|少泽|合谷|后溪|腕骨|前谷|液门|中渚|阳池|骨空|中魁/.test(text)) return "hands";
  // 足部（先于下肢判断）
  if (/趾|足底|足背|涌泉|至阴|隐白|大敦|足窍阴|厉兑|足通谷|束骨|太白|公孙|然谷|金门|京骨/.test(text)) return "feet";
  // 头面部
  if (/头|面|额|颞|枕|耳|眼|鼻|口|唇|颊|齿|舌|百会|太阳|风池|风府|攒竹|睛明|四白|迎香|地仓|颊车|听宫|翳风|完骨|头维|率谷|角孙|耳门|上星|神庭|印堂|水沟|承浆|龈交|兑端|丝竹空|瞳子|颧髎|下关|天柱|哑门|脑空|承灵|正营|目窗|阳白/.test(text)) return "head";
  // 上肢
  if (/肘|腕|前臂|上臂|手臂|曲池|尺泽|孔最|列缺|经渠|太渊|鱼际|臂臑|天井|小海|阳溪|偏历|温溜|手三里|曲泽|郄门|间使|内关|大陵|劳宫|外关|支沟/.test(text)) return "arms";
  // 下肢
  if (/膝|胫|小腿|大腿|腿|足三里|阳陵泉|阴陵泉|委中|承山|太溪|丰隆|三阴交|复溜|筑宾|飞扬|跗阳|昆仑|申脉|髀关|伏兔|阴市|梁丘|犊鼻|上巨虚|条口|下巨虚|解溪|冲阳|陷谷|内庭|血海|阴包|曲泉|膝关|中都|蠡沟|中封|太冲|行间|环跳|风市|中渎|阳交|外丘|光明|阳辅|悬钟|丘墟|足临泣|侠溪|承筋|殷门/.test(text)) return "legs";
  // 背部
  if (/背|腰|脊|肾俞|膀胱|大椎|命门|腰阳关|至阳|灵台|身柱|陶道|肺俞|心俞|肝俞|胆俞|脾俞|胃俞|三焦俞|气海俞|大肠俞|关元俞|小肠俞|白环俞|会阳|承扶|殷门|附分|魄户|膏肓|神堂|膈关|魂门|阳纲|意舍|胃仓|肓门|志室|胞肓|秩边/.test(text)) return "back";
  // 躯干
  if (/胸|腹|胃|脐|中脘|关元|气海|神阙|膻中|鸠尾|巨阙|中极|石门|天枢|大横|日月|期门|章门|京门|带脉|五枢|维道|居髎|不容|承满|梁门|关门|太乙|滑肉门|外陵|大巨|水道|归来|气冲|缺盆|气户|库房|屋翳|膺窗|乳中|乳根|中府|云门|周荣|胸乡|天溪|食窦|腹哀|腹结|腹通谷|幽门|步廊|神封|灵墟|神藏|彧中|俞府|中注|四满|气穴|大赫|横骨|盲俞|商曲|石关|阴都/.test(text)) return "torso";
  return "torso";
}

type DiagramPoint = [number, number];
type MeridianCourse = { total: number; view: "front" | "back"; points: DiagramPoint[] };

// Simplified teaching courses. The selected point is placed by its standard
// sequence number along the course; the written landmark remains the precise
// positioning reference.
const MERIDIAN_COURSES: Record<string, MeridianCourse> = {
  LU: { total: 11, view: "front", points: [[94, 93], [76, 112], [62, 150], [51, 196], [43, 239]] },
  LI: { total: 20, view: "front", points: [[43, 239], [54, 194], [68, 143], [84, 93], [105, 72], [111, 55]] },
  ST: { total: 45, view: "front", points: [[108, 52], [101, 78], [96, 116], [101, 166], [104, 216], [103, 277], [107, 345], [105, 393]] },
  SP: { total: 21, view: "front", points: [[105, 393], [96, 344], [94, 278], [93, 219], [89, 171], [86, 116], [83, 94]] },
  HT: { total: 9, view: "front", points: [[89, 96], [73, 123], [61, 159], [50, 199], [44, 239]] },
  SI: { total: 19, view: "back", points: [[43, 239], [55, 193], [70, 145], [88, 98], [99, 79], [108, 63]] },
  BL: { total: 67, view: "back", points: [[108, 49], [112, 72], [102, 101], [99, 151], [96, 205], [101, 254], [106, 312], [104, 371], [108, 397]] },
  KI: { total: 27, view: "front", points: [[112, 397], [106, 350], [108, 291], [105, 228], [103, 180], [105, 131], [108, 91]] },
  PC: { total: 9, view: "front", points: [[91, 94], [76, 126], [63, 161], [52, 201], [45, 239]] },
  TE: { total: 23, view: "back", points: [[45, 239], [55, 199], [68, 151], [84, 103], [101, 76], [114, 58]] },
  GB: { total: 44, view: "front", points: [[113, 52], [125, 64], [113, 79], [129, 99], [133, 146], [126, 199], [122, 261], [119, 326], [116, 392]] },
  LR: { total: 14, view: "front", points: [[110, 391], [104, 345], [101, 286], [99, 229], [94, 181], [88, 133], [86, 101]] },
  GV: { total: 28, view: "back", points: [[120, 211], [120, 180], [120, 142], [120, 101], [120, 73], [120, 38], [118, 22], [112, 55]] },
  CV: { total: 24, view: "front", points: [[120, 211], [120, 183], [120, 148], [120, 112], [120, 82], [120, 61]] },
};

const FALLBACK_MARKERS: Record<BodyArea, DiagramPoint> = {
  head: [120, 48], arms: [60, 155], hands: [43, 239], legs: [104, 292], feet: [106, 392],
  torso: [120, 135], back: [120, 135],
};

function interpolateCourse(points: DiagramPoint[], ratio: number): DiagramPoint {
  const lengths = points.slice(1).map((point, index) => Math.hypot(point[0] - points[index][0], point[1] - points[index][1]));
  const total = lengths.reduce((sum, value) => sum + value, 0);
  let remaining = Math.max(0, Math.min(1, ratio)) * total;
  for (let index = 0; index < lengths.length; index += 1) {
    if (remaining <= lengths[index]) {
      const start = points[index], end = points[index + 1];
      const part = lengths[index] ? remaining / lengths[index] : 0;
      return [start[0] + (end[0] - start[0]) * part, start[1] + (end[1] - start[1]) * part];
    }
    remaining -= lengths[index];
  }
  return points[points.length - 1];
}

function parseCourseCode(code?: string): { prefix: string; index: number } | null {
  const match = String(code || "").toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  let prefix = match[1], index = Number(match[2]);
  if (prefix === "DU") { prefix = "GV"; index += 25; }
  if (prefix === "RN") { prefix = "CV"; index += 21; }
  return MERIDIAN_COURSES[prefix] ? { prefix, index } : null;
}

function HumanOutline({ back }: { back: boolean }) {
  return <g fill="#F8F3EC" stroke="#9B8C80" strokeWidth="1.6" strokeLinejoin="round">
    <ellipse cx="120" cy="43" rx="25" ry="31" />
    <path d="M108 71 L104 82 Q83 86 76 104 L63 167 Q59 190 48 226 L39 237 Q35 244 43 249 Q51 252 57 243 L68 210 Q79 178 86 145 L88 205 Q87 225 93 242 L91 320 L96 389 Q98 406 108 406 Q117 405 116 389 L118 325 L120 250 L122 325 L124 389 Q124 405 134 406 Q144 405 144 389 L149 320 L147 242 Q153 224 152 205 L154 145 Q161 179 172 210 L183 243 Q189 252 197 249 Q205 244 201 237 L192 226 Q181 190 177 167 L164 104 Q157 86 136 82 L132 71 Z" />
    <path d="M106 75 Q120 87 134 75" fill="none" />
    {back ? <path d="M120 88 L120 213 M98 111 Q120 101 142 111 M101 174 Q120 184 139 174" fill="none" stroke="#C3B6AA" strokeDasharray="3 3" /> : <path d="M98 111 Q120 126 142 111 M103 154 Q120 164 137 154 M120 92 L120 210" fill="none" stroke="#D1C5BB" strokeDasharray="3 3" />}
    <path d="M101 37 Q108 31 114 37 M126 37 Q132 31 139 37 M117 47 Q120 50 123 47 M111 58 Q120 62 129 58" fill="none" stroke="#B6A79B" />
  </g>;
}

function BodyDiagramSVG({ area, acupointCode, acupointName }: { area: BodyArea; acupointCode?: string; acupointName: string }) {
  const parsed = parseCourseCode(acupointCode);
  const course = parsed ? MERIDIAN_COURSES[parsed.prefix] : null;
  const selected = course && parsed
    ? interpolateCourse(course.points, (Math.max(1, parsed.index) - 1) / Math.max(1, course.total - 1))
    : FALLBACK_MARKERS[area];
  const dots = course ? Array.from({ length: course.total }, (_, index) => interpolateCourse(course.points, index / Math.max(1, course.total - 1))) : [];
  const mirrored = (point: DiagramPoint): DiagramPoint => [240 - point[0], point[1]];
  const pathText = course?.points.map((point) => point.join(",")).join(" ") || "";
  const mirrorPathText = course?.points.map(mirrored).map((point) => point.join(",")).join(" ") || "";
  return (
    <svg width="240" height="430" viewBox="0 0 240 430" role="img" aria-label={`${acupointName}经络定位示意图`}>
      <rect x="1" y="1" width="238" height="418" rx="18" fill="#FCFAF7" stroke="#E6DDD5" />
      <text x="14" y="24" fill="#6D5C52" fontSize="11" fontWeight="700">{course?.view === "back" ? "人体背面" : "人体正面"} · 经络循行</text>
      <HumanOutline back={course?.view === "back" || area === "back"} />
      {course && <>
        <polyline points={pathText} fill="none" stroke={BRAND} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.88" />
        {parsed?.prefix !== "GV" && parsed?.prefix !== "CV" && <polyline points={mirrorPathText} fill="none" stroke={BRAND} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.45" />}
        {dots.map((point, index) => <circle key={`p-${index}`} cx={point[0]} cy={point[1]} r="1.7" fill="#fff" stroke={BRAND} strokeWidth="1" />)}
      </>}
      <circle cx={selected[0]} cy={selected[1]} r="9" fill="#EF535033" stroke="#EF5350" strokeWidth="1.5">
        <animate attributeName="r" values="7;11;7" dur="1.5s" repeatCount="indefinite" />
      </circle>
      <circle cx={selected[0]} cy={selected[1]} r="4" fill="#D32F2F" stroke="#fff" strokeWidth="1.5" />
      <path d={`M${selected[0] + 5} ${selected[1] - 5} L${Math.min(177, selected[0] + 28)} ${Math.max(30, selected[1] - 24)}`} stroke="#D32F2F" strokeWidth="1" />
      <rect x="147" y="28" width="80" height="35" rx="8" fill="#fff" stroke="#EF9A9A" />
      <text x="187" y="42" textAnchor="middle" fill="#C62828" fontSize="10" fontWeight="700">{acupointName}</text>
      <text x="187" y="56" textAnchor="middle" fill="#8D6E63" fontSize="9">{acupointCode || AREA_LABELS[area]}</text>
      <text x="120" y="417" textAnchor="middle" fill="#9E8F84" fontSize="9">红点为本经穴位顺序位置 · 具体定位请看下方骨性标志</text>
    </svg>
  );
}

function PositioningModal({
  acupointName,
  acupointCode,
  meridianName,
  locationText,
  zone,
  onClose,
}: {
  acupointName: string;
  acupointCode?: string;
  meridianName?: string;
  locationText: string;
  zone?: string;
  onClose: () => void;
}) {
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  // v20.1: 登录守卫
  const { requireLogin, showLoginPrompt, setShowLoginPrompt } = useRequireLogin();

  // P1-6/P1-7: 滚动锁 + 返回拦截（组件仅在弹窗打开时挂载）
  useBodyScrollLock(true);
  usePopupBackHandler(onClose, true);

  const bodyArea = useMemo(
    () => detectBodyArea(acupointName, locationText, zone),
    [acupointName, locationText, zone]
  );

  const handleAIEnhance = useCallback(async (forceRefresh = false) => {
    if (aiLoading) return;

    // v20.1: 三级权限检查 - 未登录弹出登录引导
    if (!requireLogin()) return;
    const perm = await getPermissionStatusFromServer();
    if (!perm.canUseAI) {
      setAiError(perm.message || "今日AI解读次数已用完，开通会员继续使用");
      return;
    }

    setAiLoading(true);
    setAiError("");
    try {
      const systemPrompt = `你是专业中医针灸专家，精通经络腧穴学定位。请提供以下穴位的详细定位信息，包括：1.详细解剖标志（骨性标志、肌肉、肌腱等体表可触及的标志）2.分步定位方法（从找到标志到确定穴位的具体步骤）3.常见定位错误及避免方法。请用中文回答，格式清晰，分点说明。`;
      const userPrompt = `穴位名称：${acupointName}\n已有定位描述：${locationText}\n请提供详细的定位指导。`;
      const result = await callAI({
        systemPrompt,
        userPrompt,
        cacheKey: `zhongyi_position_${acupointName}`,
        forceRefresh,
      });
      if (result.success) {
        setAiResult(result.content);
      } else {
        setAiError(result.error || "AI服务暂时不可用");
      }
    } catch (e: any) {
      setAiError(e.message || "请求失败");
    } finally {
      setAiLoading(false);
    }
  }, [acupointName, locationText, aiLoading, requireLogin]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000, backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "white", borderRadius: "16px", maxWidth: "380px", width: "100%",
          maxHeight: "85vh", overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            position: "sticky", top: 0, zIndex: 10,
            padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.2)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_LIGHT} 100%)`,
            borderRadius: "16px 16px 0 0",
          }}
        >
          <span style={{ fontSize: "15px", fontWeight: "bold", color: "white" }}>
            📍 {acupointName} 定位图
          </span>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.2)", border: "none", color: "white",
              width: "28px", height: "28px", borderRadius: "50%", fontSize: "16px",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        {/* Body diagram */}
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          {meridianName && meridianChartSources(meridianName)
            ? <MeridianChart meridianName={meridianName} compact />
            : <BodyDiagramSVG area={bodyArea} acupointCode={acupointCode} acupointName={acupointName} />}
          <span
            style={{
              marginTop: "8px", fontSize: "12px", fontWeight: "bold",
              color: BRAND, padding: "3px 10px", borderRadius: "12px",
              backgroundColor: BRAND_BG,
            }}
          >
            {AREA_LABELS[bodyArea]}
          </span>
          {meridianName && <span style={{ marginTop: "5px", fontSize: "11px", color: "#777" }}>{meridianName} · {acupointCode}</span>}
        </div>

        {/* Location text */}
        <div style={{ padding: "0 16px 12px" }}>
          <div style={{ fontSize: "12px", color: "#999", marginBottom: "4px" }}>定位描述</div>
          <div style={{ fontSize: "13px", color: "#333", lineHeight: 1.7 }}>
            {locationText}
          </div>
        </div>

        {/* AI enhancement */}
        <div style={{ padding: "0 16px 12px" }}>
          {!aiResult && !aiLoading && (
            <button
              onClick={() => handleAIEnhance()}
              style={{
                width: "100%", padding: "10px", borderRadius: "10px", border: "none",
                fontSize: "13px", fontWeight: "bold", cursor: "pointer",
                background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_LIGHT} 100%)`,
                color: "white",
              }}
            >
              🤖 AI 智能定位辅助
            </button>
          )}
          {aiLoading && (
            <div style={{ textAlign: "center", padding: "12px", color: "#999", fontSize: "13px" }}>
              <span style={{ display: "inline-block", width: "16px", height: "16px", border: "2px solid #ccc", borderTopColor: BRAND, borderRadius: "50%", animation: "spin 1s linear infinite", marginRight: "6px", verticalAlign: "middle" }} />
              AI 定位分析中...
            </div>
          )}
          {aiError && !aiLoading && (
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#C62828", fontSize: "12px", marginBottom: "8px" }}>{aiError}</div>
              <button
                onClick={() => handleAIEnhance()}
                style={{ padding: "6px 14px", borderRadius: "14px", border: "none", fontSize: "12px", cursor: "pointer", background: BRAND, color: "white" }}
              >
                重试
              </button>
            </div>
          )}
          {aiResult && !aiLoading && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "13px", fontWeight: "bold", color: "#333" }}>🤖 AI 定位详解</span>
                <button
                  onClick={() => handleAIEnhance(true)}
                  style={{ padding: "4px 10px", borderRadius: "12px", border: "none", fontSize: "11px", cursor: "pointer", background: BRAND_BG, color: BRAND }}
                >
                  刷新
                </button>
              </div>
              <div style={{ fontSize: "13px", color: "#333", lineHeight: 1.8, padding: "10px 12px", backgroundColor: "#F8F4FC", borderRadius: "8px", borderLeft: `3px solid ${BRAND}`, whiteSpace: "pre-wrap" }}>
                {aiResult}
              </div>
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <div style={{ padding: "10px 16px", backgroundColor: "#FFF3E0", borderTop: "1px solid #ffecb3" }}>
          <p style={{ margin: 0, fontSize: "11px", color: "#f57f17", textAlign: "center" }}>
            本图示仅供学习参考，实际定位请由专业医师操作
          </p>
        </div>
      </div>

      {/* v20.1: 登录提示弹窗 */}
      <LoginPromptModal show={showLoginPrompt} onClose={() => setShowLoginPrompt(false)} />
    </div>
  );
}

// ==================== 经络列表页 ====================
function MeridianListPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [dbLoaded, setDbLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<"standard" | "dong" | "others">("standard");

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
    if (activeTab === "others") return [];
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
              placeholder={activeTab === "dong" ? "搜索董氏奇穴..." : activeTab === "others" ? "更多流派整理中..." : "搜索穴位名称..."}
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
          <button
            onClick={() => { setActiveTab("others"); setSearchQuery(""); }}
            style={{
              flex: 1, padding: "6px 0", borderRadius: "18px", border: "none",
              fontSize: "13px", fontWeight: "bold", cursor: "pointer",
              background: activeTab === "others" ? "white" : "transparent",
              color: activeTab === "others" ? "#607D8B" : "rgba(255,255,255,0.8)",
            }}
          >
            其他流派
          </button>
        </div>
      </div>

      <div style={{ padding: "12px" }}>
        <div style={{ marginBottom: 14 }}><Anatomy3DEntry /></div>
        {activeTab === "standard" && !searchQuery && Object.entries(groupedMeridians).map(([cat, meridians]) => {
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
        {activeTab === "dong" && !searchQuery && dongZoneGroups.filter(g => g.acupoints.length > 0).map((group) => {
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
          })}
        {activeTab === "others" && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🚧</div>
            <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#455A64", marginBottom: "8px" }}>其他流派</h3>
            <p style={{ fontSize: "13px", color: "#90A4AE", lineHeight: 1.6, marginBottom: "16px" }}>
              腹针、眼针、耳针、头针等<br />更多针灸流派整理中
            </p>
            <div style={{ display: "inline-block", padding: "4px 14px", borderRadius: "14px", backgroundColor: "#ECEFF1", color: "#607D8B", fontSize: "12px", fontWeight: "bold" }}>
              整理中
            </div>
          </div>
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

      <div style={{ margin: "12px", background: "white", borderRadius: "16px", padding: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <div style={{ fontSize: "12px", color: "#666", fontWeight: "bold", margin: "2px 4px 8px" }}>经络穴位动态图</div>
        <MeridianChart meridianName={meridian.name} />
      </div>

      <div style={{ margin: "0 12px 12px" }}><Anatomy3DEntry compact /></div>

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
  const [showPositionModal, setShowPositionModal] = useState(false);

  useEffect(() => {
    loadFullMeridiansDatabase().then(() => setDbLoaded(true));
  }, []);

  const acupoint = getAcupointByName(acupointName);

  useEffect(() => {
    if (acupoint) {
      addRecentItem({ type: "meridian", id: acupoint.name, name: acupoint.name, category: acupoint.meridian });
      // 自动加载穴位详细数据（静态数据 + 缓存）
      const data = getCachedAcupointInfo(acupoint.name, "acupoint");
      if (data) {
        setAiData(data);
      } else {
        const result = triggerScrape(acupoint.name, acupoint.name, acupoint.meridian, "acupoint");
        if (result) setAiData(result);
      }
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
        setScrapeError("数据加载失败，请稍后重试");
      }
    } catch {
      setScrapeError("数据加载错误，请检查后重试");
    } finally {
      setScraping(false);
    }
  }, [acupoint, scraping]);

  const handleReportError = useCallback(async () => {
    if (!acupoint) return;
    markForRefetch(acupoint.name, "acupoint");
    setAiData(null);
    alert("已标记为需要重新加载，请再次点击刷新按钮");
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

      {/* 穴位信息卡片 */}
      <div style={{ margin: "12px", background: "white", borderRadius: "16px", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <div style={{ padding: "16px", background: "linear-gradient(135deg, #E3F2FD 0%, white 100%)", borderBottom: "1px solid #f0f0f0" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
            <span style={{ fontSize: "24px", fontWeight: "bold", color: "#333" }}>{acupoint.name}</span>
            {acupoint.pinyin && <span style={{ fontSize: "12px", color: "#999" }}>{acupoint.pinyin}</span>}
          </div>
          <div style={{ fontSize: "12px", color: "#1565C0", marginTop: "4px" }}>{acupoint.meridian} · {acupoint.code}</div>
        </div>
        {sections.filter(s => s.content).map((section, i, arr) => {
          const isLocation = section.label === "定位" || section.label === "详细定位";
          return (
          <div key={section.label} style={{ padding: "12px 16px", borderBottom: i < arr.length - 1 ? "1px solid #f5f5f5" : "none" }}>
            <div style={{ fontSize: "12px", color: "#999", marginBottom: "4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              {section.label}
              {isLocation && (
                <button onClick={() => setShowPositionModal(true)} style={{ background: "none", border: "none", color: BRAND, fontSize: "11px", cursor: "pointer", padding: 0 }}>📍 查看定位图</button>
              )}
            </div>
            <div style={{ fontSize: "14px", color: "#333", lineHeight: 1.7, cursor: isLocation ? "pointer" : "default" }}
                 onClick={isLocation ? () => setShowPositionModal(true) : undefined}>
              {section.content}
            </div>
          </div>
          );
        })}
      </div>

      {/* 穴位详解（文字描述：定位/主治/配伍/进针方法/操作禁忌） */}
      <div style={{ margin: "12px", background: "white", borderRadius: "16px", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "14px", fontWeight: "bold", color: "#333" }}>📖 穴位详解</span>
            <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", backgroundColor: "#E8F5E9", color: "#2E7D32" }}>国标数据</span>
          </div>
          {aiData && !scraping && (
            <button onClick={handleAIScrape}
              style={{ padding: "6px 14px", borderRadius: "16px", border: "none", fontSize: "12px", fontWeight: "bold", cursor: "pointer", background: BRAND_BG, color: BRAND }}>
              刷新
            </button>
          )}
          {scraping && (
            <span style={{ fontSize: "12px", color: "#999", display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ display: "inline-block", width: "14px", height: "14px", border: "2px solid #ccc", borderTopColor: BRAND, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              加载中...
            </span>
          )}
        </div>

        {aiData ? (
          <>
            {/* 定位 */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f5f5f5" }}>
              <div style={{ fontSize: "12px", color: "#999", marginBottom: "4px" }}>📍 定位</div>
              <div style={{ fontSize: "14px", color: "#333", lineHeight: 1.7 }}>{aiData.detail}</div>
            </div>
            {/* 主治 */}
            {aiData.indications && (
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #f5f5f5" }}>
                <div style={{ fontSize: "12px", color: "#999", marginBottom: "4px" }}>🏥 主治</div>
                <div style={{ fontSize: "14px", color: "#333", lineHeight: 1.7 }}>{aiData.indications}</div>
              </div>
            )}
            {/* 配伍 */}
            {aiData.combinations && (
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #f5f5f5" }}>
                <div style={{ fontSize: "12px", color: "#999", marginBottom: "4px" }}>🔗 配伍</div>
                <div style={{ fontSize: "14px", color: "#333", lineHeight: 1.7 }}>{aiData.combinations}</div>
              </div>
            )}
            {/* 进针方法 */}
            {aiData.needling_method && (
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #f5f5f5" }}>
                <div style={{ fontSize: "12px", color: "#999", marginBottom: "4px" }}>💉 进针方法</div>
                <div style={{ fontSize: "14px", color: "#333", lineHeight: 1.7, padding: "8px 12px", backgroundColor: "#FFF3E0", borderRadius: "8px", borderLeft: "3px solid #E65100" }}>
                  {aiData.needling_method}
                </div>
              </div>
            )}
            {/* 操作禁忌 */}
            {aiData.contraindications && (
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #f5f5f5" }}>
                <div style={{ fontSize: "12px", color: "#999", marginBottom: "4px" }}>⚠️ 操作禁忌</div>
                <div style={{ fontSize: "14px", color: "#C62828", lineHeight: 1.7, padding: "8px 12px", backgroundColor: "#FFEBEE", borderRadius: "8px", borderLeft: "3px solid #C62828" }}>
                  {aiData.contraindications}
                </div>
              </div>
            )}
            <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px", color: "#999" }}>
              <span>来源：{aiData.source}</span>
              <div style={{ display: "flex", gap: "8px" }}>
                <span>更新时间：{new Date(aiData.fetched_at).toLocaleDateString()}</span>
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
                正在加载穴位详细数据...
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

      {showPositionModal && (
        <PositioningModal
          acupointName={acupoint.name}
          acupointCode={acupoint.code}
          meridianName={acupoint.meridian}
          locationText={acupoint.location_detail && acupoint.location_detail !== acupoint.location
            ? acupoint.location + " " + acupoint.location_detail
            : acupoint.location}
          onClose={() => setShowPositionModal(false)}
        />
      )}
    </div>
  );
}

// ==================== 董氏奇穴详情页 ====================
function DongAcupointDetailPage({ acupointName }: { acupointName: string }) {
  const router = useRouter();
  const [aiData, setAiData] = useState<any>(null);
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState("");
  const [showPositionModal, setShowPositionModal] = useState(false);

  const acupoint = getDongAcupointByName(acupointName);

  useEffect(() => {
    if (acupoint) {
      addRecentItem({ type: "meridian", id: acupoint.name, name: acupoint.name, category: "董氏奇穴" });
      // 自动加载穴位详细数据（静态数据 + 缓存）
      const data = getCachedAcupointInfo(acupoint.name, "dong");
      if (data) {
        setAiData(data);
      } else {
        const result = triggerScrape(acupoint.name, acupoint.name, "董氏奇穴", "dong");
        if (result) setAiData(result);
      }
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
        setScrapeError("数据加载失败，请稍后重试");
      }
    } catch {
      setScrapeError("数据加载错误，请检查后重试");
    } finally {
      setScraping(false);
    }
  }, [acupoint, scraping]);

  const handleReportError = useCallback(async () => {
    if (!acupoint) return;
    markForRefetch(acupoint.name, "dong");
    setAiData(null);
    alert("已标记为需要重新加载，请再次点击刷新按钮");
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
        {sections.filter(s => s.content).map((section, i, arr) => {
          const isLocation = section.label === "定位" || section.label === "详细定位";
          return (
          <div key={section.label} style={{ padding: "12px 16px", borderBottom: i < arr.length - 1 ? "1px solid #f5f5f5" : "none" }}>
            <div style={{ fontSize: "12px", color: "#999", marginBottom: "4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              {section.label}
              {isLocation && (
                <button onClick={() => setShowPositionModal(true)} style={{ background: "none", border: "none", color: "#E65100", fontSize: "11px", cursor: "pointer", padding: 0 }}>📍 查看定位图</button>
              )}
            </div>
            <div style={{ fontSize: "14px", color: "#333", lineHeight: 1.7, cursor: isLocation ? "pointer" : "default" }}
                 onClick={isLocation ? () => setShowPositionModal(true) : undefined}>
              {section.content}
            </div>
          </div>
          );
        })}
      </div>

      {/* 穴位详解（文字描述） */}
      <div style={{ margin: "12px", background: "white", borderRadius: "16px", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "14px", fontWeight: "bold", color: "#333" }}>📖 穴位详解</span>
            <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", backgroundColor: "#E8F5E9", color: "#2E7D32" }}>国标数据</span>
          </div>
          {aiData && !scraping && (
            <button onClick={handleAIScrape}
              style={{ padding: "6px 14px", borderRadius: "16px", border: "none", fontSize: "12px", fontWeight: "bold", cursor: "pointer", background: "#FFF8E1", color: "#E65100" }}>
              刷新
            </button>
          )}
          {scraping && (
            <span style={{ fontSize: "12px", color: "#999", display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ display: "inline-block", width: "14px", height: "14px", border: "2px solid #ccc", borderTopColor: "#E65100", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              加载中...
            </span>
          )}
        </div>

        {aiData ? (
          <>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f5f5f5" }}>
              <div style={{ fontSize: "12px", color: "#999", marginBottom: "4px" }}>📍 详细定位</div>
              <div style={{ fontSize: "14px", color: "#333", lineHeight: 1.7 }}>{aiData.detail}</div>
            </div>
            {aiData.indications && (
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #f5f5f5" }}>
                <div style={{ fontSize: "12px", color: "#999", marginBottom: "4px" }}>🏥 主治</div>
                <div style={{ fontSize: "14px", color: "#333", lineHeight: 1.7 }}>{aiData.indications}</div>
              </div>
            )}
            {aiData.combinations && (
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #f5f5f5" }}>
                <div style={{ fontSize: "12px", color: "#999", marginBottom: "4px" }}>🔗 配伍</div>
                <div style={{ fontSize: "14px", color: "#333", lineHeight: 1.7 }}>{aiData.combinations}</div>
              </div>
            )}
            {aiData.needling_method && (
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #f5f5f5" }}>
                <div style={{ fontSize: "12px", color: "#999", marginBottom: "4px" }}>💉 进针方法补充</div>
                <div style={{ fontSize: "14px", color: "#333", lineHeight: 1.7, padding: "8px 12px", backgroundColor: "#FFF3E0", borderRadius: "8px", borderLeft: "3px solid #E65100" }}>
                  {aiData.needling_method}
                </div>
              </div>
            )}
            {aiData.contraindications && (
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #f5f5f5" }}>
                <div style={{ fontSize: "12px", color: "#999", marginBottom: "4px" }}>⚠️ 操作禁忌</div>
                <div style={{ fontSize: "14px", color: "#C62828", lineHeight: 1.7, padding: "8px 12px", backgroundColor: "#FFEBEE", borderRadius: "8px", borderLeft: "3px solid #C62828" }}>
                  {aiData.contraindications}
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
                正在加载穴位详细数据...
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

      {showPositionModal && (
        <PositioningModal
          acupointName={acupoint.name}
          acupointCode={acupoint.code}
          meridianName="董氏奇穴"
          locationText={acupoint.location_detail && acupoint.location_detail !== acupoint.location
            ? acupoint.location + " " + acupoint.location_detail
            : acupoint.location}
          zone={acupoint.zone}
          onClose={() => setShowPositionModal(false)}
        />
      )}
    </div>
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

function MeridianPageOriginal() {
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

// v25.0.47_12: 中医板块知识开放程度门控（后台工具矩阵实时控制：开放/会员专享/维护/关闭）
export default function MeridianPage() {
  return (
    <SectionGate toolId="zhongyi_meridian" title="经络穴位">
      <MeridianPageOriginal />
    </SectionGate>
  );
}
