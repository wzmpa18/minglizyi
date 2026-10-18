"use client";

import type { ZiweiResult } from "@/algorithm-core";

type Mode = "feixing" | "sanhe" | "sihua";
type Mutagens = { lu: string; quan: string; ke: string; ji: string };
type Overlay = { dx?: { names: string[] } | null; ln?: { names: string[] } | null; deep?: { names: string[]; tag: string } | null } | null;
const GRID = [3, 4, 5, 6, 2, null, null, 7, 1, null, null, 8, 0, 11, 10, 9];
const ZHI = ["寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑"];
const HUA = ["禄", "权", "科", "忌"];
const HUA_COLORS = ["#299234", "#800080", "#1681ff", "#ff5149"];
const ANCHORS = [[25,75],[25,62.5],[25,37.5],[25,25],[37.5,25],[62.5,25],[75,25],[75,37.5],[75,62.5],[75,75],[62.5,75],[37.5,75]];
const ABBR: Record<string, string> = { 命宫:"命", 兄弟:"兄", 夫妻:"夫", 子女:"子", 财帛:"财", 疾厄:"疾", 迁移:"迁", 交友:"友", 官禄:"官", 田宅:"田", 福德:"福", 父母:"父" };
const short = (name: string) => ABBR[name] || name.replace(/宫$/, "").slice(0, 1);

/** Presentation only. All stars, ages, mutagens and overlays come from the existing engine. */
export function ProfessionalZiweiBoard({ onOpenBazi, result, mode, focus, onSelect, onDetails, overlay, flyingStars, dynamicLabels, decadalMutagen, yearlyMutagen, mutagenTable, laiyinPalaceIndex }: {
  onOpenBazi:()=>void; result: ZiweiResult; mode: Mode; focus: number | null;
  onSelect: (index: number) => void; onDetails: (index: number) => void;
  overlay: Overlay; flyingStars?: Mutagens; mutagenTable?: Record<string, Mutagens>; laiyinPalaceIndex?: number;
  dynamicLabels: Record<number, { abbr: string; level: string }[]>;
  decadalMutagen?: string[]; yearlyMutagen?: string[];
}) {
  const selected = focus ?? ZHI.indexOf(result.earthlyBranchOfSoulPalace);
  const source = ANCHORS[selected];
  const natal = [result.sihua?.huaLu?.star, result.sihua?.huaQuan?.star, result.sihua?.huaKe?.star, result.sihua?.huaJi?.star];
  const selectedFlies = flyingStars ? [flyingStars.lu, flyingStars.quan, flyingStars.ke, flyingStars.ji] : [];
  const findPalace = (index: number) => result.palaces.find(p => (p.index ?? ZHI.indexOf(p.earthlyBranch)) === index);
  const palaceForStar = (name: string) => result.palaces.find(p => [...(p.majorStars || []), ...(p.auspiciousStars || []), ...(p.shaStars || []), ...(p.otherStars || [])].includes(name));
  const pointForPalace = (palace: ZiweiResult["palaces"][number]) => ANCHORS[palace.index ?? ZHI.indexOf(palace.earthlyBranch)];
  return <div className="relative bg-white text-black" data-testid="ziwei-professional-board" data-mode={mode} style={{ aspectRatio: "0.74" }}>
    <div className="grid h-full grid-cols-4 grid-rows-4">
      {GRID.map((index, position) => {
        if (index === null) {
          if (position !== 5) return null;
          return <div key="center" className="relative flex flex-col border border-gray-500 bg-white px-2 py-3" style={{ gridRow: "2/4", gridColumn: "2/4" }}>
            <h2 className="text-center text-[15px] font-semibold text-gray-600">言道国学 · 紫微</h2>
            <p className="mt-2 text-center text-[11px] text-gray-600">{result.fiveElementsClass} · {result.zodiac}</p>
            <p className="mt-2 text-[10px] leading-5 text-gray-600">公历：{result.solarDate}<br />农历：{result.lunarDate} {result.time}</p>
            {mode === "sanhe" && <>
              <p className="mt-1 text-[10px] text-gray-600">命主：{result.soulStar}　身主：{result.bodyStar}</p>
              <p className="mt-1 text-[10px] text-gray-600">命宫：{result.earthlyBranchOfSoulPalace}　身宫：{result.earthlyBranchOfBodyPalace}</p>
              <button type="button" onClick={onOpenBazi} className="mt-2 text-center text-[12px] text-purple-900 underline" aria-label="用此四柱打开八字基本信息">{result.chineseDate}</button>
            </>}
            <div className="mt-auto relative z-[4]">
              <button type="button" onClick={() => onDetails(selected)} className="rounded border border-gray-300 bg-white px-2 py-1 text-[10px] text-purple-800">查看{findPalace(selected)?.name || "宫位"}资料</button>
              <p className="mt-2 text-[9px] text-gray-500">点击宫格选择；详细功能保留在盘下。</p>
              <p className="mt-1 text-[10px] text-gray-500">{mode === "sihua" ? "A禄 · B权 · C科 · D忌；红线为所选宫干飞化" : <>四化图示：{HUA.map((hua, i) => <span key={hua} style={{ color: HUA_COLORS[i] }}>→{hua}</span>)}</>}</p>
            </div>
          </div>;
        }
        const palace = findPalace(index);
        if (!palace) return <div key={index} className="border border-gray-500" />;
        const major = palace.majorStars || [];
        const aux = [...(palace.auspiciousStars || []), ...(palace.shaStars || [])];
        const minor = (palace.otherStars || []).filter(star => mode === "sanhe" || ["天空", "天刑"].includes(star));
        const stars = [...major, ...aux, ...(mode === "sanhe" ? [] : minor)];
        const size = Math.min(16, Math.max(11, 98 / Math.max(stars.length, 1)));
        const palaceMutagen = mutagenTable?.[palace.heavenlyStem];
        const selfFlies = palaceMutagen ? [palaceMutagen.lu, palaceMutagen.quan, palaceMutagen.ke, palaceMutagen.ji] : [];
        const range = palace.ageRange?.[0] ? `${palace.ageRange[0]}~${palace.ageRange[1]}` : "";
        const dx = overlay?.dx?.names[index];
        const ln = overlay?.ln?.names[index];
        const deep = overlay?.deep?.names[index];
        const isSelected = selected === index;
        return <div key={index} role="button" tabIndex={0} aria-label={`选择${palace.name}${palace.heavenlyStem}${palace.earthlyBranch}`} aria-pressed={isSelected}
          onClick={() => onSelect(index)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(index); } }}
          className="relative flex min-w-0 flex-col overflow-hidden border border-gray-500 bg-white p-[2px]" style={{ boxShadow: isSelected ? "inset 0 0 0 1px #666" : undefined }}>
          <div className="min-h-0 flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
          <div className="flex flex-wrap items-start" style={{ gap: mode === "sanhe" ? 0.5 : 1 }}>
            {stars.map((name, i) => {
              const hua = natal.indexOf(name);
              const fly = selectedFlies.indexOf(name);
              const self = selfFlies.indexOf(name);
              const brightness = result.stars.find(star => star.name === name && star.palace === palace.name)?.brightness;
              const color = mode === "sihua" ? (major.includes(name) ? "#111" : "#666") : major.includes(name) ? "#b90000" : aux.includes(name) || mode === "feixing" ? "#800080" : "#014fab";
              return <div key={`${name}-${i}`} className="flex shrink-0 flex-col items-center leading-none" style={{ fontSize: major.includes(name) ? size : Math.min(size, mode === "sihua" ? 16 : 14), color, fontWeight: major.includes(name) || mode === "feixing" ? 600 : 400 }}>
                {Array.from(name).map((char, j) => <span key={j}>{char}</span>)}
                {mode === "sanhe" && brightness && <span className="mt-[2px] text-[7px] font-normal text-gray-500">{brightness}</span>}
                {hua >= 0 && <span className="mt-1 rounded-sm border px-[1px]" style={{ fontSize: mode === "sihua" ? size + 2 : 11, borderColor: mode === "sihua" ? "transparent" : HUA_COLORS[hua], color: mode === "sihua" ? "#ff5149" : HUA_COLORS[hua] }}>{mode === "sihua" ? "ABCD"[hua] : HUA[hua]}</span>}
                {mode === "sihua" && fly >= 0 && <span className="text-[8px] text-[#ff5149]">↗{"ABCD"[fly]}</span>}
                {mode === "feixing" && self >= 0 && <span title={`${palace.heavenlyStem}干对照：本宫${name}自化${HUA[self]}`} className="mt-1 text-[11px]" style={{ color: HUA_COLORS[self] }}>→{HUA[self]}</span>}
                {[decadalMutagen, yearlyMutagen].map((mutagen, layer) => {
                  const h = mutagen?.indexOf(name) ?? -1;
                  return h >= 0 && h < 4 ? <span key={layer} className="mt-[1px] text-[8px]" style={{ color: layer ? "#16a34a" : "#2563eb" }}>{layer ? "年" : "大"}{HUA[h]}</span> : null;
                })}
              </div>;
            })}
          </div>
          {mode === "sanhe" && minor.length > 0 && <div className="mt-1 flex flex-wrap gap-x-1 text-[9px] leading-tight text-[#014fab]">{minor.map((star, i) => <span key={`${star}-${i}`}>{star}</span>)}</div>}
          </div>
          {index === laiyinPalaceIndex && <span className="absolute bottom-[42%] right-[2px] rounded border border-red-500 px-[1px] text-[8px] leading-tight text-red-500" style={{ writingMode: "vertical-rl" }}>来因</span>}
          {palace.isBodyPalace && <span className="absolute right-0 top-[40%] text-[8px] text-red-700" style={{ writingMode: "vertical-rl" }}>身宫</span>}
          <div className="flex justify-between gap-1 text-[7px] leading-tight text-gray-500">
            <span>{mode === "sanhe" ? [palace.boshi, palace.jiangqian, palace.suiqian].filter(Boolean).join(" · ") : ""}</span>
            <span>{mode === "sanhe" ? palace.changsheng : ""}</span>
          </div>
          <div className="text-[7px] leading-tight text-blue-600">{dynamicLabels[index]?.map(star => star.abbr).join(" ")}</div>
          {mode === "sihua" ? <div className="-mx-[2px] -mb-[2px] mt-1 grid grid-cols-[24%_52%_24%] border-t border-gray-500 text-center">
            <span className="flex flex-col justify-center border-r border-gray-500 text-[14px] leading-tight">{palace.heavenlyStem}<br />{palace.earthlyBranch}</span>
            <div><div className="border-b border-gray-500 text-[14px] leading-5">{dx ? `大${short(dx)}` : "本命"}</div><div className="text-[10px] font-semibold leading-5">{range}</div></div>
            <span className="flex items-center justify-center border-l border-gray-500 text-[13px] leading-none" style={{ writingMode: "vertical-rl" }}>{palace.name}</span>
          </div> : <div className="mt-1 flex items-end justify-between gap-[1px] leading-tight">
            <div className="min-w-0 text-[8px] text-[#3b82b6]">{deep && <div>{overlay?.deep?.tag}{short(deep)}</div>}{ln && <div>年{short(ln)}</div>}{dx && <div>大{short(dx)}</div>}</div>
            <div className="text-center"><div className="text-[9px] text-black">{range}</div><strong className="text-[14px]" style={{ color: mode === "feixing" ? "#10066b" : "#b90000" }}>{palace.name}</strong><div className="text-[7px] text-gray-500">{mode === "sanhe" ? palace.ages?.slice(0, 4).join(",") : ""}</div></div>
            <span className="text-[14px] font-semibold leading-tight">{palace.heavenlyStem}<br />{palace.earthlyBranch}</span>
          </div>}
        </div>;
      })}
    </div>
    <svg aria-hidden="true" className="pointer-events-none absolute inset-0 z-[3] h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs><marker id="professional-hua-arrow" markerWidth="4" markerHeight="4" refX="3.5" refY="2" orient="auto"><path d="M0,0 L4,2 L0,4" fill="none" stroke="#ff5149" strokeWidth="0.6" /></marker></defs>
      {mode === "sihua" ? selectedFlies.map((star, hua) => {
        const targetPalace = palaceForStar(star);
        const target = targetPalace && pointForPalace(targetPalace);
        if (!source || !target) return null;
        // Self-transformations use a short loop; never invent another destination.
        return source === target ? <path key={hua} d={`M${source[0]},${source[1]} q-3,-4 -1,-6 q4,0 1,6`} fill="none" stroke="#ff5149" strokeWidth="0.2" markerEnd="url(#professional-hua-arrow)" /> : <g key={hua}><line x1={source[0]} y1={source[1]} x2={target[0]} y2={target[1]} stroke="#ff5149" strokeWidth="0.2" markerEnd="url(#professional-hua-arrow)" /><text x={target[0]} y={target[1] - 1} fill="#ff5149" fontSize="1.8">{"ABCD"[hua]}</text></g>;
      }) : source && <path d={`M${ANCHORS[(selected + 6) % 12].join(",")} L${source.join(",")} L${ANCHORS[(selected + 4) % 12].join(",")} L${ANCHORS[(selected + 8) % 12].join(",")} Z`} fill="none" stroke="#bdbdbd" strokeWidth="0.25" strokeDasharray="0.8 0.4" />}
    </svg>
  </div>;
}
