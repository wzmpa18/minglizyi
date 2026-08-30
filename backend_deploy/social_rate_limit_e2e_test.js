// ============================================================================
// social_rate_limit_e2e_test.js — 社交限频 + 评论层级/删除 隔离测试
//                              （FINAL-MASTER-05 第七十五~八十、一百一十八~一百二十章）
//   - 隔离临时 social.db / admin 数据目录 / 配置文件（env 覆盖，不碰生产 data/）
//   - 直接调引擎 + supertest 风格路由内省（真实 express app + fetch 回环）
//   - 覆盖：
//       75章  服务端社交限频正式落地（三维度）
//       76章  userId / IP / endpoint category 维度
//       77章  六类重点接口 category 枚举
//       78章  正常聊天不误伤（默认值内连续通过）
//       79章  刷屏 → 429 + 短期封锁窗口（窗口内同维度全拒）
//       80章  后台可调配置（更新生效 + Audit 留痕 + 手动解封）
//      118章  评论层级回复 parentId（回复回复自动拍平两级）
//      119章  作者删除自己评论 / 管理员删除 / 其他人禁止
//      120章  两级展示防无限嵌套（三层回复挂在根下）
// ============================================================================
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const jwt = require('jsonwebtoken');

const ROOT = path.join(os.tmpdir(), 'soc_rl_e2e_' + Date.now() + '_' + process.pid);
fs.mkdirSync(ROOT, { recursive: true });
process.env.SOCIAL_DB_PATH = path.join(ROOT, 'social.db');
process.env.SOCIAL_RATE_LIMIT_CONFIG = path.join(ROOT, 'rate_limit_config.json');
process.env.ADMIN_DATA_DIR = path.join(ROOT, 'admin_data');
fs.mkdirSync(process.env.ADMIN_DATA_DIR, { recursive: true });
process.env.USER_DB_PATH = path.join(ROOT, 'nonexistent_users.db'); // 隔离：无用户库（鉴权走 JWT）
process.env.JWT_SECRET = 'soc-rl-e2e-test-secret-0123456789abcdef-0123456789abcdef';
process.env.ADMIN_API_KEY = 'e2e-admin-key-super-admin-test-0001';
// 隔离真实 data/social_feature_config.json（其中 comments/groups/posts 为 false）：
// featureEnabled 支持同名大写环境变量覆盖，测试强制全开。
process.env.FRIENDS_ADD_ENABLED = 'true';
process.env.PRIVATE_CHAT_ENABLED = 'true';
process.env.POSTS_ENABLED = 'true';
process.env.COMMENTS_ENABLED = 'true';
process.env.GROUPS_ENABLED = 'true';

const rateLimit = require('./socialRateLimit');
const social = require('./socialApiRoutes');
const Database = require('better-sqlite3');

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
  // 统一注入固定测试 IP（x-forwarded-for 模拟反向代理来源）
  req.headers['x-forwarded-for'] = req.headers['x-forwarded-for'] || '10.9.9.9';
  next();
});
app.use('/api/social', social.createRouter());  // createRouter 触发建表/迁移

const server = app.listen(0);
const PORT = server.address().port;
const BASE = `http://127.0.0.1:${PORT}/api/social`;

function token(userId) {
  return jwt.sign({ userId: String(userId) }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

async function api(method, url, { userId, ip, body, adminKey } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (userId) headers['Authorization'] = 'Bearer ' + token(userId);
  if (adminKey) headers['Authorization'] = 'Bearer ' + adminKey;
  if (ip) headers['x-forwarded-for'] = ip;
  const r = await fetch(BASE + url, {
    method, headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try { json = await r.json(); } catch { /* ignore */ }
  return { status: r.status, json, retryAfter: r.headers.get('retry-after') };
}

function getDb() { return new Database(process.env.SOCIAL_DB_PATH); }

async function main() {
  // 预热：触发 getDb() 懒建表（此后测试可直接写库）
  await api('GET', '/posts');

  // 种子：一个动态 + 用户（users 库隔离缺失时 userPublicInfo 回退默认昵称，不影响功能）
  {
    const d = getDb();
    d.prepare(`INSERT INTO posts (post_id, user_id, nickname, avatar, content, images, tags, tool_type, circle)
      VALUES ('p_test_001', '1001', '测试作者', '', '测试动态内容', '[]', '[]', '', 'GuoXue')`).run();
  }

  console.log('\n=== 1) 第七十五~七十七章：限频引擎（三维度 + 六类目） ===');
  {
    // 引擎重置为干净状态
    check(rateLimit.CATEGORIES.length === 6, '77章 六类重点接口枚举', rateLimit.CATEGORIES);
    eq(rateLimit.CATEGORIES.includes('friend_request')
      && rateLimit.CATEGORIES.includes('private_message')
      && rateLimit.CATEGORIES.includes('group_message')
      && rateLimit.CATEGORIES.includes('post_publish')
      && rateLimit.CATEGORIES.includes('comment')
      && rateLimit.CATEGORIES.includes('report'), true, '77章 类目覆盖（好友/私聊/群聊/动态/评论/举报）');

    const cfg = rateLimit.getConfig();
    check(cfg.enabled === true, '默认启用');
    check(cfg.limits.private_message.perUser.limit >= 20, `78章 私聊默认 ≥20条/窗口（${cfg.limits.private_message.perUser.limit}/${cfg.limits.private_message.perUser.windowSec}s）不误伤正常聊天`);
    check(cfg.limits.comment.perUser.limit >= 10, `78章 评论默认 ≥10条/窗口（${cfg.limits.comment.perUser.limit}）`);

    // userId 维度
    const mkReq = (uid, ip) => ({ user: { userId: uid }, headers: { 'x-forwarded-for': ip || '10.1.1.1' }, socket: { remoteAddress: ip || '127.0.0.1' } });
    let r = rateLimit.check({ category: 'comment', userId: 'u-rl-1', req: mkReq('u-rl-1') });
    eq(r.allowed, true, '76章 userId 维度首次放行');

    // IP 维度（匿名：仅 IP 计数）
    r = rateLimit.check({ category: 'comment', userId: '', req: mkReq('', '10.2.2.2') });
    eq(r.allowed, true, '76章 IP 维度（匿名）放行');

    // 未知类目 → 放行（不误伤新接口）
    r = rateLimit.check({ category: 'unknown_cat', userId: 'u1', req: mkReq('u1') });
    eq(r.allowed && r.unknownCategory, true, '未知类目放行（不误伤）');
  }

  console.log('\n=== 2) 第七十八~七十九章：正常通过 / 刷屏 429 + 封锁窗口 ===');
  {
    // 78章：正常连续评论（默认 12/60s 内）全部 200
    let okCount = 0;
    for (let i = 0; i < 5; i++) {
      const r = await api('POST', '/posts/p_test_001/comments', { userId: 2001, body: { content: `正常评论第${i + 1}条内容测试` } });
      if (r.status === 200 && r.json && r.json.success) okCount++;
    }
    eq(okCount, 5, '78章 正常连续 5 条评论不触发 429');

    // 79章：刷屏（连续超过 perUser 上限）→ 429
    let limited = null;
    for (let i = 0; i < 20; i++) {
      const r = await api('POST', '/posts/p_test_001/comments', { userId: 2001, body: { content: `刷屏评论第${i + 1}条快速发送测试内容` } });
      if (r.status === 429) { limited = r; break; }
    }
    check(!!limited, '79章 刷屏触发 429');
    check(limited && limited.json && limited.json.code === 'RATE_LIMITED', '429 响应携带 RATE_LIMITED code');
    check(limited && limited.json && limited.json.scope === 'user', '限频维度标注 user');
    check(limited && Number(limited.retryAfter) > 0, `Retry-After 响应头 = ${limited && limited.retryAfter}`);
    check(limited && Number(limited.json.retryAfterSec) > 0, 'retryAfterSec 返回秒数');

    // 继续刷屏达到封锁阈值（3 次违规）
    let blocked = null;
    for (let i = 0; i < 15; i++) {
      const r = await api('POST', '/posts/p_test_001/comments', { userId: 2001, body: { content: '继续刷屏触发封锁窗口测试' } });
      if (r.json && r.json.error && String(r.json.error).includes('刷屏保护')) { blocked = r; break; }
      if (r.status === 429 && r.json && r.json.reason && String(r.json.reason).includes('刷屏')) { blocked = r; break; }
    }
    check(!!blocked, '79章 达阈值进入短期封锁窗口');

    // 封锁窗口内：同用户同类目即使换 IP 也拒
    const rBlocked = await api('POST', '/posts/p_test_001/comments', { userId: 2001, ip: '10.8.8.8', body: { content: '换IP也该被封锁窗口拦截' } });
    eq(rBlocked.status, 429, '封锁窗口内换 IP 仍拒绝（userId 维度优先）');

    // 其他用户不受影响
    const rOther = await api('POST', '/posts/p_test_001/comments', { userId: 2002, body: { content: '其他用户正常评论不受影响' } });
    eq(rOther.status, 200, '封锁不影响其他用户');

    // 限频事件留痕落库
    const d = getDb();
    const events = d.prepare(`SELECT COUNT(*) n FROM rate_limit_events WHERE user_id = '2001'`).get().n;
    check(events >= 3, `限频违规留痕落库（${events} 条）`);
  }

  console.log('\n=== 3) 第七十六~七十九章：IP 维度 + 六类接口全挂载 ===');
  {
    // post_publish 类目：独立计数（评论刷屏不影响动态发布）
    const rPost = await api('POST', '/posts', { userId: 2002, body: { content: '限频分类目独立计数测试动态', circle: 'GuoXue' } });
    eq(rPost.status, 200, '77章 动态发布独立类目（不受评论限频影响）');

    // IP 维度刷屏：多匿名账号同 IP（临时调低 perUser 走纯 IP 上限验证）
    const rCfg = rateLimit.updateConfig({ limits: { private_message: { perUser: { limit: 50, windowSec: 60 }, perIp: { limit: 3, windowSec: 60 } } } });
    eq(rCfg.ok, true, '80章 动态调整配置生效（调低 perIp=3）');
    let ipLimited = null;
    const ip = '10.77.77.77';
    for (let i = 0; i < 6; i++) {
      const r = await api('POST', '/messages/private/99001', { userId: 3000 + i, ip, body: { content: `IP维度刷屏消息${i + 1}` } });
      if (r.status === 429 && r.json && r.json.scope === 'ip') { ipLimited = r; break; }
    }
    check(!!ipLimited, '76章 IP 维度独立触发 429（scope=ip）', ipLimited && ipLimited.json);
    // 私聊接口正常业务校验也走了限频管道（非好友/不存在用户被业务层拒绝 ≠ 限频拒绝）
    const rAny = await api('POST', '/messages/private/99001', { userId: 3009, ip, body: { content: '继续验证IP维度' } });
    check(rAny.status === 429, 'IP 封锁后同 IP 新账号仍拒', { status: rAny.status, body: rAny.json && rAny.json.error });

    // 还原配置（避免影响后续类目）
    rateLimit.updateConfig({ limits: { private_message: { perUser: { limit: 30, windowSec: 60 }, perIp: { limit: 120, windowSec: 60 } } } });

    // 举报类目挂载验证（不存在的目标走业务 404，未登录走 401——都不是 429 即挂载正常且业务链路活）
    const rRepNoAuth = await api('POST', '/posts/p_test_001/report', { body: { reason: 'test' } });
    eq(rRepNoAuth.status, 401, '77章 举报接口鉴权前置正常');
    const rRep = await api('POST', '/posts/p_test_001/report', { userId: 2002, body: { reason: '测试举报' } });
    check(rRep.status === 200 || rRep.status === 404, '举报接口业务链路正常（已挂限频）', rRep.json);

    // 好友申请类目
    const rFriend = await api('POST', '/friends/request', { userId: 2002, body: { toId: '88888', message: '测试' } });
    check(rFriend.status === 200 || rFriend.status === 400, '77章 好友申请接口挂载正常', rFriend.json && rFriend.json.error);

    // 群聊消息类目（不存在群 → 业务 404；限频已过管道）
    const rGroup = await api('POST', '/groups/999999/messages', { userId: 2002, body: { content: '群消息限频测试' } });
    eq(rGroup.status, 404, '77章 群聊消息接口挂载正常（业务404）');
  }

  console.log('\n=== 4) 第八十章：后台配置调整 + 解封 + Audit ===');
  {
    const rCfgGet = await api('GET', '/admin/rate-limit/config', { adminKey: process.env.ADMIN_API_KEY });
    eq(rCfgGet.status, 200, '80章 后台读取限频配置');
    check(rCfgGet.json && rCfgGet.json.data && rCfgGet.json.data.limits, '配置结构返回完整');

    // 修改配置（收紧评论限制 → 生效）
    const rCfgPut = await api('PUT', '/admin/rate-limit/config', {
      adminKey: process.env.ADMIN_API_KEY,
      body: { limits: { comment: { perUser: { limit: 2, windowSec: 60 }, perIp: { limit: 60, windowSec: 60 } } }, reason: 'E2E收紧测试' },
    });
    eq(rCfgPut.status, 200, '80章 后台调整限频配置成功');
    eq(rCfgPut.json.data.limits.comment.perUser.limit, 2, '调整后评论上限=2');

    // 新配置立刻生效（新用户 2003 连发 3 条，第 3 条 429）
    const uid = 2003;
    await api('POST', '/posts/p_test_001/comments', { userId: uid, body: { content: '配置后第一条' } });
    await api('POST', '/posts/p_test_001/comments', { userId: uid, body: { content: '配置后第二条' } });
    const rThird = await api('POST', '/posts/p_test_001/comments', { userId: uid, body: { content: '配置后第三条应被拒' } });
    eq(rThird.status, 429, '调整后新上限立即生效');

    // 非法配置拒绝
    const rBad = await api('PUT', '/admin/rate-limit/config', {
      adminKey: process.env.ADMIN_API_KEY,
      body: { limits: { comment: { perUser: { limit: -5, windowSec: 60 }, perIp: { limit: 60, windowSec: 60 } } } },
    });
    eq(rBad.status, 400, '非法限频配置拒绝（负值）');

    // 无密钥拒绝
    const rNoKey = await api('GET', '/admin/rate-limit/config', {});
    eq(rNoKey.status, 401, '限频管理端密钥鉴权（无密钥401）');

    // stats
    const rStats = await api('GET', '/admin/rate-limit/stats', { adminKey: process.env.ADMIN_API_KEY });
    eq(rStats.status, 200, '80章 限频运行状态查询');
    check(rStats.json && rStats.json.data && Array.isArray(rStats.json.data.recentViolations), '近期违规留痕返回');
    check(rStats.json && rStats.json.data && rStats.json.data.eventCount24h >= 3, `24h 违规事件统计（${rStats.json && rStats.json.data && rStats.json.data.eventCount24h}）`);
    check(rStats.json && rStats.json.data && rStats.json.data.activeBlocks.length >= 1, '活跃封锁列表返回');

    // 解封（uid 2003 被评 429 后可能未达封锁阈值；对 2001 已封锁者解封）
    const rUnblock = await api('POST', '/admin/rate-limit/unblock', {
      adminKey: process.env.ADMIN_API_KEY,
      body: { category: 'comment', userId: '2001', reason: 'E2E人工解封' },
    });
    eq(rUnblock.status, 200, '80章 人工解封接口');
    eq(rUnblock.json.data.removed, true, '2001 封锁已解除');

    // 恢复默认配置（不污染后续用例）
    await api('PUT', '/admin/rate-limit/config', {
      adminKey: process.env.ADMIN_API_KEY,
      body: { limits: { comment: { perUser: { limit: 12, windowSec: 60 }, perIp: { limit: 60, windowSec: 60 } } } },
    });

    // Audit 留痕
    const auditFile = path.join(process.env.ADMIN_DATA_DIR, 'admin_audit.json');
    const logs = JSON.parse(fs.readFileSync(auditFile, 'utf-8'));
    const rateAudits = logs.filter((x) => x.action === 'SOCIAL_RATE_LIMIT_CONFIG' || x.action === 'SOCIAL_RATE_LIMIT_UNBLOCK');
    check(rateAudits.length >= 2, `80章 限频操作 Audit 留痕（${rateAudits.length} 条）`);
  }

  console.log('\n=== 5) 第一百一十八~一百二十章：评论层级 + 删除 ===');
  {
    // 新用户 2004（评论类目计数已被第2节 2001 刷爆？→ 不同 userId 独立计数；IP 也已被 10.9.9.9 消耗部分额度）
    // 为避免 IP 维度干扰：使用新 IP
    const ip = '10.66.66.66';
    const uid = 2004;

    // 根评论
    const r1 = await api('POST', '/posts/p_test_001/comments', { userId: uid, ip, body: { content: '根评论：这条是第一层' } });
    eq(r1.status, 200, '118章 根评论发布成功');
    const c1 = r1.json.comment;

    // 回复根评论（第二层）
    const r2 = await api('POST', '/posts/p_test_001/comments', { userId: uid, ip, body: { content: '回复根评论：这是第二层', parentId: c1.id } });
    eq(r2.status, 200, '118章 层级回复发布成功');
    const c2 = r2.json.comment;
    eq(c2.parentId, c1.id, '118章 parentId 正确挂接');

    // 回复回复（第三层）→ 120章：自动拍平挂到根（存库 parent_id = 根 id）
    const r3 = await api('POST', '/posts/p_test_001/comments', { userId: uid, ip, body: { content: '回复回复：应拍平到根', parentId: c2.id } });
    eq(r3.status, 200, '120章 回复“回复”允许发布');
    const c3 = r3.json.comment;
    eq(c3.parentId, c1.id, '120章 第三层拍平：parent_id 指向根评论');

    // 两级读视图
    const rView = await api('GET', '/posts/p_test_001/comments', { ip });
    eq(rView.status, 200, '两级读视图返回');
    const roots = rView.json.roots;
    const root1 = roots.find((r) => r.id === c1.id);
    check(!!root1, '根评论出现在 roots');
    check(root1 && Array.isArray(root1.replies) && root1.replies.length >= 2, '120章 根下聚合两条回复（两级展示）', root1 && root1.replies && root1.replies.map((x) => x.id));
    check(rView.json.comments.every((c) => c.rootId !== undefined), '平铺视图兼容字段（rootId）保留');

    // 非法 parentId：跨动态
    {
      const d = getDb();
      d.prepare(`INSERT INTO posts (post_id, user_id, nickname, avatar, content, images, tags, tool_type, circle)
        VALUES ('p_test_002', '1001', '测试作者', '', '第二条动态', '[]', '[]', '', 'GuoXue')`).run();
      d.prepare(`INSERT INTO comments (post_id, user_id, nickname, content, parent_id) VALUES ('p_test_002', '1001', '作者', '另一动态的评论', 0)`).run();
      const otherId = d.prepare(`SELECT id FROM comments WHERE post_id = 'p_test_002' LIMIT 1`).get().id;
      const rCross = await api('POST', '/posts/p_test_001/comments', { userId: uid, ip, body: { content: '跨动态回复应拒绝', parentId: String(otherId) } });
      eq(rCross.status, 400, '118章 跨动态回复拒绝');
    }

    // 119章：其他人不能删除
    const rDelOther = await api('DELETE', `/comments/${c2.id}`, { userId: 2005, ip });
    eq(rDelOther.status, 403, '119章 其他用户删除被拒（403）');

    // 119章：作者删除自己评论（软删除）
    const rDel = await api('DELETE', `/comments/${c2.id}`, { userId: uid, ip });
    eq(rDel.status, 200, '119章 作者删除自己评论成功');
    const deletedRow = getDb().prepare('SELECT * FROM comments WHERE id = ?').get(Number(c2.id));
    eq(deletedRow.deleted, 1, '软删除标记落库');
    check(String(deletedRow.content).includes('已删除'), '删除后内容占位');
    eq(deletedRow.deleted_by, String(uid), '删除人留痕');

    // 重复删除幂等
    const rDelAgain = await api('DELETE', `/comments/${c2.id}`, { userId: uid, ip });
    eq(rDelAgain.status, 200, '重复删除幂等');

    // 已删除评论不能被回复
    const rReplyDeleted = await api('POST', '/posts/p_test_001/comments', { userId: uid, ip, body: { content: '回复已删除评论应拒绝', parentId: c2.id } });
    eq(rReplyDeleted.status, 404, '已删除评论不可回复');

    // 119章：管理员删除任意评论
    const rAdminDel = await api('DELETE', `/admin/comments/${c3.id}`, { adminKey: process.env.ADMIN_API_KEY, ip, body: { reason: 'E2E管理员删除' } });
    eq(rAdminDel.status, 200, '119章 管理员删除评论成功');

    // 后台评论列表
    const rAdminList = await api('GET', '/admin/comments', { adminKey: process.env.ADMIN_API_KEY, ip });
    eq(rAdminList.status, 200, '119章 后台评论列表');
    const delRows = await api('GET', '/admin/comments?deleted=1', { adminKey: process.env.ADMIN_API_KEY, ip });
    check(delRows.json && delRows.json.data && delRows.json.data.length >= 2, '删除列表过滤（≥2条软删除）', delRows.json && delRows.json.data && delRows.json.data.length);

    // 无密钥拒绝
    const rAdminNoKey = await api('DELETE', `/admin/comments/${c1.id}`, { ip });
    eq(rAdminNoKey.status, 401, '管理删除密钥鉴权（401）');
  }

  console.log('\n=== 6) 既有功能回归：平铺评论兼容（无 parentId 老客户端） ===');
  {
    // 老客户端不带 parentId 的评论照常成功（默认 0）
    const r = await api('POST', '/posts/p_test_001/comments', { userId: 2006, ip: '10.55.55.55', body: { content: '老客户端无parentId兼容评论' } });
    eq(r.status, 200, '无 parentId 兼容（默认根评论）');
    eq(r.json.comment.parentId, '0', '默认 parentId=0');

    // 列表平铺字段保留（comments 数组，兼容旧前端）
    const rv = await api('GET', '/posts/p_test_001/comments', { ip: '10.55.55.55' });
    check(Array.isArray(rv.json.comments) && rv.json.comments.length >= 4, '平铺 comments 数组保留（兼容）');
  }

  server.close();
  console.log('\n========================================');
  console.log(`SOCIAL RATE-LIMIT + COMMENT E2E: PASS=${PASS}  FAIL=${FAIL}`);
  if (FAIL > 0) {
    console.log('失败项：');
    for (const f of failures) console.log('  - ' + f);
    process.exitCode = 1;
  } else {
    console.log('全部通过 ✅（隔离库 = ' + process.env.SOCIAL_DB_PATH + '）');
  }
  console.log('========================================');
}

main().catch((e) => {
  console.error('[SOC-RL-E2E] 致命错误:', e);
  try { server.close(); } catch { /* ignore */ }
  process.exitCode = 1;
});
