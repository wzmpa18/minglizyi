// ============================================================================
// 微信支付通道 - v20.4
// 使用微信支付 API v3 接口
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
 * 微信支付配置（从环境变量读取）
 */
function getWechatConfig(): {
  mchId: string;
  appid: string;
  apiV3Key: string;
  certPath: string;
} {
  return {
    mchId: process.env.WECHAT_MCH_ID || "",
    appid: process.env.WECHAT_APPID || "",
    apiV3Key: process.env.WECHAT_API_V3_KEY || "",
    certPath: process.env.WECHAT_API_CERT_PATH || "",
  };
}

/**
 * 检查微信支付参数是否已配置
 */
export function isWechatConfigured(): boolean {
  const config = getWechatConfig();
  return !!(config.mchId && config.appid && config.apiV3Key && config.certPath);
}

// ==================== 微信支付 API v3 常量 ====================

const WECHAT_API_BASE = "https://api.mch.weixin.qq.com";
const WECHAT_API_PATHS = {
  /** JSAPI / Native 下单 */
  createOrder: "/v3/pay/transactions/jsapi",
  createOrderNative: "/v3/pay/transactions/native",
  /** 查询订单（微信支付订单号） */
  queryById: "/v3/pay/transactions/id/{transaction_id}",
  /** 查询订单（商户订单号） */
  queryByOutTradeNo: "/v3/pay/transactions/out-trade-no/{out_trade_no}",
  /** 关闭订单 */
  closeOrder: "/v3/pay/transactions/out-trade-no/{out_trade_no}/close",
} as const;

/**
 * 微信支付回调通知解密后的数据结构
 */
interface WechatCallbackResource {
  transaction_id: string;
  out_trade_no: string;
  trade_type: string;
  trade_state: string;
  trade_state_desc: string;
  amount: {
    total: number;
    payer_total: number;
    currency: string;
  };
  payer: {
    openid: string;
  };
  success_time: string;
}

// ==================== 内部工具函数 ====================

/**
 * 生成随机字符串（nonce_str）
 */
function generateNonceStr(length: number = 32): string {
  return crypto.randomBytes(length).toString("hex").slice(0, length);
}

/**
 * 微信支付 v3 签名生成
 * 使用商户私钥对请求参数进行 SHA256-RSA 签名
 *
 * @param method    HTTP 方法
 * @param url       请求路径
 * @param timestamp 时间戳
 * @param nonceStr  随机字符串
 * @param body      请求体
 * @returns Base64 编码的签名
 */
function buildWechatSignature(
  method: string,
  url: string,
  timestamp: string,
  nonceStr: string,
  body: string
): string {
  // TODO: 参数到位后启用
  // 实现步骤：
  // 1. 读取商户私钥（WECHAT_API_CERT_PATH 指向的 apiclient_key.pem）
  // 2. 拼接签名串：method\nurl\ntimestamp\nnonceStr\nbody\n
  // 3. 使用 RSA-SHA256 签名
  // 4. Base64 编码返回
  const message = `${method}\n${url}\n${timestamp}\n${nonceStr}\n${body}\n`;
  // 预留：商户私钥签名
  void message; // 避免未使用变量告警
  return "";
}

/**
 * 构建微信支付 v3 请求头
 */
function buildWechatHeaders(
  method: string,
  url: string,
  body: string
): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = generateNonceStr();
  const signature = buildWechatSignature(method, url, timestamp, nonceStr, body);
  const { mchId, appid } = getWechatConfig();
  // 序列号需从证书中读取，此处预留
  const serialNo = "";
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "User-Agent": "Yandao-Guoxue/1.0",
    Authorization: `WECHATPAY2-SHA256-RSA2048 mchid="${mchId}",nonce_str="${nonceStr}",timestamp="${timestamp}",serial_no="${serialNo}",signature="${signature}"`,
    "Wechatpay-Serial": serialNo,
    "X-Appid": appid,
  };
}

/**
 * 发送 HTTPS 请求
 */
function httpsRequest(
  method: string,
  url: string,
  headers: Record<string, string>,
  body: string
): Promise<{ statusCode: number; data: string }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options: https.RequestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port ? parseInt(urlObj.port, 10) : 443,
      path: urlObj.pathname + urlObj.search,
      method,
      headers,
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
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

// ==================== 核心接口 ====================

/**
 * 创建微信支付订单（下单）
 *
 * 调用微信支付 API v3 的 JSAPI / Native 下单接口
 *
 * @param order       统一订单对象
 * @param openid      用户 openid（JSAPI 支付必填，Native 支付不需要）
 * @param notifyUrl   支付结果回调地址
 * @returns 支付结果
 */
export async function createPayment(
  order: Order,
  openid?: string,
  notifyUrl?: string
): Promise<PaymentResult> {
  if (!isWechatConfigured()) {
    // TODO: 参数到位后启用
    return {
      success: false,
      error: "微信支付通道尚未配置，参数到位后启用",
    };
  }

  const { appid, mchId } = getWechatConfig();
  const apiUrl = WECHAT_API_BASE + WECHAT_API_PATHS.createOrder;

  const requestBody = JSON.stringify({
    appid,
    mchid: mchId,
    description: order.title,
    out_trade_no: order.orderId,
    notify_url: notifyUrl || "",
    amount: {
      total: Math.round(order.amount * 100), // 单位：分
      currency: "CNY",
    },
    payer: openid ? { openid } : undefined,
  });

  const headers = buildWechatHeaders("POST", WECHAT_API_PATHS.createOrder, requestBody);

  // TODO: 参数到位后启用
  // const response = await httpsRequest("POST", apiUrl, headers, requestBody);
  // if (response.statusCode === 200) {
  //   const data = JSON.parse(response.data);
  //   // JSAPI 返回 prepay_id，需组装 jsapiParams 供前端调起
  //   // Native 返回 code_url，前端生成二维码
  //   return {
  //     success: true,
  //     prepayId: data.prepay_id,
  //     payUrl: data.code_url,
  //     jsapiParams: buildJsapiParams(data.prepay_id),
  //     rawData: response.data,
  //   };
  // }
  // return { success: false, error: response.data, rawData: response.data };

  void apiUrl;
  void requestBody;
  void headers;
  void httpsRequest;

  return {
    success: false,
    error: "微信支付通道即将开放，参数到位后启用",
  };
}

/**
 * 构建 JSAPI 调起参数
 */
function buildJsapiParams(prepayId: string): Record<string, string> {
  // TODO: 参数到位后启用
  const { appid } = getWechatConfig();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = generateNonceStr();
  const packageStr = `prepay_id=${prepayId}`;
  // 签名需用商户私钥
  const paySign = "";
  return {
    appId: appid,
    timeStamp: timestamp,
    nonceStr,
    package: packageStr,
    signType: "RSA",
    paySign,
  };
}

/**
 * 查询微信支付订单状态
 *
 * 调用微信支付 API v3 查询接口，根据商户订单号查询
 *
 * @param orderId 商户订单号（即统一订单系统的 orderId）
 * @returns 查询结果
 */
export async function queryPayment(orderId: string): Promise<PaymentQueryResult> {
  if (!isWechatConfigured()) {
    // TODO: 参数到位后启用
    return {
      success: false,
      status: null,
      error: "微信支付通道尚未配置，参数到位后启用",
    };
  }

  const { mchId } = getWechatConfig();
  const urlPath = WECHAT_API_PATHS.queryByOutTradeNo.replace(
    "{out_trade_no}",
    orderId
  );
  const apiUrl = `${WECHAT_API_BASE}${urlPath}?mchid=${mchId}`;
  const headers = buildWechatHeaders("GET", `${urlPath}?mchid=${mchId}`, "");

  // TODO: 参数到位后启用
  // const response = await httpsRequest("GET", apiUrl, headers, "");
  // if (response.statusCode === 200) {
  //   const data = JSON.parse(response.data);
  //   const statusMap: Record<string, OrderStatus> = {
  //     SUCCESS: OrderStatus.PAID,
  //     NOTPAY: OrderStatus.PENDING,
  //     CLOSED: OrderStatus.CLOSED,
  //     REFUND: OrderStatus.REFUNDED,
  //   };
  //   return {
  //     success: true,
  //     status: statusMap[data.trade_state] || null,
  //     tradeNo: data.transaction_id,
  //     paidAt: data.success_time || null,
  //     rawData: response.data,
  //   };
  // }
  // return { success: false, status: null, error: response.data, rawData: response.data };

  void apiUrl;
  void headers;
  void httpsRequest;

  return {
    success: false,
    status: null,
    error: "微信支付通道即将开放，参数到位后启用",
  };
}

/**
 * 关闭微信支付订单
 *
 * 调用微信支付 API v3 关闭订单接口
 *
 * @param orderId 商户订单号
 * @returns 关闭结果
 */
export async function closePayment(orderId: string): Promise<PaymentCloseResult> {
  if (!isWechatConfigured()) {
    // TODO: 参数到位后启用
    return {
      success: false,
      error: "微信支付通道尚未配置，参数到位后启用",
    };
  }

  const { mchId } = getWechatConfig();
  const urlPath = WECHAT_API_PATHS.closeOrder.replace("{out_trade_no}", orderId);
  const apiUrl = WECHAT_API_BASE + urlPath;
  const requestBody = JSON.stringify({ mchid: mchId });
  const headers = buildWechatHeaders("POST", urlPath, requestBody);

  // TODO: 参数到位后启用
  // const response = await httpsRequest("POST", apiUrl, headers, requestBody);
  // if (response.statusCode === 204) {
  //   return { success: true };
  // }
  // return { success: false, error: response.data };

  void apiUrl;
  void requestBody;
  void headers;
  void httpsRequest;

  return {
    success: false,
    error: "微信支付通道即将开放，参数到位后启用",
  };
}

/**
 * 处理微信支付回调（验签 + 解密）
 *
 * 微信支付 v3 回调验签流程：
 * 1. 从回调头中获取 Wechatpay-Signature（签名）和 Wechatpay-Serial（平台证书序列号）
 * 2. 使用微信支付平台证书验证签名（验签串：时间戳\n随机串\n请求体\n）
 * 3. 验签通过后，使用 APIv3 密钥（WECHAT_API_V3_KEY）AES-256-GCM 解密 resource.ciphertext
 * 4. 解密后得到支付结果数据
 *
 * @param data 回调原始数据（headers + body）
 * @returns 验签结果
 */
export async function handleCallback(
  data: CallbackData
): Promise<CallbackVerifyResult> {
  if (!isWechatConfigured()) {
    // TODO: 参数到位后启用
    return {
      success: false,
      error: "微信支付通道尚未配置，参数到位后启用",
    };
  }

  const { apiV3Key } = getWechatConfig();

  // 1. 提取回调头
  const wechatpayTimestamp = data.headers["wechatpay-timestamp"] || "";
  const wechatpayNonce = data.headers["wechatpay-nonce"] || "";
  const wechatpaySignature = data.headers["wechatpay-signature"] || "";
  const wechatpaySerial = data.headers["wechatpay-serial"] || "";

  // 2. 构建验签串
  const verifyMessage = `${wechatpayTimestamp}\n${wechatpayNonce}\n${data.body}\n`;

  // 3. 验签（使用微信支付平台证书）
  // TODO: 参数到位后启用
  //    - 根据 wechatpaySerial 下载/缓存微信支付平台证书
  //    - 使用平台证书公钥验证 wechatpaySignature（RSA-SHA256）
  //    - 验签失败返回 { success: false, error: "签名验证失败" }
  void verifyMessage;
  void wechatpaySerial;
  void wechatpaySignature;

  // 4. 解密回调数据
  try {
    const callbackBody = JSON.parse(data.body);
    const resource = callbackBody.resource;

    if (!resource || !resource.ciphertext || !resource.nonce || !resource.associated_data) {
      return {
        success: false,
        error: "回调数据格式错误：缺少 resource 字段",
      };
    }

    // TODO: 参数到位后启用
    // 使用 apiV3Key 进行 AES-256-GCM 解密
    const decrypted = decryptWechatResource(
      resource.ciphertext,
      resource.nonce,
      resource.associated_data,
      apiV3Key
    );

    if (!decrypted) {
      return {
        success: false,
        error: "回调数据解密失败",
      };
    }

    const paymentData: WechatCallbackResource = JSON.parse(decrypted);

    // 5. 返回验签结果
    const statusMap: Record<string, OrderStatus> = {
      SUCCESS: OrderStatus.PAID,
      NOTPAY: OrderStatus.PENDING,
      CLOSED: OrderStatus.CLOSED,
      REFUND: OrderStatus.REFUNDED,
    };

    return {
      success: paymentData.trade_state === "SUCCESS",
      orderId: paymentData.out_trade_no,
      amount: paymentData.amount.total / 100, // 分转元
      tradeNo: paymentData.transaction_id,
      paidAt: paymentData.success_time || undefined,
      rawData: decrypted,
      error: paymentData.trade_state === "SUCCESS" ? undefined : paymentData.trade_state_desc,
    };
  } catch (e) {
    return {
      success: false,
      error: `回调处理异常: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

/**
 * 使用 APIv3 密钥解密微信回调 resource
 * AES-256-GCM 解密
 */
function decryptWechatResource(
  ciphertext: string,
  nonce: string,
  associatedData: string,
  apiV3Key: string
): string | null {
  // TODO: 参数到位后启用
  // 实现步骤：
  // 1. Base64 解码 ciphertext 得到密文 Buffer
  // 2. 密文最后 16 字节为 authTag
  // 3. 使用 apiV3Key 作为密钥，nonce 作为 IV，associatedData 作为 AAD
  // 4. AES-256-GCM 解密
  try {
    const key = Buffer.from(apiV3Key, "utf-8");
    const ciphertextBuf = Buffer.from(ciphertext, "base64");
    const authTag = ciphertextBuf.subarray(ciphertextBuf.length - 16);
    const encryptedData = ciphertextBuf.subarray(0, ciphertextBuf.length - 16);

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, nonce);
    decipher.setAuthTag(authTag);
    decipher.setAAD(Buffer.from(associatedData, "utf-8"));

    const decrypted = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final(),
    ]);

    return decrypted.toString("utf-8");
  } catch (e) {
    console.error("[wechatPay] decryptWechatResource error:", e);
    return null;
  }
}

// ==================== 导出 ====================

export const wechatPay = {
  createPayment,
  queryPayment,
  closePayment,
  handleCallback,
  isConfigured: isWechatConfigured,
};
