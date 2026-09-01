"use client";

import { useEffect } from "react";

/**
 * 微信服务号身份识别 - v25.0.75
 *
 * 机制（指令书第十三~二十章）：
 * 1. 微信内置浏览器访问网页版时，静默走服务号网页 OAuth（snsapi_base，无感授权）
 * 2. 回调写入 woa_identity 签名 Cookie（HttpOnly，服务端签发），不自动创建账号
 * 3. 非微信浏览器 / 原生APP壳 / 已识别（或本会话已尝试过）完全不动作
 * 4. 静默失败：OAuth 未配置或网络异常不影响正常浏览
 */
export default function WechatOaIdentityInit() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = navigator.userAgent || "";
    if (!ua.includes("MicroMessenger")) return; // 非微信浏览器
    try {
      const cap = window.Capacitor as { isNativePlatform?: () => boolean } | undefined;
      if (cap && typeof cap.isNativePlatform === "function" && cap.isNativePlatform()) return; // 原生APP壳
    } catch { /* ignore */ }

    // 每会话只尝试一次，防 OAuth 失败后重定向循环
    try {
      if (sessionStorage.getItem("woa_oauth_attempted")) return;
      sessionStorage.setItem("woa_oauth_attempted", "1");
    } catch { return; }

    (async () => {
      try {
        const res = await fetch("/api/wechat/official/me", { credentials: "include" });
        const json = await res.json();
        if (json?.data?.wechat) return; // 已识别，无需再走 OAuth
        if (json?.data?.oauthEnabled === false) return; // 服务号未认证/未开通OAuth：静默跳过，防微信报错页
        const redirect = encodeURIComponent(window.location.href);
        window.location.replace(`/api/wechat/official/oauth/authorize?redirect=${redirect}`);
      } catch { /* 静默：识别失败不影响浏览 */ }
    })();
  }, []);
  return null;
}
