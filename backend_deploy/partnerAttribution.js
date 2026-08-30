/**
 * Partner 商业归属体系（FINAL-OPERATIONS-COMPLETION-MASTER-05 第十八~三十章）
 *
 * 原则（第十八章）：复用 users.invited_by / user_invite_relation / partners 现有体系，
 * 禁止重新造第二棵邀请树（归属解析仍走 partnerEngine.findChannelPartner 链式逻辑+快照）。
 *
 * 本模块职责：
 *   - 第二十章：SUPER_ADMIN 改绑（原因必填 + rebind_log 审计 + 版本递增 + 旧行 REBOUND 保留）
 *   - 第二十一~二十三章：合同体系（createContract/renew/terminate/policy；期限与收益规则分开；
 *     到期不删历史归属，仅停止新计佣）
 *   - 第二十五~二十六章：Partner 逐单透明账（脱敏，禁止输出聊天/Prompt/命理输入/完整手机号）
 *   - 第二十七章：Partner 用户列表字段全集（昵称/最后活跃/会员等级/最近消费/模块使用次数）
 *   - 第二十八章：渠道子码 + 管理端逐单账/提现视图
 *   - 第二十九~三十章：邀请关系只读统计（TOTAL_RELATIONS；默认只读禁止改写）
 *
 * 表（partner_attribution / partner_attribution_rebind_log / partner_contracts /
 * partner_channel_codes）由 partnerEngine.getDb() 的 ensureSchema 统一建立，本模块只做读写。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const partnerEngine = require('./partnerEngine');

const ACADEMY_DB_PATH = process.env.AI_COST_DB_PATH || path.join(__dirname, 'data', 'academy.db');

function nowIso() { return new Date().toISOString(); }
function todayStr() { return new Date().toISOString().slice(0, 10); }
function db() { return partnerEngine.getDb(); }

// ==================== 归属快照查询 ====================

function getActiveAttribution(d, userId) {
  return d.prepare("SELECT * FROM partner_attribution WHERE user_id = ? AND status = 'ACTIVE' ORDER BY attribution_version DESC LIMIT 1")
    .get(parseInt(userId, 10)) || null;
}

// ==================== 改绑（第二十章） ====================

/**
 * SUPER_ADMIN 改绑渠道归属：
 *   - 原因必填（≥2字）+ 操作人必填
 *   - 旧 ACTIVE 行置 REBOUND（保留完整历史链，不删除）
 *   - 新行 attribution_version = 旧版本+1，source=ADMIN_REBIND
 *   - partner_attribution_rebind_log 全链路审计（from→to+原因+操作人+时间）
 */
function rebindAttribution(params) {
  const d = db();
  const uid = parseInt(params.userId, 10);
  const np = parseInt(params.newPartnerId, 10);
  if (!uid || isNaN(uid)) return { ok: false, error: '参数错误：userId' };
  if (!np || isNaN(np)) return { ok: false, error: '参数错误：newPartnerId' };
  const reason = String(params.reason || '').trim();
  if (reason.length < 2) return { ok: false, error: '必须填写改绑原因' };
  const operator = String(params.operator || '').trim();
  if (!operator) return { ok: false, error: '缺少操作人' };
  const npPartner = partnerEngine.getPartner(np);
  if (!npPartner || npPartner.status !== 'APPROVED') return { ok: false, error: '新归属必须是已开通合伙人' };
  if (np === uid) return { ok: false, error: '不能将用户归属到其本人' };
  const user = d.prepare('SELECT user_id FROM users WHERE user_id = ?').get(uid);
  if (!user) return { ok: false, error: '用户不存在' };
  const cur = getActiveAttribution(d, uid);
  if (cur && cur.partner_id === np) return { ok: false, error: '该用户当前已归属此合伙人，无需改绑' };

  const now = nowIso();
  const tx = d.transaction(() => {
    let version = 1;
    if (cur) {
      version = cur.attribution_version + 1;
      d.prepare("UPDATE partner_attribution SET status = 'REBOUND', rebind_reason = ?, rebind_by = ?, rebind_at = ?, updated_at = ? WHERE id = ?")
        .run(reason.slice(0, 200), operator, now, now, cur.id);
    } else {
      const last = d.prepare('SELECT MAX(attribution_version) v FROM partner_attribution WHERE user_id = ?').get(uid).v;
      if (last) version = last + 1;
    }
    const contract = activeContractOf(d, np);
    const effTo = contract ? effectiveToDate(contract) : null;
    d.prepare(`INSERT INTO partner_attribution (user_id, partner_id, channel_code, source, bound_at, contract_id, effective_from, effective_to, attribution_version, status, updated_at)
      VALUES (?, ?, '', 'ADMIN_REBIND', ?, ?, ?, ?, ?, 'ACTIVE', ?)`)
      .run(uid, np, now, contract ? contract.id : null, now.slice(0, 10), effTo, version, now);
    d.prepare(`INSERT INTO partner_attribution_rebind_log (user_id, from_partner_id, to_partner_id, reason, operator, created_at)
      VALUES (?, ?, ?, ?, ?, ?)`)
      .run(uid, cur ? cur.partner_id : null, np, reason.slice(0, 500), operator, now);
  });
  tx();
  console.log(`[PartnerAttribution] 改绑 user=${uid} ${cur ? cur.partner_id : '无'} → ${np} by=${operator}`);
  return { ok: true, userId: uid, fromPartnerId: cur ? cur.partner_id : null, toPartnerId: np };
}

// ==================== 管理端归属查询（第二十八章） ====================

function listAttributions(opts) {
  const d = db();
  const page = Math.max(1, parseInt(opts.page, 10) || 1);
  const size = Math.min(200, parseInt(opts.size, 10) || 20);
  let where = "a.status IN ('ACTIVE','EXPIRED','REBOUND')";
  const params = [];
  if (opts.status) { where = 'a.status = ?'; params.push(String(opts.status).toUpperCase()); }
  if (opts.partnerId) { where += ' AND a.partner_id = ?'; params.push(parseInt(opts.partnerId, 10)); }
  if (opts.userId) { where += ' AND a.user_id = ?'; params.push(parseInt(opts.userId, 10)); }
  const total = d.prepare(`SELECT COUNT(*) c FROM partner_attribution a WHERE ${where}`).get(...params).c;
  const rows = d.prepare(`
    SELECT a.*, u.nickname AS user_nickname, pu.nickname AS partner_nickname,
           (SELECT COUNT(*) FROM partner_attribution x WHERE x.user_id = a.user_id) AS ver_count
    FROM partner_attribution a
    LEFT JOIN users u ON u.user_id = a.user_id
    LEFT JOIN users pu ON pu.user_id = a.partner_id
    WHERE ${where} ORDER BY a.id DESC LIMIT ? OFFSET ?`)
    .all(...params, size, (page - 1) * size);
  return {
    total, page, size,
    attributions: rows.map(r => ({
      userId: String(r.user_id), userNickname: r.user_nickname || '',
      partnerId: String(r.partner_id), partnerNickname: r.partner_nickname || '',
      channelCode: r.channel_code || '', source: r.source, boundAt: r.bound_at,
      contractId: r.contract_id, effectiveFrom: r.effective_from, effectiveTo: r.effective_to,
      attributionVersion: r.attribution_version, status: r.status,
      rebindReason: r.rebind_reason || '', rebindBy: r.rebind_by || '', rebindAt: r.rebind_at || '',
      historyVersions: r.ver_count,
    })),
  };
}

function getAttributionDetail(userId) {
  const d = db();
  const uid = parseInt(userId, 10);
  const rows = d.prepare('SELECT * FROM partner_attribution WHERE user_id = ? ORDER BY attribution_version ASC').all(uid);
  if (!rows.length) return null;
  const logs = d.prepare('SELECT * FROM partner_attribution_rebind_log WHERE user_id = ? ORDER BY id ASC').all(uid);
  return {
    userId: String(uid),
    versions: rows.map(r => ({
      attributionVersion: r.attribution_version, partnerId: String(r.partner_id),
      channelCode: r.channel_code || '', source: r.source, boundAt: r.bound_at,
      contractId: r.contract_id, effectiveFrom: r.effective_from, effectiveTo: r.effective_to,
      status: r.status, rebindReason: r.rebind_reason || '', rebindBy: r.rebind_by || '', rebindAt: r.rebind_at || '',
    })),
    rebindLog: logs.map(l => ({
      fromPartnerId: l.from_partner_id ? String(l.from_partner_id) : null,
      toPartnerId: String(l.to_partner_id), reason: l.reason, operator: l.operator, createdAt: l.created_at,
    })),
  };
}

// ==================== 合同体系（第二十一~二十三章） ====================

function activeContractOf(d, partnerId) {
  return d.prepare("SELECT * FROM partner_contracts WHERE partner_id = ? AND status = 'ACTIVE' ORDER BY id DESC LIMIT 1")
    .get(parseInt(partnerId, 10)) || null;
}

/**
 * 合同 → 归属有效期（第二十二章：合同期限与历史渠道用户收益规则分开记录）：
 *   NET50_POSTEXPIRY_STOP     → effective_to = 合同结束日（到期停止新收益）
 *   NET50_POSTEXPIRY_CONTINUE → NULL（到期后历史渠道用户继续计佣）
 */
function effectiveToDate(contract) {
  if (!contract) return null;
  if (String(contract.revenue_right_policy) === 'NET50_POSTEXPIRY_CONTINUE') return null;
  return contract.contract_end || null;
}

function addYears(dateStr, years) {
  const dt = new Date(dateStr + 'T00:00:00Z');
  if (isNaN(dt.getTime())) return null;
  dt.setUTCFullYear(dt.getUTCFullYear() + parseInt(years, 10));
  return dt.toISOString().slice(0, 10);
}

function genContractNo(d) {
  for (let i = 0; i < 20; i++) {
    const no = 'PC' + todayStr().replace(/-/g, '') + String(Math.floor(1000 + Math.random() * 9000));
    if (!d.prepare('SELECT 1 FROM partner_contracts WHERE contract_no = ?').get(no)) return no;
  }
  return 'PC' + todayStr().replace(/-/g, '') + Date.now();
}

/** 签约/续约/终止/调整后同步该合伙人名下 ACTIVE 归属的合同关联与有效期（不动历史版本行） */
function syncAttributionEffectiveTo(d, partnerId) {
  const contract = activeContractOf(d, partnerId);
  const effTo = contract ? effectiveToDate(contract) : null;
  d.prepare("UPDATE partner_attribution SET contract_id = ?, effective_to = ?, updated_at = ? WHERE partner_id = ? AND status = 'ACTIVE'")
    .run(contract ? contract.id : null, effTo, nowIso(), parseInt(partnerId, 10));
}

function createContract(params) {
  const d = db();
  const pid = parseInt(params.partnerId, 10);
  if (!pid || isNaN(pid)) return { ok: false, error: '参数错误：partnerId' };
  if (!partnerEngine.isApprovedPartner(pid)) return { ok: false, error: '仅已开通合伙人可签约' };
  const start = String(params.contractStart || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return { ok: false, error: 'contractStart 必须为 YYYY-MM-DD' };
  // 第二十二章：支持 3 年合作合同（默认 3 年，1~10 年）
  const years = Math.min(10, Math.max(1, parseInt(params.contractYears, 10) || 3));
  let end = String(params.contractEnd || '').trim();
  if (end && !/^\d{4}-\d{2}-\d{2}$/.test(end)) return { ok: false, error: 'contractEnd 必须为 YYYY-MM-DD' };
  if (!end) end = addYears(start, years);
  if (!end || end <= start) return { ok: false, error: 'contractEnd 必须晚于 contractStart' };
  const policy = String(params.revenueRightPolicy || 'NET50_POSTEXPIRY_STOP');
  if (!['NET50_POSTEXPIRY_STOP', 'NET50_POSTEXPIRY_CONTINUE'].includes(policy)) {
    return { ok: false, error: 'revenueRightPolicy 仅支持 NET50_POSTEXPIRY_STOP / NET50_POSTEXPIRY_CONTINUE' };
  }
  if (activeContractOf(d, pid)) return { ok: false, error: '该合伙人已有生效合同，请先续约或终止' };

  const now = nowIso();
  const no = genContractNo(d);
  const tx = d.transaction(() => {
    d.prepare(`INSERT INTO partner_contracts (partner_id, contract_no, contract_start, contract_end, contract_years, contract_version, renewal_status, revenue_right_policy, status, note, created_at, updated_at, reviewed_by)
      VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, 'ACTIVE', ?, ?, ?, ?)`)
      .run(pid, no, start, end, years, String(params.contractVersion || 'V1').slice(0, 20), policy,
        String(params.note || '').slice(0, 500), now, now, String(params.admin || ''));
    syncAttributionEffectiveTo(d, pid);
  });
  tx();
  console.log(`[PartnerContract] 签约 partner=${pid} no=${no} ${start}~${end}(${years}年) policy=${policy}`);
  return { ok: true, contractNo: no, contractId: d.prepare('SELECT id FROM partner_contracts WHERE contract_no = ?').get(no).id };
}

/** 续约：旧合同 ARCHIVED+RENEWED（历史保留），新建续约合同并同步归属有效期 */
function renewContract(params) {
  const d = db();
  const id = parseInt(params.contractId, 10);
  const old = d.prepare('SELECT * FROM partner_contracts WHERE id = ?').get(id);
  if (!old) return { ok: false, error: '合同不存在' };
  if (old.status !== 'ACTIVE') return { ok: false, error: '仅生效合同可续约' };
  const start = String(params.contractStart || '').trim() || todayStr();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return { ok: false, error: 'contractStart 必须为 YYYY-MM-DD' };
  const years = Math.min(10, Math.max(1, parseInt(params.contractYears, 10) || old.contract_years || 3));
  let end = String(params.contractEnd || '').trim();
  if (end && !/^\d{4}-\d{2}-\d{2}$/.test(end)) return { ok: false, error: 'contractEnd 必须为 YYYY-MM-DD' };
  if (!end) end = addYears(start, years);
  if (!end || end <= start) return { ok: false, error: 'contractEnd 必须晚于 contractStart' };
  const policy = String(params.revenueRightPolicy || old.revenue_right_policy);

  const now = nowIso();
  const no = genContractNo(d);
  const tx = d.transaction(() => {
    d.prepare("UPDATE partner_contracts SET status = 'ARCHIVED', renewal_status = 'RENEWED', updated_at = ? WHERE id = ?").run(now, id);
    d.prepare(`INSERT INTO partner_contracts (partner_id, contract_no, contract_start, contract_end, contract_years, contract_version, renewal_status, revenue_right_policy, status, note, created_at, updated_at, reviewed_by)
      VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, 'ACTIVE', ?, ?, ?, ?)`)
      .run(old.partner_id, no, start, end, years, String(params.contractVersion || old.contract_version).slice(0, 20), policy,
        String(params.note || old.note || '').slice(0, 500), now, now, String(params.admin || ''));
    syncAttributionEffectiveTo(d, old.partner_id);
  });
  tx();
  console.log(`[PartnerContract] 续约 partner=${old.partner_id} 旧=${old.contract_no} 新=${no}`);
  return { ok: true, contractNo: no };
}

/** 终止：合同 TERMINATED；STOP 口径下归属 effective_to=当日（历史归属行保留，第二十三章） */
function terminateContract(params) {
  const d = db();
  const id = parseInt(params.contractId, 10);
  const old = d.prepare('SELECT * FROM partner_contracts WHERE id = ?').get(id);
  if (!old) return { ok: false, error: '合同不存在' };
  if (old.status !== 'ACTIVE') return { ok: false, error: '仅生效合同可终止' };
  const reason = String(params.reason || '').trim();
  if (reason.length < 2) return { ok: false, error: '必须填写终止原因' };
  const now = nowIso();
  const tx = d.transaction(() => {
    d.prepare("UPDATE partner_contracts SET status = 'TERMINATED', renewal_status = 'TERMINATED', note = COALESCE(note,'') || ?, updated_at = ? WHERE id = ?")
      .run(` | 终止(${reason.slice(0, 100)})`, now, id);
    // 终止即停止新计佣：ACTIVE 归属 effective_to=终止日（历史归属行/订单/佣金全部保留，第二十三章）
    d.prepare("UPDATE partner_attribution SET effective_to = ?, updated_at = ? WHERE partner_id = ? AND status = 'ACTIVE'")
      .run(todayStr(), now, old.partner_id);
  });
  tx();
  console.log(`[PartnerContract] 终止 partner=${old.partner_id} no=${old.contract_no} reason=${reason}`);
  return { ok: true };
}

function updateContractPolicy(params) {
  const d = db();
  const id = parseInt(params.contractId, 10);
  const old = d.prepare('SELECT * FROM partner_contracts WHERE id = ?').get(id);
  if (!old) return { ok: false, error: '合同不存在' };
  if (old.status !== 'ACTIVE') return { ok: false, error: '仅生效合同可调整收益规则' };
  const policy = String(params.revenueRightPolicy || '');
  if (!['NET50_POSTEXPIRY_STOP', 'NET50_POSTEXPIRY_CONTINUE'].includes(policy)) {
    return { ok: false, error: 'revenueRightPolicy 仅支持 NET50_POSTEXPIRY_STOP / NET50_POSTEXPIRY_CONTINUE' };
  }
  const reason = String(params.reason || '').trim();
  if (reason.length < 2) return { ok: false, error: '必须填写调整原因' };
  const now = nowIso();
  const tx = d.transaction(() => {
    d.prepare("UPDATE partner_contracts SET revenue_right_policy = ?, note = COALESCE(note,'') || ?, updated_at = ? WHERE id = ?")
      .run(policy, ` | 收益规则调整为${policy}(${reason.slice(0, 80)})`, now, id);
    syncAttributionEffectiveTo(d, old.partner_id);
  });
  tx();
  return { ok: true, revenueRightPolicy: policy };
}

/** 到期扫描（幂等）：过期 ACTIVE 合同 renewal_status=EXPIRED；归属行保留不删（第二十三章） */
function expireDueContracts() {
  const d = db();
  const due = d.prepare("SELECT id, partner_id, contract_no FROM partner_contracts WHERE status = 'ACTIVE' AND contract_end IS NOT NULL AND contract_end < ?").all(todayStr());
  for (const c of due) {
    d.prepare("UPDATE partner_contracts SET renewal_status = 'EXPIRED', updated_at = ? WHERE id = ?").run(nowIso(), c.id);
  }
  if (due.length) console.log(`[PartnerContract] 到期标记 ${due.length} 份合同（历史归属保留）`);
  return { expired: due.length };
}

function listContracts(opts) {
  const d = db();
  const page = Math.max(1, parseInt(opts.page, 10) || 1);
  const size = Math.min(200, parseInt(opts.size, 10) || 20);
  let where = '1=1'; const params = [];
  if (opts.partnerId) { where += ' AND c.partner_id = ?'; params.push(parseInt(opts.partnerId, 10)); }
  if (opts.status) { where += ' AND c.status = ?'; params.push(String(opts.status).toUpperCase()); }
  const total = d.prepare(`SELECT COUNT(*) c FROM partner_contracts c WHERE ${where}`).get(...params).c;
  const rows = d.prepare(`
    SELECT c.*, u.nickname, (SELECT COUNT(*) FROM partner_attribution a WHERE a.contract_id = c.id) AS attr_count
    FROM partner_contracts c LEFT JOIN users u ON u.user_id = c.partner_id
    WHERE ${where} ORDER BY c.id DESC LIMIT ? OFFSET ?`)
    .all(...params, size, (page - 1) * size);
  return {
    total, page, size,
    contracts: rows.map(c => ({
      id: c.id, contractNo: c.contract_no, partnerId: String(c.partner_id), nickname: c.nickname || '',
      contractStart: c.contract_start, contractEnd: c.contract_end, contractYears: c.contract_years,
      contractVersion: c.contract_version, renewalStatus: c.renewal_status,
      revenueRightPolicy: c.revenue_right_policy, status: c.status,
      note: c.note || '', attributionCount: c.attr_count,
      createdAt: c.created_at, updatedAt: c.updated_at, reviewedBy: c.reviewed_by || '',
    })),
  };
}

/** Partner 本人合同视图（仅期限/收益规则，无内部审计字段） */
function myContract(partnerId) {
  const d = db();
  const rows = d.prepare('SELECT * FROM partner_contracts WHERE partner_id = ? ORDER BY id DESC LIMIT 10').all(parseInt(partnerId, 10));
  return rows.map(c => ({
    contractNo: c.contract_no, contractStart: c.contract_start, contractEnd: c.contract_end,
    contractVersion: c.contract_version, renewalStatus: c.renewal_status,
    revenueRightPolicy: c.revenue_right_policy, status: c.status,
  }));
}

// ==================== 渠道子码（第二十八章） ====================

function createChannelCode(params) {
  const d = db();
  const pid = parseInt(params.partnerId, 10);
  if (!pid || isNaN(pid)) return { ok: false, error: '参数错误：partnerId' };
  if (!partnerEngine.isApprovedPartner(pid)) return { ok: false, error: '仅已开通合伙人可创建子码' };
  let code = String(params.code || '').trim().toUpperCase();
  if (!code) code = `CH${pid}-${Math.floor(1000 + Math.random() * 9000)}`;
  if (!/^[A-Z0-9-]{4,20}$/.test(code)) return { ok: false, error: '子码仅支持4-20位大写字母/数字/连字符' };
  if (d.prepare('SELECT 1 FROM partner_channel_codes WHERE code = ?').get(code)) return { ok: false, error: '子码已存在' };
  const now = nowIso();
  d.prepare(`INSERT INTO partner_channel_codes (partner_id, code, label, status, created_at, updated_at)
    VALUES (?, ?, ?, 'ACTIVE', ?, ?)`)
    .run(pid, code, String(params.label || '').slice(0, 50), now, now);
  return { ok: true, code };
}

function listChannelCodes(partnerId) {
  const d = db();
  const rows = d.prepare('SELECT * FROM partner_channel_codes WHERE partner_id = ? ORDER BY id DESC').all(parseInt(partnerId, 10));
  const usage = {};
  try {
    const cnt = d.prepare("SELECT channel_code, COUNT(*) c FROM partner_attribution WHERE channel_code != '' GROUP BY channel_code").all();
    for (const r of cnt) usage[r.channel_code] = r.c;
  } catch (e) { /* ignore */ }
  return rows.map(c => ({
    id: c.id, code: c.code, label: c.label || '', status: c.status,
    createdAt: c.created_at, boundUserCount: usage[c.code] || 0,
  }));
}

function setChannelCodeStatus(params) {
  const d = db();
  const id = parseInt(params.codeId, 10);
  const row = d.prepare('SELECT * FROM partner_channel_codes WHERE id = ?').get(id);
  if (!row) return { ok: false, error: '子码不存在' };
  const action = String(params.action || '');
  if (!['disable', 'enable'].includes(action)) return { ok: false, error: 'action 仅支持 disable/enable' };
  const status = action === 'disable' ? 'DISABLED' : 'ACTIVE';
  d.prepare('UPDATE partner_channel_codes SET status = ?, updated_at = ? WHERE id = ?').run(status, nowIso(), id);
  return { ok: true, status };
}

// ==================== Partner 逐单透明账（第二十五~二十六章） ====================

function settlementStatusForPeriod(d, partnerId, period) {
  const s = d.prepare('SELECT status FROM partner_settlements WHERE partner_id = ? AND period = ?').get(parseInt(partnerId, 10), period);
  return s ? s.status : 'UNSETTLED';
}

function routerTableExists(d) {
  return !!d.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='commission_router_snapshots'").get();
}

/**
 * Partner 本人逐单账（第二十五章字段全集，脱敏）：
 * 订单时间/订单类型/用户脱敏身份/实付金额/手续费/普通佣金成本/预计AI成本/退款/
 * 可分配净收入/Partner 50%/结算状态
 * 隐私红线（第二十六章）：仅 maskUserId，禁止任何聊天正文/Prompt/命理输入输出
 */
function partnerOrders(partnerId, opts) {
  const d = db();
  const pid = parseInt(partnerId, 10);
  const page = Math.max(1, parseInt(opts.page, 10) || 1);
  const size = Math.min(100, parseInt(opts.size, 10) || 20);
  const hasRouter = routerTableExists(d);
  const routerJoin = hasRouter ? 'LEFT JOIN commission_router_snapshots rs ON rs.order_no = pol.order_no' : '';
  const routerCols = hasRouter ? ', rs.status AS router_status' : '';

  const total = d.prepare('SELECT COUNT(*) c FROM partner_order_log pol WHERE pol.partner_id = ?').get(pid).c;
  const rows = d.prepare(`
    SELECT pol.*, uo.order_type, uo.status AS pay_status, uo.paid_at ${routerCols}
    FROM partner_order_log pol
    LEFT JOIN user_orders uo ON uo.order_no = pol.order_no
    ${routerJoin}
    WHERE pol.partner_id = ? ORDER BY pol.id DESC LIMIT ? OFFSET ?`)
    .all(pid, size, (page - 1) * size);

  return {
    total, page, size,
    aiCostSource: 'ESTIMATED', // 第十六章：估算成本禁止冒充真实成本
    orders: rows.map(r => ({
      orderNo: r.order_no,
      orderTime: r.created_at,
      orderType: r.order_type || 'UNKNOWN',
      payerMasked: partnerEngine.maskUserId(r.payer_user_id),
      paidAmountYuan: (r.gross_cents / 100).toFixed(2),
      paymentFeeYuan: (r.fee_cost_cents / 100).toFixed(2),
      referralCostYuan: (r.normal_commission_cents / 100).toFixed(2),
      estimatedAiCostYuan: (r.ai_cost_cents / 100).toFixed(2),
      refundYuan: ((r.refund_cents || 0) / 100).toFixed(2),
      distributableNetYuan: (r.net_cents / 100).toFixed(2),
      partnerRevenueYuan: (r.base_commission_cents / 100).toFixed(2),
      entryStatus: r.status,
      settlementStatus: settlementStatusForPeriod(d, pid, String(r.created_at || '').slice(0, 7)),
    })),
  };
}

/** 管理端逐单账（不脱敏，第二十八章） */
function adminPartnerOrders(partnerId, opts) {
  const d = db();
  const pid = parseInt(partnerId, 10);
  const page = Math.max(1, parseInt(opts.page, 10) || 1);
  const size = Math.min(200, parseInt(opts.size, 10) || 20);
  const hasRouter = routerTableExists(d);
  const routerJoin = hasRouter ? 'LEFT JOIN commission_router_snapshots rs ON rs.order_no = pol.order_no' : '';
  const routerCols = hasRouter ? ', rs.status AS router_status, rs.formula_version, rs.conservation_ok' : '';

  const total = d.prepare('SELECT COUNT(*) c FROM partner_order_log pol WHERE pol.partner_id = ?').get(pid).c;
  const rows = d.prepare(`
    SELECT pol.*, uo.order_type, uo.status AS pay_status, uo.paid_at, u.nickname AS payer_nickname, u.phone AS payer_phone ${routerCols}
    FROM partner_order_log pol
    LEFT JOIN user_orders uo ON uo.order_no = pol.order_no
    LEFT JOIN users u ON u.user_id = pol.payer_user_id
    ${routerJoin}
    WHERE pol.partner_id = ? ORDER BY pol.id DESC LIMIT ? OFFSET ?`)
    .all(pid, size, (page - 1) * size);

  return {
    total, page, size,
    orders: rows.map(r => ({
      orderNo: r.order_no, orderTime: r.created_at, orderType: r.order_type || 'UNKNOWN',
      payerUserId: String(r.payer_user_id), payerNickname: r.payer_nickname || '', payerPhone: r.payer_phone || '',
      grossYuan: (r.gross_cents / 100).toFixed(2), feeCostYuan: (r.fee_cost_cents / 100).toFixed(2),
      aiCostYuan: (r.ai_cost_cents / 100).toFixed(2), normalCommissionYuan: (r.normal_commission_cents / 100).toFixed(2),
      netYuan: (r.net_cents / 100).toFixed(2), baseCommissionYuan: (r.base_commission_cents / 100).toFixed(2),
      nurturePartnerId: r.nurture_partner_id ? String(r.nurture_partner_id) : null,
      nurtureYuan: (r.nurture_cents / 100).toFixed(2),
      refundYuan: ((r.refund_cents || 0) / 100).toFixed(2),
      entryStatus: r.status, payStatus: r.pay_status || '', paidAt: r.paid_at || '',
      settlementStatus: settlementStatusForPeriod(d, pid, String(r.created_at || '').slice(0, 7)),
      routerStatus: r.router_status || null,
      conservationOk: r.conservation_ok == null ? null : !!r.conservation_ok,
      formulaVersion: r.formula_version || null,
    })),
  };
}

// ==================== Partner 用户列表（第二十七章字段全集） ====================

let _academyDb = null;
function getAcademyDb() {
  if (_academyDb) return _academyDb;
  try {
    if (!fs.existsSync(ACADEMY_DB_PATH)) return null;
    const Database = require('better-sqlite3');
    _academyDb = new Database(ACADEMY_DB_PATH, { readonly: true });
    return _academyDb;
  } catch (e) { return null; }
}

/** 模块使用次数（ai_call_logs 计量元数据；不含任何内容字段，第二十六章红线） */
function moduleUsageMap(userIds) {
  const out = {};
  if (!userIds || !userIds.length) return out;
  const adb = getAcademyDb();
  if (!adb) return out;
  try {
    const placeholders = userIds.map(() => '?').join(',');
    const rows = adb.prepare(`SELECT user_id, COUNT(*) c FROM ai_call_logs WHERE user_id IN (${placeholders}) GROUP BY user_id`)
      .all(...userIds.map(String));
    for (const r of rows) out[parseInt(r.user_id, 10)] = r.c;
  } catch (e) { /* 表不存在或库不可读：返回空，不猜测 */ }
  return out;
}

/**
 * Partner 用户列表（第二十七章）：
 * UID/昵称/脱敏手机号/注册时间/最后活跃/会员等级/累计消费/最近消费/使用模块次数/是否付费
 */
function partnerUsersDetailed(partnerId, opts) {
  const d = db();
  const pid = parseInt(partnerId, 10);
  const page = Math.max(1, parseInt(opts.page, 10) || 1);
  const size = Math.min(100, parseInt(opts.size, 10) || 20);
  const sort = opts.sort === 'consume' ? 'consume' : 'registered';

  const chan = partnerEngine.channelUserIds(pid);
  if (!chan.size) return { total: 0, page, size, users: [] };
  const chanArr = Array.from(chan);
  const placeholders = chanArr.map(() => '?').join(',');
  const params = [...chanArr];
  const join = `LEFT JOIN (SELECT user_id, COALESCE(SUM(amount),0) consume, MAX(paid_at) last_paid FROM user_orders WHERE status IN ('PAID','paid') GROUP BY user_id) o ON o.user_id = u.user_id`;

  let where = `u.user_id IN (${placeholders})`;
  if (opts.paid === '1') where += ' AND o.consume > 0';
  if (opts.paid === '0') where += ' AND (o.consume IS NULL OR o.consume = 0)';

  const total = d.prepare(`SELECT COUNT(*) c FROM users u ${join} WHERE ${where}`).get(...params).c;
  const orderBy = sort === 'consume' ? 'COALESCE(o.consume,0) DESC, u.created_at DESC' : 'u.created_at DESC';
  const rows = d.prepare(`SELECT u.user_id, u.nickname, u.phone, u.created_at, u.last_login_at, u.member_level,
      COALESCE(o.consume,0) consume, o.last_paid FROM users u ${join} WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
    .all(...params, size, (page - 1) * size);

  const usage = moduleUsageMap(rows.map(r => r.user_id));
  return {
    total, page, size,
    users: rows.map(r => ({
      uid: String(r.user_id),
      nickname: r.nickname || '',
      phoneMasked: partnerEngine.maskPhone(r.phone),
      registeredAt: r.created_at,
      lastActiveAt: r.last_login_at || '',
      memberLevel: r.member_level || 'basic',
      totalConsumeYuan: (Number(r.consume) || 0).toFixed(2),
      lastConsumeAt: r.last_paid || '',
      moduleUsageCount: usage[r.user_id] || 0,
      isPaid: Number(r.consume) > 0,
    })),
  };
}

// ==================== Partner 结算单（本人脱敏视图，第二十四章） ====================

function partnerMySettlements(partnerId) {
  const d = db();
  const rows = d.prepare('SELECT * FROM partner_settlements WHERE partner_id = ? ORDER BY period DESC LIMIT 24').all(parseInt(partnerId, 10));
  return rows.map(s => ({
    period: s.period,
    grossYuan: (s.gross_cents / 100).toFixed(2),
    paymentFeeYuan: (s.fee_cost_cents / 100).toFixed(2),
    referralCostYuan: (s.normal_commission_cents / 100).toFixed(2),
    estimatedAiCostYuan: (s.ai_cost_cents / 100).toFixed(2), // 第十六章：明确"预计"，禁止冒充实际
    aiCostSource: s.ai_cost_source || 'ESTIMATED',
    refundYuan: ((s.refund_cents || 0) / 100).toFixed(2),
    distributableRevenueYuan: (s.net_cents / 100).toFixed(2),
    partnerRevenueYuan: (s.base_commission_cents / 100).toFixed(2),
    nurtureRevenueYuan: (s.nurture_received_cents / 100).toFixed(2),
    adjustmentYuan: ((s.adjust_cents || 0) / 100).toFixed(2),
    finalAmountYuan: ((s.final_amount_cents != null ? s.final_amount_cents
      : (s.base_commission_cents + s.nurture_received_cents + (s.adjust_cents || 0))) / 100).toFixed(2),
    formulaVersion: s.formula_version || '1.1.0',
    status: s.status,
  }));
}

// ==================== 邀请关系只读统计（第二十九~三十章） ====================

/** 谁邀请了他/直接邀请数/二级关系数/TOTAL_RELATIONS（只读，禁止改写关系） */
function userInviteStats(userId) {
  const d = db();
  const uid = parseInt(userId, 10);
  if (!uid || isNaN(uid)) return null;
  const u = d.prepare('SELECT user_id, nickname FROM users WHERE user_id = ?').get(uid);
  if (!u) return null;
  let inviter = null;
  let direct = 0, level2 = 0;
  try {
    const l1 = d.prepare('SELECT inviter_id FROM user_invite_relation WHERE invitee_id = ? AND level = 1').get(uid);
    if (l1) {
      const inv = d.prepare('SELECT user_id, nickname FROM users WHERE user_id = ?').get(l1.inviter_id);
      if (inv) inviter = { userId: String(inv.user_id), nickname: inv.nickname || '' };
    }
    direct = d.prepare('SELECT COUNT(*) c FROM user_invite_relation WHERE inviter_id = ? AND level = 1').get(uid).c;
    level2 = d.prepare('SELECT COUNT(*) c FROM user_invite_relation WHERE inviter_id = ? AND level = 2').get(uid).c;
  } catch (e) { /* user_invite_relation 未建：零值 */ }
  return {
    userId: String(uid), nickname: u.nickname || '',
    invitedBy: inviter, directInvites: direct, level2Relations: level2,
    totalRelations: direct + level2,
    readonly: true, // 第三十章：邀请统计默认只读
  };
}

// ==================== 管理端提现视图（第二十八章） ====================

function adminPartnerWithdrawals(partnerId) {
  const d = db();
  const pid = parseInt(partnerId, 10);
  try {
    const rows = d.prepare('SELECT * FROM withdrawals WHERE user_id = ? ORDER BY id DESC LIMIT 100').all(pid);
    return rows.map(w => ({
      withdrawNo: w.withdraw_no, amountYuan: (w.amount_cents / 100).toFixed(2), status: w.status,
      failReason: w.fail_reason || '', createdAt: w.created_at, paidAt: w.paid_at,
      transferNo: w.wechat_transfer_no || '',
    }));
  } catch (e) { return []; }
}

// ==================== 调度：合同到期扫描 ====================

function initScheduler() {
  const run = () => { try { expireDueContracts(); } catch (e) { /* ignore */ } };
  run();
  setInterval(run, 24 * 60 * 60 * 1000).unref();
}

module.exports = {
  rebindAttribution, listAttributions, getAttributionDetail,
  createContract, renewContract, terminateContract, updateContractPolicy,
  expireDueContracts, listContracts, myContract,
  createChannelCode, listChannelCodes, setChannelCodeStatus,
  partnerOrders, adminPartnerOrders,
  partnerUsersDetailed, partnerMySettlements,
  userInviteStats, adminPartnerWithdrawals,
  initScheduler,
};
