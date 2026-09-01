// ============================================================================
// 言道国学 - 微信草稿箱服务（指令书第五十九~六十三章）
// - 官方草稿接口 draft/add|update|delete|get + 永久素材上传（封面）
// - 失败重试：最多3次指数退避（5s/15s/45s）；429限流立即延迟（第七十七~七十八章）
// - 禁止自动群发：本模块不实现 mass send 接口（第六十二章代码层禁止）
// ============================================================================
const fs = require('fs');
const path = require('path');
const { getAccessToken } = require('./wechatTokenManager');

const WX_BASE = 'https://api.weixin.qq.com/cgi-bin';
const RETRY_DELAYS_MS = [5000, 15000, 45000];

async function callWx(method, url, body, attempt = 0) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 429) {
    const wait = parseInt(res.headers.get('retry-after') || '5', 10) * 1000;
    throw Object.assign(new Error('WECHAT_RATE_LIMITED'), { retryAfterMs: wait, rateLimited: true });
  }
  const data = await res.json();
  // 40001/42001：token失效 → 强刷一次重试
  if ((data.errcode === 40001 || data.errcode === 42001) && attempt < 3) {
    const { invalidate } = require('./wechatTokenManager');
    invalidate('access_token');
    const fresh = await getAccessToken(true);
    const newUrl = url.replace(/access_token=[^&]+/, `access_token=${fresh}`);
    return callWx(method, newUrl, body, attempt + 1);
  }
  if (data.errcode && data.errcode !== 0) {
    throw Object.assign(new Error(`WECHAT_API_ERROR ${data.errcode}: ${data.errmsg}`), { errcode: data.errcode });
  }
  return data;
}

async function withRetry(fn, label) {
  let lastErr = null;
  for (let i = 0; i < RETRY_DELAYS_MS.length; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (e.rateLimited) {
        await new Promise((r) => setTimeout(r, e.retryAfterMs || RETRY_DELAYS_MS[i]));
      } else if (e.message && e.message.startsWith('WECHAT_API_ERROR')) {
        throw e; // 业务错误不盲目重试
      } else if (i < RETRY_DELAYS_MS.length - 1) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[i]));
      }
    }
  }
  throw lastErr || new Error(`${label}失败`);
}

// 封面图上传为永久素材 → media_id
async function uploadCoverImage(imagePath) {
  const token = await getAccessToken();
  const buf = fs.readFileSync(imagePath);
  const fileName = path.basename(imagePath);
  const form = new FormData();
  form.append('media', new Blob([buf], { type: 'image/png' }), fileName);
  const res = await fetch(`${WX_BASE}/material/add_material?access_token=${token}&type=image`, { method: 'POST', body: form });
  const data = await res.json();
  if (!data.media_id) throw new Error(`封面上传失败: ${data.errcode || ''} ${data.errmsg || ''}`);
  return data.media_id;
}

// 新建草稿（官方 draft/add）。articles 结构见微信官方文档
async function createDraft(article) {
  return withRetry(async () => {
    const token = await getAccessToken();
    return callWx('POST', `${WX_BASE}/draft/add?access_token=${token}`, { articles: [article] });
  }, 'createDraft');
}

// 更新草稿
async function updateDraft(mediaId, index, article) {
  return withRetry(async () => {
    const token = await getAccessToken();
    return callWx('POST', `${WX_BASE}/draft/update?access_token=${token}`, { media_id: mediaId, index, articles: { ...article } });
  }, 'updateDraft');
}

// 删除草稿
async function deleteDraft(mediaId) {
  return withRetry(async () => {
    const token = await getAccessToken();
    return callWx('POST', `${WX_BASE}/draft/delete?access_token=${token}`, { media_id: mediaId });
  }, 'deleteDraft');
}

// 获取草稿总数/列表（验收用：确认项目方后台可见）
async function getDraftCount() {
  const token = await getAccessToken();
  return callWx('POST', `${WX_BASE}/draft/count?access_token=${token}`, {});
}

async function getDraftList(offset = 0, count = 5) {
  const token = await getAccessToken();
  return callWx('POST', `${WX_BASE}/draft/batchget?access_token=${token}`, { offset, count, no_content: 1 });
}

module.exports = { createDraft, updateDraft, deleteDraft, getDraftCount, getDraftList, uploadCoverImage };
