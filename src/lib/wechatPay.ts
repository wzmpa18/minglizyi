// ============================================================================
// 微信支付 API v3 工具库 - 生产就绪
// 提供统一下单、回调验签、回调数据解密三大核心能力
// 使用微信支付 v3 接口：https://api.mch.weixin.qq.com/v3/pay/transactions/jsapi
// 所有支付金额商品描述统一标注「传统文化学习服务」以确保合规
// ============================================================================

import crypto from "crypto";
import https from "https";
import fs from "fs";

// ==================== 类型定义 ====================

/** 微信支付配置（从环境变量读取） */
export interface WechatPayConfig {
  /** 微信 AppID（公众号/小程序） */
  appId: string;
  /** 商户号 */
  mchId: string;
  /** API v3 密钥（32 位，用于 AES-256-GCM 解密） */
  apiV3Key: string;
  /** 支付回调通知地址 */
  notifyUrl: string;
  /** 商户证书序列号 */
  certSerial: string;
  /** 商户私钥（PEM 格式） */
  privateKey: string;
}

/** 创建微信订单的参数 */
export interface CreateOrderParams {
  /** 商户订单号（out_trade_no） */
  outTradeNo: string;
  /** 商品描述（合规口径，默认「传统文化学习服务」） */
  description: string;
  /** 支付金额（单位：元） */
  amount: number;
  /** 用户 openid（JSAPI 支付必填） */
  openid: string;
  /** 支付回调地址（不传则使用环境变量中的默认地址） */
  notifyUrl?: string;
}

/** JSAPI 调起支付参数 */
export interface JsapiParams {
  /** 微信 AppID */
  appId: string;
  /** 时间戳（秒） */
  timeStamp: string;
  /** 随机字符串 */
  nonceStr: string;
  /** 订单详情扩展字符串，格式：prepay_id=xxx */
  package: string;
  /** 签名类型，固定 RSA */
  signType: string;
  /** 签名 */
  paySign: string;
}

/** 创建订单返回结果 */
export interface CreateOrderResult {
  success: boolean;
  /** 微信预支付 ID */
  prepayId?: string;
  /** JSAPI 调起参数 */
  jsapiParams?: JsapiParams;
  /** 原始响应（调试用） */
  rawData?: string;
  error?: string;
}

/** 微信回调解密后的支付通知数据 */
export interface WechatNotifyData {
  /** 商户号 */
  mchid: string;
  /** 微信 AppID */
  appid: string;
  /** 商户订单号 */
  out_trade_no: string;
  /** 微信支付交易号 */
  transaction_id: string;
  /** 交易类型 JSAPI / NATIVE / APP 等 */
  trade_type: string;
  /** 交易状态 SUCCESS / NOTPAY / CLOSED / REFUND 等 */
  trade_state: string;
  /** 交易状态描述 */
  trade_state_desc: string;
  /** 银行类型 */
  bank_type?: string;
  /** 附加数据 */
  attach?: string;
  /** 支付完成时间（RFC 3339 格式） */
  success_time: string;
  /** 支付者信息 */
  payer: {
    openid: string;
  };
  /** 订单金额信息 */
  amount: {
    /** 订单总金额（单位：分） */
    total: number;
    /** 用户实际支付金额（单位：分） */
    payer_total: number;
    /** 货币类型 CNY */
    currency: string;
    /** 用户支付货币类型 */
    payer_currency: string;
  };
}

// ==================== 常量 ====================

/** 微信支付 API v3 基础地址 */
const API_BASE = "https://api.mch.weixin.qq.com";

/** JSAPI 统一下单接口路径 */
const JSAPI_ORDER_PATH = "/v3/pay/transactions/jsapi";

/** 平台证书下载接口路径 */
const CERTIFICATES_PATH = "/v3/certificates";

/** 合规商品描述 */
const COMPLIANCE_DESCRIPTION = "传统文化学习服务";

// ==================== 平台证书缓存 ====================

interface PlatformCertEntry {
  /** 证书序列号 */
  serial: string;
  /** PEM 格式证书内容 */
  certPem: string;
  /** 过期时间戳（毫秒） */
  expireAt: number;
}

/** 平台证书缓存（serial -> entry） */
const platformCertCache = new Map<string, PlatformCertEntry>();

/** 缓存有效期：12 小时 */
const CERT_CACHE_TTL = 12 * 60 * 60 * 1000;

/** 证书下载锁（防止并发重复下载） */
let certDownloadPromise: Promise<Map<string, PlatformCertEntry>> | null = null;

// ==================== 配置读取 ====================

/**
 * 从环境变量读取微信支付配置
 *
 * 环境变量：
 * - WECHAT_APP_ID      微信 AppID
 * - WECHAT_MCH_ID       商户号
 * - WECHAT_API_KEY_V3   API v3 密钥（32 位）
 * - WECHAT_NOTIFY_URL   支付回调地址
 * - WECHAT_CERT_SERIAL  商户证书序列号
 * - WECHAT_PRIVATE_KEY  商户私钥（PEM 格式，可为文件路径或内联 PEM）
 */
export function getConfig(): WechatPayConfig {
  const privateKeyRaw = process.env.WECHAT_PRIVATE_KEY || "";

  // 私钥支持文件路径或内联 PEM 两种方式
  let privateKey = privateKeyRaw;
  if (privateKeyRaw && !privateKeyRaw.includes("-----BEGIN")) {
    // 不含 PEM 头，尝试作为文件路径读取
    try {
      if (fs.existsSync(privateKeyRaw)) {
        privateKey = fs.readFileSync(privateKeyRaw, "utf-8");
      } else {
        console.error(
          `[wechatPay] 私钥文件不存在: ${privateKeyRaw}`
        );
      }
    } catch (e) {
      console.error("[wechatPay] 读取私钥文件失败:", e);
    }
  }

  return {
    appId: process.env.WECHAT_APP_ID || "",
    mchId: process.env.WECHAT_MCH_ID || "",
    apiV3Key: process.env.WECHAT_API_KEY_V3 || "",
    notifyUrl: process.env.WECHAT_NOTIFY_URL || "",
    certSerial: process.env.WECHAT_CERT_SERIAL || "",
    privateKey,
  };
}

/**
 * 检查微信支付是否已完整配置
 */
export function isConfigured(): boolean {
  const config = getConfig();
  return !!(
    config.appId &&
    config.mchId &&
    config.apiV3Key &&
    config.certSerial &&
    config.privateKey
  );
}

// ==================== 内部工具函数 ====================

/**
 * 生成随机字符串（nonce_str）
 */
function generateNonceStr(length: number = 32): string {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length);
}

/**
 * 获取当前时间戳（秒）
 */
function getTimestamp(): string {
  return Math.floor(Date.now() / 1000).toString();
}

/**
 * 使用商户私钥进行 RSA-SHA256 签名
 *
 * @param message 待签名字符串
 * @returns Base64 编码的签名
 */
function signWithPrivateKey(message: string): string {
  const config = getConfig();
  if (!config.privateKey) {
    throw new Error("商户私钥未配置（WECHAT_PRIVATE_KEY）");
  }
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(message, "utf-8");
  return sign.sign(config.privateKey, "base64");
}

/**
 * 构建微信支付 v3 Authorization 请求头
 *
 * 签名串格式：{method}\n{url}\n{timestamp}\n{nonceStr}\n{body}\n
 *
 * @param method HTTP 方法（大写）
 * @param url    请求路径（不含域名，含查询参数）
 * @param body   请求体（GET 请求为空字符串）
 * @returns Authorization 头值
 */
function buildAuthorization(
  method: string,
  url: string,
  body: string
): string {
  const config = getConfig();
  const timestamp = getTimestamp();
  const nonceStr = generateNonceStr();
  const message = `${method}\n${url}\n${timestamp}\n${nonceStr}\n${body}\n`;
  const signature = signWithPrivateKey(message);

  return `WECHATPAY2-SHA256-RSA2048 mchid="${config.mchId}",nonce_str="${nonceStr}",timestamp="${timestamp}",serial_no="${config.certSerial}",signature="${signature}"`;
}

/**
 * 发送 HTTPS 请求并返回响应
 *
 * @param method  HTTP 方法
 * @param fullUrl  完整 URL
 * @param headers  请求头
 * @param body     请求体
 * @returns 响应状态码、响应体、响应头
 */
function httpsRequest(
  method: string,
  fullUrl: string,
  headers: Record<string, string>,
  body: string
): Promise<{
  statusCode: number;
  data: string;
  headers: Record<string, string | string[] | undefined>;
}> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(fullUrl);
    const options: https.RequestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port ? parseInt(urlObj.port, 10) : 443,
      path: urlObj.pathname + urlObj.search,
      method,
      headers,
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk: Buffer) => {
        data += chunk.toString("utf-8");
      });
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode || 0,
          data,
          headers: res.headers,
        });
      });
    });

    req.on("error", (e: Error) => {
      reject(e);
    });

    req.setTimeout(15000, () => {
      req.destroy(new Error("请求超时"));
    });

    if (body) {
      req.write(body, "utf-8");
    }
    req.end();
  });
}

// ==================== 平台证书管理 ====================

/**
 * 下载微信支付平台证书列表
 *
 * 调用 GET /v3/certificates 接口获取平台证书，
 * 证书数据使用 AES-256-GCM 加密，需用 APIv3 密钥解密。
 *
 * @returns 证书序列号 -> PEM 证书 的映射
 */
async function downloadPlatformCertificates(): Promise<
  Map<string, PlatformCertEntry>
> {
  const config = getConfig();
  const authorization = buildAuthorization("GET", CERTIFICATES_PATH, "");

  const response = await httpsRequest(
    "GET",
    API_BASE + CERTIFICATES_PATH,
    {
      Accept: "application/json",
      Authorization: authorization,
      "User-Agent": "Yandao-Guoxue/1.0",
    },
    ""
  );

  if (response.statusCode !== 200) {
    throw new Error(
      `下载平台证书失败: HTTP ${response.statusCode}, ${response.data}`
    );
  }

  const certList = JSON.parse(response.data);
  const result = new Map<string, PlatformCertEntry>();

  if (!certList.data || !Array.isArray(certList.data)) {
    throw new Error("平台证书响应格式异常");
  }

  for (const item of certList.data) {
    const serial = item.serial_no;
    const encryptCert = item.encrypt_certificate;
    if (!encryptCert || !encryptCert.ciphertext) {
      continue;
    }

    // 使用 APIv3 密钥解密证书
    const certPem = decryptResource(
      encryptCert.ciphertext,
      encryptCert.nonce,
      encryptCert.associated_data
    );

    // 解析证书过期时间
    let expireAt = Date.now() + CERT_CACHE_TTL;
    try {
      const cert = new crypto.X509Certificate(certPem);
      if (cert.validTo) {
        expireAt = new Date(cert.validTo).getTime();
      }
    } catch {
      // 解析失败时使用默认 TTL
    }

    result.set(serial, { serial, certPem, expireAt });
  }

  console.log(
    `[wechatPay] 平台证书下载成功，共 ${result.size} 张证书`
  );
  return result;
}

/**
 * 获取指定序列号的平台证书（带缓存）
 *
 * @param serial 平台证书序列号（来自回调头 Wechatpay-Serial）
 * @returns PEM 格式证书内容
 */
async function getPlatformCertificate(serial: string): Promise<string> {
  // 检查缓存
  const cached = platformCertCache.get(serial);
  if (cached && cached.expireAt > Date.now() + 60000) {
    return cached.certPem;
  }

  // 使用锁防止并发下载
  if (!certDownloadPromise) {
    certDownloadPromise = downloadPlatformCertificates()
      .then((certs) => {
        // 更新缓存
        for (const [s, entry] of certs) {
          platformCertCache.set(s, entry);
        }
        return certs;
      })
      .finally(() => {
        certDownloadPromise = null;
      });
  }

  const certs = await certDownloadPromise;
  const entry = certs.get(serial);

  if (!entry) {
    throw new Error(
      `未找到序列号为 ${serial} 的平台证书，已下载 ${certs.size} 张证书`
    );
  }

  return entry.certPem;
}

// ==================== 核心接口 ====================

/**
 * 创建微信支付 JSAPI 统一下单
 *
 * 调用微信支付 API v3 的 JSAPI 下单接口，获取 prepay_id，
 * 并组装前端调起支付所需的 JSAPI 参数（appId, timeStamp, nonceStr, package, signType, paySign）。
 *
 * @param params 下单参数
 * @returns 下单结果，包含 prepayId 和 jsapiParams
 */
export async function createOrder(
  params: CreateOrderParams
): Promise<CreateOrderResult> {
  if (!isConfigured()) {
    return {
      success: false,
      error: "微信支付配置不完整，请检查环境变量（WECHAT_APP_ID, WECHAT_MCH_ID, WECHAT_API_KEY_V3, WECHAT_CERT_SERIAL, WECHAT_PRIVATE_KEY）",
    };
  }

  if (!params.openid) {
    return {
      success: false,
      error: "JSAPI 支付必须提供用户 openid",
    };
  }

  const config = getConfig();
  const description = params.description || COMPLIANCE_DESCRIPTION;
  const notifyUrl = params.notifyUrl || config.notifyUrl;

  if (!notifyUrl) {
    return {
      success: false,
      error: "支付回调地址未配置（WECHAT_NOTIFY_URL）",
    };
  }

  // 构建请求体
  const requestBody = JSON.stringify({
    appid: config.appId,
    mchid: config.mchId,
    description,
    out_trade_no: params.outTradeNo,
    notify_url: notifyUrl,
    amount: {
      total: Math.round(params.amount * 100), // 元转分
      currency: "CNY",
    },
    payer: {
      openid: params.openid,
    },
  });

  console.log(
    `[wechatPay] 创建统一下单 — outTradeNo=${params.outTradeNo}, amount=${params.amount}元, description=${description}`
  );

  // 构建签名并发送请求
  const authorization = buildAuthorization(
    "POST",
    JSAPI_ORDER_PATH,
    requestBody
  );

  let response;
  try {
    response = await httpsRequest(
      "POST",
      API_BASE + JSAPI_ORDER_PATH,
      {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: authorization,
        "User-Agent": "Yandao-Guoxue/1.0",
      },
      requestBody
    );
  } catch (e) {
    console.error("[wechatPay] 统一下单请求异常:", e);
    return {
      success: false,
      error: `网络请求失败: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  if (response.statusCode !== 200) {
    let errorMsg = `微信下单失败: HTTP ${response.statusCode}`;
    try {
      const errData = JSON.parse(response.data);
      errorMsg = `微信下单失败: ${errData.code || ""} - ${errData.message || response.data}`;
    } catch {
      errorMsg += ` - ${response.data}`;
    }
    console.error(`[wechatPay] ${errorMsg}`);
    return {
      success: false,
      error: errorMsg,
      rawData: response.data,
    };
  }

  // 解析响应
  let responseData: { prepay_id: string };
  try {
    responseData = JSON.parse(response.data);
  } catch (e) {
    console.error("[wechatPay] 解析下单响应失败:", e);
    return {
      success: false,
      error: "解析微信响应失败",
      rawData: response.data,
    };
  }

  const prepayId = responseData.prepay_id;
  if (!prepayId) {
    return {
      success: false,
      error: "微信返回数据缺少 prepay_id",
      rawData: response.data,
    };
  }

  // 构建 JSAPI 调起参数
  const jsapiParams = buildJsapiParams(prepayId);

  console.log(
    `[wechatPay] 统一下单成功 — outTradeNo=${params.outTradeNo}, prepayId=${prepayId}`
  );

  return {
    success: true,
    prepayId,
    jsapiParams,
    rawData: response.data,
  };
}

/**
 * 构建 JSAPI 调起支付参数并签名
 *
 * 签名串格式：{appId}\n{timeStamp}\n{nonceStr}\n{package}\n
 * 使用商户私钥进行 RSA-SHA256 签名得到 paySign。
 *
 * @param prepayId 微信预支付 ID
 * @returns JSAPI 调起参数
 */
function buildJsapiParams(prepayId: string): JsapiParams {
  const config = getConfig();
  const timeStamp = getTimestamp();
  const nonceStr = generateNonceStr();
  const packageStr = `prepay_id=${prepayId}`;

  // 构建签名串
  const signMessage = `${config.appId}\n${timeStamp}\n${nonceStr}\n${packageStr}\n`;
  const paySign = signWithPrivateKey(signMessage);

  return {
    appId: config.appId,
    timeStamp,
    nonceStr,
    package: packageStr,
    signType: "RSA",
    paySign,
  };
}

/**
 * 验证微信支付回调签名
 *
 * 验签流程：
 * 1. 根据 Wechatpay-Serial 头获取对应的微信支付平台证书
 * 2. 构建验签串：{timestamp}\n{nonce}\n{body}\n
 * 3. 使用平台证书公钥进行 RSA-SHA256 验签
 *
 * @param timestamp 回调头中的 Wechatpay-Timestamp
 * @param nonce     回调头中的 Wechatpay-Nonce
 * @param body      回调原始请求体（字符串）
 * @param signature 回调头中的 Wechatpay-Signature（Base64）
 * @param serial    回调头中的 Wechatpay-Serial（平台证书序列号）
 * @returns 验签是否通过
 */
export async function verifyNotifySignature(
  timestamp: string,
  nonce: string,
  body: string,
  signature: string,
  serial: string
): Promise<boolean> {
  if (!timestamp || !nonce || !body || !signature || !serial) {
    console.error("[wechatPay] 验签参数不完整");
    return false;
  }

  try {
    // 获取平台证书
    const certPem = await getPlatformCertificate(serial);

    // 构建验签串
    const verifyMessage = `${timestamp}\n${nonce}\n${body}\n`;

    // 使用平台证书公钥验签
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(verifyMessage, "utf-8");

    const isValid = verifier.verify(certPem, signature, "base64");

    if (!isValid) {
      console.error(`[wechatPay] 回调验签失败 — serial=${serial}`);
    }

    return isValid;
  } catch (e) {
    console.error("[wechatPay] 验签异常:", e);
    return false;
  }
}

/**
 * 解密微信支付回调通知中的加密资源数据
 *
 * 微信支付 v3 回调中的 resource 字段使用 AES-256-GCM 加密：
 * - 密钥：APIv3 密钥（32 字节）
 * - IV：resource.nonce
 * - AAD：resource.associated_data
 * - 密文：Base64 编码的 resource.ciphertext
 * - 认证标签：密文最后 16 字节
 *
 * @param ciphertext      Base64 编码的密文
 * @param nonce           加密使用的随机串（IV）
 * @param associatedData  附加数据（AAD）
 * @returns 解密后的明文字符串
 */
export function decryptResource(
  ciphertext: string,
  nonce: string,
  associatedData: string
): string {
  const config = getConfig();

  if (!config.apiV3Key) {
    throw new Error("API v3 密钥未配置（WECHAT_API_KEY_V3）");
  }

  if (!ciphertext || !nonce) {
    throw new Error("解密参数不完整：ciphertext 和 nonce 为必填项");
  }

  try {
    const key = Buffer.from(config.apiV3Key, "utf-8");

    // Base64 解码密文
    const ciphertextBuf = Buffer.from(ciphertext, "base64");

    // 密文最后 16 字节为 GCM 认证标签（authTag）
    const authTag = ciphertextBuf.subarray(ciphertextBuf.length - 16);
    const encryptedData = ciphertextBuf.subarray(0, ciphertextBuf.length - 16);

    // 创建 AES-256-GCM 解密器
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(nonce, "utf-8")
    );
    decipher.setAuthTag(authTag);
    decipher.setAAD(Buffer.from(associatedData, "utf-8"));

    // 解密
    const decrypted = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final(),
    ]);

    return decrypted.toString("utf-8");
  } catch (e) {
    console.error("[wechatPay] 解密资源数据失败:", e);
    throw new Error(
      `解密失败: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}

/**
 * 解析微信支付回调通知
 *
 * 完整流程：验签 → 解密 → 返回结构化支付数据
 *
 * @param body      回调原始请求体字符串
 * @param headers   回调请求头（小写键名）
 * @returns 解析结果，验签或解密失败时 success 为 false
 */
export async function parseNotify(
  body: string,
  headers: Record<string, string>
): Promise<{
  success: boolean;
  data?: WechatNotifyData;
  eventId?: string;
  error?: string;
}> {
  const timestamp = headers["wechatpay-timestamp"] || "";
  const nonce = headers["wechatpay-nonce"] || "";
  const signature = headers["wechatpay-signature"] || "";
  const serial = headers["wechatpay-serial"] || "";

  // 1. 验签
  const verified = await verifyNotifySignature(
    timestamp,
    nonce,
    body,
    signature,
    serial
  );

  if (!verified) {
    return {
      success: false,
      error: "回调签名验证失败",
    };
  }

  // 2. 解析回调 JSON
  let callbackBody: {
    id: string;
    event_type: string;
    resource_type: string;
    resource: {
      algorithm: string;
      ciphertext: string;
      nonce: string;
      associated_data: string;
    };
  };

  try {
    callbackBody = JSON.parse(body);
  } catch (e) {
    return {
      success: false,
      error: `回调 JSON 解析失败: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  const resource = callbackBody.resource;
  if (!resource || !resource.ciphertext || !resource.nonce) {
    return {
      success: false,
      error: "回调数据缺少 resource 字段",
    };
  }

  // 3. 解密
  let decryptedStr: string;
  try {
    decryptedStr = decryptResource(
      resource.ciphertext,
      resource.nonce,
      resource.associated_data || ""
    );
  } catch (e) {
    return {
      success: false,
      error: `回调数据解密失败: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  // 4. 解析解密后的支付数据
  let notifyData: WechatNotifyData;
  try {
    notifyData = JSON.parse(decryptedStr);
  } catch (e) {
    return {
      success: false,
      error: `解密数据 JSON 解析失败: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  return {
    success: true,
    data: notifyData,
    eventId: callbackBody.id,
  };
}

// ==================== 导出 ====================

export const wechatPay = {
  createOrder,
  verifyNotifySignature,
  decryptResource,
  parseNotify,
  getConfig,
  isConfigured,
};
