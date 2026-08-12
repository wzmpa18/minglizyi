"use client";

// ============================================================================
// 海报 DOM 转图片工具
// 基于 html2canvas-pro（支持 oklch / Tailwind v4 颜色函数）
// 解决跨域二维码图片导致 canvas 污染的问题：先预加载为 dataURL
// ============================================================================

import type {} from "html2canvas-pro";

/**
 * 将外部图片 URL 预加载为 data URL，避免 canvas 跨域污染
 */
export async function preloadImageAsDataUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) throw new Error("fetch failed");
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(url); // fallback to original URL
      reader.readAsDataURL(blob);
    });
  } catch {
    // fetch 失败，尝试通过 Image + canvas 方式
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || 300;
          canvas.height = img.naturalHeight || 300;
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(url);
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        } catch {
          resolve(url);
        }
      };
      img.onerror = () => resolve(url);
      img.src = url;
    });
  }
}

/**
 * 将 DOM 元素转为高清图片 data URL
 * @param element 要截取的 DOM 元素
 * @param scale 缩放倍率，默认 2（375px 宽 → 750px 输出）
 * @returns data URL 字符串
 */
export async function captureDomToDataUrl(
  element: HTMLElement,
  scale: number = 2
): Promise<string> {
  const html2canvas = (await import("html2canvas-pro")).default;

  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: false,
    backgroundColor: "#ffffff",
    logging: false,
    width: element.offsetWidth,
    height: element.scrollHeight,
    windowWidth: element.offsetWidth,
    removeContainer: true,
  });

  return canvas.toDataURL("image/png", 1.0);
}

/**
 * 完整的海报保存流程：DOM 截图 → data URL → 保存到本地
 * 不跳转浏览器，优先使用 Web Share API
 */
export async function captureAndSavePoster(
  element: HTMLElement,
  fileName: string,
  scale: number = 2
): Promise<{ success: boolean; message: string }> {
  try {
    const dataUrl = await captureDomToDataUrl(element, scale);

    // 将 dataUrl 转为 Blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    // 优先 Web Share API（移动端原生分享面板）
    if (navigator.share && navigator.canShare) {
      const file = new File([blob], fileName, { type: "image/png" });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: "保存海报",
            text: "长按图片可保存到相册",
          });
          return { success: true, message: "海报已保存到相册" };
        } catch (shareErr: any) {
          if (shareErr?.name === "AbortError") {
            return { success: true, message: "已取消" };
          }
        }
      }
    }

    // Blob URL + <a download>
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = fileName;
    link.href = blobUrl;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);

    return { success: true, message: "海报已保存，若未自动下载请长按图片保存" };
  } catch (err) {
    console.error("海报截图失败:", err);
    return { success: false, message: "保存失败，请截图保存" };
  }
}
