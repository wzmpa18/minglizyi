"use client";

// ============================================================================
// 图片保存工具 - 兼容移动端 WebView / 浏览器
// 解决 <a download> 跨域无效导致跳转浏览器的问题
// 策略：fetch blob → Web Share API → blob URL download → canvas fallback
// ============================================================================

/**
 * 从 URL 下载图片并保存到本地（不跳转浏览器）
 * @param imageUrl 图片URL（可以是跨域的二维码API等）
 * @param fileName 保存的文件名
 * @returns 保存结果
 */
export async function saveImageFromUrl(
  imageUrl: string,
  fileName: string = `yandao_${Date.now()}.png`
): Promise<{ success: boolean; message: string }> {
  if (typeof document === "undefined") {
    return { success: false, message: "环境不支持" };
  }

  try {
    // Step 1: fetch 图片为 Blob
    const response = await fetch(imageUrl, { mode: "cors" });
    if (!response.ok) throw new Error("图片加载失败");
    const blob = await response.blob();

    // Step 2: 优先尝试 Web Share API（移动端原生分享面板，可直接保存到相册）
    if (navigator.share && navigator.canShare) {
      const file = new File([blob], fileName, { type: blob.type || "image/png" });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: "保存图片",
            text: "长按图片可保存到相册",
          });
          return { success: true, message: "图片已保存到相册" };
        } catch (shareErr: any) {
          // 用户取消分享，不报错继续走 fallback
          if (shareErr?.name === "AbortError") {
            return { success: true, message: "已取消" };
          }
        }
      }
    }

    // Step 3: Blob URL + <a download>（比直接用外部URL更可靠）
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = fileName;
    link.href = blobUrl;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);

    return { success: true, message: "图片已保存，若未自动下载请长按图片保存" };
  } catch (fetchErr) {
    // Step 4: fetch 失败（CORS等），尝试用 canvas 方式
    try {
      const dataUrl = await imageToDataUrl(imageUrl);
      if (dataUrl) {
        const link = document.createElement("a");
        link.download = fileName;
        link.href = dataUrl;
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return { success: true, message: "图片已保存到相册" };
      }
    } catch {}

    // Step 5: 最终兜底 - 在新窗口打开图片，提示用户长按保存
    return {
      success: false,
      message: "自动保存失败，请长按图片选择「保存到相册」",
    };
  }
}

/**
 * 将图片 URL 转为 data URL（通过 canvas）
 */
async function imageToDataUrl(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || 300;
        canvas.height = img.naturalHeight || 300;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * 保存 Canvas 生成的 data URL 到本地
 * @param dataUrl Canvas 的 data URL
 * @param fileName 文件名
 */
export async function saveDataUrl(
  dataUrl: string,
  fileName: string = `yandao_${Date.now()}.png`
): Promise<{ success: boolean; message: string }> {
  if (typeof document === "undefined") {
    return { success: false, message: "环境不支持" };
  }

  try {
    // Step 1: data URL → Blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    // Step 2: Web Share API
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

    // Step 3: Blob URL download
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = fileName;
    link.href = blobUrl;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);

    return { success: true, message: "海报已保存，若未自动下载请长按图片保存" };
  } catch {
    // Step 4: 直接用 data URL 下载
    try {
      const link = document.createElement("a");
      link.download = fileName;
      link.href = dataUrl;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return { success: true, message: "海报已保存到相册" };
    } catch {
      return { success: false, message: "保存失败，请截图保存" };
    }
  }
}
