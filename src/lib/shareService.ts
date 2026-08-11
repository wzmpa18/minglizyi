"use client";

// ============================================================================
// 多平台分享服务 - v20.5
// 支持渠道：微信好友、微信朋友圈、QQ、QQ空间、新浪微博、小红书、复制链接、保存海报
// v20.5: 移除所有AI免费赠送表述，分享不奖励积分，保存海报直接到本地
// ============================================================================

import { SHARE_TEXT, SHARE_COMPLIANCE_TEXT } from "./sharePoster";

const BRAND = "#7B2FBE";
const DOWNLOAD_URL = "https://www.yandao.vip/download";
const APK_DOWNLOAD_URL = "https://www.yandao.vip/app-download/guoxue-chuancheng-v1.0-release.apk";

/** 默认社交媒体分享文案（已移除所有AI免费赠送表述） */
const SHARE_DEFAULT_TEXT = "发现一个实用的传统文化学习平台，排盘工具、典籍知识库都有，分享给你一起看看。";
/** 备选分享文案 */
const SHARE_ALT_TEXT = "一直在用的国学学习工具，基础排盘永久免费，还有同道交流社区，扫码就能下载。";

export type ShareChannel =
  | "wechat_friend"
  | "wechat_moments"
  | "qq"
  | "qzone"
  | "weibo"
  | "xiaohongshu"
  | "copy_link"
  | "save_poster";

export interface ShareParams {
  channel: ShareChannel;
  title: string;
  text: string;
  url: string;
  posterDataUrl?: string; // base64 poster image
  posterSize?: "square" | "vertical" | "xiaohongshu" | "weibo";
}

export interface ShareResult {
  success: boolean;
  message: string;
  rewarded?: boolean;
  rewardAmount?: number;
}

/** 分享渠道配置 */
export const SHARE_CHANNELS: Array<{
  channel: ShareChannel;
  label: string;
  icon: string;
  color: string;
  desc: string;
}> = [
  { channel: "wechat_friend", label: "微信好友", icon: "💬", color: "#09BB07", desc: "发送给微信好友" },
  { channel: "wechat_moments", label: "朋友圈", icon: "📸", color: "#09BB07", desc: "分享到朋友圈" },
  { channel: "qq", label: "QQ好友", icon: "🐧", color: "#12B7F5", desc: "发送给QQ好友" },
  { channel: "qzone", label: "QQ空间", icon: "⭐", color: "#FDBE00", desc: "分享到QQ空间" },
  { channel: "weibo", label: "微博", icon: "🔴", color: "#E6162D", desc: "分享到新浪微博" },
  { channel: "xiaohongshu", label: "小红书", icon: "📕", color: "#FF2442", desc: "保存后到小红书发布" },
  { channel: "copy_link", label: "复制链接", icon: "🔗", color: "#666", desc: "复制分享链接" },
  { channel: "save_poster", label: "保存海报", icon: "💾", color: BRAND, desc: "保存海报到相册" },
];

/**
 * 执行分享
 */
export async function share(params: ShareParams): Promise<ShareResult> {
  const { channel, title, text, url, posterDataUrl } = params;

  try {
    switch (channel) {
      case "wechat_friend":
        return await shareWechat(title, text, url, 0);

      case "wechat_moments":
        return await shareWechat(title, text, url, 1);

      case "qq":
        return await shareQQ(title, text, url, "friend");

      case "qzone":
        return await shareQQ(title, text, url, "qzone");

      case "weibo":
        return await shareWeibo(title, text, url);

      case "xiaohongshu":
        return await shareXiaohongshu(posterDataUrl);

      case "copy_link":
        return await copyLink(url, text);

      case "save_poster":
        return await savePoster(posterDataUrl);

      default:
        return { success: false, message: "不支持的分享渠道" };
    }
  } catch (e) {
    return { success: false, message: "分享失败，请重试" };
  }
}

// ==================== 微信分享 ====================

async function shareWechat(title: string, text: string, url: string, type: number): Promise<ShareResult> {
  // APP端：通过微信SDK分享
  if (typeof window !== "undefined" && (window as any).capacitor) {
    try {
      const { Share } = (window as any).capacitor.Plugins;
      await Share.share({
        title,
        text,
        url,
        dialogTitle: "分享到微信",
      });
      logShareEvent(type === 1 ? "wechat_moments" : "wechat_friend");
      return shareDone();
    } catch {
      // SDK不可用时降级
    }
  }

  // 网页端：引导用户使用微信内置分享
  if (isWechatBrowser()) {
    logShareEvent(type === 1 ? "wechat_moments" : "wechat_friend");
    return {
      success: true,
      message: "请点击右上角「...」→「发送给朋友」或「分享到朋友圈」进行分享",
    };
  }

  logShareEvent(type === 1 ? "wechat_moments" : "wechat_friend");
  return {
    success: true,
    message: "请在微信中打开本页面后使用微信分享，或复制链接发送给好友",
  };
}

// ==================== QQ分享 ====================

async function shareQQ(title: string, text: string, url: string, type: "friend" | "qzone"): Promise<ShareResult> {
  const shareUrl = type === "qzone"
    ? `https://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&summary=${encodeURIComponent(text)}`
    : `https://connect.qq.com/widget/shareqq/index.html?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&desc=${encodeURIComponent(text)}`;

  if (typeof window !== "undefined") {
    window.open(shareUrl, "_blank", "width=600,height=500");
  }

  logShareEvent(type === "qzone" ? "qzone" : "qq");
  return shareDone();
}

// ==================== 微博分享 ====================

async function shareWeibo(title: string, text: string, url: string): Promise<ShareResult> {
  const shareText = `${title} ${text}`;
  const shareUrl = `https://service.weibo.com/share/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(shareText)}&pic=`;

  if (typeof window !== "undefined") {
    window.open(shareUrl, "_blank", "width=600,height=500");
  }

  logShareEvent("weibo");
  return shareDone();
}

// ==================== 小红书分享 ====================

async function shareXiaohongshu(posterDataUrl?: string): Promise<ShareResult> {
  if (posterDataUrl) {
    // 先保存海报到本地
    await savePoster(posterDataUrl);
  }

  logShareEvent("xiaohongshu");
  return {
    success: true,
    message: "海报已保存到相册，请打开小红书APP发布图文笔记",
    rewarded: false,
  };
}

// ==================== 复制链接 ====================

async function copyLink(url: string, text: string): Promise<ShareResult> {
  const fullText = `${text}\n${url}`;

  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(fullText);
      logShareEvent("copy_link");
      return shareDone();
    } catch {
      // 降级
    }
  }

  // 降级方案
  if (typeof document !== "undefined") {
    const textarea = document.createElement("textarea");
    textarea.value = fullText;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      document.body.removeChild(textarea);
      logShareEvent("copy_link");
      return shareDone();
    } catch {
      document.body.removeChild(textarea);
    }
  }

  return { success: false, message: "复制失败，请手动复制链接" };
}

// ==================== 保存海报（直接保存到本地，不跳转浏览器） ====================

async function savePoster(posterDataUrl?: string): Promise<ShareResult> {
  if (!posterDataUrl) {
    return { success: false, message: "海报尚未生成" };
  }

  // 创建下载链接，直接触发保存到本地
  if (typeof document !== "undefined") {
    try {
      const link = document.createElement("a");
      link.download = `言道国学_分享海报_${Date.now()}.png`;
      link.href = posterDataUrl;
      // 不设置 target，避免打开新窗口
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 记录保存到后端统计
      logShareEvent("save_poster");

      return {
        success: true,
        message: "海报已保存到相册",
        rewarded: false,
        rewardAmount: 0,
      };
    } catch (e) {
      return { success: false, message: "保存失败，请开启存储权限后重试" };
    }
  }

  return { success: false, message: "保存失败，请重试" };
}

// ==================== 工具函数 ====================

function isWechatBrowser(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes("micromessenger");
}

/**
 * 记录分享行为到后端统计
 */
async function logShareEvent(channel: string): Promise<void> {
  try {
    if (typeof fetch !== "undefined") {
      const userId = typeof localStorage !== "undefined"
        ? localStorage.getItem("yandao_user_id") || ""
        : "";
      let inviteCode = "";
      try {
        const { getInviteCode } = await import("@/lib/inviteStore");
        inviteCode = getInviteCode(userId);
      } catch {}

      await fetch("/api/share/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, userId, inviteCode }),
      }).catch(() => {});
    }
  } catch {}
}

/**
 * 分享完成后的通用返回（v20.5: 不再奖励积分）
 */
function shareDone(): ShareResult {
  return {
    success: true,
    message: "分享成功",
    rewarded: false,
    rewardAmount: 0,
  };
}

/**
 * 获取默认分享参数（v20.5: 已移除AI免费赠送表述，文案合规）
 */
export function getDefaultShareParams(inviteCode?: string): {
  title: string;
  text: string;
  url: string;
} {
  const url = inviteCode
    ? `${DOWNLOAD_URL}?ref=${encodeURIComponent(inviteCode)}`
    : DOWNLOAD_URL;

  return {
    title: SHARE_TEXT,
    text: `${SHARE_DEFAULT_TEXT}\n${SHARE_COMPLIANCE_TEXT}`,
    url,
  };
}

/**
 * 获取备选分享参数
 */
export function getAltShareParams(inviteCode?: string): {
  title: string;
  text: string;
  url: string;
} {
  const url = inviteCode
    ? `${DOWNLOAD_URL}?ref=${encodeURIComponent(inviteCode)}`
    : DOWNLOAD_URL;

  return {
    title: SHARE_TEXT,
    text: `${SHARE_ALT_TEXT}\n${SHARE_COMPLIANCE_TEXT}`,
    url,
  };
}
