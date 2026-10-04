export type LearningPosterId = "tcm-learning" | "medical-exam";

export const LEARNING_POSTERS: Array<{ id: LearningPosterId; name: string; description: string; baseUrl: string }> = [
  { id: "tcm-learning", name: "中医自学", description: "典籍、经络与方药学习", baseUrl: "/assets/share-posters/01-tcm-learning.png" },
  { id: "medical-exam", name: "医考学习", description: "知识学习与练习入口", baseUrl: "/assets/share-posters/02-medical-exam.png" },
];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("海报素材加载失败"));
    image.src = src;
  });
}

function fitText(ctx: CanvasRenderingContext2D, value: string, maxWidth: number, initialSize: number): number {
  let size = initialSize;
  while (size > 20) {
    ctx.font = `600 ${size}px "PingFang SC","Microsoft YaHei",sans-serif`;
    if (ctx.measureText(value).width <= maxWidth) return size;
    size -= 2;
  }
  return size;
}

/** Uses the delivered 1080×1920 base and the package's fixed QR/name coordinates. */
export async function renderLearningPoster(options: {
  templateId: LearningPosterId;
  qrDataUrl: string;
  inviteLink: string;
  nickname?: string;
  showNickname?: boolean;
}): Promise<string> {
  if (!/^https:\/\//i.test(options.inviteLink)) throw new Error("服务器未返回有效的个人分享链接");
  if (!options.qrDataUrl) throw new Error("个人分享二维码尚未生成");
  const template = LEARNING_POSTERS.find((item) => item.id === options.templateId);
  if (!template) throw new Error("海报模板不存在");
  const [base, qr] = await Promise.all([loadImage(template.baseUrl), loadImage(options.qrDataUrl)]);
  const canvas = document.createElement("canvas");
  canvas.width = 1080; canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("当前设备无法生成海报");
  ctx.drawImage(base, 0, 0, 1080, 1920);

  // Config: x=730 y=1494 w=256 h=256. Keep a white quiet zone for reliable decoding.
  ctx.fillStyle = "#fff";
  ctx.fillRect(722, 1486, 272, 272);
  ctx.drawImage(qr, 730, 1494, 256, 256);

  if (options.showNickname && options.nickname?.trim()) {
    const text = `${options.nickname.trim()} 分享`;
    const size = fitText(ctx, text, 580, 32);
    ctx.font = `600 ${size}px "PingFang SC","Microsoft YaHei",sans-serif`;
    ctx.fillStyle = "#5b4634";
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText(text, 92, 1733 + 21.5, 580);
  }
  return canvas.toDataURL("image/png", 0.94);
}
