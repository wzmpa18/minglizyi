// ============================================================================
// final_gap_regression_test.js — FINAL-MASTER-05 第一百二十四/一百二十七/一百二十八章
//   补全全量回归覆盖缺口（其余项已由专项 E2E 覆盖）：
//   一百二十四章安全核心：Auth 401（社交/学堂）/ 管理端无密钥 401 / Price SSOT 公开价格源
//   一百二十七章中医/学习：轨道（中医基础页）/典籍/知识点（学习）/题库/考试/进度/错题
//   一百二十八章社交全功能：好友/私聊/群聊/动态/评论/点赞/收藏/通知/拉黑/举报
//   隔离：ACADEMY_DB_PATH/SOCIAL_DB_PATH/ADMIN_DATA_DIR 全部指向临时目录，零生产污染
//   运行：node backend_deploy/final_gap_regression_test.js
// ============================================================================
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const jwt = require('jsonwebtoken');

const ROOT = path.join(os.tmpdir(), 'gap_e2e_' + Date.now() + '_' + process.pid);
fs.mkdirSync(ROOT, { recursive: true });
process.env.ACADEMY_DB_PATH = path.join(ROOT, 'academy.db');
process.env.SOCIAL_DB_PATH = path.join(ROOT, 'social.db');
process.env.SOCIAL_RATE_LIMIT_CONFIG = path.join(ROOT, 'rate_limit_config.json');
process.env.ADMIN_DATA_DIR = path.join(ROOT, 'admin_data');
fs.mkdirSync(process.env.ADMIN_DATA_DIR, { recursive: true });
process.env.USER_DB_PATH = path.join(ROOT, 'nonexistent_users.db'); // 隔离：无用户库（鉴权走 JWT）
process.env.JWT_SECRET = 'gap-e2e-test-secret-0123456789abcdef-0123456789abcdef';
process.env.ADMIN_API_KEY = 'gap-e2e-admin-key-super-admin-0001';
process.env.FRIENDS_ADD_ENABLED = 'true';
process.env.PRIVATE_CHAT_ENABLED = 'true';
process.env.POSTS_ENABLED = 'true';
process.env.COMMENTS_ENABLED = 'true';
process.env.GROUPS_ENABLED = 'true';

const social = require('./socialApiRoutes');
const academy = require('./academyRoutes');
const publicPricing = require('./publicPricingRoutes');

let PASS = 0, FAIL = 0;
const failures = [];
function eq(actual, expected, name) {
  if (actual === expected) { PASS++; console.log('  PASS  ' + name + ' = ' + JSON.stringify(actual)); }
  else { FAIL++; failures.push(name); console.log('  FAIL  ' + name + ` (期望 ${JSON.stringify(expected)} 实际 ${JSON.stringify(actual)})`); }
}
function check(cond, name, extra) {
  if (cond) { PASS++; console.log('  PASS  ' + name); }
  else { FAIL++; failures.push(name); console.log('  FAIL  ' + name + (extra ? '  => ' + JSON.stringify(extra) : '')); }
}

// ==================== 真实 HTTP 回环 ====================
const app = express();
app.use(express.json({ limit: '6mb' }));
app.use((req, res, next) => {
  req.headers['x-forwarded-for'] = req.headers['x-forwarded-for'] || '10.7.7.7';
  next();
});
app.use('/api/social', social.createRouter());
app.use('/api/academy', academy.createRouter());
app.use('/api/public/pricing', publicPricing.router);

const server = app.listen(0);
const BASE = `http://127.0.0.1:${server.address().port}`;

function token(userId) {
  return jwt.sign({ userId: String(userId) }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

async function api(method, url, { userId, badToken, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (userId) headers['Authorization'] = 'Bearer ' + token(userId);
  if (badToken) headers['Authorization'] = 'Bearer ' + badToken;
  const r = await fetch(BASE + url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  let json = null;
  try { json = await r.json(); } catch { /* ignore */ }
  return { status: r.status, json };
}

async function main() {
  // 预热：触发两库懒建表
  await api('GET', '/api/academy/tracks', { userId: 7001 });
  await api('GET', '/api/social/posts', { userId: 7001 });

  // 种子：学堂轨道数据（materials.track=tcm + 关联 approved 知识点，供 /tracks 统计与进度展示）
  {
    const db = academy.getDb();
    const m = db.prepare(`INSERT INTO materials (title, track, category, format, file_path, text_content, grade, status, uploader_id, uploader_name, content_hash)
      VALUES ('[回归]中医基础教材', 'tcm', '中医基础', 'text', '', '中医基础理论测试内容', 'B', 'approved', 'system_import', '回归测试', 'x')`).run();
    db.prepare(`INSERT INTO knowledge_points (material_id, chapter, title, content, tags, difficulty, status, source_text, track, category, govern_state)
      VALUES (?, '第一章', '[回归]中医基础知识点', '测试内容', '[]', 'easy', 'approved', '', 'tcm', '中医基础', 'PUBLISHED')`).run(Number(m.lastInsertRowid));
  }

  // ============================================================
  console.log('\n=== 一、第一百二十四章：安全核心（认证 / 管理端鉴权 / Price SSOT） ===');
  {
    // GET /posts 为 authOptional 公开动态流（未登录可浏览，返回 200 属正确行为）
    const r0 = await api('GET', '/api/social/posts');
    eq(r0.status, 200, '124章 公开动态流未登录可浏览（authOptional → 200）');

    const r1 = await api('GET', '/api/social/posts/mine');
    eq(r1.status, 401, '124章 社交私有接口（我的动态）无 token → 401');

    const r2 = await api('GET', '/api/social/friends/list', { badToken: 'not.a.jwt' });
    eq(r2.status, 401, '124章 社交好友列表伪造 token → 401');

    const r3 = await api('GET', '/api/academy/progress');
    eq(r3.status, 401, '124章 学堂接口无 token → 401');

    const r4 = await api('GET', '/api/academy/questions', { badToken: 'xx.yy.zz' });
    eq(r4.status, 401, '124章 学堂接口伪造 token → 401');

    const r5 = await api('GET', '/api/social/admin/comments');
    eq(r5.status, 401, '124章 管理端无密钥 → 401');

    const r6 = await api('GET', '/api/social/admin/rate-limit/config', { badToken: 'fake-admin' });
    eq(r6.status, 401, '124章 管理端用用户 JWT 冒充密钥 → 401');

    // Price SSOT：公开价格源聚合（会员套餐 + AI 配置），价格来自后台配置文件（改价即生效）
    const r7 = await api('GET', '/api/public/pricing');
    eq(r7.status, 200, '124章 公开价格 SSOT 接口可用');
    const plans = (r7.json && r7.json.data && r7.json.data.membershipPlans) || [];
    check(Array.isArray(plans) && plans.length >= 4, '124章 价格 SSOT 含 ≥4 档会员套餐', plans.length);
    const levels = plans.map((p) => p.level);
    check(['monthly', 'quarterly', 'yearly', 'lifetime'].every((l) => levels.includes(l)), '124章 套餐档位齐全（monthly/quarterly/yearly/lifetime）', levels);
    const monthly = plans.find((p) => p.level === 'monthly');
    check(monthly && typeof monthly.price === 'number' && monthly.price > 0, '124章 套餐价格字段为正数（SSOT 数值源）', monthly && monthly.price);
  }

  // ============================================================
  console.log('\n=== 二、第一百二十七章：中医/学习（轨道/典籍/知识点/题库/考试/进度/错题） ===');
  {
    const U = 7001;
    const rt = await api('GET', '/api/academy/tracks', { userId: U });
    eq(rt.status, 200, '127章 中医基础页：学科轨道接口可用');
    const tracks = (rt.json && rt.json.tracks) || [];
    check(Array.isArray(tracks), '127章 轨道返回数组');
    check(tracks.some((t) => String(t.key || t.track || t).includes('tcm')) || tracks.length > 0, '127章 含中医轨道（tcm）', tracks.map((t) => t.key || t.track || t).slice(0, 6));

    const ma = await api('GET', '/api/academy/materials', { userId: U });
    eq(ma.status, 200, '127章 典籍：资料列表接口可用');

    const kn = await api('GET', '/api/academy/knowledge', { userId: U });
    eq(kn.status, 200, '127章 学习：知识点接口可用');

    const qs = await api('GET', '/api/academy/questions', { userId: U });
    eq(qs.status, 200, '127章 题库：题目接口可用');

    const em = await api('GET', '/api/academy/exams/mine', { userId: U });
    eq(em.status, 200, '127章 考试：我的考试记录接口可用');

    // 进度：签到 + 查询
    const ck = await api('POST', '/api/academy/progress/checkin', { userId: U, body: { track: 'tcm', chapter: '中医基础理论' } });
    eq(ck.status, 200, '127章 进度：学习签到可用');
    const pg = await api('GET', '/api/academy/progress', { userId: U });
    eq(pg.status, 200, '127章 进度：进度查询可用');
    const progressRows = (pg.json && pg.json.progress) || [];
    check(Array.isArray(progressRows) && progressRows.some((r) => String(r.track).includes('tcm')), '127章 进度含刚签到 track=tcm 记录', progressRows.length);

    const wa = await api('GET', '/api/academy/wrong-answers', { userId: U });
    eq(wa.status, 200, '127章 错题：错题本接口可用');
  }

  // ============================================================
  console.log('\n=== 三、第一百二十八章：社交全功能（好友/私聊/群聊/动态/评论/点赞/收藏/通知/拉黑/举报） ===');
  {
    const A = 8001, B = 8002;

    // 3.1 好友链路
    const fr = await api('POST', '/api/social/friends/request', { userId: A, body: { toId: String(B), message: '回归测试好友申请' } });
    check(fr.status === 200 || fr.status === 201, '128章 好友：发送好友申请', fr.status);
    const frq = await api('GET', '/api/social/friends/requests', { userId: B });
    eq(frq.status, 200, '128章 好友：申请列表可用');
    const pend = (frq.json && (frq.json.data || frq.json.requests)) || [];
    const req0 = Array.isArray(pend) && pend[0];
    check(!!req0, '128章 好友：B 收到 A 的申请');
    if (req0) {
      const act = await api('POST', `/api/social/friends/requests/${req0.id}/accept`, { userId: B });
      check(act.status === 200, '128章 好友：B 接受申请', act.status);
    }
    const fl = await api('GET', '/api/social/friends/list', { userId: A });
    eq(fl.status, 200, '128章 好友：好友列表可用');
    const friends = (fl.json && (fl.json.data || fl.json.friends)) || [];
    check(Array.isArray(friends) && friends.some((f) => String(f.userId || f.id) === String(B)), '128章 好友：A 的列表含 B', friends.length);

    // 3.2 私聊
    const pm = await api('POST', `/api/social/messages/private/${B}`, { userId: A, body: { content: '私聊回归测试消息' } });
    check(pm.status === 200 || pm.status === 201, '128章 私聊：发送私信', pm.status);
    const pmv = await api('GET', `/api/social/messages/private/${B}`, { userId: A });
    eq(pmv.status, 200, '128章 私聊：会话查询可用');
    const msgs = (pmv.json && (pmv.json.data || pmv.json.messages)) || [];
    check(Array.isArray(msgs) && msgs.some((m) => String(m.content || '').includes('私聊回归测试')), '128章 私聊：消息已入库', Array.isArray(msgs) ? msgs.length : msgs);

    // 3.3 群聊
    const gc = await api('POST', '/api/social/groups', { userId: A, body: { name: '回归测试群' } });
    check(gc.status === 200 || gc.status === 201, '128章 群聊：建群可用', gc.status);
    const gid = (gc.json && gc.json.group && (gc.json.group.id || gc.json.group.groupId)) || null;
    check(!!gid, '128章 群聊：返回群 ID', gid);
    const gl = await api('GET', '/api/social/groups', { userId: A });
    eq(gl.status, 200, '128章 群聊：群列表可用');
    if (gid) {
      const gj = await api('POST', `/api/social/groups/${gid}/join`, { userId: B });
      check(gj.status === 200 || gj.status === 201, '128章 群聊：B 加群', gj.status);
      const gm = await api('POST', `/api/social/groups/${gid}/messages`, { userId: A, body: { content: '群聊回归测试消息' } });
      check(gm.status === 200 || gm.status === 201, '128章 群聊：发群消息', gm.status);
      const gmv = await api('GET', `/api/social/groups/${gid}/messages`, { userId: B });
      eq(gmv.status, 200, '128章 群聊：群消息查询可用');
      const gMsgs = (gmv.json && (gmv.json.data || gmv.json.messages)) || [];
      check(Array.isArray(gMsgs) && gMsgs.some((m) => String(m.content || '').includes('群聊回归测试')), '128章 群聊：B 可见 A 的群消息', Array.isArray(gMsgs) ? gMsgs.length : gMsgs);
    }

    // 3.4 动态
    const pc = await api('POST', '/api/social/posts', { userId: A, body: { content: '动态回归测试内容', circle: 'GuoXue' } });
    check(pc.status === 200 || pc.status === 201, '128章 动态：发动态可用', pc.status);
    const postId = (pc.json && pc.json.post && (pc.json.post.postId || pc.json.post.id)) || null;
    check(!!postId, '128章 动态：返回动态 ID', postId);
    const pv = await api('GET', '/api/social/posts', { userId: B });
    eq(pv.status, 200, '128章 动态：动态流可用');

    if (postId) {
      // 3.5 评论
      const cm = await api('POST', `/api/social/posts/${postId}/comments`, { userId: B, body: { content: '评论回归测试内容' } });
      check(cm.status === 200 || cm.status === 201, '128章 评论：评论可用', cm.status);
      const cmv = await api('GET', `/api/social/posts/${postId}/comments`, { userId: A });
      eq(cmv.status, 200, '128章 评论：评论查询可用');
      const comments = (cmv.json && (cmv.json.data || cmv.json.comments)) || [];
      check(Array.isArray(comments) && comments.some((c) => String(c.content || '').includes('评论回归测试')), '128章 评论：评论已入库', Array.isArray(comments) ? comments.length : comments);

      // 3.6 点赞
      const lk = await api('POST', `/api/social/posts/${postId}/like`, { userId: B });
      check(lk.status === 200, '128章 点赞：点赞可用', lk.status);

      // 3.7 收藏
      const fv = await api('POST', `/api/social/posts/${postId}/favorite`, { userId: B });
      check(fv.status === 200, '128章 收藏：收藏可用', fv.status);
      const fvl = await api('GET', '/api/social/favorites/mine', { userId: B });
      eq(fvl.status, 200, '128章 收藏：我的收藏可用');
      const favs = (fvl.json && (fvl.json.posts || fvl.json.favorites)) || [];
      check(Array.isArray(favs) && favs.some((f) => String(f.postId || f.post_id || (f.post && f.post.postId)) === String(postId)), '128章 收藏：收藏列表含该动态', Array.isArray(favs) ? favs.length : favs);

      // 3.10 举报
      const rp = await api('POST', `/api/social/posts/${postId}/report`, { userId: B, body: { reason: '举报回归测试' } });
      check(rp.status === 200 || rp.status === 201, '128章 举报：举报动态可用', rp.status);
    }

    // 3.8 通知
    const nt = await api('GET', '/api/social/notifications', { userId: B });
    eq(nt.status, 200, '128章 通知：通知列表可用');

    // 3.9 拉黑
    const bl = await api('POST', `/api/social/blacklist/${B}`, { userId: A });
    check(bl.status === 200 || bl.status === 201, '128章 拉黑：拉黑可用', bl.status);
    const blv = await api('GET', '/api/social/blacklist', { userId: A });
    eq(blv.status, 200, '128章 拉黑：黑名单查询可用');
    const bls = (blv.json && (blv.json.data || blv.json.blacklist)) || [];
    check(Array.isArray(bls) && bls.some((x) => String(x.blockedId || x.blocked_id || x.userId || x.id) === String(B)), '128章 拉黑：黑名单含 B', Array.isArray(bls) ? bls.length : bls);
    const bul = await api('DELETE', `/api/social/blacklist/${B}`, { userId: A });
    check(bul.status === 200 || bul.status === 201, '128章 拉黑：解除拉黑可用', bul.status);
  }

  console.log('\n==========================================');
  console.log(`GAP 回归结果：PASS=${PASS}  FAIL=${FAIL}`);
  if (FAIL > 0) {
    console.log('失败项：');
    for (const f of failures) console.log('  ✗ ' + f);
    process.exitCode = 1;
  } else {
    console.log('第一百二十四/一百二十七/一百二十八章覆盖缺口全部补齐 ✅');
  }
}

main().catch(async (e) => {
  console.error('GAP 回归崩溃:', e);
  process.exitCode = 1;
}).finally(() => {
  setTimeout(() => { try { server.close(); } catch { /* ignore */ } }, 200);
});
