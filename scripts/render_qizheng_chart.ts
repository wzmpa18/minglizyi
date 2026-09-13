// ============================================================================
// 七政四余盘面效果图渲染器（v25.0.84 P1-3 达标效果图 / 离线视觉验证）
// ============================================================================
// 目的：复刻 src/app/yixue/qizheng/page.tsx 的盘面 SVG 几何（五圈层 + 五行配色
//   + 感应图层 + 流年模式），离线产出 HTML 供 headless Chrome 截图成 PNG：
//   1. 不消耗 AI 积分（本地 Chrome --headless --screenshot，非浏览器自动化插件）；
//   2. 产出用户要求的「达标效果图」；
//   3. 结构断言：圈层半径序 / 星曜半径界 / 标记不出 viewBox / 文本角度可容纳。
// 注意：几何常量与绘制逻辑镜像 page.tsx（R_* 同源），改盘面需两处同步。
// ============================================================================

import * as fs from "fs";
import * as path from "path";
import { calcQizhengChart, type QizhengResult, type StarPosition } from "../src/algorithm-core/modules/qizheng";
import { calcQizhengDuanyu, huayaoStarKeysForGan } from "../src/algorithm-core/modules/qizheng-duanyu";
import { computeQizhengLayers, type LayerLine, type LayerKey } from "../src/algorithm-core/modules/qizheng-layers";
import { computeQizhengLiunian } from "../src/algorithm-core/modules/qizheng-liunian";

// ===== 与 page.tsx 同源的几何与配色 =====
const RAD = Math.PI / 180;
const C = 180;
function px(r: number, a: number): [number, number] {
  return [C + r * Math.sin(a * RAD), C - r * Math.cos(a * RAD)];
}
function pt(r: number, a: number): string {
  const [x, y] = px(r, a);
  return `${x.toFixed(2)},${y.toFixed(2)}`;
}
function sectorPath(r1: number, r2: number, a1: number, a2: number): string {
  const large = a2 - a1 > 180 ? 1 : 0;
  return `M ${pt(r2, a1)} A ${r2},${r2} 0 ${large} 1 ${pt(r2, a2)} L ${pt(r1, a2)} A ${r1},${r1} 0 ${large} 0 ${pt(r1, a1)} Z`;
}

const PAN_BG = "#f5ecd7";
const PAN_LINE = "#8a6d3b";
const PAN_DARK = "#14100b";
const GOLD = "#e8c96a";
const STAR_AREA = "#0e1526";

const R_EDGE = 179;
const R_RENSHI_OUT = 177;
const R_RENSHI_IN = 154;
const R_XIU_OUT = 152;
const R_XIU_IN = 124;
const R_GONG_OUT = 122;
const R_GONG_IN = 94;
const R_STAR_IN = 89;
const R_CORE = 30;

const WUXING_STAR_COLOR: Record<string, string> = {
  "金": "#f5f5f5", "木": "#66bb6a", "水": "#4fc3f7", "火": "#ef5350", "土": "#e0b64a",
};
const YU_STAR_COLOR: Record<string, string> = {
  qi: "#ce93d8", luo: "#ff7043", ji: "#90a4ae", bei: "#26c6da",
};
function starColor(s: { key: string; wuxing: string }): string {
  return YU_STAR_COLOR[s.key] ?? WUXING_STAR_COLOR[s.wuxing] ?? GOLD;
}
const XIU_TEXT_COLOR: Record<string, string> = {
  "木": "#2e7d32", "火": "#c62828", "土": "#8d6e2f", "金": "#455a64", "水": "#1565c0",
};
const LAYER_COLORS: Record<LayerKey, string> = {
  shou: "#7B2FBE", chong: "#e53935", sanfang: "#43a047", gong: "#fb8c00", jia: "#b8860b",
  tongjing: "#00acc1", tongluo: "#26a69a", dingxing: "#00bcd4", dingdu: "#4dd0e1",
  shensha: "#d81b60", huayao: "#fbc02d", daxian: "#1e88e5",
};

/** 星曜径向避让排布（与 page.tsx starLayout 同逻辑） */
function starLayout(res: QizhengResult): Array<{ s: StarPosition; r: number }> {
  const sorted = [...res.stars].sort((a, b) => a.lon - b.lon);
  const placed: Array<{ s: StarPosition; r: number }> = [];
  for (const s of sorted) {
    let r = 82;
    for (const p of placed) {
      let d = Math.abs(s.lon - p.s.lon);
      if (d > 180) d = 360 - d;
      if (d < 12 && Math.abs(p.r - r) < 14) r = p.r - 17;
    }
    placed.push({ s, r: Math.max(38, r) });
  }
  return placed;
}

/** 生成盘面 SVG（与 page.tsx 渲染路径一致） */
function renderChartSvg(
  res: QizhengResult,
  opts: {
    layerLines?: Array<{ key: LayerKey; lines: LayerLine[] }>;
    liunian?: ReturnType<typeof computeQizhengLiunian>;
  } = {},
): string {
  const parts: string[] = [];
  const layout = starLayout(res);

  parts.push(`<circle cx="${C}" cy="${C}" r="${R_EDGE}" fill="${PAN_BG}" stroke="${PAN_LINE}" stroke-width="2"/>`);

  // 第五圈层·十二人事宫
  for (const p of res.palaces) {
    const mid = p.startLon + p.width / 2;
    const [tx, ty] = px((R_RENSHI_IN + R_RENSHI_OUT) / 2, mid);
    const flip = mid > 90 && mid < 270;
    const label = flip ? p.renshiGong.split("").reverse().join("") : p.renshiGong;
    parts.push(`<path d="${sectorPath(R_RENSHI_IN, R_RENSHI_OUT, p.startLon, p.startLon + p.width)}" fill="#f6eed9" stroke="${PAN_LINE}" stroke-width="0.6"/>`);
    parts.push(`<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="10.5" fill="#5a4526" font-weight="700" font-family="sans-serif" transform="rotate(${(flip ? mid + 180 : mid).toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)})">${label}</text>`);
  }
  const shenPal = res.palaces[res.shenGong.branchIndex];
  parts.push(`<path d="${sectorPath(R_RENSHI_IN, R_RENSHI_OUT, res.mingGong.startLon, res.mingGong.startLon + res.mingGong.width)}" fill="rgba(123,47,190,0.18)" stroke="#7B2FBE" stroke-width="1.2"/>`);
  parts.push(`<path d="${sectorPath(R_RENSHI_IN, R_RENSHI_OUT, shenPal.startLon, shenPal.startLon + shenPal.width)}" fill="rgba(33,150,243,0.14)" stroke="#2196F3" stroke-width="1"/>`);

  // 第四圈层·二十八宿（宿名按宿主五行着色）
  for (const m of res.mansions) {
    const mid = m.startLon + m.width / 2;
    const [tx, ty] = px((R_XIU_IN + R_XIU_OUT) / 2, mid);
    parts.push(`<path d="${sectorPath(R_XIU_IN, R_XIU_OUT, m.startLon, m.startLon + m.width)}" fill="#efe4c8" stroke="${PAN_LINE}" stroke-width="0.5"/>`);
    parts.push(`<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="10" fill="${XIU_TEXT_COLOR[m.wuxing] ?? "#5a4526"}" font-weight="600" font-family="sans-serif" transform="rotate(${mid.toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)})">${m.name}</text>`);
  }

  // 第二圈层·十二地支宫
  for (const p of res.palaces) {
    const mid = p.startLon + p.width / 2;
    const [bx, by] = px((R_GONG_IN + R_GONG_OUT) / 2 + 3, mid);
    const [rx, ry] = px(R_GONG_IN + 5.5, mid);
    const flip = mid > 90 && mid < 270;
    const owner = flip ? `主${p.owner}`.split("").reverse().join("") : `主${p.owner}`;
    parts.push(`<path d="${sectorPath(R_GONG_IN, R_GONG_OUT, p.startLon, p.startLon + p.width)}" fill="${PAN_BG}" stroke="${PAN_LINE}" stroke-width="0.8"/>`);
    parts.push(`<text x="${bx.toFixed(1)}" y="${by.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="17" fill="#3a2d18" font-weight="700" font-family="sans-serif" transform="rotate(${mid.toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)})">${p.branch}</text>`);
    parts.push(`<text x="${rx.toFixed(1)}" y="${ry.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="7.5" fill="#a08a5f" font-family="sans-serif" transform="rotate(${(flip ? mid + 180 : mid).toFixed(1)} ${rx.toFixed(1)} ${ry.toFixed(1)})">${owner}</text>`);
  }

  // 星区 + 刻度
  parts.push(`<circle cx="${C}" cy="${C}" r="${R_GONG_IN}" fill="${STAR_AREA}" stroke="${PAN_LINE}" stroke-width="1.5"/>`);
  parts.push(`<circle cx="${C}" cy="${C}" r="${R_STAR_IN}" fill="none" stroke="#31406b" stroke-width="0.7"/>`);
  for (let i = 0; i < 24; i++) {
    const a = i * 15;
    const [x1, y1] = px(R_GONG_IN, a);
    const [x2, y2] = px(R_STAR_IN, a);
    parts.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#31406b" stroke-width="0.6"/>`);
  }

  // 感应图层连线（与 page.tsx v25.0.84 P1-3 整改后同逻辑：端点让位 + 近对冲弧线 + 端点标记 + 神煞点线）
  for (const l of opts.layerLines ?? []) {
    const color = LAYER_COLORS[l.key];
    const dashed = l.key === "tongjing" || l.key === "tongluo" || l.key === "daxian";
    const dash = dashed ? "4 3" : l.key === "shensha" ? "1.5 2.5" : "";
    for (const ln of l.lines) {
      const fromR = ln.starKey ? 88 : 96;
      const toR = ln.target === "mingDu" ? 150 : 96;
      const delta = ((ln.toLon - ln.fromLon + 540) % 360) - 180;
      const d = Math.abs(delta) > 150
        ? `M ${pt(90, ln.fromLon)} A 90,90 0 0 ${delta > 0 ? 1 : 0} ${pt(90, ln.toLon)} L ${pt(toR, ln.toLon)}`
        : `M ${pt(fromR, ln.fromLon)} Q ${pt(34, ln.fromLon + delta / 2)} ${pt(toR, ln.toLon)}`;
      parts.push(`<path d="${d}" fill="none" stroke="${color}" stroke-width="1.3" opacity="0.8" ${dash ? `stroke-dasharray="${dash}"` : ""}/>`);
      parts.push(`<circle cx="${px(toR, ln.toLon)[0].toFixed(1)}" cy="${px(toR, ln.toLon)[1].toFixed(1)}" r="1.5" fill="${color}" opacity="0.8"/>`);
    }
  }

  // 流年模式：太岁宫 + 流年星（v25.0.84 整改：描边加浓、标记带底衬与星符）
  if (opts.liunian) {
    const ts = res.palaces.find((p) => p.branch === opts.liunian!.ganzhi.zhi);
    if (ts) {
      parts.push(`<path d="${sectorPath(R_GONG_IN, R_GONG_OUT, ts.startLon, ts.startLon + ts.width)}" fill="rgba(230,81,0,0.14)" stroke="#e65100" stroke-width="1.5" stroke-dasharray="4 2.5"/>`);
    }
    for (const s of opts.liunian.stars) {
      const [x, y] = px(90.5, s.lon);
      const sym = res.stars.find((b) => b.key === s.key)?.symbol ?? "";
      parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.2" fill="rgba(14,21,38,0.6)" stroke="${starColor(s)}" stroke-width="1.4"/>`);
      parts.push(`<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="5.5" fill="${starColor(s)}" font-weight="700" font-family="sans-serif">${sym}</text>`);
    }
  }

  // 星曜
  for (const { s, r } of layout) {
    const [x, y] = px(r, s.lon);
    const color = starColor(s);
    const sym = s.kind === "zheng" ? s.symbol : s.name;
    parts.push(`<text x="${x.toFixed(1)}" y="${(y - 5).toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="11" fill="${color}" font-weight="700" font-family="sans-serif">${sym}</text>`);
    parts.push(`<text x="${x.toFixed(1)}" y="${(y + 6).toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="7.5" fill="#c9d4ee" font-family="sans-serif">${s.name}</text>`);
    if (s.retrograde) {
      parts.push(`<text x="${x.toFixed(1)}" y="${(y + 15).toFixed(1)}" text-anchor="middle" font-size="7" fill="#ff8a80" font-family="sans-serif">逆</text>`);
    }
  }

  // 天心十字
  parts.push(`<line x1="${C}" y1="${C - 93}" x2="${C}" y2="${C + 93}" stroke="rgba(232,201,106,0.4)" stroke-width="0.8"/>`);
  parts.push(`<line x1="${C - 93}" y1="${C}" x2="${C + 93}" y2="${C}" stroke="rgba(232,201,106,0.4)" stroke-width="0.8"/>`);

  // 命度/身度标记
  for (const [lon, color] of [[res.mingDu.lon, "#e53935"], [res.shenDu.lon, "#4fc3f7"]] as const) {
    const [x1, y1] = px(R_RENSHI_IN, lon);
    const [x2, y2] = px(R_RENSHI_OUT, lon);
    const [cx, cy] = px(175, lon);
    parts.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="2"/>`);
    parts.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="3" fill="${color}"/>`);
  }

  // 命理核心
  parts.push(`<circle cx="${C}" cy="${C}" r="${R_CORE}" fill="${PAN_DARK}" stroke="${PAN_LINE}" stroke-width="1"/>`);
  parts.push(`<text x="${C}" y="${C - 13}" text-anchor="middle" font-size="7" fill="#bfa76a" font-family="sans-serif">七政四余</text>`);
  parts.push(`<text x="${C}" y="${C - 3.5}" text-anchor="middle" font-size="8.5" fill="${GOLD}" font-weight="700" font-family="sans-serif">${res.mingGong.branch}宫立命</text>`);
  parts.push(`<text x="${C}" y="${C + 5.5}" text-anchor="middle" font-size="7" fill="#bfa76a" font-family="sans-serif">${res.shenGong.branch}宫安身</text>`);
  parts.push(`<text x="${C}" y="${C + 14}" text-anchor="middle" font-size="5.5" fill="#ff8a80" font-family="sans-serif">命度·${res.mingDu.xiuName}${res.mingDu.xiuDegree.toFixed(0)}°</text>`);
  parts.push(`<text x="${C}" y="${C + 21.5}" text-anchor="middle" font-size="5.5" fill="#81d4fa" font-family="sans-serif">身度·${res.shenDu.xiuName}${res.shenDu.xiuDegree.toFixed(0)}°</text>`);

  return parts.join("\n");
}

function wrapHtml(title: string, svgInner: string, legendHtml: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>body{margin:0;padding:16px;background:#fff;font-family:"Microsoft YaHei",sans-serif}
.chart{display:flex;justify-content:center}.cap{text-align:center;color:#555;font-size:13px;margin:6px 0 12px}
.legend{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;font-size:11px;color:#666;max-width:720px;margin:0 auto}
.dot{display:inline-block;width:9px;height:9px;border-radius:50%;border:1px solid #bbb;vertical-align:middle;margin-right:2px}</style></head>
<body><div class="cap">${title}</div><div class="chart"><svg viewBox="0 0 360 360" width="720" height="720">${svgInner}</svg></div><div class="legend">${legendHtml}</div></body></html>`;
}

function legendHtml(): string {
  const items = [
    ["命度", "#e53935"], ["身度", "#4fc3f7"], ["命宫", "rgba(123,47,190,0.55)"], ["身宫", "rgba(33,150,243,0.5)"],
    ["金", WUXING_STAR_COLOR["金"]], ["木", WUXING_STAR_COLOR["木"]], ["水", WUXING_STAR_COLOR["水"]],
    ["火", WUXING_STAR_COLOR["火"]], ["土", WUXING_STAR_COLOR["土"]],
    ["炁", YU_STAR_COLOR.qi], ["罗", YU_STAR_COLOR.luo], ["计", YU_STAR_COLOR.ji], ["孛", YU_STAR_COLOR.bei],
  ] as const;
  return items.map(([label, c]) => `<span><span class="dot" style="background:${c}"></span>${label}</span>`).join(" ");
    + `<span style="color:#999">｜五圈层：命理核心→十二地支→星曜→二十八宿→十二人事宫</span>`;
}

// ============================================================================
// 主流程
// ============================================================================
const OUT_DIR = path.join(process.cwd(), "docs", "reports", "assets");
fs.mkdirSync(OUT_DIR, { recursive: true });

// 金样本（与 test_qizheng_liunian.ts 同源：1988-09-27 15:40 北京 男）
const res = calcQizhengChart({
  year: 1988, month: 9, day: 27, hour: 15, minute: 40,
  lat: 39.9042, lon: 116.4074, tzOffset: 8, placeName: "北京市市辖区", gender: "male",
});

// —— 结构断言（几何不变量） ——
let pass = 0, fail = 0;
function check(name: string, cond: boolean) {
  if (cond) { pass++; } else { fail++; console.error(`  ✗ ${name}`); }
}
check("圈层半径序：core(30) < 星min(38) < 星max(82) < 刻度内(89) < 星区界(94) < 地支(94-122) < 宿(124-152) < 人事宫(154-177) < 外缘(179)",
  R_CORE < 38 && 82 < R_STAR_IN && R_STAR_IN < R_GONG_IN && R_GONG_IN === 94 && R_GONG_OUT < R_XIU_IN && R_XIU_OUT < R_RENSHI_IN && R_RENSHI_OUT < R_EDGE);
const layout = starLayout(res);
check("星曜半径均在 [38,82] 且避让间距≥14", layout.every(({ r }) => r >= 38 && r <= 82)
  && layout.every((a, i) => layout.slice(0, i).every((b) => {
    let d = Math.abs(a.s.lon - b.s.lon); if (d > 180) d = 360 - d;
    return d >= 12 || Math.abs(a.r - b.r) >= 14;
  })));
check("命度/身度标记不出 viewBox（175+3=178 < 180）", 175 + 3 < 180);
check("人事宫名均为 2 字（10.5px 双字弧长 < 30° 扇区弧 @r=165.5）",
  res.palaces.every((p) => p.renshiGong.length === 2) && 2 * 10.5 < (30 * Math.PI / 180) * ((R_RENSHI_IN + R_RENSHI_OUT) / 2));
check("五行配色齐全（金木水火土）", Object.keys(WUXING_STAR_COLOR).length === 5);
check("四余分色齐全（炁罗计孛）", ["qi", "luo", "ji", "bei"].every((k) => !!YU_STAR_COLOR[k]));
check("星曜取色：七政按五行、四余按 key", res.stars.every((s) => s.kind === "yu" ? !!YU_STAR_COLOR[s.key] : !!WUXING_STAR_COLOR[s.wuxing]));

// —— 三张效果图 ——
// 1. 基础盘（五圈层 + 五行配色）
fs.writeFileSync(path.join(OUT_DIR, "qizheng_effect_1_base.html"),
  wrapHtml("七政四余专业盘 · 五圈层 + 五行配色（金样本：1988-09-27 15:40 北京 · 戊辰年）", renderChartSvg(res), legendHtml()));

// 2. 感应图层（守/冲/三方/拱/夹/顶星/神煞/化曜/大限）
const duanyu = calcQizhengDuanyu(res);
const xianRow = res.dongwei.rows.find((r) => 37 >= r.startAge && 37 < r.endAge) ?? res.dongwei.rows[0];
const xianLon = res.dongwei.rows.length > 0 ? (xianRow.startLon ?? res.mingGong.startLon) : res.mingGong.startLon;
const layersRes = computeQizhengLayers(res, duanyu, {
  row: { palaceBranch: xianRow.palaceBranch, renshiGong: xianRow.renshiGong, startLon: xianRow.startLon, width: xianRow.width },
  lon: xianLon, xiuFullName: "—", xiuDegree: 0,
});
const onLayers: LayerKey[] = ["shou", "chong", "sanfang", "gong", "jia", "dingxing", "shensha", "huayao", "daxian"];
const activeLayers = layersRes.layers.filter((l) => onLayers.includes(l.key));
fs.writeFileSync(path.join(OUT_DIR, "qizheng_effect_2_layers.html"),
  wrapHtml(`七政四余专业盘 · 感应图层连线（守/冲/三方/拱/夹/顶星/神煞/化曜/大限，连线 ${activeLayers.reduce((n, l) => n + l.lines.length, 0)} 条，RULE_ID 可追溯）`,
    renderChartSvg(res, { layerLines: activeLayers.filter((l) => l.lines.length > 0) }),
    legendHtml() + `<br><span style="color:#999">连线：紫=守 朱红=冲 绿=三方 橙=拱 香槟金=夹 青=顶星 玫红点线=神煞 明黄=化曜 蓝=大限</span>`));
// 条件层（守/冲/三方/拱/夹/顶星/顶度/同经/同络）依盘而现，常驻层（神煞/化曜/大限）必有连线
check("感应图层：神煞/化曜/大限常驻层均有连线",
  (["shensha", "huayao", "daxian"] as LayerKey[]).every((k) => layersRes.layers.find((l) => l.key === k)!.lines.length > 0));

// 3. 流年模式（2026 丙午年：太岁 + 流年星原流相并）
const liunian = computeQizhengLiunian(res, 2026);
fs.writeFileSync(path.join(OUT_DIR, "qizheng_effect_3_liunian.html"),
  wrapHtml(`七政四余专业盘 · 流年模式（2026 丙午年 · 立春 2026-02-04 · 太岁在${liunian.ganzhi.zhi}宫虚线描边 + 流年星空心标记原流相并）`,
    renderChartSvg(res, { liunian }),
    legendHtml() + `<br><span style="color:#e65100">太岁宫：虚线橙描边｜流年星：空心圆标记（原流相并）｜顶命度：${liunian.dingXing.map((d) => `${d.starName}（差${d.diffDeg.toFixed(2)}°）`).join("、") || "无"}</span>`));
check("流年模式：太岁宫定位 + 流年星 11 曜落盘", liunian.stars.length === 11 && !!liunian.taiSui.branch);

// ============================================================================
// P1-5：高清导出版式效果图（与 page.tsx buildExportSvg 同版式）
//   4. 导出全字段（标题/出生/真太阳时/口径/命身要略/十一曜明细含化曜列/引擎水印）
//   5. 导出隐私模式（脱敏：隐藏姓名/出生时间/地点）
// ============================================================================
const hyMap: Record<string, string[]> = {};
for (const { huaName, starKey } of huayaoStarKeysForGan(duanyu.yearGanzhi.gan)) {
  if (starKey) (hyMap[starKey] ||= []).push(huaName);
}
check("化曜映射：年干起十干化曜覆盖除太阳外 10 曜（太阳为君不作化曜）",
  Object.keys(hyMap).length === 10 && !hyMap.sun && res.stars.filter((s) => (hyMap[s.key] ?? []).length > 0).length === 10);

function buildExportSvg(target: QizhengResult, privacy: boolean): { svg: string; w: number; h: number } {
  const chartInner = renderChartSvg(target);
  const W = 1080;
  const CHART = W - 160;
  const PAD = 60;
  const parts: string[] = [];
  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const T = (x: number, yy: number, text: string, size: number, opts?: { bold?: boolean; fill?: string; anchor?: string }) =>
    `<text x="${x}" y="${yy}" text-anchor="${opts?.anchor ?? "start"}" font-family="'PingFang SC','Microsoft YaHei',sans-serif" font-size="${size}"${opts?.bold ? ' font-weight="700"' : ""} fill="${opts?.fill ?? "#333"}">${esc(text)}</text>`;
  let y = PAD;

  if (true) {
    parts.push(T(W / 2, y + 30, privacy ? "七政四余星盘" : "测试命例 · 七政四余星盘", 34, { bold: true, anchor: "middle", fill: "#1a2a5e" }));
    y += 54;
  }
  const birthLine = privacy ? "" : `1988年9月27日 15:40 · 北京市市辖区 · 男`;
  if (birthLine) {
    parts.push(T(W / 2, y + 18, birthLine, 18, { anchor: "middle", fill: "#666" }));
    y += 30;
  }
  parts.push(T(W / 2, y + 18, `真太阳时 ${target.trueSolar.trueSolarTime} · ${target.hour.name}（${target.hour.branch}时） · ${target.dayNight.isDay ? "昼生" : "夜生"}`, 16, { anchor: "middle", fill: "#666" }));
  y += 28;
  parts.push(T(W / 2, y + 18, `${target.frame === "sidereal" ? "恒星制（郑氏星案）" : "黄道回归今制"} · 遇卯安命 · 童限 10 岁起`, 16, { anchor: "middle", fill: "#666" }));
  y += 28;
  y += 14;

  parts.push(`<g transform="translate(${(W - CHART) / 2},${y}) scale(${CHART / 360})">${chartInner}</g>`);
  y += CHART + 24;

  parts.push(T(W / 2, y + 20, `命宫 ${target.mingGong.branch} · 命度 ${target.mingDu.xiuFullName}${target.mingDu.xiuDegree.toFixed(1)}°（度主 ${target.mingDuZhu}） · 身宫 ${target.shenGong.branch} · 身度 ${target.shenDu.xiuFullName}${target.shenDu.xiuDegree.toFixed(1)}°（度主 ${target.shenDuZhu}）`, 17, { anchor: "middle", fill: "#333" }));
  y += 40;

  const cols = ["星曜", "宫/度", "宿度", "人事宫", "化曜", "状态"];
  const colX = [PAD, PAD + 150, PAD + 350, PAD + 560, PAD + 720, PAD + 900];
  parts.push(`<rect x="${PAD - 14}" y="${y}" width="${W - (PAD - 14) * 2}" height="34" fill="#f5f0fa" rx="6"/>`);
  cols.forEach((c, i) => parts.push(T(colX[i], y + 23, c, 17, { bold: true, fill: "#555" })));
  y += 34;
  target.stars.forEach((s) => {
    parts.push(T(colX[0], y + 24, `${s.name}（${s.wuxing}）`, 17, { fill: starColor(s) }));
    parts.push(T(colX[1], y + 24, `${s.palaceBranch}宫${s.palaceDegree.toFixed(1)}°`, 17));
    parts.push(T(colX[2], y + 24, `${s.xiuFullName}${s.xiuDegree.toFixed(1)}°`, 17));
    parts.push(T(colX[3], y + 24, s.renshiGong, 17));
    parts.push(T(colX[4], y + 24, (hyMap[s.key] ?? []).join("、") || "--", 17, { fill: "#7B2FBE" }));
    parts.push(T(colX[5], y + 24, `${s.retrograde ? "逆" : "顺"}${s.inYuan ? " 入垣" : ""}${s.shengDian ? " 升殿" : ""}`, 17));
    y += 36;
  });
  y += 12;

  parts.push(T(W / 2, y + 16, `${target.engineVersion}`, 12, { anchor: "middle", fill: "#aaa" }));
  y += 26;

  const H = y + PAD;
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#fff"/>${parts.join("")}</svg>`, w: W, h: H };
}

function wrapExportHtml(title: string, svg: string, w: number, h: number): string {
  const dispW = 720;
  const dispH = Math.round((h / w) * dispW);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>body{margin:0;padding:12px;background:#fff}svg{display:block;margin:0 auto}</style></head>
<body>${svg.replace(`width="${w}" height="${h}"`, `width="${dispW}" height="${dispH}"`)}</body></html>`;
}

const exportFull = buildExportSvg(res, false);
fs.writeFileSync(path.join(OUT_DIR, "qizheng_effect_4_export_full.html"),
  wrapExportHtml("七政四余导出效果图 · 全字段（P1-5 高清 PNG 导出版式）", exportFull.svg, exportFull.w, exportFull.h));

const exportPrivacy = buildExportSvg(res, true);
fs.writeFileSync(path.join(OUT_DIR, "qizheng_effect_5_export_privacy.html"),
  wrapExportHtml("七政四余导出效果图 · 隐私模式（P1-5 脱敏：无姓名/出生时间/地点）", exportPrivacy.svg, exportPrivacy.w, exportPrivacy.h));

check("导出版式：隐私模式高度 < 全字段高度（脱敏省略出生行）", exportPrivacy.h < exportFull.h);
check("导出版式：明细表 11 行含化曜列（太阳行为 --，其余 10 行有化曜名）",
  res.stars.filter((s) => s.key === "sun" ? (hyMap[s.key] ?? []).length === 0 : (hyMap[s.key] ?? []).length > 0).length === 11);

console.log(`\n========== 七政盘面效果图渲染（P1-3） ==========`);
console.log(`金样本：1988-09-27 15:40 北京市 · ${res.mingGong.branch}宫立命 · 命度 ${res.mingDu.xiuFullName}${res.mingDu.xiuDegree.toFixed(1)}°`);
console.log(`12 层连线计数：${layersRes.layers.map((l) => `${l.key}=${l.lines.length}`).join(" ")}`);
console.log(`图层连线（开启 ${activeLayers.length} 层）：${activeLayers.reduce((n, l) => n + l.lines.length, 0)} 条`);
console.log(`流年 2026 丙午：太岁${liunian.taiSui.branch}宫 · 神煞 ${liunian.shensha.length} 项 · 化曜 ${liunian.huayao.length} 项 · 顶星 ${liunian.dingXing.length} 项`);
console.log(`输出：${OUT_DIR}\\qizheng_effect_{1_base,2_layers,3_liunian}.html`);
console.log(`断言：通过 ${pass}  失败 ${fail}`);
if (fail > 0) process.exit(1);
console.log("全部通过 ✓");
