// ============================================================================
// 腾讯云邮件推送(SES)发送服务 - v20.3
// 言道国学注册验证码邮件
// 使用腾讯云SES API（TC3-HMAC-SHA256签名）
// 发件地址：noreply@yandao.vip  模板ID：186641  发件人名称：言道国学
// 地区：ap-hongkong（腾讯云SES仅支持香港区域）
// 注意：腾讯云SES默认仅支持使用模板发送邮件，Simple参数已废弃
// ============================================================================

'use strict';

const crypto = require('crypto');
const https = require('https');

// 从环境变量读取密钥
const SECRET_ID = process.env.TENCENT_SES_SECRET_ID || '';
const SECRET_KEY = process.env.TENCENT_SES_SECRET_KEY || '';

// 硬编码业务参数（不可通过环境变量覆盖）
const FROM_EMAIL = 'noreply@yandao.vip';
const FROM_NAME = '言道国学';
const TEMPLATE_ID = 186641;

// 验证码有效时间（分钟），用于邮件模板变量
const CODE_VALID_MINUTES = 5;

// 腾讯云 SES API 配置
const SES_ENDPOINT = 'ses.tencentcloudapi.com';
const SES_SERVICE = 'ses';
const SES_VERSION = '2020-10-02';
const SES_ACTION = 'SendEmail';
const SES_REGION = 'ap-hongkong';

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
    `host:${SES_ENDPOINT}`,
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
  const credentialScope = `${date}/${SES_SERVICE}/tc3_request`;
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
    .update(SES_SERVICE)
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
    Host: SES_ENDPOINT,
    'X-TC-Action': action,
    'X-TC-Timestamp': String(timestamp),
    'X-TC-Version': SES_VERSION,
    'X-TC-Region': SES_REGION,
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
      hostname: SES_ENDPOINT,
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
          reject(new Error(`解析腾讯云SES响应失败: ${e.message}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(new Error(`请求腾讯云SES失败: ${e.message}`));
    });

    req.write(payload);
    req.end();
  });
}

/**
 * 构建验证码邮件 HTML 内容
 * 此 HTML 用于参考和备用，实际发送使用腾讯云SES模板(186641)
 * 模板应包含验证码({{.code}})和有效期({{.expire}})变量
 * @param {string} code - 6位验证码
 * @returns {string} HTML邮件内容
 */
function buildEmailHtml(code) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>言道国学 - 注册验证码</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- 头部 -->
          <tr>
            <td style="background:linear-gradient(135deg,#7B2FBE,#9B4FDE);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">言道国学</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">注册验证码</p>
            </td>
          </tr>
          <!-- 内容 -->
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6;">您好，感谢您注册言道国学。</p>
              <p style="margin:0 0 24px;color:#333;font-size:15px;line-height:1.6;">您的注册验证码为：</p>
              <div style="text-align:center;margin:0 0 24px;">
                <span style="display:inline-block;padding:16px 40px;background-color:#f8f0fe;border:2px solid #7B2FBE;border-radius:8px;font-size:32px;font-weight:700;letter-spacing:8px;color:#7B2FBE;">${code}</span>
              </div>
              <p style="margin:0 0 8px;color:#666;font-size:13px;line-height:1.6;">验证码有效期为 ${CODE_VALID_MINUTES} 分钟，请尽快使用。</p>
              <p style="margin:0 0 24px;color:#666;font-size:13px;line-height:1.6;">如非本人操作，请忽略此邮件。</p>
              <div style="border-top:1px solid #eee;padding-top:16px;">
                <p style="margin:0;color:#999;font-size:12px;line-height:1.6;">此邮件由系统自动发送，请勿回复。</p>
                <p style="margin:4px 0 0;color:#999;font-size:12px;line-height:1.6;">言道国学 - 传承经典，启迪智慧</p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * 构建纯文本邮件内容
 * @param {string} code - 6位验证码
 * @returns {string} 纯文本邮件内容
 */
function buildEmailText(code) {
  return [
    '言道国学 - 注册验证码',
    '',
    '您好，感谢您注册言道国学。',
    '',
    `您的注册验证码为：${code}`,
    '',
    `验证码有效期为 ${CODE_VALID_MINUTES} 分钟，请尽快使用。`,
    '如非本人操作，请忽略此邮件。',
    '',
    '此邮件由系统自动发送，请勿回复。',
    '言道国学 - 传承经典，启迪智慧',
  ].join('\n');
}

/**
 * 发送邮件验证码（通过腾讯云SES API模板发送）
 * @param {string} email - 收件人邮箱
 * @param {string} code - 6位验证码
 * @returns {Promise<{ success: boolean, message: string }>}
 */
async function sendEmailCode(email, code) {
  // 参数校验
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, message: '邮箱地址格式不正确' };
  }
  if (!code || !/^\d{6}$/.test(code)) {
    return { success: false, message: '验证码格式不正确' };
  }

  // 检查密钥配置
  if (!SECRET_ID || !SECRET_KEY) {
    console.error('[EMAIL] 腾讯云SES密钥未配置 (TENCENT_SES_SECRET_ID / TENCENT_SES_SECRET_KEY)');
    return { success: false, message: '邮件服务未正确配置' };
  }

  // 构建请求参数
  // FromEmailAddress 格式：别名+空格+<邮箱地址>
  const fromEmailAddress = `${FROM_NAME} <${FROM_EMAIL}>`;

  // 模板变量数据（JSON字符串）
  // 模板186641应包含 {{.code}} 和 {{.expire}} 变量
  const templateData = JSON.stringify({
    code: code,
    expire: String(CODE_VALID_MINUTES),
  });

  const params = {
    FromEmailAddress: fromEmailAddress,
    Destination: [email],
    Subject: '【言道国学】注册验证码',
    Template: {
      TemplateID: TEMPLATE_ID,
      TemplateData: templateData,
    },
    TriggerType: 1, // 触发类邮件（验证码等即时发送）
    Unsubscribe: "0", // 不加入退订链接（腾讯云SES要求字符串类型）
  };

  const payload = JSON.stringify(params);

  try {
    const headers = buildTencentHeaders(SECRET_ID, SECRET_KEY, payload, SES_ACTION);
    const response = await httpsPost(headers, payload);

    // 检查腾讯云API层级错误
    if (response.Response) {
      const resp = response.Response;
      if (resp.Error) {
        console.error('[EMAIL] 腾讯云SES API错误:', resp.Error.Code, resp.Error.Message);
        return {
          success: false,
          message: `邮件发送失败: ${resp.Error.Message}`,
        };
      }

      // 发送成功，返回 MessageId
      if (resp.MessageId) {
        console.log(`[EMAIL] 验证码邮件发送成功: ${email} (messageId: ${resp.MessageId})`);
        return { success: true, message: '验证码已发送至您的邮箱' };
      }
    }

    console.error('[EMAIL] 腾讯云SES响应格式异常:', JSON.stringify(response));
    return { success: false, message: '邮件服务异常' };
  } catch (error) {
    console.error('[EMAIL] 发送邮件异常:', error.message);
    return { success: false, message: '邮件发送失败，请稍后重试' };
  }
}

module.exports = {
  sendEmailCode,
  buildEmailHtml,
  buildEmailText,
};
