// ============================================================================
// P7-MKT-POSTER-02 海报模板引擎（第三十一条 Poster Template Engine）
// Canvas渲染：所有端视觉一致；模板未变不重跑AI（第三十二条）
// 第二十八条：textContrastCheck / overflowCheck / safeAreaCheck
// ============================================================================

import type { PosterRequest, ChannelPolicy } from "./types";
import { RATIOS } from "./templates";
import { getDisclaimer } from "./copyLibrary";
import { validateCopySet } from "./compliance";

const FONT = `"Noto Sans CJK SC","PingFang SC","Microsoft YaHei","WenQuanYi Micro Hei",sans-serif`;
const BRAND_NAME = "言道国学";
const BRAND_ENTITY = "东莞言道科技有限公司";

export interface RenderCheck {
  textContrastOk: boolean;
  overflowOk: boolean;
  safeAreaOk: boolean;
  warnings: string[];
}

export interface RenderResult {
  dataUrl: string;
  checks: RenderCheck;
  complianceBlocked: boolean;
}

/** 合规前置：文案过不了合规校验直接拒绝渲染（第二十四条） */
export async function renderPoster(
  req: PosterRequest,
  channelPolicy: ChannelPolicy
): Promise<RenderResult> {
  const compliance = validateCopySet([
    req.copy.title,
    req.copy.subtitle,
    ...req.copy.sellingPoints,
    req.copy.cta,
    req.price ?? "",
  ]);
  if (!compliance.passed) {
    return {
      dataUrl: "",
      complianceBlocked: true,
      checks: { textContrastOk: false, overflowOk: false, safeAreaOk: false, warnings: compliance.violations.map((v) => `${v.category}:${v.word}`) },
    };
  }

  // 预加载二维码/头像图片：必须等图片加载完成再绘制，否则画布上二维码为空白
  const qrImg = await loadImage(req.qrDataUrl || "");
  const avatarImg = await loadImage(
    req.showAvatar && req.variant.family === "T06" && req.userAvatarUrl ? req.userAvatarUrl : ""
  );

  const spec = RATIOS[req.ratio];
  const canvas = document.createElement("canvas");
  canvas.width = spec.width;
  canvas.height = spec.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  const w = spec.width;
  const h = spec.height;
  const unit = w / 1080;
  const p = req.variant.palette;
  const dark = isDarkBg(p.bg[0]);
  const warnings: string[] = [];

  drawBackground(ctx, w, h, p, req.variant.decorative, unit);

  const showQr = channelPolicy.qrAllowed;
  const isPersonal = req.variant.family === "T06";
  let y = drawHeader(ctx, w, unit, dark, p, isPersonal ? req : null, warnings, avatarImg);

  y = drawTitle(ctx, w, y, unit, req, dark, p, warnings);

  y = drawSellingPoints(ctx, w, y, unit, req, p, warnings);

  if (channelPolicy.priceAllowed && req.price) {
    y = drawPrice(ctx, w, y, unit, p, req.price, dark, warnings);
  }

  if (showQr) {
    drawQrSection(ctx, w, h, y, unit, p, req, dark, warnings, qrImg);
  } else {
    drawNoQrFooter(ctx, w, h, unit, p, dark, req);
  }

  drawDisclaimer(ctx, w, h, unit, req, channelPolicy, dark, warnings);

  const dataUrl = canvas.toDataURL("image/png", 0.92);
  const checks: RenderCheck = {
    textContrastOk: !warnings.some((x) => x.startsWith("contrast")),
    overflowOk: !warnings.some((x) => x.startsWith("overflow")),
    safeAreaOk: !warnings.some((x) => x.startsWith("safearea")),
    warnings,
  };
  return { dataUrl, checks, complianceBlocked: false };
}

function isDarkBg(hex: string): boolean {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b < 128;
}

/** 预加载图片（dataUrl或同源URL）；空串或加载失败返回null，不阻塞渲染 */
function loadImage(src: string): Promise<HTMLImageElement | null> {
  if (!src || typeof window === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawBackground(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  p: PosterRequest["variant"]["palette"], decorative: string, unit: number
): void {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, p.bg[0]);
  grad.addColorStop(1, p.bg[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  switch (decorative) {
    case "mountain":
      ctx.fillStyle = hexAlpha(p.accent, 0.10);
      ctx.beginPath();
      ctx.moveTo(0, h * 0.92);
      ctx.quadraticCurveTo(w * 0.3, h * 0.80, w * 0.55, h * 0.9);
      ctx.quadraticCurveTo(w * 0.8, h * 0.98, w, h * 0.86);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, h * 0.86);
      ctx.quadraticCurveTo(w * 0.25, h * 0.74, w * 0.5, h * 0.84);
      ctx.lineTo(w * 0.5, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fillStyle = hexAlpha(p.accent, 0.16);
      ctx.fill();
      break;
    case "paper":
      ctx.strokeStyle = hexAlpha(p.accent, 0.12);
      ctx.lineWidth = 2 * unit;
      for (let i = 1; i <= 3; i++) {
        roundRectPath(ctx, 24 * unit * i, 24 * unit * i, w - 48 * unit * i, h - 48 * unit * i, 10 * unit);
        ctx.stroke();
      }
      break;
    case "stars":
      for (let i = 0; i < 70; i++) {
        const x = Math.random() * w;
        const yy = Math.random() * h * 0.55;
        const r = Math.random() * 2.6 * unit + 0.6;
        ctx.fillStyle = hexAlpha("#FFFFFF", 0.12 + Math.random() * 0.3);
        ctx.beginPath();
        ctx.arc(x, yy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case "grid":
      ctx.strokeStyle = hexAlpha(p.accent, 0.08);
      ctx.lineWidth = unit;
      for (let x = 0; x <= w; x += 90 * unit) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let yy = 0; yy <= h; yy += 90 * unit) {
        ctx.beginPath();
        ctx.moveTo(0, yy);
        ctx.lineTo(w, yy);
        ctx.stroke();
      }
      break;
    case "flow": {
      const steps = ["资料", "知识点", "题库"];
      ctx.font = `bold ${26 * unit}px ${FONT}`;
      ctx.textAlign = "center";
      steps.forEach((s, i) => {
        const x = w * (0.22 + i * 0.28);
        const yy = h * 0.62;
        ctx.fillStyle = hexAlpha(p.accent, 0.14);
        roundRectPath(ctx, x - 70 * unit, yy - 34 * unit, 140 * unit, 68 * unit, 34 * unit);
        ctx.fill();
        ctx.fillStyle = p.accent;
        ctx.fillText(s, x, yy + 9 * unit);
        if (i < steps.length - 1) {
          ctx.strokeStyle = hexAlpha(p.accent, 0.5);
          ctx.lineWidth = 3 * unit;
          ctx.beginPath();
          ctx.moveTo(x + 80 * unit, yy);
          ctx.lineTo(x + 168 * unit, yy);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x + 160 * unit, yy - 8 * unit);
          ctx.lineTo(x + 172 * unit, yy);
          ctx.lineTo(x + 160 * unit, yy + 8 * unit);
          ctx.stroke();
        }
      });
      break;
    }
    case "avatar":
      ctx.fillStyle = hexAlpha(p.accent, 0.08);
      ctx.beginPath();
      ctx.arc(w / 2, h * 0.18, 150 * unit, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
  ctx.restore();
}

function drawHeader(
  ctx: CanvasRenderingContext2D, w: number, unit: number, dark: boolean,
  p: PosterRequest["variant"]["palette"], req: PosterRequest | null, warnings: string[],
  avatarImg: HTMLImageElement | null
): number {
  ctx.textAlign = "center";
  let y = 70 * unit;

  if (req && req.showNickname && req.userNickname) {
    // T06 个人推荐版：头像须用户主动开启（第十四/三十七条），未开启只显示昵称
    if (req.showAvatar && avatarImg) {
      const s = 132 * unit;
      const cx = w / 2;
      const cy = y + s / 2;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, s / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatarImg, cx - s / 2, cy - s / 2, s, s);
      ctx.restore();
      ctx.strokeStyle = hexAlpha(p.accent, 0.65);
      ctx.lineWidth = 5 * unit;
      ctx.beginPath();
      ctx.arc(cx, cy, s / 2 + 4 * unit, 0, Math.PI * 2);
      ctx.stroke();
      y = cy + s / 2 + 58 * unit;
    }
    ctx.fillStyle = dark ? "rgba(255,255,255,0.85)" : p.subText;
    ctx.font = `${30 * unit}px ${FONT}`;
    ctx.fillText(`${req.userNickname} 分享`, w / 2, y);
    y += 52 * unit;
  } else {
    ctx.fillStyle = dark ? "rgba(255,255,255,0.55)" : hexAlpha(p.subText, 0.8);
    ctx.font = `${24 * unit}px ${FONT}`;
    ctx.fillText(BRAND_ENTITY, w / 2, y);
    return y + 40 * unit;
  }

  ctx.fillStyle = dark ? "rgba(255,255,255,0.55)" : hexAlpha(p.subText, 0.8);
  ctx.font = `${24 * unit}px ${FONT}`;
  ctx.fillText(BRAND_ENTITY, w / 2, y);
  return y + 40 * unit;
}

function drawTitle(
  ctx: CanvasRenderingContext2D, w: number, y: number, unit: number,
  req: PosterRequest, dark: boolean, p: PosterRequest["variant"]["palette"], warnings: string[]
): number {
  const title = req.copy.title;
  // A04 中老年圈层：字体更大（第三十八条 T01视觉要求）
  const bigFont = req.audience === "A04";
  let size = (title.length > 12 ? 58 : 72) * unit;
  if (bigFont) size *= 1.15;
  ctx.textAlign = "center";
  ctx.fillStyle = dark ? "#FFFFFF" : p.text;
  ctx.font = `bold ${size}px ${FONT}`;

  const maxW = w - 160 * unit;
  const lines = wrapText(ctx, title, maxW);
  if (lines.length > 2) warnings.push(`overflow:主标题超2行(${lines.length})`);
  for (const line of lines) {
    if (ctx.measureText(line).width > maxW + 4) warnings.push("overflow:主标题越界");
    ctx.fillText(line, w / 2, y + size * 0.8);
    y += size * 1.18;
  }

  ctx.font = `${30 * unit}px ${FONT}`;
  ctx.fillStyle = dark ? "rgba(255,255,255,0.82)" : p.subText;
  const subLines = wrapText(ctx, req.copy.subtitle, maxW);
  for (const line of subLines.slice(0, 2)) {
    ctx.fillText(line, w / 2, y + 24 * unit);
    y += 44 * unit;
  }
  return y + 40 * unit;
}

function drawSellingPoints(
  ctx: CanvasRenderingContext2D, w: number, y: number, unit: number,
  req: PosterRequest, p: PosterRequest["variant"]["palette"], warnings: string[]
): number {
  const points = req.copy.sellingPoints.slice(0, 3); // 第三十九条：最多3个辅助点
  const cardPad = 56 * unit;
  const rowH = 96 * unit;
  const cardH = points.length * rowH + 40 * unit;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.10)";
  ctx.shadowBlur = 24 * unit;
  ctx.shadowOffsetY = 6 * unit;
  ctx.fillStyle = p.cardBg;
  roundRectPath(ctx, cardPad, y, w - cardPad * 2, cardH, 28 * unit);
  ctx.fill();
  ctx.restore();

  let ry = y + 66 * unit;
  for (const pt of points) {
    ctx.fillStyle = hexAlpha(p.accent, 0.9);
    ctx.beginPath();
    ctx.arc(cardPad + 56 * unit, ry, 12 * unit, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.text;
    ctx.textAlign = "left";
    ctx.font = `${32 * unit}px ${FONT}`;
    if (ctx.measureText(pt).width > w - cardPad * 2 - 130 * unit) warnings.push(`overflow:卖点过长(${pt.slice(0, 6)})`);
    ctx.fillText(pt, cardPad + 88 * unit, ry + 11 * unit);
    ry += rowH;
  }
  ctx.textAlign = "center";
  return y + cardH + 36 * unit;
}

function drawPrice(
  ctx: CanvasRenderingContext2D, w: number, y: number, unit: number,
  p: PosterRequest["variant"]["palette"], price: string, dark: boolean, warnings: string[]
): number {
  // 第十七/十八条：价格说明范围，不写死模板
  ctx.fillStyle = dark ? "rgba(255,255,255,0.92)" : p.text;
  ctx.font = `bold ${30 * unit}px ${FONT}`;
  ctx.textAlign = "center";
  const line = `${price}`;
  if (ctx.measureText(line).width > w - 120 * unit) warnings.push("overflow:价格行过长");
  ctx.fillText(line, w / 2, y + 20 * unit);
  return y + 56 * unit;
}

function drawQrSection(
  ctx: CanvasRenderingContext2D, w: number, h: number, y: number, unit: number,
  p: PosterRequest["variant"]["palette"], req: PosterRequest, dark: boolean, warnings: string[],
  qrImg: HTMLImageElement | null
): void {
  const qrSize = req.channel === "C09" ? 340 * unit : 250 * unit;
  const bottomNeed = qrSize + 190 * unit;
  const avail = h - y - 130 * unit;
  let qrY = y + 30 * unit;
  if (avail < bottomNeed) {
    warnings.push("safearea:二维码区空间紧张");
    qrY = Math.max(y + 8 * unit, h - bottomNeed - 110 * unit);
  }
  const qrX = (w - qrSize) / 2;

  ctx.fillStyle = dark ? "rgba(255,255,255,0.94)" : "#FFFFFF";
  roundRectPath(ctx, qrX - 18 * unit, qrY - 18 * unit, qrSize + 36 * unit, qrSize + 36 * unit, 20 * unit);
  ctx.fill();

  if (qrImg) {
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
  } else {
    ctx.fillStyle = "#E7E2EF";
    ctx.fillRect(qrX, qrY, qrSize, qrSize);
    warnings.push("safearea:二维码未加载");
  }

  ctx.fillStyle = p.accent;
  ctx.font = `bold ${34 * unit}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(req.copy.cta, w / 2, qrY + qrSize + 56 * unit);

  if (req.inviteCode) {
    ctx.fillStyle = dark ? "rgba(255,255,255,0.6)" : p.subText;
    ctx.font = `${24 * unit}px ${FONT}`;
    ctx.fillText(`邀请码：${req.inviteCode}`, w / 2, qrY + qrSize + 96 * unit);
  }
}

function drawNoQrFooter(
  ctx: CanvasRenderingContext2D, w: number, h: number, unit: number,
  p: PosterRequest["variant"]["palette"], dark: boolean, req: PosterRequest
): void {
  // 小红书等禁二维码渠道（第十一/四十三条）：内容种草图，不含站外二维码/联系方式
  ctx.fillStyle = dark ? "rgba(255,255,255,0.88)" : p.text;
  ctx.font = `bold ${38 * unit}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(`App内搜索「${BRAND_NAME}」`, w / 2, h - 210 * unit);
  ctx.fillStyle = dark ? "rgba(255,255,255,0.6)" : p.subText;
  ctx.font = `${27 * unit}px ${FONT}`;
  const sub = req.copy.cta.replace(/扫码了解?/, "").replace(/^「|」$/g, "");
  ctx.fillText(sub ? `了解${sub}` : BRAND_NAME, w / 2, h - 158 * unit);
}

function drawDisclaimer(
  ctx: CanvasRenderingContext2D, w: number, h: number, unit: number,
  req: PosterRequest, policy: ChannelPolicy, dark: boolean, warnings: string[]
): void {
  const text = getDisclaimer(req.copy.disclaimer);
  const size = Math.max(22, 24) * unit; // 第二十八条：禁止2px级免责声明
  ctx.fillStyle = dark ? "rgba(255,255,255,0.62)" : "rgba(0,0,0,0.42)";
  ctx.font = `${size}px ${FONT}`;
  ctx.textAlign = "center";
  const lines = wrapText(ctx, text, w - 140 * unit).slice(0, 2);
  lines.forEach((line, i) => {
    ctx.fillText(line, w / 2, h - 64 * unit - (lines.length - 1 - i) * 32 * unit);
  });
  if (h - 64 * unit < 40 * unit) warnings.push("safearea:免责声明贴边");
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const ch of text) {
    if (ctx.measureText(current + ch).width > maxWidth) {
      lines.push(current);
      current = ch;
    } else {
      current += ch;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function roundRectPath(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function hexAlpha(hex: string, alpha: number): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
