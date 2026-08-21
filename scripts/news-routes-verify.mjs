// 验证脚本：newsRoutes.js 全接口断言（零依赖 shim，node scripts/news-routes-verify.mjs）
import http from 'http';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

process.env.ADMIN_API_KEY = 'test_key_123';

// ---------- 极简 express.Router shim（内联注入，不依赖全局变量传播） ----------
const SHIM_CODE = `
const __ROUTES__ = [];
const express = {
  Router: () => ({
    get: (p, h) => __ROUTES__.push({ method: 'GET', path: p, handler: h }),
    post: (p, h) => __ROUTES__.push({ method: 'POST', path: p, handler: h }),
    put: (p, h) => __ROUTES__.push({ method: 'PUT', path: p, handler: h }),
    delete: (p, h) => __ROUTES__.push({ method: 'DELETE', path: p, handler: h }),
  }),
};
globalThis.__NEWS_ROUTES__ = __ROUTES__;
`;

// ---------- 加载被测路由（数据文件重定向 + express 替换为内联 shim） ----------
const TMP_DIR = fs.mkdtempSync(path.join(process.env.TEMP || '/tmp', 'news-smoke-'));
const DATA_FILE = path.join(TMP_DIR, 'news_items.json');
const src = fs.readFileSync('backend_deploy/newsRoutes.js', 'utf-8')
  .replace("const express = require('express');", SHIM_CODE)
  .replace("path.join(__dirname, 'data', 'news_items.json')", JSON.stringify(DATA_FILE));
const tmpModule = path.join(TMP_DIR, 'newsRoutes.patched.cjs');
fs.writeFileSync(tmpModule, src, 'utf-8');
require(tmpModule);
const routes = globalThis.__NEWS_ROUTES__;

// 挂载前缀（与 server.js 注册方式一致）
const MOUNTS = ['/api/news', '/api/admin/news'];

function matchRoute(method, pathname) {
  for (const mount of MOUNTS) {
    if (pathname !== mount && !pathname.startsWith(mount + '/')) continue;
    const sub = pathname.slice(mount.length);
    const segs = sub.split('/').filter(Boolean);
    for (const r of routes) {
      if (r.method !== method) continue;
      const rSegs = r.path.split('/').filter(Boolean);
      if (rSegs.length !== segs.length) continue;
      const params = {};
      let ok = true;
      for (let i = 0; i < rSegs.length; i++) {
        if (rSegs[i].startsWith(':')) params[rSegs[i].slice(1)] = decodeURIComponent(segs[i]);
        else if (rSegs[i] !== segs[i]) { ok = false; break; }
      }
      if (ok) return { handler: r.handler, params };
    }
  }
  return null;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    const m = matchRoute(req.method, url.pathname);
    const fakeRes = {
      statusCode: 200,
      json(obj) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); },
    };
    if (!m) { fakeRes.json({ success: false, error: 'NOT_FOUND' }); return; }
    const fakeReq = {
      headers: req.headers,
      query: Object.fromEntries(url.searchParams),
      params: m.params,
      body: body ? JSON.parse(body) : {},
    };
    try { m.handler(fakeReq, fakeRes); } catch (e) { fakeRes.json({ success: false, error: e.message }); }
  });
});

await new Promise(r => server.listen(0, r));
const port = server.address().port;
const BASE = `http://127.0.0.1:${port}`;
const AUTH = { 'Authorization': 'Bearer test_key_123' };

async function req(method, urlPath, body, headers) {
  const res = await fetch(`${BASE}${urlPath}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

let pass = 0, fail = 0;
function assert(cond, name, extra) {
  if (cond) { pass++; console.log(`  OK  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}${extra !== undefined ? ' — ' + JSON.stringify(extra).slice(0, 220) : ''}`); }
}

// [1] 公开读取：默认16条
let r = await req('GET', '/api/news/public?page=1&pageSize=5');
assert(r.json.success === true, '公开接口 success', r.json);
assert(Array.isArray(r.json.news) && r.json.news.length === 5, '分页 pageSize=5', r.json.news?.length);
assert(r.json.hasMore === true, 'hasMore=true', r.json);
assert(r.json.news[0].source && r.json.news[0].sourceUrl, '首条带来源标注', r.json.news?.[0]);

// [2] 排序：默认库最旧条目（n016 = 2026-07-28）在尾部
r = await req('GET', '/api/news/public?page=1&pageSize=50');
assert(r.json.news.length === 16, '默认库共16条', r.json.news?.length);
assert(r.json.news[r.json.news.length - 1].id === 'n016', '按时间倒序（最旧在尾）', r.json.news?.[r.json.news.length - 1]);

// [3] 分类过滤
r = await req('GET', '/api/news/public?category=yixue');
const yixueCount = r.json.news.filter(n => n.category === 'yixue').length;
assert(yixueCount === r.json.news.length && yixueCount > 0, `分类过滤 yixue（${yixueCount}条全为yixue）`, r.json.news?.length);

// [4] 管理接口鉴权：无密钥拒绝
r = await req('GET', '/api/admin/news');
assert(r.json.success === false && /未授权/.test(r.json.error || ''), '无密钥拒绝', r.json);
r = await req('GET', '/api/admin/news', undefined, { 'Authorization': 'Bearer wrong' });
assert(r.json.success === false, '错误密钥拒绝', r.json);

// [5] 管理接口：正确密钥
r = await req('GET', '/api/admin/news', undefined, AUTH);
assert(r.json.success === true && r.json.data.total === 16, '管理员列表16条', r.json.data?.total);

// [6] 合规拦截：绝对化用语
r = await req('POST', '/api/admin/news', {
  title: '全网第一的中医课程来了', summary: '测试合规拦截的摘要内容超过十个字',
  source: '测试源', sourceUrl: 'https://example.com/a',
  publishedAt: '2026-08-21T00:00:00Z', category: 'zhongyi',
}, AUTH);
assert(r.json.success === false && /全网第一/.test(r.json.error || ''), '拦截「全网第一」', r.json);

// [7] 合规拦截：根治
r = await req('POST', '/api/admin/news', {
  title: '这个方子能根治百病', summary: '测试合规拦截的摘要内容超过十个字',
  source: '测试源', sourceUrl: 'https://example.com/b',
  publishedAt: '2026-08-21T00:00:00Z', category: 'zhongyi',
}, AUTH);
assert(r.json.success === false && /根治/.test(r.json.error || ''), '拦截「根治」', r.json);

// [8] 字段校验：来源为空
r = await req('POST', '/api/admin/news', {
  title: '正常标题四个字', summary: '足够长的摘要内容超过十个字',
  source: '', sourceUrl: 'https://example.com/c',
  publishedAt: '2026-08-21T00:00:00Z', category: 'zhongyi',
}, AUTH);
assert(r.json.success === false && /来源/.test(r.json.error || ''), '来源必填校验', r.json);

// [9] 正常新增
r = await req('POST', '/api/admin/news', {
  title: '测试新增的正常资讯标题', summary: '这是一条测试新增的资讯摘要，超过十个字',
  source: '测试新闻源', sourceUrl: 'https://example.com/normal',
  publishedAt: '2026-08-22T00:00:00Z', category: 'yixue',
}, AUTH);
assert(r.json.success === true && r.json.data.id, '正常新增成功', r.json);
const newId = r.json.data?.id;

// [10] 公开接口可见新条目且排最前（时间最新）
r = await req('GET', '/api/news/public?category=yixue');
assert(r.json.news[0].id === newId, '新条目公开可见且排最前', r.json.news?.[0]);

// [11] 更新
r = await req('PUT', `/api/admin/news/${newId}`, {
  title: '更新后的测试资讯标题', summary: '这是更新后的资讯摘要内容，超过十个字',
  source: '测试新闻源2', sourceUrl: 'https://example.com/updated',
  publishedAt: '2026-08-22T01:00:00Z', category: 'yixue',
}, AUTH);
assert(r.json.success === true, '更新成功', r.json);

// [12] 更新不存在条目
r = await req('PUT', '/api/admin/news/not_exist', {
  title: '更新后的测试资讯标题', summary: '这是更新后的资讯摘要内容，超过十个字',
  source: '测试新闻源2', sourceUrl: 'https://example.com/updated',
  publishedAt: '2026-08-22T01:00:00Z', category: 'yixue',
}, AUTH);
assert(r.json.success === false && /不存在/.test(r.json.error || ''), '更新不存在条目拒绝', r.json);

// [13] 删除
r = await req('DELETE', `/api/admin/news/${newId}`, undefined, AUTH);
assert(r.json.success === true, '删除成功', r.json);
r = await req('GET', '/api/admin/news', undefined, AUTH);
assert(r.json.data.total === 16, '删除后恢复16条', r.json.data?.total);

// [14] 恢复默认
r = await req('POST', '/api/admin/news/reset', undefined, AUTH);
assert(r.json.success === true && r.json.data.total === 16, '恢复默认16条', r.json);

// [15] 数据落盘校验
const stored = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
assert(Array.isArray(stored.items) && stored.items.length === 16, 'JSON文件落盘', stored.items?.length);

server.close();
fs.rmSync(TMP_DIR, { recursive: true, force: true });
console.log(`\n===== NEWS ROUTES SMOKE: ${pass} passed, ${fail} failed =====`);
process.exit(fail > 0 ? 1 : 0);
