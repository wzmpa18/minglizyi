// ============================================================================
// 平台功能开关中间件 PLATFORM_FEATURE_MATRIX - FINAL-RC-02
// 服务端强制执行层（最终裁决方）
//
// 前端镜像：src/lib/platformGate.ts（仅负责 UI 隐藏与请求层拦截）
// 本中间件在所有业务路由之前注册，依据 X-Client-Platform 请求头
// （authInterceptor.ts / paymentService.ts 注入）+ UA 兜底识别客户端平台，
// 对被关闭能力直接返回 403，杜绝"仅隐藏按钮但 URL/API 仍可访问"。
//
// 矩阵摘要：
// - v25.0.77（IOS-APPSTORE-FINAL-RELEASE-SEAL-11）：iOS 原生壳支付关闭——
//   Apple App Review 3.1.1 要求 App 内数字内容购买走 IAP，首版未建内购，
//   全部购买入口在 iOS 壳内拦截（与前端 platformGate.ts 同口径三层防护）；
//   已购会员权益登录恢复不受影响。后续接入 IAP 后再评估放开。
// - WECHAT / QQ：预测/命理/占卜类 OFF（永久，审核通过后也不可远程打开）
// ============================================================================

"use strict";

// ==================== 平台功能矩阵 ====================

const PLATFORM_FEATURE_MATRIX = {
  // —— 支付能力（v25.0.77：iOS 原生壳关闭——App Store 合规；QQ小程序维持关闭） ——
  payment: { web: true, android: true, ios: false, wechat: true, qq: false, unknown: true },
  store:   { web: true, android: true, ios: false, wechat: false, qq: false, unknown: true },

  // —— 预测/命理/占卜类（小程序永久关闭） ——
  bazi:           { web: true, android: true, ios: true, wechat: false, qq: false, unknown: true },
  ziwei:          { web: true, android: true, ios: true, wechat: false, qq: false, unknown: true },
  qimen:          { web: true, android: true, ios: true, wechat: false, qq: false, unknown: true },
  liuyao:         { web: true, android: true, ios: true, wechat: false, qq: false, unknown: true },
  daliuren:       { web: true, android: true, ios: true, wechat: false, qq: false, unknown: true },
  xiaoliuren:     { web: true, android: true, ios: true, wechat: false, qq: false, unknown: true },
  meihua:         { web: true, android: true, ios: true, wechat: false, qq: false, unknown: true },
  tarot:          { web: true, android: true, ios: true, wechat: false, qq: false, unknown: true },
  astrology:      { web: true, android: true, ios: true, wechat: false, qq: false, unknown: true },
  hehun:          { web: true, android: true, ios: true, wechat: false, qq: false, unknown: true },
  fortuneConsult: { web: true, android: true, ios: true, wechat: false, qq: false, unknown: true },

  // —— 学习工具类（ALL ON） ——
  materialToExam: { web: true, android: true, ios: true, wechat: true, qq: true, unknown: true },
  learningSpace:  { web: true, android: true, ios: true, wechat: true, qq: true, unknown: true },
  questionBank:   { web: true, android: true, ios: true, wechat: true, qq: true, unknown: true },
  tcmClassics:    { web: true, android: true, ios: true, wechat: true, qq: true, unknown: true },
};

const IOS_PAYMENT_DISABLED_MESSAGE =
  "iOS 版暂未开放付费功能，现有免费功能可正常使用。";

// iOS 支付关闭期间拦截的支付端点。
// 微信/支付宝 callback 为支付渠道服务器间回调，不依赖客户端平台，不拦截。
const PAYMENT_BLOCK_PATHS = [
  "/api/payment/create",
  "/api/payment/query",
  "/api/payment/close",
  "/api/ai-quota/purchase",
];

// 小程序端（wechat/qq）永久关闭的预测/命理类端点前缀。
// 当前服务端尚无对应路由（矩阵先行），小程序接入后按此清单强制拦截。
const FORTUNE_BLOCK_PREFIXES = [
  "/api/yixue/bazi",
  "/api/yixue/ziwei",
  "/api/yixue/qimen",
  "/api/yixue/liuyao",
  "/api/yixue/daliuren",
  "/api/yixue/xiaoliuren",
  "/api/yixue/meihua",
  "/api/yixue/tarot",
  "/api/yixue/astro",
  "/api/yixue/hehun",
  "/api/fortune",
];

// ==================== 平台识别 ====================

function detectPlatform(req) {
  const header = String(req.headers["x-client-platform"] || "").toLowerCase().trim();
  if (["ios", "android", "web", "wechat", "qq"].indexOf(header) !== -1) {
    return header;
  }
  // UA 兜底：Capacitor 壳在 capacitor.config.ts 中配置了 appendUserAgent 标记
  const ua = String(req.headers["user-agent"] || "");
  if (/YandaoGuoxueIOS/i.test(ua)) return "ios";
  if (/YandaoGuoxueAndroid/i.test(ua)) return "android";
  if (/micromessenger/i.test(ua)) return "wechat";
  if (/QQ\//i.test(ua)) return "qq";
  return "web";
}

function isFeatureEnabled(feature, platform) {
  const row = PLATFORM_FEATURE_MATRIX[feature];
  if (!row) return true;
  return row[platform] !== false;
}

// ==================== 中间件 ====================

function createPlatformFeatureGate() {
  return function platformFeatureGate(req, res, next) {
    const platform = detectPlatform(req);
    // 挂到 req 上供后续路由/日志使用
    req.clientPlatform = platform;

    try {
      // 1) 支付能力：iOS 关闭
      if (!isFeatureEnabled("payment", platform)) {
        const p = String(req.path || "").split("?")[0];
        if (PAYMENT_BLOCK_PATHS.indexOf(p) !== -1) {
          return res.status(403).json({
            success: false,
            error: "PLATFORM_PAYMENT_DISABLED",
            message: IOS_PAYMENT_DISABLED_MESSAGE,
            platform: platform,
          });
        }
      }

      // 2) 预测/命理类：WECHAT / QQ 永久关闭
      if (platform === "wechat" || platform === "qq") {
        const p = String(req.path || "");
        for (let i = 0; i < FORTUNE_BLOCK_PREFIXES.length; i++) {
          if (p.indexOf(FORTUNE_BLOCK_PREFIXES[i]) === 0) {
            return res.status(403).json({
              success: false,
              error: "PLATFORM_FEATURE_DISABLED",
              message: "该功能在小程序端不可用。",
              platform: platform,
            });
          }
        }
      }
    } catch (e) {
      // 开关自身异常不阻断业务
      console.log("[platformFeatureGate] error:", e && e.message);
    }

    next();
  };
}

module.exports = {
  createPlatformFeatureGate,
  detectPlatform,
  isFeatureEnabled,
  PLATFORM_FEATURE_MATRIX,
};
