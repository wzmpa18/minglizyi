// ============================================================================
// 支付宝支付通道 - v20.4
// 使用支付宝 OpenAPI（直接调用，或后续接入支付宝 SDK）
// 四个核心接口：createPayment / queryPayment / closePayment / handleCallback
// 参数从环境变量读取，参数到位后填入实现即可启用
// ============================================================================

import crypto from "crypto";
import https from "https";
import {
  Order,
  PaymentResult,
  PaymentQueryResult,
  PaymentCloseResult,
  CallbackVerifyResult,
  CallbackData,
  OrderStatus,
} from "./paymentTypes";

// ==================== 环境变量读取 ====================

/**
 * 支付宝配置（从环境变量读取）
 */
function getAlipayConfig(): {
  appId: string;
  appPrivateKey: string;
  alipayPublicKey: string;
  gateway: string;
} {
  return {
    appId: process.env.ALIPAY_APP_ID || "",
    appPrivateKey: process.env.ALIPAY_APP_PRIVATE_KEY || "",
    alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY || "",
    gateway: process.env.ALIPAY_GATEWAY || "https://openapi.alipay.com/gateway.do",
  };
}

/**
 * 检查支付宝参数是否已配置
 */
export function isAlipayConfigured(): boolean {
  const config = getAlipayConfig();
  return !!(config.appId && config.appPrivateKey && config.alipayPublicKey);
}

// ==================== 支付宝 OpenAPI 常量 ====================

const ALIPAY_API_METHODS = {
  /** 统一下单（电脑网站支付 alipay.trade.page.pay） */
  tradePagePay: "alipay.trade.page.pay",
  /** 手机网站支付 */
  tradeWapPay: "alipay.trade.wap.pay",
  /** 查询订单 */
  tradeQuery: "alipay.trade.query",
  /** 关闭订单 */
  tradeClose: "alipay.trade.close",
} as const;

/**
 * 支付宝回调通知数据结构
 */
interface AlipayCallbackData {
  out_trade_no: string;
  trade_no: string;
  trade_status: string;
  total_amount: string;
  gmt_payment: string;
  sign: string;
  sign_type: string;
  [key: string]: string;
}

// ==================== 内部工具函数 ====================

/**
 * 生成支付宝请求签名
 * 使用商户私钥进行 RSA2 (SHA256withRSA) 签名
 *
 * @param params    请求参数（已排序）
 * @param privateKey 商户应用私钥
 * @returns Base64 编码的签名
 */
function buildAlipaySignature(
  params: Record<string, string>,
  privateKey: string
): string {
  // 1. 按字典序排序参数，拼接成 key=value&key=value 格式
  const sortedKeys = Object.keys(params)
    .filter((k) => params[k] !== "" && params[k] !== undefined)
    .sort();
  const signString = sortedKeys.map((k) => `${k}=${params[k]}`).join("&");

  // 2. 使用 RSA-SHA256 签名
  // TODO: 参数到位后启用
  try {
    const sign = crypto.createSign("RSA-SHA256");
    sign.update(signString, "utf-8");
    return sign.sign(privateKey, "base64");
  } catch {
    return "";
  }
}

/**
 * 构建支付宝请求公共参数
 */
function buildAlipayCommonParams(
  method: string,
  bizContent: Record<string, unknown>
): Record<string, string> {
  const { appId } = getAlipayConfig();
  return {
    app_id: appId,
    method,
    format: "JSON",
    charset: "utf-8",
    sign_type: "RSA2",
    timestamp: new Date().toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }),
    version: "1.0",
    biz_content: JSON.stringify(bizContent),
  };
}

/**
 * 发送 HTTPS POST 请求（form-urlencoded）
 */
function httpsPost(
  url: string,
  params: Record<string, string>
): Promise<{ statusCode: number; data: string }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const body = Object.keys(params)
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
      .join("&");

    const options: https.RequestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port ? parseInt(urlObj.port, 10) : 443,
      path: urlObj.pathname + urlObj.search,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve({ statusCode: res.statusCode || 0, data });
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ==================== 核心接口 ====================

/**
 * 创建支付宝支付订单（下单）
 *
 * 调用支付宝 OpenAPI alipay.trade.page.pay / alipay.trade.wap.pay
 *
 * @param order     统一订单对象
 * @param notifyUrl 异步回调地址
 * @param returnUrl 同步跳转地址
 * @param wap       是否手机网站支付（true=wap, false=page）
 * @returns 支付结果
 */
export async function createPayment(
  order: Order,
  notifyUrl?: string,
  returnUrl?: string,
  wap: boolean = false
): Promise<PaymentResult> {
  if (!isAlipayConfigured()) {
    // TODO: 参数到位后启用
    return {
      success: false,
      error: "支付宝通道尚未配置，参数到位后启用",
    };
  }

  const { appPrivateKey, gateway } = getAlipayConfig();
  const method = wap ? ALIPAY_API_METHODS.tradeWapPay : ALIPAY_API_METHODS.tradePagePay;

  const bizContent: Record<string, unknown> = {
    out_trade_no: order.orderId,
    total_amount: order.amount.toFixed(2),
    subject: order.title,
    body: order.description,
    product_code: wap ? "QUICK_WAP_WAY" : "FAST_INSTANT_TRADE_PAY",
  };

  const params = buildAlipayCommonParams(method, bizContent);
  if (notifyUrl) params.notify_url = notifyUrl;
  if (returnUrl) params.return_url = returnUrl;

  // 签名
  params.sign = buildAlipaySignature(params, appPrivateKey);

  // TODO: 参数到位后启用
  // 对于 page.pay 和 wap.pay，支付宝返回的是 form HTML 或跳转 URL
  // const response = await httpsPost(gateway, params);
  // if (response.statusCode === 200) {
  //   // page.pay 返回一段自动提交的 form HTML，前端直接写入页面即可跳转
  //   // wap.pay 同理
  //   return {
  //     success: true,
  //     payUrl: gateway + "?" + new URLSearchParams(params).toString(),
  //     rawData: response.data,
  //   };
  // }
  // return { success: false, error: response.data, rawData: response.data };

  void gateway;
  void httpsPost;

  return {
    success: false,
    error: "支付宝通道即将开放，参数到位后启用",
  };
}

/**
 * 查询支付宝订单状态
 *
 * 调用支付宝 OpenAPI alipay.trade.query
 *
 * @param orderId 商户订单号
 * @returns 查询结果
 */
export async function queryPayment(orderId: string): Promise<PaymentQueryResult> {
  if (!isAlipayConfigured()) {
    // TODO: 参数到位后启用
    return {
      success: false,
      status: null,
      error: "支付宝通道尚未配置，参数到位后启用",
    };
  }

  const { appPrivateKey, gateway } = getAlipayConfig();
  const bizContent = { out_trade_no: orderId };
  const params = buildAlipayCommonParams(ALIPAY_API_METHODS.tradeQuery, bizContent);
  params.sign = buildAlipaySignature(params, appPrivateKey);

  // TODO: 参数到位后启用
  // const response = await httpsPost(gateway, params);
  // if (response.statusCode === 200) {
  //   const data = JSON.parse(response.data);
  //   const responseNode = data.alipay_trade_query_response;
  //   const statusMap: Record<string, OrderStatus> = {
  //     TRADE_SUCCESS: OrderStatus.PAID,
  //     TRADE_FINISHED: OrderStatus.PAID,
  //     WAIT_BUYER_PAY: OrderStatus.PENDING,
  //     TRADE_CLOSED: OrderStatus.CLOSED,
  //   };
  //   return {
  //     success: true,
  //     status: statusMap[responseNode.trade_status] || null,
  //     tradeNo: responseNode.trade_no,
  //     paidAt: responseNode.send_pay_date || null,
  //     rawData: response.data,
  //   };
  // }
  // return { success: false, status: null, error: response.data, rawData: response.data };

  void gateway;
  void httpsPost;

  return {
    success: false,
    status: null,
    error: "支付宝通道即将开放，参数到位后启用",
  };
}

/**
 * 关闭支付宝订单
 *
 * 调用支付宝 OpenAPI alipay.trade.close
 *
 * @param orderId 商户订单号
 * @returns 关闭结果
 */
export async function closePayment(orderId: string): Promise<PaymentCloseResult> {
  if (!isAlipayConfigured()) {
    // TODO: 参数到位后启用
    return {
      success: false,
      error: "支付宝通道尚未配置，参数到位后启用",
    };
  }

  const { appPrivateKey, gateway } = getAlipayConfig();
  const bizContent = { out_trade_no: orderId };
  const params = buildAlipayCommonParams(ALIPAY_API_METHODS.tradeClose, bizContent);
  params.sign = buildAlipaySignature(params, appPrivateKey);

  // TODO: 参数到位后启用
  // const response = await httpsPost(gateway, params);
  // if (response.statusCode === 200) {
  //   const data = JSON.parse(response.data);
  //   const responseNode = data.alipay_trade_close_response;
  //   if (responseNode.code === "10000") {
  //     return { success: true };
  //   }
  //   return { success: false, error: responseNode.sub_msg || responseNode.msg };
  // }
  // return { success: false, error: response.data };

  void gateway;
  void httpsPost;

  return {
    success: false,
    error: "支付宝通道即将开放，参数到位后启用",
  };
}

/**
 * 处理支付宝回调（验签）
 *
 * 支付宝回调验签流程：
 * 1. 从回调 POST 表单中提取所有参数
 * 2. 使用支付宝公钥验签（验证 sign 字段）
 * 3. 验签通过后检查 trade_status 是否为 TRADE_SUCCESS / TRADE_FINISHED
 *
 * @param data 回调原始数据（headers + body）
 * @returns 验签结果
 */
export async function handleCallback(
  data: CallbackData
): Promise<CallbackVerifyResult> {
  if (!isAlipayConfigured()) {
    // TODO: 参数到位后启用
    return {
      success: false,
      error: "支付宝通道尚未配置，参数到位后启用",
    };
  }

  const { alipayPublicKey } = getAlipayConfig();

  try {
    // 1. 解析回调参数（支付宝回调为 form-urlencoded）
    const callbackParams: AlipayCallbackData = parseAlipayCallback(data.body);

    if (!callbackParams.out_trade_no || !callbackParams.sign) {
      return {
        success: false,
        error: "回调数据缺少必要字段（out_trade_no 或 sign）",
      };
    }

    // 2. 提取签名
    const sign = callbackParams.sign;
    const signType = callbackParams.sign_type || "RSA2";

    // 3. 构建验签串（剔除 sign 和 sign_type，按字典序排列）
    const signParams: Record<string, string> = {};
    for (const key of Object.keys(callbackParams)) {
      if (key !== "sign" && key !== "sign_type" && callbackParams[key] !== "") {
        signParams[key] = callbackParams[key];
      }
    }
    const sortedKeys = Object.keys(signParams).sort();
    const signString = sortedKeys.map((k) => `${k}=${signParams[k]}`).join("&");

    // 4. 验签（使用支付宝公钥）
    // TODO: 参数到位后启用
    const verifyResult = verifyAlipaySignature(signString, sign, alipayPublicKey, signType);

    if (!verifyResult) {
      return {
        success: false,
        error: "支付宝回调签名验证失败",
      };
    }

    // 5. 检查交易状态
    const statusMap: Record<string, OrderStatus> = {
      TRADE_SUCCESS: OrderStatus.PAID,
      TRADE_FINISHED: OrderStatus.PAID,
      WAIT_BUYER_PAY: OrderStatus.PENDING,
      TRADE_CLOSED: OrderStatus.CLOSED,
    };

    const tradeStatus = callbackParams.trade_status;
    const isSuccess = tradeStatus === "TRADE_SUCCESS" || tradeStatus === "TRADE_FINISHED";

    // statusMap 用于日志记录，不直接返回（CallbackVerifyResult 无 status 字段）
    const mappedStatus = statusMap[tradeStatus] || null;
    if (mappedStatus) {
      console.log(`[alipay] 回调交易状态映射: ${tradeStatus} -> ${mappedStatus}`);
    }

    return {
      success: isSuccess,
      orderId: callbackParams.out_trade_no,
      amount: parseFloat(callbackParams.total_amount) || 0,
      tradeNo: callbackParams.trade_no,
      paidAt: callbackParams.gmt_payment || undefined,
      rawData: data.body,
      error: isSuccess ? undefined : `交易状态: ${tradeStatus}`,
    };
  } catch (e) {
    return {
      success: false,
      error: `回调处理异常: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

/**
 * 解析支付宝回调 body（form-urlencoded）
 */
function parseAlipayCallback(body: string): AlipayCallbackData {
  const params: Record<string, string> = {};
  try {
    const pairs = body.split("&");
    for (const pair of pairs) {
      const [key, value] = pair.split("=", 2);
      if (key) {
        params[decodeURIComponent(key)] = value ? decodeURIComponent(value) : "";
      }
    }
  } catch {
    // 忽略解析错误
  }
  return params as AlipayCallbackData;
}

/**
 * 使用支付宝公钥验签
 */
function verifyAlipaySignature(
  signString: string,
  sign: string,
  alipayPublicKey: string,
  signType: string
): boolean {
  // TODO: 参数到位后启用
  try {
    const algorithm = signType === "RSA2" ? "RSA-SHA256" : "RSA-SHA1";
    const verifier = crypto.createVerify(algorithm);
    verifier.update(signString, "utf-8");
    return verifier.verify(alipayPublicKey, sign, "base64");
  } catch (e) {
    console.error("[alipay] verifyAlipaySignature error:", e);
    return false;
  }
}

// ==================== 导出 ====================

export const alipay = {
  createPayment,
  queryPayment,
  closePayment,
  handleCallback,
  isConfigured: isAlipayConfigured,
};
