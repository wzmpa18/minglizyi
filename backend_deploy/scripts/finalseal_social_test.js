// ============================================================================
// FINAL-SEAL-20260826 P3 任务8: 社交六链路真实验收
// SOCIAL_A=910077 SOCIAL_B=910078 SOCIAL_C=910079
// S1好友 S2私聊 S3群聊 S4动态 S5通知 S6治理(拉黑/举报/后台处理/禁言)
// 全部走真实HTTP API + 真实JWT；测试后清理测试数据（保留admin审计日志）
// ============================================================================
process.env.DB_PATH = '/root/backend-auth/data/yandao_users.db';
const Database = require('better-sqlite3');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '/www/yandaoguoxue-backend/.env' });

const udb = new Database(process.env.DB_PATH); // 用户库(禁言/封禁操作)
const API = 'http://127.0.0.1:3001';
const ADMIN_KEY = process.env.ADMIN_API_KEY;
const A = '910077', B = '910078', C = '910079';
const tk = (id) => jwt.sign({ userId: Number(id), phone: String(id) }, process.env.JWT_SECRET, { expiresIn: '2h' });
const TA = tk(A), TB = tk(B), TC = tk(C);

let PASS = 0, FAIL = 0, NOTIMPL = [];
const check = (name, ok, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  ' + (detail || '')}`);
  ok ? PASS++ : FAIL++;
};
const note = (name, msg) => { NOTIMPL.push(`${name}: ${msg}`); console.log(`NOTE  ${name}: ${msg}`); };

async function req(method, path, token, body) {
  const r = await fetch(`${API}/api/social${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, json: await r.json().catch(() => ({})) };
}
async function admin(method, path, body) {
  const r = await fetch(`${API}/api/admin/unified${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_KEY}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, json: await r.json().catch(() => ({})) };
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  // ========== 预清理：移除三账号间历史测试关系 ==========
  const sdbPath = '/www/yandaoguoxue-backend/data/social.db';
  const sdb = new Database(sdbPath);
  const preClean = () => {
    const pair = (x, y) => [x, y].sort().join('_');
    sdb.prepare(`DELETE FROM friendships WHERE user_a || '_' || user_b IN (?,?,?)`).run(pair(A,B), pair(A,C), pair(B,C));
    sdb.prepare(`DELETE FROM friend_requests WHERE (from_id IN (?,?,?) AND to_id IN (?,?,?)) AND created_at > datetime('now','-2 days')`).run(A,B,C,A,B,C);
    sdb.prepare('DELETE FROM blacklists WHERE (user_id=? AND blocked_id=?) OR (user_id=? AND blocked_id=?)').run(A,B,B,A);
    sdb.prepare(`DELETE FROM groups WHERE name LIKE 'FINAL-SEAL测试群%'`).run();
    sdb.prepare(`DELETE FROM posts WHERE post_id LIKE 'p%' AND user_id IN (?,?,?) AND created_at > datetime('now','-1 day')`).run(A,B,C);
  };
  preClean();
  console.log('预清理完成\n');

  // ================= S1 好友关系 =================
  console.log('===== S1 好友关系 =====');
  // 1. A查B资料（搜索入口的API面）
  let r = await req('GET', `/users/${B}/profile`, TA);
  check('S1-1 A可查B公开资料', r.status === 200 && r.json.success === true, JSON.stringify(r.json).slice(0, 100));
  // 2. A发好友申请
  r = await req('POST', '/friends/request', TA, { toId: B, message: 'FINAL-SEAL验收' });
  const reqId = r.json.requestId;
  check('S1-2 A发好友申请成功', r.json.success === true && !!reqId, JSON.stringify(r.json).slice(0, 100));
  // 3. B收到申请
  r = await req('GET', '/friends/requests', TB);
  const got = (r.json.requests || []).find(x => x.id === reqId);
  check('S1-3 B收到申请', !!got, JSON.stringify(r.json).slice(0, 150));
  // 重复申请（pending时）
  r = await req('POST', '/friends/request', TA, { toId: B });
  check('S1-4 重复申请被拒(等待对方处理)', r.json.success === false, JSON.stringify(r.json).slice(0, 100));
  // 4. B接受
  r = await req('POST', `/friends/requests/${reqId}/accept`, TB);
  check('S1-5 B接受申请', r.json.success === true, JSON.stringify(r.json).slice(0, 100));
  // 5. 双方好友列表
  r = await req('GET', '/friends/list', TA);
  check('S1-6 A好友列表含B', (r.json.friends || []).some(f => f.userId === B));
  r = await req('GET', '/friends/list', TB);
  check('S1-7 B好友列表含A(双向一致)', (r.json.friends || []).some(f => f.userId === A));
  // 已是好友再次申请
  r = await req('POST', '/friends/request', TA, { toId: B });
  check('S1-8 已是好友再次申请被拒', r.json.success === false && /已是好友/.test(r.json.error || ''), JSON.stringify(r.json).slice(0, 100));
  // 6. A删除B
  r = await req('DELETE', `/friends/${B}`, TA);
  check('S1-9 A删除B成功', r.json.success === true);
  r = await req('GET', '/friends/list', TA);
  check('S1-10 A列表不再有B', !(r.json.friends || []).some(f => f.userId === B));
  r = await req('GET', '/friends/list', TB);
  check('S1-11 B列表同步消失(状态一致)', !(r.json.friends || []).some(f => f.userId === A));
  // 7. 重新申请→B拒绝
  r = await req('POST', '/friends/request', TA, { toId: B });
  const reqId2 = r.json.requestId;
  r = await req('POST', `/friends/requests/${reqId2}/reject`, TB);
  check('S1-12 B拒绝申请', r.json.success === true);
  r = await req('GET', '/friends/list', TA);
  check('S1-13 拒绝后不成为好友', !(r.json.friends || []).some(f => f.userId === B));
  // 8. A/B同时互加（并发）→ autoAccept
  const [ra, rb] = await Promise.all([
    req('POST', '/friends/request', TA, { toId: B }),
    new Promise(res => sleep(200).then(() => res(req('POST', '/friends/request', TB, { toId: A })))),
  ]);
  const auto = ra.json.autoAccepted || rb.json.autoAccepted;
  r = await req('GET', '/friends/list', TA);
  const bothFriends = (r.json.friends || []).some(f => f.userId === B);
  check('S1-14 互向申请自动成为好友(无重复边)', auto === true && bothFriends, `a=${JSON.stringify(ra.json).slice(0,60)} b=${JSON.stringify(rb.json).slice(0,60)}`);
  const edgeCount = sdb.prepare('SELECT COUNT(*) c FROM friendships WHERE (user_a=? AND user_b=?) OR (user_a=? AND user_b=?)').get(A,B,B,A).c;
  check('S1-15 数据库无重复好友边(=1)', edgeCount === 1, `edges=${edgeCount}`);

  // ================= S2 私聊 =================
  console.log('\n===== S2 私聊 =====');
  const cmi1 = `fs-a-${Date.now()}`;
  r = await req('POST', `/messages/private/${B}`, TA, { content: 'S2测试消息A→B', clientMsgId: cmi1 });
  const msgId1 = r.json.message && r.json.message.id;
  check('S2-1 A发文字给B', r.json.success === true && !!msgId1, JSON.stringify(r.json).slice(0, 120));
  check('S2-2 服务端字段齐全(id/senderId/createdAt)', !!(r.json.message && r.json.message.id && r.json.message.senderId === A && r.json.message.createdAt), JSON.stringify(r.json.message).slice(0, 150));
  // clientMsgId幂等
  r = await req('POST', `/messages/private/${B}`, TA, { content: 'S2测试消息A→B', clientMsgId: cmi1 });
  check('S2-3 clientMsgId幂等(重发不重复)', r.json.success === true && r.json.duplicated === true, JSON.stringify(r.json).slice(0, 100));
  // B回复
  r = await req('POST', `/messages/private/${A}`, TB, { content: 'S2回复B→A' });
  check('S2-4 B回复A', r.json.success === true);
  // B拉取历史
  r = await req('GET', `/messages/private/${A}`, TB);
  const hist = r.json.messages || [];
  check('S2-5 B拉取历史含A消息', hist.some(m => m.senderId === A && /S2测试消息/.test(m.content)), `共${hist.length}条`);
  // A拉取历史
  r = await req('GET', `/messages/private/${B}`, TA);
  check('S2-6 A历史含B回复', (r.json.messages || []).some(m => m.senderId === B && /S2回复/.test(m.content)));
  // 分页 afterId
  r = await req('GET', `/messages/private/${B}?afterId=${msgId1}`, TA);
  check('S2-7 afterId增量拉取(不含旧消息)', !(r.json.messages || []).some(m => m.id === msgId1), `返回${(r.json.messages||[]).length}条`);
  // 未读数: C给A发3条 → A会话未读3 → read后清零
  for (let i = 0; i < 3; i++) await req('POST', `/messages/private/${A}`, TC, { content: `S2未读测试${i + 1}` });
  r = await req('GET', '/conversations', TA);
  const convCA = (r.json.conversations || []).find(c => c.type === 'private' && String(c.lastMessage.senderId) === C);
  check('S2-8 A会话未读数=3', convCA && convCA.unread === 3, JSON.stringify(convCA).slice(0, 120));
  await req('POST', `/conversations/${convCA.conversationId}/read`, TA);
  r = await req('GET', '/conversations', TA);
  const convCA2 = (r.json.conversations || []).find(c => c.conversationId === convCA.conversationId);
  check('S2-9 进入会话未读清零', convCA2 && convCA2.unread === 0, JSON.stringify(convCA2).slice(0, 120));
  // 空消息拒绝
  r = await req('POST', `/messages/private/${B}`, TA, { content: '   ' });
  check('S2-10 空消息拒绝(400)', r.status === 400);

  // ================= S3 群聊 =================
  console.log('\n===== S3 群聊 =====');
  r = await req('POST', '/groups', TA, { name: 'FINAL-SEAL测试群1' });
  const g = r.json.group;
  const gid = g && g.groupId;
  check('S3-1 A创建群(服务端生成groupId)', r.json.success === true && /^\d+$/.test(String(gid)), JSON.stringify(r.json).slice(0, 120));
  check('S3-2 群主=A且默认成员1人', g.ownerId === A && g.memberCount === 1, JSON.stringify(g).slice(0, 100));
  // 邀请B/C
  r = await req('POST', `/groups/${gid}/invite`, TA, { userIds: [B, C] });
  check('S3-3 A邀请B/C入群', r.json.success === true && (r.json.added || []).length === 2, JSON.stringify(r.json).slice(0, 100));
  // 群详情
  r = await req('GET', `/groups/${gid}/detail`, TA);
  check('S3-4 群详情: 3成员+群主A', r.json.success === true && r.json.group.memberCount === 3 && String(r.json.group.ownerId) === A, JSON.stringify(r.json).slice(0, 120));
  // A设B为管理员
  r = await req('POST', `/groups/${gid}/admins`, TA, { userId: B, action: 'set' });
  check('S3-5 A设B管理员', r.json.success === true && (r.json.admins || []).includes(B), JSON.stringify(r.json).slice(0, 100));
  // 群消息三方
  const gcmi = `fs-g-${Date.now()}`;
  r = await req('POST', `/groups/${gid}/messages`, TA, { content: '群消息A', clientMsgId: gcmi });
  check('S3-6 A发群消息', r.json.success === true);
  r = await req('POST', `/groups/${gid}/messages`, TB, { content: '群消息B' });
  check('S3-7 B(管理员)发群消息', r.json.success === true);
  r = await req('POST', `/groups/${gid}/messages`, TC, { content: '群消息C' });
  check('S3-8 C(普通成员)发群消息', r.json.success === true);
  // 幂等
  r = await req('POST', `/groups/${gid}/messages`, TA, { content: '群消息A', clientMsgId: gcmi });
  check('S3-9 群消息clientMsgId幂等', r.json.success === true && r.json.duplicated === true);
  // 各自拉历史
  for (const [t, name] of [[TA, 'A'], [TB, 'B'], [TC, 'C']]) {
    r = await req('GET', `/groups/${gid}/messages`, t);
    const ms = r.json.messages || [];
    const ok = ms.some(m => /群消息A/.test(m.content)) && ms.some(m => /群消息B/.test(m.content)) && ms.some(m => /群消息C/.test(m.content));
    check(`S3-10${name} ${name}拉群历史含全部3条`, ok, `${name}看到${ms.length}条`);
  }
  // 越权: B管理员不能踢群主A
  r = await req('POST', `/groups/${gid}/kick`, TB, { userId: A });
  check('S3-11 B(管理员)踢群主 => 403', r.status === 403, `status=${r.status} ${JSON.stringify(r.json).slice(0,80)}`);
  // C普通成员不能踢人
  r = await req('POST', `/groups/${gid}/kick`, TC, { userId: B });
  check('S3-12 C(普通成员)踢人 => 403', r.status === 403, `status=${r.status}`);
  // B管理员踢C
  r = await req('POST', `/groups/${gid}/kick`, TB, { userId: C });
  check('S3-13 B(管理员)踢C成功', r.json.success === true, JSON.stringify(r.json).slice(0, 80));
  // C被踢后访问群
  r = await req('GET', `/groups/${gid}/messages`, TC);
  check('S3-14 被踢C读群消息 => 403你不是群成员', r.status === 403 && /不是群成员/.test(r.json.error || ''), `status=${r.status} ${JSON.stringify(r.json).slice(0,80)}`);
  r = await req('POST', `/groups/${gid}/messages`, TC, { content: '被踢后发言' });
  check('S3-15 被踢C发群消息 => 403', r.status === 403);
  // C群列表无此群
  r = await req('GET', '/groups', TC);
  check('S3-16 C群列表无该群', !((r.json.groups || []).some(x => String(x.id) === String(gid))), JSON.stringify(r.json).slice(0, 100));
  // 重新邀请C, C退群
  await req('POST', `/groups/${gid}/invite`, TA, { userIds: [C] });
  r = await req('POST', `/groups/${gid}/leave`, TC);
  check('S3-17 普通成员C退群成功', r.json.success === true, JSON.stringify(r.json).slice(0, 80));
  // 群主退群被拒（需先转让/解散）
  r = await req('POST', `/groups/${gid}/leave`, TA);
  const ownerLeaveBlocked = r.json.success === false || r.status === 400 || r.status === 403;
  check('S3-18 群主直接退群被拒(避免无主群)', ownerLeaveBlocked, `status=${r.status} ${JSON.stringify(r.json).slice(0,80)}`);
  // 管理员B退群(角色清理)
  r = await req('POST', `/groups/${gid}/leave`, TB);
  check('S3-19 管理员B退群成功', r.json.success === true);
  r = await req('GET', `/groups/${gid}/detail`, TA);
  const adminsAfter = (r.json.group && r.json.group.admins) || [];
  check('S3-20 B退群后管理员列表清理', !adminsAfter.includes(B), JSON.stringify(adminsAfter));
  // 解散
  r = await req('POST', `/groups/${gid}/dissolve`, TA);
  check('S3-21 群主解散群成功', r.json.success === true && r.json.dissolved === true);
  r = await req('GET', `/groups/${gid}/messages`, TB);
  check('S3-22 解散后旧URL => 404群不存在', r.status === 404, `status=${r.status}`);
  r = await req('POST', `/groups/${gid}/messages`, TA, { content: '解散后' });
  check('S3-23 解散后群主也不能发言', r.status === 404);

  // ================= S4 动态 =================
  console.log('\n===== S4 动态 =====');
  r = await req('POST', '/posts', TA, { content: 'FINAL-SEAL验收动态：八字入门', circle: 'Bazi' });
  const post = r.json.post;
  const pid = post && post.postId;
  check('S4-1 A发纯文字动态(圈层Bazi)', r.json.success === true && !!pid, JSON.stringify(r.json).slice(0, 120));
  // B在feed可见
  r = await req('GET', '/posts', TB);
  check('S4-2 B在feed看到A动态', (r.json.posts || []).some(p => p.postId === pid), `feed共${(r.json.posts||[]).length}条`);
  // 无圈层拒绝
  r = await req('POST', '/posts', TA, { content: '无圈层动态' });
  check('S4-3 无圈层动态被拒(400)', r.status === 400, `status=${r.status}`);
  // 点赞toggle
  r = await req('POST', `/posts/${pid}/like`, TB);
  const lc1 = r.json.likeCount;
  check('S4-4 B点赞 +1', r.json.success === true && r.json.liked === true && lc1 === (post.likeCount + 1), `likeCount=${lc1}`);
  // 快速连点2次(取消+再赞) → 净+1
  await req('POST', `/posts/${pid}/like`, TB);
  r = await req('POST', `/posts/${pid}/like`, TB);
  check('S4-5 连点3次净效果=+1(toggle幂等)', r.json.likeCount === lc1, `likeCount=${r.json.likeCount} vs 首赞后=${lc1}`);
  // 取消点赞
  r = await req('POST', `/posts/${pid}/like`, TB);
  check('S4-6 取消点赞 -1', r.json.liked === false && r.json.likeCount === lc1 - 1, `likeCount=${r.json.likeCount}`);
  // 评论
  r = await req('POST', `/posts/${pid}/comments`, TB, { content: 'B的评论' });
  const cmt = r.json.comment;
  check('S4-7 B评论A动态', r.json.success === true && !!cmt, JSON.stringify(r.json).slice(0, 100));
  r = await req('POST', `/posts/${pid}/comments`, TC, { content: 'C回复B的评论(扁平)' });
  check('S4-8 C再评论(扁平结构)', r.json.success === true);
  r = await req('GET', `/posts/${pid}/comments`, TA);
  const cmts = r.json.comments || [];
  check('S4-9 A看到2条评论且刷新存在', cmts.length === 2 && cmts.some(x => /B的评论/.test(x.content)) && cmts.some(x => /C回复/.test(x.content)), `共${cmts.length}条`);
  note('S4-10 评论层级回复', 'API为扁平评论无parentId，C回复B仅为平铺新评论（NOT_IMPLEMENTED层级）');
  note('S4-11 评论删除', '无评论删除端点（作者/他人均不可删）NOT_IMPLEMENTED');
  // 收藏
  r = await req('POST', `/posts/${pid}/favorite`, TB);
  check('S4-12 B收藏动态', r.json.success === true, JSON.stringify(r.json).slice(0, 80));
  r = await req('GET', '/favorites/mine', TB);
  check('S4-13 我的收藏可见', (r.json.favorites || []).some(p => p.postId === pid), JSON.stringify(r.json).slice(0, 100));
  r = await req('POST', `/posts/${pid}/favorite`, TB);
  r = await req('GET', '/favorites/mine', TB);
  check('S4-14 取消收藏后消失', !((r.json.favorites || []).some(p => p.postId === pid)));
  // XSS输入: 存储安全（原样存储返回，前端负责转义渲染——验证无异常）
  r = await req('POST', '/posts', TA, { content: '<script>alert(1)</script>测试', circle: 'GuoXue' });
  const xssPost = r.json.post;
  check('S4-15 XSS输入不炸(存储成功无白屏)', r.json.success === true && /alert\(1\)/.test(xssPost.content || ''), JSON.stringify(r.json).slice(0, 100));
  // emoji/特殊字符
  r = await req('POST', '/posts', TA, { content: 'emoji测试😀🎉&<>"\'', circle: 'GuoXue' });
  check('S4-16 emoji/特殊字符正常', r.json.success === true);
  // 用户主页
  r = await req('GET', `/users/${A}/profile`, TB);
  check('S4-17 用户主页(资料+动态数+关系)', r.json.success === true && r.json.profile && r.json.rel && r.json.rel.isFriend === true, JSON.stringify(r.json).slice(0, 150));
  // 他人删除动态被拒
  r = await req('DELETE', `/posts/${pid}`, TB);
  check('S4-18 B删A的动态 => 403', r.status === 403, `status=${r.status}`);

  // ================= S5 通知 =================
  console.log('\n===== S5 通知 =====');
  r = await req('GET', '/notifications', TB);
  const nb = r.json;
  const hasFriendReq = (nb.notifications || []).some(n => n.type === 'friend_request');
  const hasInvite = (nb.notifications || []).some(n => n.type === 'group_invite');
  check('S5-1 B收到好友申请通知', hasFriendReq, JSON.stringify((nb.notifications||[]).slice(0,3)).slice(0,150));
  check('S5-2 B收到群邀请通知', hasInvite);
  r = await req('GET', '/notifications', TA);
  const hasAccepted = (r.json.notifications || []).some(n => n.type === 'friend_accepted');
  const hasComment = (r.json.notifications || []).some(n => n.type === 'comment');
  check('S5-3 A收到好友通过通知', hasAccepted);
  check('S5-4 A收到评论通知', hasComment);
  check('S5-5 未读数>0', (r.json.unread || 0) > 0, `unread=${r.json.unread}`);
  await req('POST', '/notifications/read-all', TA);
  r = await req('GET', '/notifications', TA);
  check('S5-6 read-all后未读=0', r.json.unread === 0, `unread=${r.json.unread}`);
  check('S5-7 已读不回弹(通知仍在但read=1)', (r.json.notifications || []).length > 0 && (r.json.notifications || []).every(n => n.read === true));

  // ================= S6 治理 =================
  console.log('\n===== S6 治理 =====');
  // 拉黑
  r = await req('POST', `/blacklist/${B}`, TA);
  check('S6-1 A拉黑B', r.json.success === true, JSON.stringify(r.json).slice(0, 80));
  r = await req('POST', `/messages/private/${A}`, TB, { content: '被拉黑后私聊' });
  check('S6-2 拉黑后B私聊A => 403', r.status === 403, `status=${r.status} ${JSON.stringify(r.json).slice(0,80)}`);
  r = await req('DELETE', `/blacklist/${B}`, TA);
  check('S6-3 解除拉黑', r.json.success === true);
  r = await req('POST', `/messages/private/${A}`, TB, { content: '解除后私聊恢复' });
  check('S6-4 解除后私聊恢复', r.json.success === true, JSON.stringify(r.json).slice(0, 80));
  // 举报
  r = await req('POST', `/posts/${pid}/report`, TB, { reason: 'FINAL-SEAL测试举报：内容违规测试' });
  check('S6-5 B举报A动态', r.json.success === true, JSON.stringify(r.json).slice(0, 80));
  r = await req('POST', `/posts/${pid}/report`, TB, { reason: '重复举报' });
  check('S6-6 重复举报幂等', r.json.success === true && r.json.duplicated === true);
  // 后台查看举报
  r = await admin('GET', '/moderation/reports?status=pending');
  const reports = (r.json.data && r.json.data.reports) || [];
  const myReport = reports.find(x => x.target_id === pid && x.reporter_id == B);
  check('S6-7 后台可见该举报', !!myReport, `pending举报${reports.length}条`);
  // 后台处理举报 resolve + 下架动态
  r = await admin('POST', `/moderation/reports/${myReport.id}/action`, { action: 'resolve', reason: 'FINAL-SEAL验收处理' });
  check('S6-8 后台处理举报(resolve)', r.json.success === true && r.json.data.status === 'resolved', JSON.stringify(r.json).slice(0, 100));
  r = await admin('POST', `/moderation/posts/${pid}/action`, { action: 'takedown', reason: 'FINAL-SEAL验收下架' });
  check('S6-9 后台下架动态(takedown)', r.json.success === true, JSON.stringify(r.json).slice(0, 100));
  r = await req('GET', `/posts/${pid}`, TB);
  check('S6-10 下架后详情不可访问(404)', r.status === 404, `status=${r.status}`);
  r = await req('GET', '/posts', TB);
  check('S6-11 下架后feed消失', !((r.json.posts || []).some(p => p.postId === pid)));
  // 禁言(平台级): 禁言B 40秒 → 发动态/评论/私聊/群消息全403 → 到期恢复
  console.log('--- 禁言测试(40秒窗口) ---');
  const until = new Date(Date.now() + 40 * 1000).toISOString();
  udb.prepare('UPDATE users SET muted_until = ? WHERE user_id = ?').run(until, Number(B));
  r = await req('POST', '/posts', TB, { content: '禁言中发动态', circle: 'GuoXue' });
  check('S6-12 禁言中发动态 => 403 USER_MUTED', r.status === 403 && r.json.code === 'USER_MUTED', JSON.stringify(r.json).slice(0, 100));
  r = await req('POST', `/messages/private/${A}`, TB, { content: '禁言中私聊' });
  check('S6-13 禁言中私聊 => 403', r.status === 403);
  r = await req('GET', '/posts', TB);
  check('S6-14 禁言中读取正常(只限制发布)', r.json.success === true);
  console.log('--- 等待禁言到期(45秒) ---');
  await sleep(45000);
  r = await req('POST', `/messages/private/${A}`, TB, { content: '禁言到期后恢复' });
  check('S6-15 禁言到期自动恢复', r.json.success === true, JSON.stringify(r.json).slice(0, 80));
  udb.prepare('UPDATE users SET muted_until = NULL WHERE user_id = ?').run(Number(B));

  // ================= 收尾清理 =================
  console.log('\n===== 清理测试数据 =====');
  const cleanResult = {};
  cleanResult.posts = sdb.prepare(`DELETE FROM posts WHERE user_id IN (?,?,?) AND created_at > datetime('now','-1 day')`).run(A,B,C).changes;
  cleanResult.comments = sdb.prepare(`DELETE FROM comments WHERE user_id IN (?,?,?) AND created_at > datetime('now','-1 day')`).run(A,B,C).changes;
  cleanResult.likes = sdb.prepare(`DELETE FROM likes WHERE user_id IN (?,?,?)`).run(A,B,C).changes;
  cleanResult.favorites = sdb.prepare(`DELETE FROM favorites WHERE user_id IN (?,?,?)`).run(A,B,C).changes;
  cleanResult.groups = sdb.prepare(`DELETE FROM groups WHERE name LIKE 'FINAL-SEAL测试群%'`).run().changes;
  cleanResult.friendships = sdb.prepare(`DELETE FROM friendships WHERE user_a IN (?,?,?) AND user_b IN (?,?,?)`).run(A,B,C,A,B,C).changes;
  cleanResult.requests = sdb.prepare(`DELETE FROM friend_requests WHERE from_id IN (?,?,?) AND to_id IN (?,?,?) AND created_at > datetime('now','-1 day')`).run(A,B,C,A,B,C).changes;
  cleanResult.messages = sdb.prepare(`DELETE FROM chat_messages WHERE sender_id IN (?,?,?) AND created_at > datetime('now','-1 day')`).run(A,B,C).changes;
  cleanResult.convs = sdb.prepare(`DELETE FROM user_conversations WHERE user_id IN (?,?,?)`).run(A,B,C).changes;
  cleanResult.notifs = sdb.prepare(`DELETE FROM notifications WHERE user_id IN (?,?,?) AND created_at > datetime('now','-1 day')`).run(A,B,C).changes;
  cleanResult.reports = sdb.prepare(`DELETE FROM reports WHERE reporter_id IN (?,?,?) AND created_at > datetime('now','-1 day')`).run(A,B,C).changes;
  cleanResult.blacklists = sdb.prepare(`DELETE FROM blacklists WHERE user_id IN (?,?,?) OR blocked_id IN (?,?,?)`).run(A,B,C,A,B,C).changes;
  cleanResult.sensitive = sdb.prepare(`DELETE FROM sensitive_logs WHERE user_id IN (?,?,?) AND created_at > datetime('now','-1 day')`).run(A,B,C).changes;
  console.log('清理统计:', JSON.stringify(cleanResult));

  console.log(`\n===== 社交六链路结果: PASS=${PASS} FAIL=${FAIL} =====`);
  if (NOTIMPL.length) console.log('NOT_IMPLEMENTED记录:\n  ' + NOTIMPL.join('\n  '));
  udb.close(); sdb.close();
})().catch(e => { console.error('脚本异常:', e); process.exit(1); });
