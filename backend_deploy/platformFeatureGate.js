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

  // —— 预测/排盘/占卜类 ——
  // iOS：永久 OFF（IOS-4.3B-RECOVERY-EDUCATION-EDITION-14：App Store 4.3(b) 整改——
  //   iOS 版正式产品定位为"国学/中医/传统文化学习"，不提供 fortune-telling 功能。
  //   正式产品 Profile 而非审核模式：所有 iOS 用户一致，不随审核状态/设备/账户变化）
  // WECHAT / QQ：永久关闭
  bazi:           { web: true, android: true, ios: false, wechat: false, qq: false, unknown: true },
  ziwei:          { web: true, android: true, ios: false, wechat: false, qq: false, unknown: true },
  qimen:          { web: true, android: true, ios: false, wechat: false, qq: false, unknown: true },
  liuyao:         { web: true, android: true, ios: false, wechat: false, qq: false, unknown: true },
  daliuren:       { web: true, android: true, ios: false, wechat: false, qq: false, unknown: true },
  xiaoliuren:     { web: true, android: true, ios: false, wechat: false, qq: false, unknown: true },
  meihua:         { web: true, android: true, ios: false, wechat: false, qq: false, unknown: true },
  tarot:          { web: true, android: true, ios: false, wechat: false, qq: false, unknown: true },
  astrology:      { web: true, android: true, ios: false, wechat: false, qq: false, unknown: true },
  hehun:          { web: true, android: true, ios: false, wechat: false, qq: false, unknown: true },
  fortuneConsult: { web: true, android: true, ios: false, wechat: false, qq: false, unknown: true },
  taiyiSanshi:    { web: true, android: true, ios: false, wechat: false, qq: false, unknown: true },
  xuankong:       { web: true, android: true, ios: false, wechat: false, qq: false, unknown: true },
  yizhangjing:    { web: true, android: true, ios: false, wechat: false, qq: false, unknown: true },
  zeri:           { web: true, android: true, ios: false, wechat: false, qq: false, unknown: true },
  name:           { web: true, android: true, ios: false, wechat: false, qq: false, unknown: true },
  qiming:         { web: true, android: true, ios: false, wechat: false, qq: false, unknown: true },
  phone:          { web: true, android: true, ios: false, wechat: false, qq: false, unknown: true },
  carplate:       { web: true, android: true, ios: false, wechat: false, qq: false, unknown: true },
  chenggu:        { web: true, android: true, ios: false, wechat: false, qq: false, unknown: true },
  jiemeng:        { web: true, android: true, ios: false, wechat: false, qq: false, unknown: true },
  yixueAI:        { web: true, android: true, ios: false, wechat: false, qq: false, unknown: true },

  // —— 历法/工具/查询类（iOS 保留：传统历法与工具） ——
  compass:        { web: true, android: true, ios: true, wechat: true, qq: true, unknown: true },
  liji:           { web: true, android: true, ios: true, wechat: true, qq: true, unknown: true },
  luban:          { web: true, android: true, ios: true, wechat: true, qq: true, unknown: true },
  wannianli:      { web: true, android: true, ios: true, wechat: true, qq: true, unknown: true },
  huangli:        { web: true, android: true, ios: true, wechat: true, qq: true, unknown: true },
  jieqi:          { web: true, android: true, ios: true, wechat: true, qq: true, unknown: true },
  ganzhi:         { web: true, android: true, ios: true, wechat: true, qq: true, unknown: true },
  wuxing:         { web: true, android: true, ios: true, wechat: true, qq: true, unknown: true },
  nayin:          { web: true, android: true, ios: true, wechat: true, qq: true, unknown: true },
  shensha:        { web: true, android: true, ios: true, wechat: true, qq: true, unknown: true },
  kongwang:       { web: true, android: true, ios: true, wechat: true, qq: true, unknown: true },

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

// 小程序端（wechat/qq）永久关闭 + iOS 端（IOS-4.3B-RECOVERY）关闭的预测/命理类端点前缀。
// 注：多数排盘工具为前端算法（离线可算），本清单为服务端纵深防御层——
// 凡命中前缀的 API（AI 解读/记录辅助/后续新增算路）在 iOS 壳内直接 403。
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
  "/api/yixue/zeri",
  "/api/yixue/name",
  "/api/yixue/qiming",
  "/api/yixue/phone",
  "/api/yixue/carplate",
  "/api/yixue/chenggu",
  "/api/yixue/jiemeng",
  "/api/yixue/yizhangjing",
  "/api/yixue/taiyi",
  "/api/yixue/xuankong",
  "/api/yixue/ai",
  "/api/fortune",
  "/api/ai/fortune",
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

      // 2) 预测/命理类：WECHAT / QQ 永久关闭；iOS 永久关闭（IOS-4.3B-RECOVERY）
      if (platform === "wechat" || platform === "qq" || platform === "ios") {
        const p = String(req.path || "");
        for (let i = 0; i < FORTUNE_BLOCK_PREFIXES.length; i++) {
          if (p.indexOf(FORTUNE_BLOCK_PREFIXES[i]) === 0) {
            return res.status(403).json({
              success: false,
              error: "PLATFORM_FEATURE_DISABLED",
              message:
                platform === "ios"
                  ? "该功能在 iOS 版不可用。iOS 版为国学/中医/传统文化学习版。"
                  : "该功能在小程序端不可用。",
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
