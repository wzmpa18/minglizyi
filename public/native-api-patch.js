/**
 * 原生壳 API 改写补丁（原生内置资源模式 v25.0.47）
 *
 * 背景：APK/IPA 原生化后 WebView 从内置资源（https://localhost）加载页面，
 * 而所有后端接口在 https://yandaoguoxue.yandao.vip。前端代码大量使用
 * 相对路径 fetch("/api/...") 与 window.location.origin 拼接（两种模式），
 * 在原生模式下会请求到 localhost 导致 404。
 *
 * 本脚本在 <head> 同步加载（早于所有应用 JS），对 window.fetch 做一次性包装：
 * - 仅在原生平台（Capacitor 原生桥或 UA 标记）激活，Web 端零影响
 * - "/api/..." 相对路径        → https://yandaoguoxue.yandao.vip/api/...
 * - "{origin}/api/..." 拼接路径 → https://yandaoguoxue.yandao.vip/api/...
 * - 其余 URL（静态资源/外链）不改写，继续走本地 bundle
 *
 * 认证为 Bearer token header（无 cookie 依赖），跨域无会话风险；
 * CapacitorHttp 已启用，原生层执行请求无 CORS 限制。
 */
(function () {
  "use strict";
  if (typeof window === "undefined") return;
  if (window.__nativeApiPatchInstalled) return;

  var API_SERVER = "https://yandaoguoxue.yandao.vip";

  function detectNativePlatform() {
    try {
      var cap = window.Capacitor;
      if (cap && typeof cap.isNativePlatform === "function" && cap.isNativePlatform()) {
        var p = cap.getPlatform ? cap.getPlatform() : "";
        if (p === "ios" || p === "android") return p;
      }
      var ua = navigator.userAgent || "";
      if (/YandaoGuoxueIOS/i.test(ua)) return "ios";
      if (/YandaoGuoxueAndroid/i.test(ua)) return "android";
    } catch (e) {
      /* 检测失败按 web 处理 */
    }
    return "web";
  }

  var platform = detectNativePlatform();
  if (platform === "web") {
    window.__nativeApiPatchInstalled = "web-skip";
    return;
  }

  var origin = window.location.origin;
  var origFetch = window.fetch.bind(window);

  function rewriteUrl(url) {
    if (typeof url !== "string") return url;
    if (url.indexOf("/api/") === 0) return API_SERVER + url;
    if (origin && url.indexOf(origin + "/api/") === 0) {
      return API_SERVER + url.slice(origin.length);
    }
    return url;
  }

  window.fetch = function (input, init) {
    if (typeof input === "string") {
      return origFetch(rewriteUrl(input), init);
    }
    if (input && typeof input === "object" && input instanceof URL) {
      return origFetch(rewriteUrl(input.toString()), init);
    }
    if (input && typeof input === "object" && typeof input.url === "string") {
      var newUrl = rewriteUrl(input.url);
      if (newUrl !== input.url) {
        return origFetch(new Request(newUrl, input), init);
      }
    }
    return origFetch(input, init);
  };

  window.__nativeApiPatchInstalled = platform;
})();
