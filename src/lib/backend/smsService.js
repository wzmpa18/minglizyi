// ============================================================================
// 腾讯云短信发送服务 - v20.3
// 言道国学注册验证码短信
// 使用腾讯云SMS API v3（TC3-HMAC-SHA256签名）
// 签名：东莞言道科技有限公司  模板ID：186686  SdkAppId：1401146274
// 地区：ap-guangzhou
// 模板参数：{1}=验证码  {2}=有效时间(分钟)
// ============================================================================

'use strict';

const crypto = require('crypto');
const https = require('https');

// 从环境变量读取密钥
const SECRET_ID = process.env.TENCENT_SMS_SECRET_ID || '';
const SECRET_KEY = process.env.TENCENT_SMS_SECRET_KEY || '';

// 硬编码业务参数（不可通过环境变量覆盖）
const SIGN_NAME = '东莞言道科技有限公司';
const TEMPLATE_ID = '186686';
const SDK_APP_ID = '1401146274';

// 验证码有效时间（分钟），用于短信模板第二参数 {2}
const CODE_VALID_MINUTES = 5;

// 腾讯云 SMS API 配置
const SMS_ENDPOINT = 'sms.tencentcloudapi.com';
const SMS_SERVICE = 'sms';
const SMS_VERSION = '2021-01-11';
const SMS_ACTION = 'SendSms';
const SMS_REGION = 'ap-guangzhou';

/**
 * 腾讯云 TC3-HMAC-SHA256 签名算法
 * @param {string} secretId - 密钥ID
 * @param {string} secretKey - 密钥Key
 * @param {string} payload - 请求体JSON字符串
 * @param {string} action - API动作
 * @returns {Object} 包含签名后的 headers
 */
function buildTencentHeaders(secretId, secretKey, payload, action) {
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);

  // 1. 拼接规范请求串
  const httpRequestMethod = 'POST';
  const canonicalUri = '/';
  const canonicalQueryString = '';
  const canonicalHeaders = [
    'content-type:application/json; charset=utf-8',
    `host:${SMS_ENDPOINT}`,
    `x-tc-action:${action.toLowerCase()}`,
  ].join('\n') + '\n';
  const signedHeaders = 'content-type;host;x-tc-action';
  const hashedRequestPayload = crypto
    .createHash('sha256')
    .update(payload)
    .digest('hex');
  const canonicalRequest = [
    httpRequestMethod,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    hashedRequestPayload,
  ].join('\n');

  // 2. 拼接待签名字符串
  const algorithm = 'TC3-HMAC-SHA256';
  const hashedCanonicalRequest = crypto
    .createHash('sha256')
    .update(canonicalRequest)
    .digest('hex');
  const credentialScope = `${date}/${SMS_SERVICE}/tc3_request`;
  const stringToSign = [
    algorithm,
    timestamp,
    credentialScope,
    hashedCanonicalRequest,
  ].join('\n');

  // 3. 计算签名
  const secretDate = crypto
    .createHmac('sha256', `TC3${secretKey}`)
    .update(date)
    .digest();
  const secretService = crypto
    .createHmac('sha256', secretDate)
    .update(SMS_SERVICE)
    .digest();
  const secretSigning = crypto
    .createHmac('sha256', secretService)
    .update('tc3_request')
    .digest();
  const signature = crypto
    .createHmac('sha256', secretSigning)
    .update(stringToSign)
    .digest('hex');

  // 4. 拼接 Authorization
  const authorization = `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    'Content-Type': 'application/json; charset=utf-8',
    Authorization: authorization,
    Host: SMS_ENDPOINT,
    'X-TC-Action': action,
    'X-TC-Timestamp': String(timestamp),
    'X-TC-Version': SMS_VERSION,
    'X-TC-Region': SMS_REGION,
  };
}

/**
 * 发送 HTTPS POST 请求到腾讯云
 * @param {Object} headers - 请求头
 * @param {string} payload - 请求体
 * @returns {Promise<Object>} 响应JSON
 */
function httpsPost(headers, payload) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SMS_ENDPOINT,
      port: 443,
      path: '/',
      method: 'POST',
      headers: {
        ...headers,
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`解析腾讯云SMS响应失败: ${e.message}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(new Error(`请求腾讯云SMS失败: ${e.message}`));
    });

    req.write(payload);
    req.end();
  });
}

/**
 * 发送短信验证码
 * @param {string} phone - 手机号（11位，如 13800138000）
 * @param {string} code - 6位验证码
 * @returns {Promise<{ success: boolean, message: string }>}
 */
async function sendSmsCode(phone, code) {
  // 参数校验
  if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
    return { success: false, message: '手机号格式不正确' };
  }
  if (!code || !/^\d{6}$/.test(code)) {
    return { success: false, message: '验证码格式不正确' };
  }

  // 检查密钥配置
  if (!SECRET_ID || !SECRET_KEY) {
    console.error('[SMS] 腾讯云SMS密钥未配置 (TENCENT_SMS_SECRET_ID / TENCENT_SMS_SECRET_KEY)');
    return { success: false, message: '短信服务未正确配置' };
  }

  // 构建请求参数
  // 中国大陆手机号需加 +86 前缀
  const phoneNumber = `+86${phone}`;
  // 模板参数：{1}=验证码  {2}=有效时间(分钟)
  const templateParams = [code, String(CODE_VALID_MINUTES)];

  const params = {
    PhoneNumberSet: [phoneNumber],
    SmsSdkAppId: SDK_APP_ID,
    SignName: SIGN_NAME,
    TemplateId: TEMPLATE_ID,
    TemplateParamSet: templateParams,
  };

  const payload = JSON.stringify(params);

  try {
    const headers = buildTencentHeaders(SECRET_ID, SECRET_KEY, payload, SMS_ACTION);
    const response = await httpsPost(headers, payload);

    // 检查腾讯云API层级错误
    if (response.Response) {
      const resp = response.Response;
      if (resp.Error) {
        console.error('[SMS] 腾讯云SMS API错误:', resp.Error.Code, resp.Error.Message);
        return {
          success: false,
          message: `短信发送失败: ${resp.Error.Message}`,
        };
      }

      // 检查发送结果
      if (resp.SendStatusSet && resp.SendStatusSet.length > 0) {
        const status = resp.SendStatusSet[0];
        if (status.Code === 'Ok') {
          console.log(`[SMS] 验证码发送成功: ${phone.slice(0, 3)}****${phone.slice(-4)}`);
          return { success: true, message: '验证码已发送' };
        } else {
          console.error('[SMS] 短信发送失败:', status.Code, status.Message);
          return {
            success: false,
            message: `短信发送失败: ${status.Message}`,
          };
        }
      }
    }

    console.error('[SMS] 腾讯云SMS响应格式异常:', JSON.stringify(response));
    return { success: false, message: '短信服务异常' };
  } catch (error) {
    console.error('[SMS] 发送短信异常:', error.message);
    return { success: false, message: '短信服务异常，请稍后重试' };
  }
}

module.exports = {
  sendSmsCode,
};
