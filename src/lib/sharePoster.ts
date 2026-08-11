"use client";

// ============================================================================
// 分享海报生成器 - v20.4
// 价值直击式海报，转化导向
// 4种尺寸：1:1(朋友圈) / 9:16(聊天/APP) / 3:4(小红书) / 16:9(微博)
// ============================================================================

export type PosterSize = "square" | "vertical" | "xiaohongshu" | "weibo";

export interface PosterConfig {
  size: PosterSize;
  userId?: string;
  userName?: string;
  inviteCode?: string;
  qrCodeUrl?: string;
}

interface SizeConfig {
  width: number;
  height: number;
  label: string;
  desc: string;
}

export const POSTER_SIZES: Record<PosterSize, SizeConfig> = {
  square: { width: 600, height: 600, label: "1:1 方形", desc: "微信朋友圈" },
  vertical: { width: 600, height: 1080, label: "9:16 竖版", desc: "微信聊天/APP分享" },
  xiaohongshu: { width: 600, height: 800, label: "3:4 竖版", desc: "小红书" },
  weibo: { width: 600, height: 338, label: "16:9 横版", desc: "微博" },
};

const BRAND = "#7B2FBE";
const BRAND_LIGHT = "#9B5ECF";
const BRAND_URL = "yandao.vip";
const DOWNLOAD_URL = "https://www.yandao.vip/download";

/** 3个核心价值点 */
const VALUE_POINTS = [
  { icon: "chart", title: "专业排盘", desc: "八字紫微奇门，一键精准排盘" },
  { icon: "ai", title: "AI解读", desc: "多流派思路，传统文化深度参考" },
  { icon: "community", title: "同道交流", desc: "同好交流学习，师父一对一咨询" },
];

/** 统一分享文案 */
export const SHARE_TEXT = "国学随身查，AI深度解！14款专业排盘、名家中医问诊、同道交流学习，新人注册赠3次AI解读";

/** 合规分享文案 */
export const SHARE_COMPLIANCE_TEXT = "传统文化学习交流工具";

/**
 * 生成海报（返回 base64 data URL）
 */
export async function generatePoster(config: PosterConfig): Promise<string> {
  const sizeConfig = POSTER_SIZES[config.size];
  const canvas = document.createElement("canvas");
  canvas.width = sizeConfig.width;
  canvas.height = sizeConfig.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  const w = sizeConfig.width;
  const h = sizeConfig.height;

  // ==================== 背景渐变 ====================
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, BRAND);
  gradient.addColorStop(0.35, BRAND_LIGHT);
  gradient.addColorStop(0.5, "#f5f0fa");
  gradient.addColorStop(1, "#ffffff");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  // ==================== 顶部装饰圆 ====================
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  ctx.arc(w - 50, 60, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(40, 120, 60, 0, Math.PI * 2);
  ctx.fill();

  // ==================== 主标题 ====================
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  const titleSize = config.size === "weibo" ? 28 : config.size === "square" ? 32 : 36;
  ctx.font = `bold ${titleSize}px "Noto Sans CJK SC", "WenQuanYi Micro Hei", sans-serif`;
  ctx.fillText("国学随身查，AI深度解", w / 2, config.size === "weibo" ? 50 : 80);

  // ==================== 副标题 ====================
  const subSize = config.size === "weibo" ? 13 : 16;
  ctx.font = `${subSize}px "Noto Sans CJK SC", "WenQuanYi Micro Hei", sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillText("14款专业排盘 · 名家中医问诊 · 同道交流学习", w / 2, config.size === "weibo" ? 78 : 115);

  // 微博横版特殊布局
  if (config.size === "weibo") {
    drawWeiboLayout(ctx, w, h, config);
    return canvas.toDataURL("image/png", 0.9);
  }

  // ==================== 中部：3个核心价值点 ====================
  const cardStartY = h < 700 ? 150 : 180;
  const cardHeight = h < 700 ? 240 : 320;
  const cardPadding = 30;

  // 白色卡片背景
  ctx.fillStyle = "white";
  ctx.shadowColor = "rgba(0,0,0,0.08)";
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 3;
  roundRect(ctx, cardPadding, cardStartY, w - cardPadding * 2, cardHeight, 16);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // 3个价值点
  const valueStartY = cardStartY + 35;
  const valueSpacing = h < 700 ? 70 : 90;

  VALUE_POINTS.forEach((vp, i) => {
    const y = valueStartY + i * valueSpacing;

    // 图标背景圆
    const iconX = cardPadding + 35;
    ctx.fillStyle = `${BRAND}15`;
    ctx.beginPath();
    ctx.arc(iconX, y, 22, 0, Math.PI * 2);
    ctx.fill();

    // 绘制图标
    drawValueIcon(ctx, vp.icon, iconX, y, 22);

    // 标题
    ctx.fillStyle = "#333";
    ctx.font = `bold 17px "Noto Sans CJK SC", "WenQuanYi Micro Hei", sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText(vp.title, iconX + 35, y - 3);

    // 描述
    ctx.fillStyle = "#888";
    ctx.font = `13px "Noto Sans CJK SC", "WenQuanYi Micro Hei", sans-serif`;
    ctx.fillText(vp.desc, iconX + 35, y + 16);
  });

  // ==================== 福利钩子 ====================
  const hookY = cardStartY + cardHeight + 30;
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = `bold 15px "Noto Sans CJK SC", "WenQuanYi Micro Hei", sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("新人注册赠 3 次 AI 解读", w / 2, hookY);

  // ==================== 底部二维码区 ====================
  const qrSize = h < 700 ? 100 : 130;
  const qrX = (w - qrSize) / 2;
  const qrY = hookY + 25;

  // 二维码背景
  ctx.fillStyle = "#f9f5fc";
  roundRect(ctx, qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 10);
  ctx.fill();

  // 尝试加载二维码
  const qrUrl = config.qrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(DOWNLOAD_URL)}`;
  try {
    const img = await loadImage(qrUrl);
    ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
  } catch {
    // 占位
    ctx.fillStyle = "#e0d0e8";
    ctx.fillRect(qrX, qrY, qrSize, qrSize);
    ctx.fillStyle = BRAND;
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("二维码", w / 2, qrY + qrSize / 2);
  }

  // 扫码引导文案
  ctx.fillStyle = BRAND;
  ctx.font = `bold 16px "Noto Sans CJK SC", "WenQuanYi Micro Hei", sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("长按扫码 免费体验", w / 2, qrY + qrSize + 35);

  // ==================== 底部合规小字 ====================
  ctx.fillStyle = "#ccc";
  ctx.font = `10px "Noto Sans CJK SC", "WenQuanYi Micro Hei", sans-serif`;
  ctx.fillText("内容仅供传统文化学习参考，不构成任何决策建议", w / 2, h - 20);

  // 品牌标识
  if (config.inviteCode) {
    ctx.fillStyle = "#999";
    ctx.font = `12px "Noto Sans CJK SC", "WenQuanYi Micro Hei", sans-serif`;
    ctx.fillText(`邀请码：${config.inviteCode}`, w / 2, h - 40);
  }

  return canvas.toDataURL("image/png", 0.9);
}

/**
 * 微博横版特殊布局
 */
function drawWeiboLayout(ctx: CanvasRenderingContext2D, w: number, h: number, config: PosterConfig): void {
  // 左侧价值点
  const valueStartX = 30;
  const valueStartY = 120;
  const colWidth = 160;

  VALUE_POINTS.forEach((vp, i) => {
    const x = valueStartX + (i % 3) * colWidth;
    const y = valueStartY;

    ctx.fillStyle = `${BRAND}15`;
    ctx.beginPath();
    ctx.arc(x + 15, y, 18, 0, Math.PI * 2);
    ctx.fill();

    drawValueIcon(ctx, vp.icon, x + 15, y, 18);

    ctx.fillStyle = "#333";
    ctx.font = 'bold 13px "Noto Sans CJK SC", sans-serif';
    ctx.textAlign = "left";
    ctx.fillText(vp.title, x + 40, y - 2);

    ctx.fillStyle = "#888";
    ctx.font = '10px "Noto Sans CJK SC", sans-serif';
    ctx.fillText(vp.desc, x + 40, y + 14);
  });

  // 右侧二维码
  const qrSize = 80;
  const qrX = w - qrSize - 30;
  const qrY = 100;

  ctx.fillStyle = "#f9f5fc";
  roundRect(ctx, qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 8);
  ctx.fill();

  // 二维码占位
  ctx.fillStyle = "#e0d0e8";
  ctx.fillRect(qrX, qrY, qrSize, qrSize);

  // 扫码文案
  ctx.fillStyle = BRAND;
  ctx.font = 'bold 12px "Noto Sans CJK SC", sans-serif';
  ctx.textAlign = "center";
  ctx.fillText("扫码体验", qrX + qrSize / 2, qrY + qrSize + 20);

  // 福利
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = 'bold 12px "Noto Sans CJK SC", sans-serif';
  ctx.fillText("新人注册赠3次AI解读", w / 2, 240);

  // 合规
  ctx.fillStyle = "#ccc";
  ctx.font = '9px "Noto Sans CJK SC", sans-serif';
  ctx.fillText("内容仅供传统文化学习参考，不构成任何决策建议", w / 2, h - 12);
}

/**
 * 绘制价值点图标
 */
function drawValueIcon(ctx: CanvasRenderingContext2D, type: string, cx: number, cy: number, size: number): void {
  ctx.strokeStyle = BRAND;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const s = size * 0.5;

  switch (type) {
    case "chart":
      // 排盘图标 - 圆形+十字
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.5, cy);
      ctx.lineTo(cx + s * 0.5, cy);
      ctx.moveTo(cx, cy - s * 0.5);
      ctx.lineTo(cx, cy + s * 0.5);
      ctx.stroke();
      break;
    case "ai":
      // AI图标 - 闪电
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.2, cy - s * 0.6);
      ctx.lineTo(cx + s * 0.3, cy - s * 0.1);
      ctx.lineTo(cx, cy - s * 0.1);
      ctx.lineTo(cx + s * 0.2, cy + s * 0.6);
      ctx.lineTo(cx - s * 0.3, cy + s * 0.1);
      ctx.lineTo(cx, cy + s * 0.1);
      ctx.closePath();
      ctx.stroke();
      break;
    case "community":
      // 社区图标 - 对话气泡
      ctx.beginPath();
      ctx.roundRect(cx - s * 0.5, cy - s * 0.4, s, s * 0.6, 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.2, cy + s * 0.2);
      ctx.lineTo(cx - s * 0.3, cy + s * 0.4);
      ctx.lineTo(cx, cy + s * 0.2);
      ctx.stroke();
      break;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
