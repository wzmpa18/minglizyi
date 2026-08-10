"use client";

// ============================================================================
// 分享海报生成器 - v18.4
// 4套模板：个人邀请、学习打卡、工具分享、社群推广
// ============================================================================

export type PosterTemplate = 'invite' | 'study' | 'tool' | 'community';

export interface PosterConfig {
  template: PosterTemplate;
  userId: string;
  userName: string;
  inviteCode: string;
  qrCodeUrl: string;
  extraText?: string;
}

const BRAND = '#7B2FBE';
const BRAND_URL = 'yandao.vip';

// 生成海报 Canvas（返回 base64 data URL）
export async function generatePoster(config: PosterConfig): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  // 背景
  const gradient = ctx.createLinearGradient(0, 0, 0, 1080);
  gradient.addColorStop(0, '#7B2FBE');
  gradient.addColorStop(0.4, '#9B5ECF');
  gradient.addColorStop(0.6, '#f5f0fa');
  gradient.addColorStop(1, '#ffffff');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 600, 1080);

  // 顶部装饰
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath();
  ctx.arc(500, 100, 150, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(80, 200, 80, 0, Math.PI * 2);
  ctx.fill();

  // 标题
  ctx.fillStyle = 'white';
  ctx.font = 'bold 36px "Noto Sans CJK SC", sans-serif';
  ctx.textAlign = 'center';
  const titles: Record<PosterTemplate, string> = {
    invite: '邀你一起学国学',
    study: '今日学习打卡',
    tool: '好工具分享给你',
    community: '加入国学社群',
  };
  ctx.fillText(titles[config.template], 300, 180);

  // 副标题
  ctx.font = '18px "Noto Sans CJK SC", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText('言道国学 · 传承千年智慧', 300, 220);

  // 白色卡片区域
  ctx.fillStyle = 'white';
  ctx.shadowColor = 'rgba(0,0,0,0.1)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 4;
  roundRect(ctx, 40, 270, 520, 380, 16);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // 卡片内文案
  ctx.fillStyle = '#333';
  ctx.font = 'bold 22px "Noto Sans CJK SC", sans-serif';
  ctx.textAlign = 'center';
  const subtitles: Record<PosterTemplate, string> = {
    invite: `${config.userName} 邀请你加入言道国学`,
    study: `${config.userName} 今日已完成国学学习`,
    tool: '命理排盘 · 中医养生 · 经典解读',
    community: '与同道中人一起研习国学',
  };
  ctx.fillText(subtitles[config.template], 300, 360);

  ctx.font = '15px "Noto Sans CJK SC", sans-serif';
  ctx.fillStyle = '#666';
  const descs: Record<PosterTemplate, string> = {
    invite: '扫码下载APP，输入邀请码即可获得新人礼包',
    study: '坚持学习，每天进步一点点',
    tool: '八字排盘、紫微斗数、奇门遁甲等20+工具',
    community: '学习圈、兴趣群、名师讲座',
  };
  ctx.fillText(descs[config.template], 300, 400);

  if (config.extraText) {
    ctx.font = '14px "Noto Sans CJK SC", sans-serif';
    ctx.fillStyle = '#999';
    ctx.fillText(config.extraText, 300, 440);
  }

  // 邀请码
  ctx.fillStyle = BRAND;
  ctx.font = 'bold 28px monospace';
  ctx.fillText(`邀请码：${config.inviteCode}`, 300, 500);

  // 二维码占位
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(225, 540, 150, 150);
  ctx.fillStyle = '#999';
  ctx.font = '12px sans-serif';
  ctx.fillText('扫码加入', 300, 620);

  // 尝试加载二维码图片
  if (config.qrCodeUrl) {
    try {
      const img = await loadImage(config.qrCodeUrl);
      ctx.drawImage(img, 225, 540, 150, 150);
    } catch {}
  }

  // 底部品牌标识
  ctx.fillStyle = BRAND;
  ctx.font = 'bold 16px "Noto Sans CJK SC", sans-serif';
  ctx.fillText('言道国学 yandao.vip', 300, 760);

  ctx.fillStyle = '#999';
  ctx.font = '12px "Noto Sans CJK SC", sans-serif';
  ctx.fillText('分享有礼 · 邀请好友一起学习', 300, 790);

  // ===== 底部下载二维码区域 =====
  // 分隔线
  ctx.strokeStyle = '#e0d0e8';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(100, 820);
  ctx.lineTo(500, 820);
  ctx.stroke();

  // 下载二维码（指向官网下载页）
  const downloadUrl = 'https://www.yandao.vip/download';
  const downloadQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(downloadUrl)}`;

  // 二维码背景框
  ctx.fillStyle = '#f9f5fc';
  roundRect(ctx, 210, 840, 180, 180, 12);
  ctx.fill();

  // 加载并绘制下载二维码
  try {
    const downloadImg = await loadImage(downloadQrUrl);
    ctx.drawImage(downloadImg, 225, 855, 150, 150);
  } catch { /* 二维码加载失败时忽略 */ }

  // 二维码下方文字
  ctx.fillStyle = BRAND;
  ctx.font = 'bold 16px "Noto Sans CJK SC", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('扫码下载言道国学APP', 300, 1050);

  return canvas.toDataURL('image/png', 0.9);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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
