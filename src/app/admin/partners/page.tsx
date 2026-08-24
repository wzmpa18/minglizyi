"use client";

/**
 * 超管后台·合伙人渠道体系V2（DEV-V22-PARTNER-V2）
 * 四大模块：合伙人管理 / 传播链路追溯（渠道总览·用户层级树·合伙人关系树） / 结算管理 / 风控
 * 全量数据权限（不脱敏），所有操作经 adminRoles 鉴权并写入审计日志
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  fetchPartners, partnerAction, partnerSetReferrer, fetchPartnerUsers,
  fetchChannelOverview, fetchUserTree, fetchPartnerTree,
  fetchSettlements, generateSettlements, approveSettlement, rejectSettlement, adjustSettlement,
  markOrderInvalid,
  type AdminPartnerRow, type AdminChannelRow, type AdminTreeNode, type AdminSettlementRow, type AdminPartnerUsers,
} from "@/lib/admin/partnerAdminService";

type TabKey = "partners" | "network" | "settlements" | "risk";

const THEME = {
  primary: "#6C3EF5",
  bg: "#f6f5fa",
  card: "#ffffff",
  text: "#1f2330",
  sub: "#8a8fa3",
  border: "#e9e5f5",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "待审核", APPROVED: "已开通", REJECTED: "已驳回", DISABLED: "已禁用",
};
const STATUS_COLOR: Record<string, string> = {
  PENDING: "#d48806", APPROVED: "#1e8e5a", REJECTED: "#cf1322", DISABLED: "#8a8fa3",
};
const SETTLE_LABEL: Record<string, string> = {
  PENDING_REVIEW: "待审核", APPROVED: "已通过", REJECTED: "已驳回", EMPTY: "无业绩",
};

export default function PartnerAdminPage() {
  const [tab, setTab] = useState<TabKey>("partners");
  const [toast, setToast] = useState("");
  const [confirmText, setConfirmText] = useState("");

  // 合伙人列表
  const [partners, setPartners] = useState<AdminPartnerRow[]>([]);
  const [partnersTotal, setPartnersTotal] = useState(0);
  const [partnersPage, setPartnersPage] = useState(1);
  const [partnersStatus, setPartnersStatus] = useState("");
  const [partnersQuery, setPartnersQuery] = useState("");
  // 用户明细弹层
  const [detailUsers, setDetailUsers] = useState<AdminPartnerUsers | null>(null);
  const [detailPartner, setDetailPartner] = useState<AdminPartnerRow | null>(null);
  const [detailQuery, setDetailQuery] = useState("");
  const [detailPage, setDetailPage] = useState(1);

  // 传播链路
  const [netMode, setNetMode] = useState<"channels" | "userTree" | "partnerTree">("channels");
  const [channels, setChannels] = useState<AdminChannelRow[]>([]);
  const [totalGross, setTotalGross] = useState("0.00");
  const [treeUserId, setTreeUserId] = useState("");
  const [userTree, setUserTree] = useState<{ user: { userId: string; nickname: string; phone: string; createdAt: string }; upline: AdminTreeNode[]; downline: AdminTreeNode[] } | null>(null);
  const [partnerTree, setPartnerTree] = useState<AdminTreeNode[] | null>(null);

  // 结算
  const [settlements, setSettlements] = useState<AdminSettlementRow[]>([]);
  const [settleTotal, setSettleTotal] = useState(0);
  const [settlePage, setSettlePage] = useState(1);
  const [settlePeriod, setSettlePeriod] = useState("");
  const [genPeriod, setGenPeriod] = useState("");

  // 风控
  const [riskOrder, setRiskOrder] = useState("");
  const [riskReason, setRiskReason] = useState("");

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2500); };

  const loadPartners = useCallback(async (page = partnersPage, status = partnersStatus, q = partnersQuery) => {
    const r = await fetchPartners(page, 20, status, q);
    if (r.success && r.data) { setPartners(r.data.partners); setPartnersTotal(r.data.total); setPartnersPage(r.data.page); }
    else showToast(r.error || "加载失败");
  }, [partnersPage, partnersStatus, partnersQuery]);

  const loadSettlements = useCallback(async (page = settlePage, period = settlePeriod) => {
    const r = await fetchSettlements(page, 20, period);
    if (r.success && r.data) { setSettlements(r.data.settlements); setSettleTotal(r.data.total); setSettlePage(r.data.page); }
    else showToast(r.error || "加载失败");
  }, [settlePage, settlePeriod]);

  useEffect(() => {
    if (tab === "partners") loadPartners();
    if (tab === "network" && netMode === "channels" && !channels.length) {
      fetchChannelOverview().then((r) => {
        if (r.success && r.data) { setChannels(r.data.partners); setTotalGross(r.data.totalGrossYuan); }
      });
    }
    if (tab === "network" && netMode === "partnerTree" && partnerTree === null) {
      fetchPartnerTree().then((r) => r.success && r.data && setPartnerTree(r.data.roots));
    }
    if (tab === "settlements") loadSettlements();
  }, [tab, netMode]);

  const doAction = async (userId: string, action: string, extra?: { level?: string; reason?: string }) => {
    if ((action === "reject" || action === "disable") && !(extra && extra.reason)) {
      const reason = prompt((action === "reject" ? "驳回原因（必填）：" : "禁用原因（必填）：")) || "";
      if (!reason.trim()) return;
      extra = { reason: reason.trim() };
    }
    const r = await partnerAction(userId, action, extra || {});
    if (r.success) { showToast("操作成功"); loadPartners(); }
    else showToast(r.error || "操作失败");
  };

  const doReferrer = async (userId: string) => {
    const ref = prompt("新上级合伙人userId（留空表示清除上级）：") ?? null;
    if (ref === null) return;
    const reason = prompt("调整原因（必填）：") || "";
    if (!reason.trim()) return showToast("必须填写调整原因");
    const r = await partnerSetReferrer(userId, ref.trim(), reason.trim());
    if (r.success) { showToast("推荐关系已调整"); loadPartners(); }
    else showToast(r.error || "调整失败");
  };

  const openDetail = async (p: AdminPartnerRow) => {
    setDetailPartner(p); setDetailQuery(""); setDetailPage(1);
    const r = await fetchPartnerUsers(p.userId, 1, 50, "");
    if (r.success && r.data) setDetailUsers(r.data); else setDetailUsers(null);
  };

  const searchDetail = async (page = 1) => {
    if (!detailPartner) return;
    const r = await fetchPartnerUsers(detailPartner.userId, page, 50, detailQuery);
    if (r.success && r.data) { setDetailUsers(r.data); setDetailPage(page); }
  };

  const searchUserTree = async () => {
    if (!treeUserId.trim()) return;
    const r = await fetchUserTree(treeUserId.trim());
    if (r.success && r.data) setUserTree(r.data);
    else { setUserTree(null); showToast(r.error || "查询失败"); }
  };

  const doGenerate = async () => {
    const period = genPeriod.trim() || prompt("生成哪个月的结算单？(YYYY-MM，留空=上月)") || "";
    const r = await generateSettlements(period.trim());
    if (r.success) { showToast(`已生成 ${r.data?.period}（新建${r.data?.created}单）`); loadSettlements(1); }
    else showToast(r.error || "生成失败");
  };

  const doApprove = async (id: number) => {
    if (!confirmText[id] && !window.confirm("确认审核通过该结算单？金额将转入合伙人可提现余额。")) return;
    const r = await approveSettlement(id);
    if (r.success) { showToast(`已通过，转可提现 ¥${((r.data?.movedCents || 0) / 100).toFixed(2)}`); loadSettlements(); }
    else showToast(r.error || "操作失败");
  };

  const doReject = async (id: number) => {
    const reason = prompt("驳回原因（必填）：") || "";
    if (!reason.trim()) return;
    const r = await rejectSettlement(id, reason.trim());
    if (r.success) { showToast("已驳回"); loadSettlements(); }
    else showToast(r.error || "操作失败");
  };

  const doAdjust = async (id: number) => {
    const delta = prompt("调整金额（元，可负数）：") || "";
    const d = Number(delta);
    if (!isFinite(d) || d === 0) return showToast("金额无效");
    const reason = prompt("调整原因（必填）：") || "";
    if (!reason.trim()) return;
    const r = await adjustSettlement(id, d, reason.trim());
    if (r.success) { showToast("已调整"); loadSettlements(); }
    else showToast(r.error || "调整失败");
  };

  const doRisk = async () => {
    if (!riskOrder.trim() || !riskReason.trim()) return showToast("请填写订单号与原因");
    if (!window.confirm(`确认标记订单 ${riskOrder} 无效？该订单全部佣金（普通+合伙人+培养奖励）将被扣回。`)) return;
    const r = await markOrderInvalid(riskOrder.trim(), riskReason.trim());
    if (r.success) { showToast(`已标记无效，扣回${r.data?.reversed ?? 0}条记录`); setRiskOrder(""); setRiskReason(""); }
    else showToast(r.error || "操作失败");
  };

  // ==================== 样式 ====================

  const card: React.CSSProperties = { background: THEME.card, borderRadius: 12, padding: 14, marginBottom: 12, border: `1px solid ${THEME.border}` };
  const btn = (bg: string, color = "#fff"): React.CSSProperties => ({ padding: "5px 10px", borderRadius: 8, border: "none", background: bg, color, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" });
  const inputS: React.CSSProperties = { padding: "7px 10px", borderRadius: 8, border: `1px solid ${THEME.border}`, fontSize: 12, outline: "none" };
  const th: React.CSSProperties = { fontSize: 11, color: THEME.sub, textAlign: "left", padding: "8px 6px", fontWeight: 600, whiteSpace: "nowrap" };
  const td: React.CSSProperties = { fontSize: 12, padding: "9px 6px", borderTop: `1px solid ${THEME.border}`, verticalAlign: "top", whiteSpace: "nowrap" };
  const badge = (color: string, text: string) => (
    <span style={{ fontSize: 10, color, background: `${color}15`, padding: "2px 7px", borderRadius: 8, whiteSpace: "nowrap" }}>{text}</span>
  );

  const TreeNode = ({ node, depth }: { node: AdminTreeNode; depth: number }) => (
    <div style={{ marginLeft: depth * 16 }}>
      <div style={{ fontSize: 12, padding: "3px 0", display: "flex", gap: 6, alignItems: "center" }}>
        <span style={{ color: "#555" }}>{node.nickname || node.userId}</span>
        <span style={{ fontSize: 10, color: "#bbb" }}>#{node.userId}</span>
        {node.isPartner && badge("#ad6800", node.partnerLevel === "CORE" ? "核心合伙人" : "合伙人")}
        {node.phone && <span style={{ fontSize: 10, color: "#999" }}>{node.phone}</span>}
      </div>
      {node.children && node.children.length > 0 && node.children.map((c) => <TreeNode key={c.userId} node={c} depth={depth + 1} />)}
    </div>
  );

  return (
    <div style={{ padding: 20, background: THEME.bg, minHeight: "100vh" }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: THEME.text, marginBottom: 4 }}>合伙人渠道体系 V2</div>
      <div style={{ fontSize: 12, color: THEME.sub, marginBottom: 16 }}>多级渠道 · 直属培养奖励 · 传播链路追溯 · 月度结算</div>

      {/* Tab */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {([
          { key: "partners", label: "合伙人管理" },
          { key: "network", label: "传播链路" },
          { key: "settlements", label: "结算管理" },
          { key: "risk", label: "风控" },
        ] as { key: TabKey; label: string }[]).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: "8px 16px", borderRadius: 10, fontSize: 13, cursor: "pointer",
              border: `1px solid ${tab === t.key ? THEME.primary : THEME.border}`,
              background: tab === t.key ? THEME.primary : "#fff",
              color: tab === t.key ? "#fff" : THEME.sub, fontWeight: tab === t.key ? 700 : 400,
            }}>{t.label}</button>
        ))}
      </div>

      {/* ========== 合伙人管理 ========== */}
      {tab === "partners" && (
        <div style={card}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <input style={inputS} placeholder="搜索 名称/联系方式/ID" value={partnersQuery}
              onChange={(e) => setPartnersQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadPartners(1, partnersStatus, partnersQuery)} />
            <select style={inputS} value={partnersStatus} onChange={(e) => { setPartnersStatus(e.target.value); loadPartners(1, e.target.value, partnersQuery); }}>
              <option value="">全部状态</option>
              <option value="PENDING">待审核</option>
              <option value="APPROVED">已开通</option>
              <option value="REJECTED">已驳回</option>
              <option value="DISABLED">已禁用</option>
            </select>
            <button style={btn(THEME.primary)} onClick={() => loadPartners(1, partnersStatus, partnersQuery)}>搜索</button>
            <span style={{ fontSize: 12, color: THEME.sub, lineHeight: "30px" }}>共 {partnersTotal} 位</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100 }}>
              <thead>
                <tr>
                  <th style={th}>ID/昵称</th><th style={th}>姓名/联系</th><th style={th}>等级</th><th style={th}>状态</th>
                  <th style={th}>上级推荐人</th><th style={th}>渠道用户</th><th style={th}>累计流水</th><th style={th}>累计佣金</th>
                  <th style={th}>申请时间</th><th style={th}>操作</th>
                </tr>
              </thead>
              <tbody>
                {partners.map((p) => (
                  <tr key={p.userId}>
                    <td style={td}><b>{p.nickname || "-"}</b><div style={{ fontSize: 10, color: "#bbb" }}>#{p.userId}</div></td>
                    <td style={td}>{p.realName}<div style={{ fontSize: 10, color: "#999" }}>{p.contact}{p.phone ? ` · ${p.phone}` : ""}</div></td>
                    <td style={td}>{p.level === "CORE" ? badge("#ad6800", "核心") : badge(THEME.sub, "普通")}</td>
                    <td style={td}>{badge(STATUS_COLOR[p.status] || "#999", STATUS_LABEL[p.status] || p.status)}</td>
                    <td style={td}>{p.referrerUserId ? `${p.referrerName || ""} #${p.referrerUserId}` : "-"}</td>
                    <td style={td}>{p.channelUserCount}</td>
                    <td style={td}>¥{p.channelGrossYuan}</td>
                    <td style={td}>¥{p.commissionTotalYuan}</td>
                    <td style={td}>{String(p.appliedAt || "").slice(0, 10)}</td>
                    <td style={td}>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {p.status === "PENDING" && <button style={btn("#1e8e5a")} onClick={() => doAction(p.userId, "approve")}>通过</button>}
                        {p.status === "PENDING" && <button style={btn("#cf1322")} onClick={() => doAction(p.userId, "reject")}>驳回</button>}
                        {p.status === "APPROVED" && <button style={btn("#8a8fa3")} onClick={() => doAction(p.userId, "disable")}>禁用</button>}
                        {p.status === "DISABLED" && <button style={btn("#1e8e5a")} onClick={() => doAction(p.userId, "enable")}>重开</button>}
                        {p.status === "APPROVED" && (
                          <button style={btn("#fff", THEME.primary)} onClick={() => doAction(p.userId, "level", { level: p.level === "CORE" ? "NORMAL" : "CORE" })}>
                            {p.level === "CORE" ? "降普通" : "升核心"}
                          </button>
                        )}
                        {p.status === "APPROVED" && <button style={btn("#fff", "#ad6800")} onClick={() => doReferrer(p.userId)}>改上级</button>}
                        {p.status === "APPROVED" && <button style={btn("#fff", "#555")} onClick={() => openDetail(p)}>用户明细</button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {partners.length === 0 && <tr><td style={{ ...td, textAlign: "center", color: "#bbb" }} colSpan={10}>暂无数据</td></tr>}
              </tbody>
            </table>
          </div>
          {partnersTotal > 20 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 10 }}>
              <button style={btn("#fff", "#555")} disabled={partnersPage <= 1} onClick={() => loadPartners(partnersPage - 1)}>上一页</button>
              <span style={{ fontSize: 12, color: THEME.sub, lineHeight: "26px" }}>{partnersPage} / {Math.ceil(partnersTotal / 20)}</span>
              <button style={btn("#fff", "#555")} disabled={partnersPage >= Math.ceil(partnersTotal / 20)} onClick={() => loadPartners(partnersPage + 1)}>下一页</button>
            </div>
          )}
          <div style={{ fontSize: 10, color: "#bbb", marginTop: 10 }}>
            红线：用户渠道归属与合伙人推荐关系一经绑定永久生效，仅此处可手动调整；全部操作已写入审计日志
          </div>
        </div>
      )}

      {/* 用户明细弹层 */}
      {detailPartner && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => { setDetailPartner(null); setDetailUsers(null); }}>
          <div style={{ background: "#fff", borderRadius: 14, width: "92%", maxWidth: 800, maxHeight: "80vh", overflowY: "auto", padding: 18 }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>
              渠道用户明细 · {detailPartner.nickname} #{detailPartner.userId}
              <span style={{ fontSize: 11, color: "#999", fontWeight: 400, marginLeft: 8 }}>共 {detailUsers?.total ?? 0} 人（管理端全量，不脱敏）</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <input style={inputS} placeholder="搜索昵称/手机号" value={detailQuery} onChange={(e) => setDetailQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchDetail(1)} />
              <button style={btn(THEME.primary)} onClick={() => searchDetail(1)}>搜索</button>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>用户</th><th style={th}>手机/邮箱</th><th style={th}>注册</th><th style={th}>最近登录</th><th style={th}>付费</th><th style={th}>累计消费</th></tr></thead>
              <tbody>
                {(detailUsers?.users || []).map((u) => (
                  <tr key={u.userId}>
                    <td style={td}>{u.nickname || "-"}<div style={{ fontSize: 10, color: "#bbb" }}>#{u.userId}</div></td>
                    <td style={td}>{u.phone || "-"}<div style={{ fontSize: 10, color: "#999" }}>{u.email || ""}</div></td>
                    <td style={td}>{String(u.registeredAt || "").slice(0, 10)}</td>
                    <td style={td}>{String(u.lastLoginAt || "").slice(0, 10)}</td>
                    <td style={td}>{u.isPaid ? badge("#1e8e5a", "已付费") : badge("#bbb", "未付费")}</td>
                    <td style={td}>¥{u.consumeYuan}</td>
                  </tr>
                ))}
                {detailUsers && detailUsers.users.length === 0 && <tr><td style={{ ...td, textAlign: "center", color: "#bbb" }} colSpan={6}>无匹配用户</td></tr>}
              </tbody>
            </table>
            {detailUsers && detailUsers.total > 50 && (
              <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 10 }}>
                <button style={btn("#fff", "#555")} disabled={detailPage <= 1} onClick={() => searchDetail(detailPage - 1)}>上一页</button>
                <span style={{ fontSize: 12, color: THEME.sub, lineHeight: "26px" }}>{detailPage} / {Math.ceil(detailUsers.total / 50)}</span>
                <button style={btn("#fff", "#555")} disabled={detailPage >= Math.ceil(detailUsers.total / 50)} onClick={() => searchDetail(detailPage + 1)}>下一页</button>
              </div>
            )}
            <button style={{ ...btn("#f0ecf8", "#666"), width: "100%", marginTop: 12, padding: 10 }} onClick={() => { setDetailPartner(null); setDetailUsers(null); }}>关闭</button>
          </div>
        </div>
      )}

      {/* ========== 传播链路 ========== */}
      {tab === "network" && (
        <div style={card}>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            {([["channels", "渠道总览"], ["userTree", "用户层级树"], ["partnerTree", "合伙人关系树"]] as const).map(([v, t]) => (
              <button key={v} onClick={() => setNetMode(v)}
                style={{
                  padding: "6px 14px", borderRadius: 16, fontSize: 12,
                  border: `1px solid ${netMode === v ? THEME.primary : THEME.border}`,
                  background: netMode === v ? THEME.primary : "#fff", color: netMode === v ? "#fff" : THEME.sub,
                }}>{t}</button>
            ))}
          </div>

          {netMode === "channels" && (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>合伙人</th><th style={th}>渠道注册</th><th style={th}>付费人数</th><th style={th}>累计流水</th><th style={th}>流水占比</th></tr></thead>
              <tbody>
                {channels.map((c) => (
                  <tr key={c.partnerUserId}>
                    <td style={td}>{c.nickname} <span style={{ fontSize: 10, color: "#bbb" }}>#{c.partnerUserId}</span></td>
                    <td style={td}>{c.registered}</td>
                    <td style={td}>{c.paid}</td>
                    <td style={td}>¥{c.grossYuan}</td>
                    <td style={td}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 70, height: 6, background: "#f0ecf8", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: `${Math.min(100, parseFloat(c.grossShare) || 0)}%`, height: "100%", background: THEME.primary }} />
                        </div>
                        <span style={{ fontSize: 11, color: THEME.sub }}>{c.grossShare}</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {channels.length === 0 && <tr><td style={{ ...td, textAlign: "center", color: "#bbb" }} colSpan={5}>暂无已开通合伙人</td></tr>}
              </tbody>
              {channels.length > 0 && (
                <tfoot><tr><td style={{ ...td, fontWeight: 700 }} colSpan={3}>全渠道合计</td><td style={{ ...td, fontWeight: 700 }}>¥{totalGross}</td><td style={td} /></tr></tfoot>
              )}
            </table>
          )}

          {netMode === "userTree" && (
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input style={inputS} placeholder="输入用户ID，追溯完整上下级链路" value={treeUserId} onChange={(e) => setTreeUserId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchUserTree()} />
                <button style={btn(THEME.primary)} onClick={searchUserTree}>追溯</button>
              </div>
              {userTree && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, padding: "8px 10px", background: "#f8f6fd", borderRadius: 8, marginBottom: 10 }}>
                    目标用户：{userTree.user.nickname} #{userTree.user.userId} · {userTree.user.phone || "无手机号"}
                  </div>
                  {userTree.upline.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: THEME.sub, marginBottom: 4 }}>上级链路（就近 → 最远）</div>
                      {userTree.upline.map((n) => <TreeNode key={n.userId} node={n} depth={0} />)}
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: THEME.sub, marginBottom: 4 }}>下级邀请树（最深5层，合伙人节点截止）</div>
                    {userTree.downline.length > 0
                      ? userTree.downline.map((n) => <TreeNode key={n.userId} node={n} depth={0} />)
                      : <div style={{ fontSize: 12, color: "#bbb" }}>无下级</div>}
                  </div>
                </div>
              )}
              {!userTree && <div style={{ fontSize: 12, color: "#bbb", textAlign: "center", padding: 20 }}>输入用户ID开始追溯全链路传播脉络</div>}
            </div>
          )}

          {netMode === "partnerTree" && (
            <div>
              {partnerTree && partnerTree.length > 0
                ? partnerTree.map((n) => <TreeNode key={n.userId} node={n} depth={0} />)
                : <div style={{ fontSize: 12, color: "#bbb", textAlign: "center", padding: 20 }}>暂无合伙人推荐关系（全部为无上级的顶级合伙人）</div>}
            </div>
          )}
        </div>
      )}

      {/* ========== 结算管理 ========== */}
      {tab === "settlements" && (
        <div style={card}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <input style={inputS} placeholder="期间 YYYY-MM" value={settlePeriod} onChange={(e) => setSettlePeriod(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadSettlements(1, settlePeriod)} />
            <button style={btn(THEME.primary)} onClick={() => loadSettlements(1, settlePeriod)}>筛选</button>
            <input style={inputS} placeholder="生成期间 YYYY-MM" value={genPeriod} onChange={(e) => setGenPeriod(e.target.value)} />
            <button style={btn("#1e8e5a")} onClick={doGenerate}>生成结算单</button>
            <span style={{ fontSize: 12, color: THEME.sub, lineHeight: "30px" }}>共 {settleTotal} 单</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1050 }}>
              <thead>
                <tr>
                  <th style={th}>期间</th><th style={th}>合伙人</th><th style={th}>实付总额</th><th style={th}>手续费</th><th style={th}>AI成本</th>
                  <th style={th}>普通佣金</th><th style={th}>净收入</th><th style={th}>基础佣金</th><th style={th}>培养奖励(收)</th>
                  <th style={th}>调整</th><th style={th}>状态</th><th style={th}>操作</th>
                </tr>
              </thead>
              <tbody>
                {settlements.map((s) => (
                  <tr key={s.id}>
                    <td style={td}>{s.period}</td>
                    <td style={td}>{s.nickname || "-"}<div style={{ fontSize: 10, color: "#bbb" }}>#{s.partnerId}</div></td>
                    <td style={td}>¥{s.grossYuan}</td>
                    <td style={td}>¥{s.feeCostYuan}</td>
                    <td style={td}>¥{s.aiCostYuan}</td>
                    <td style={td}>¥{(Number(s.grossYuan) - Number(s.feeCostYuan) - Number(s.aiCostYuan) - Number(s.netYuan)).toFixed(2)}</td>
                    <td style={td}>¥{s.netYuan}</td>
                    <td style={td}><b>¥{s.baseCommissionYuan}</b></td>
                    <td style={td}>¥{s.nurtureReceivedYuan}</td>
                    <td style={td}>{Number(s.adjustYuan) !== 0 ? `${Number(s.adjustYuan) > 0 ? "+" : ""}${s.adjustYuan}` : "-"}</td>
                    <td style={td}>{badge(SETTLE_LABEL[s.status] ? (s.status === "APPROVED" ? "#1e8e5a" : s.status === "REJECTED" ? "#cf1322" : "#d48806") : "#999", SETTLE_LABEL[s.status] || s.status)}</td>
                    <td style={td}>
                      {s.status === "PENDING_REVIEW" && (
                        <div style={{ display: "flex", gap: 4 }}>
                          <button style={btn("#1e8e5a")} onClick={() => doApprove(s.id)}>通过</button>
                          <button style={btn("#cf1322")} onClick={() => doReject(s.id)}>驳回</button>
                          <button style={btn("#fff", THEME.primary)} onClick={() => doAdjust(s.id)}>调整</button>
                        </div>
                      )}
                      {s.status === "REJECTED" && <span style={{ fontSize: 10, color: "#cf1322" }}>{s.rejectReason.slice(0, 12)}</span>}
                    </td>
                  </tr>
                ))}
                {settlements.length === 0 && <tr><td style={{ ...td, textAlign: "center", color: "#bbb" }} colSpan={12}>暂无结算单</td></tr>}
              </tbody>
            </table>
          </div>
          {settleTotal > 20 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 10 }}>
              <button style={btn("#fff", "#555")} disabled={settlePage <= 1} onClick={() => loadSettlements(settlePage - 1)}>上一页</button>
              <span style={{ fontSize: 12, color: THEME.sub, lineHeight: "26px" }}>{settlePage} / {Math.ceil(settleTotal / 20)}</span>
              <button style={btn("#fff", "#555")} disabled={settlePage >= Math.ceil(settleTotal / 20)} onClick={() => loadSettlements(settlePage + 1)}>下一页</button>
            </div>
          )}
          <div style={{ fontSize: 10, color: "#bbb", marginTop: 10 }}>
            成本明细均取自逐单精确留痕（partner_order_log）；审核通过后当期冻结佣金（含培养奖励）转入可提现余额，提现与普通佣金共用每月16日-月末窗口与微信商家转账通道
          </div>
        </div>
      )}

      {/* ========== 风控 ========== */}
      {tab === "risk" && (
        <div style={{ ...card, maxWidth: 560 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>标记无效订单</div>
          <div style={{ fontSize: 11, color: THEME.sub, lineHeight: 1.8, marginBottom: 12 }}>
            适用：异常刷量、虚假注册、自推自/互推套利等作弊订单。标记后该订单全部佣金（普通两级 + 合伙人渠道 + 培养奖励）
            自动扣回，账户余额不足部分记为负向余额；操作全程审计留痕。
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input style={inputS} placeholder="订单号（YD开头）" value={riskOrder} onChange={(e) => setRiskOrder(e.target.value)} />
            <input style={inputS} placeholder="标记原因（如：批量虚假注册刷单）" value={riskReason} onChange={(e) => setRiskReason(e.target.value)} />
            <button style={{ ...btn("#cf1322"), padding: 10, fontSize: 13 }} onClick={doRisk}>确认标记无效并扣回佣金</button>
          </div>
          <div style={{ fontSize: 10, color: "#bbb", marginTop: 14, lineHeight: 1.8 }}>
            规则引擎已内置防线：禁止自推自、互推绑定拦截、推荐人资格校验、订单幂等防重。<br />
            所有合伙人后台操作（审核/禁用/调级/改上级/结算/调整/风控）均写入审计日志，可在「审计日志」页检索 PARTNER_ 前缀动作。
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: 40, background: "rgba(0,0,0,0.78)", color: "#fff", fontSize: 13, padding: "10px 18px", borderRadius: 20, zIndex: 200 }}>
          {toast}
        </div>
      )}
    </div>
  );
}
