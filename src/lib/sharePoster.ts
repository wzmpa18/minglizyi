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
const DOWNLOAD_URL = "https://yandaoguoxue.yandao.vip/friend";

/** 3个核心价值点（零成本权益，与实际免费范围一致） */
const VALUE_POINTS = [
  { icon: "chart", title: "专业排盘", desc: "八字、紫微、奇门等14款工具，基础排盘永久免费" },
  { icon: "book", title: "典籍学习", desc: "中医经典、易学古籍、方剂经络，免费查阅初级库" },
  { icon: "community", title: "同道交流", desc: "同好社区互动，师父一对一咨询通道" },
];

/** 统一分享文案（已移除所有AI免费赠送表述） */
export const SHARE_TEXT = "国学随身查，典籍全收录！14款专业排盘工具、中医典籍知识库、同好交流学习社区";

/** 备选分享文案 */
export const SHARE_TEXT_ALT = "一直在用的国学学习工具，基础排盘永久免费，还有同道交流社区，扫码就能下载。";

/** 合规分享文案 */
export const SHARE_COMPLIANCE_TEXT = "传统文化学习交流工具";

/** 品牌主体 */
const BRAND_ENTITY = "东莞言道科技有限公司";

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

  // ==================== 顶部品牌标识 ====================
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = `11px "Noto Sans CJK SC", "WenQuanYi Micro Hei", sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(BRAND_ENTITY, w / 2, 22);

  // ==================== 主标题 ====================
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  const titleSize = config.size === "weibo" ? 28 : config.size === "square" ? 32 : 36;
  ctx.font = `bold ${titleSize}px "Noto Sans CJK SC", "WenQuanYi Micro Hei", sans-serif`;
  ctx.fillText("国学随身查，典籍全收录", w / 2, config.size === "weibo" ? 55 : 85);

  // ==================== 副标题 ====================
  const subSize = config.size === "weibo" ? 12 : 15;
  ctx.font = `${subSize}px "Noto Sans CJK SC", "WenQuanYi Micro Hei", sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText("14 款专业排盘工具・中医典籍知识库・同好交流学习社区", w / 2, config.size === "weibo" ? 78 : 118);

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

  // ==================== 福利钩子（零成本权益，无AI赠送） ====================
  const hookY = cardStartY + cardHeight + 25;
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = `bold 14px "Noto Sans CJK SC", "WenQuanYi Micro Hei", sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("新人专享：免费解锁全部基础排盘 + 5 部易学典籍电子版", w / 2, hookY);

  // ==================== 底部二维码区 ====================
  const qrSize = h < 700 ? 100 : 130;
  const qrX = (w - qrSize) / 2;
  const qrY = hookY + 25;

  // 二维码背景 + 官方正版标识
  ctx.fillStyle = "#f9f5fc";
  roundRect(ctx, qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 10);
  ctx.fill();

  // 尝试加载二维码 - 优先调用方传入（本地生成），降级再本地生成（P9：不再依赖境外 qrserver）
  const posterQrData = config.inviteCode
    ? `${DOWNLOAD_URL}?ref=${config.inviteCode}`
    : DOWNLOAD_URL;
  let qrUrl = config.qrCodeUrl || "";
  if (!qrUrl) {
    try {
      const { makeQrDataUrl } = await import("./qrLocal");
      qrUrl = await makeQrDataUrl(posterQrData, { width: qrSize });
    } catch { /* 走占位 */ }
  }
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

  // 官方正版标识
  ctx.fillStyle = BRAND;
  ctx.font = `bold 11px "Noto Sans CJK SC", "WenQuanYi Micro Hei", sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("官方正版・安全下载", w / 2, qrY - 18);

  // 行动指令
  ctx.fillStyle = BRAND;
  ctx.font = `bold 15px "Noto Sans CJK SC", "WenQuanYi Micro Hei", sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("长按识别二维码，立即下载安卓版", w / 2, qrY + qrSize + 32);

  // iOS 提示
  ctx.fillStyle = "#999";
  ctx.font = `12px "Noto Sans CJK SC", "WenQuanYi Micro Hei", sans-serif`;
  ctx.fillText("iOS 版本・暂未开放", w / 2, qrY + qrSize + 52);

  // ==================== 底部合规小字 ====================
  ctx.fillStyle = "#ccc";
  ctx.font = `10px "Noto Sans CJK SC", "WenQuanYi Micro Hei", sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("内容仅供传统文化学习参考，不构成任何决策建议。", w / 2, h - 15);

  // 品牌主体
  ctx.fillStyle = "#bbb";
  ctx.font = `10px "Noto Sans CJK SC", "WenQuanYi Micro Hei", sans-serif`;
  ctx.fillText(BRAND_ENTITY, w / 2, h - 30);

  // 邀请码
  if (config.inviteCode) {
    ctx.fillStyle = "#999";
    ctx.font = `11px "Noto Sans CJK SC", "WenQuanYi Micro Hei", sans-serif`;
    ctx.fillText(`邀请码：${config.inviteCode}`, w / 2, h - 45);
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

  // 福利（零成本权益）
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = 'bold 12px "Noto Sans CJK SC", sans-serif';
  ctx.fillText("新人专享：免费解锁全部基础排盘 + 5 部易学典籍电子版", w / 2, 240);

  // 行动指令
  ctx.fillStyle = BRAND;
  ctx.font = 'bold 11px "Noto Sans CJK SC", sans-serif';
  ctx.fillText("长按识别二维码，立即下载安卓版", w / 2, 260);
  ctx.fillStyle = "#999";
  ctx.font = '10px "Noto Sans CJK SC", sans-serif';
  ctx.fillText("iOS 版本・暂未开放", w / 2, 275);

  // 合规
  ctx.fillStyle = "#ccc";
  ctx.font = '9px "Noto Sans CJK SC", sans-serif';
  ctx.fillText("内容仅供传统文化学习参考，不构成任何决策建议。", w / 2, h - 12);
  ctx.fillStyle = "#bbb";
  ctx.fillText(BRAND_ENTITY, w / 2, h - 24);
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
    case "book":
      // 典籍图标 - 书本
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.5, cy - s * 0.4);
      ctx.lineTo(cx - s * 0.5, cy + s * 0.4);
      ctx.lineTo(cx, cy + s * 0.3);
      ctx.lineTo(cx + s * 0.5, cy + s * 0.4);
      ctx.lineTo(cx + s * 0.5, cy - s * 0.4);
      ctx.lineTo(cx, cy - s * 0.3);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy - s * 0.3);
      ctx.lineTo(cx, cy + s * 0.3);
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
