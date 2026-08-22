"use client";

// ============================================================================
// 言道国学 - 统一运营管理中心（FINAL-SEAL-03 第九~十一章）
//   · 当前身份（角色体系 SUPER_ADMIN/ADMIN/CONTENT_ADMIN/FINANCE_ADMIN/SUPPORT_ADMIN）
//   · 总览全量指标：用户/今日新增/活跃/会员/订单/收入/AI调用/群/动态/举报/分佣/服务器/版本
//   · 审计日志：所有后台变更（operator/time/action/old/new/reason/IP）
//   · 后台密钥管理（SUPER_ADMIN）：创建/吊销各角色密钥
// ============================================================================

import { useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Crown,
  Receipt,
  Bot,
  UsersRound,
  Flag,
  Coins,
  Server,
  ShieldCheck,
  KeyRound,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { THEME, styles, AdminCard, StatCard, Badge, LoadingSpinner, useMounted, useToast } from "../_shared";
import {
  fetchWhoami,
  fetchUnifiedOverview,
  fetchAuditLogs,
  fetchAdminKeys,
  createAdminKey,
  revokeAdminKey,
  type AdminIdentity,
  type UnifiedOverview,
  type AuditEntry,
  type AdminKeyInfo,
} from "@/lib/admin/unifiedService";

function fmtTime(iso?: string | null): string {
  if (!iso) return "-";
  return iso.slice(0, 19).replace("T", " ");
}

const ROLE_BADGE: Record<string, { label: string; type: "primary" | "success" | "warning" | "info" | "default" }> = {
  SUPER_ADMIN: { label: "超级管理员", type: "primary" },
  ADMIN: { label: "管理员", type: "success" },
  CONTENT_ADMIN: { label: "内容管理员", type: "info" },
  FINANCE_ADMIN: { label: "财务管理员", type: "warning" },
  SUPPORT_ADMIN: { label: "客服管理员", type: "default" },
};

export default function AdminUnifiedPage() {
  const mounted = useMounted();
  const { show, toastNode } = useToast();

  const [loading, setLoading] = useState(true);
  const [identity, setIdentity] = useState<AdminIdentity | null>(null);
  const [overview, setOverview] = useState<UnifiedOverview | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [keys, setKeys] = useState<AdminKeyInfo[]>([]);
  const [isSuper, setIsSuper] = useState(false);

  // 密钥管理表单
  const [newKeyRole, setNewKeyRole] = useState("SUPPORT_ADMIN");
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyReason, setNewKeyReason] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const who = await fetchWhoami();
    setIdentity(who);
    const superAdmin = who?.role === "SUPER_ADMIN";
    setIsSuper(superAdmin);
    const [ov, logs] = await Promise.all([fetchUnifiedOverview(), fetchAuditLogs(50)]);
    setOverview(ov);
    setAuditLogs(logs);
    if (superAdmin) {
      const ks = await fetchAdminKeys();
      setKeys(ks);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (mounted) load();
  }, [mounted, load]);

  const handleCreateKey = async () => {
    if (!newKeyName.trim() || newKeyReason.trim().length < 2) {
      show("请填写密钥名称与创建原因", "error");
      return;
    }
    setBusy(true);
    const r = await createAdminKey(newKeyRole, newKeyName.trim(), newKeyReason.trim());
    setBusy(false);
    if (r.ok && r.key) {
      setCreatedKey(r.key);
      setNewKeyName("");
      setNewKeyReason("");
      show("密钥已创建（仅此一次展示，请立即保存）");
      fetchAdminKeys().then(setKeys);
    } else {
      show(r.error || "创建失败", "error");
    }
  };

  const handleRevoke = async (masked: string) => {
    const reason = window.prompt("吊销原因（写入审计）：");
    if (!reason || reason.trim().length < 2) return;
    const r = await revokeAdminKey(masked, reason.trim());
    if (r.ok) {
      show("密钥已吊销");
      fetchAdminKeys().then(setKeys);
    } else {
      show(r.error || "吊销失败", "error");
    }
  };

  if (!mounted || loading) {
    return (
      <div style={{ padding: 24 }}>
        <LoadingSpinner text="加载统一控制中心..." />
      </div>
    );
  }

  const u = overview?.users || {};
  const o = overview?.orders || {};
  const s = overview?.social || {};
  const m = overview?.moderation || {};
  const c = overview?.commission || {};
  const sv = overview?.server || {};

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      {/* 身份卡片 */}
      <AdminCard>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              backgroundColor: THEME.primaryBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: THEME.primary,
            }}
          >
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: THEME.textMain }}>
              {identity?.name || "未知管理员"}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center" }}>
              {identity && <Badge type={(ROLE_BADGE[identity.role] || { type: "default" }).type}>
                {ROLE_BADGE[identity.role]?.label || identity.role}
              </Badge>}
              <span style={{ fontSize: 12, color: THEME.textHint }}>
                版本 {overview?.version || "unknown"} · 数据截至 {fmtTime(overview?.generatedAt)}
              </span>
            </div>
          </div>
          <button onClick={load} style={{ ...styles.btnSecondary, marginLeft: "auto" }}>
            <RefreshCw size={13} style={{ verticalAlign: -1, marginRight: 4 }} />
            刷新
          </button>
        </div>
      </AdminCard>

      {/* 核心指标 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <StatCard label="总用户" value={String(u.total ?? "-")} sub={`今日新增 ${u.newToday ?? 0}`} icon={<Users size={18} />} />
        <StatCard label="活跃用户（7天）" value={String(u.active7d ?? "-")} icon={<Users size={18} />} color={THEME.info} />
        <StatCard label="会员用户" value={String(overview?.membership?.paid ?? "-")} icon={<Crown size={18} />} color={THEME.warning} />
        <StatCard label="订单（总/已付）" value={`${o.total ?? 0} / ${o.paid ?? 0}`} icon={<Receipt size={18} />} color={THEME.success} />
        <StatCard label="累计收入" value={`¥${o.revenueYuan ?? "0.00"}`} icon={<Receipt size={18} />} color={THEME.success} />
        <StatCard label="AI 调用" value={String(overview?.ai?.totalCalls ?? 0)} sub={overview?.ai?.enabled ? "AI已启用" : "AI已关闭"} icon={<Bot size={18} />} color={THEME.info} />
        <StatCard label="群数量" value={String(s.groups ?? 0)} icon={<UsersRound size={18} />} />
        <StatCard label="动态数量" value={String(s.posts ?? 0)} icon={<UsersRound size={18} />} />
        <StatCard label="待处理举报" value={String(m.reportsPending ?? 0)} icon={<Flag size={18} />} color={(m.reportsPending ?? 0) > 0 ? THEME.error : THEME.textHint} />
        <StatCard label="封禁用户" value={String(m.usersBanned ?? 0)} icon={<Flag size={18} />} color={THEME.error} />
        <StatCard label="分佣记录" value={String(c.records ?? 0)} sub={`累计 ¥${c.totalYuan ?? "0.00"}`} icon={<Coins size={18} />} color={THEME.warning} />
        <StatCard label="待审核提现" value={String(c.withdrawalsPending ?? 0)} icon={<Coins size={18} />} color={(c.withdrawalsPending ?? 0) > 0 ? THEME.warning : THEME.textHint} />
      </div>

      {/* 服务器状态 */}
      <AdminCard title={<span style={{ display: "flex", alignItems: "center", gap: 6 }}><Server size={15} /> 服务器状态</span>}>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", fontSize: 13, color: THEME.textSub }}>
          <span>运行时长：{sv.uptimeHours ?? "-"} 小时</span>
          <span>内存：{sv.memoryMB ?? "-"} MB</span>
          <span>Node：{sv.nodeVersion || "-"}</span>
          <span>PID：{sv.pid ?? "-"}</span>
        </div>
      </AdminCard>

      {/* 密钥管理（仅 SUPER_ADMIN） */}
      {isSuper && (
        <AdminCard title={<span style={{ display: "flex", alignItems: "center", gap: 6 }}><KeyRound size={15} /> 后台密钥管理（仅超级管理员可见）</span>}>
          {/* 新建密钥 */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            <select value={newKeyRole} onChange={(e) => setNewKeyRole(e.target.value)} style={{ ...styles.input, width: 160 }}>
              {Object.keys(ROLE_BADGE).map((r) => (
                <option key={r} value={r}>
                  {ROLE_BADGE[r].label}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="密钥名称（如：内容运营-小王）"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              style={{ ...styles.input, width: 200 }}
            />
            <input
              type="text"
              placeholder="创建原因（审计）"
              value={newKeyReason}
              onChange={(e) => setNewKeyReason(e.target.value)}
              style={{ ...styles.input, width: 200 }}
            />
            <button onClick={handleCreateKey} disabled={busy} style={styles.btnPrimary}>
              {busy ? "创建中..." : "创建密钥"}
            </button>
          </div>

          {createdKey && (
            <div
              style={{
                padding: 12,
                backgroundColor: THEME.warningBg,
                borderRadius: 8,
                marginBottom: 14,
                fontSize: 13,
                color: THEME.warning,
              }}
            >
              新密钥（仅此一次展示）：<code style={{ fontWeight: 700, userSelect: "all" }}>{createdKey}</code>
              <br />
              <span style={{ fontSize: 11 }}>请立即复制保存并分发给对应管理员，关闭后无法再次查看。</span>
            </div>
          )}

          {/* 密钥列表 */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  <Th>名称</Th>
                  <Th>角色</Th>
                  <Th>密钥（掩码）</Th>
                  <Th>创建时间</Th>
                  <Th>最近使用</Th>
                  <Th>操作</Th>
                </tr>
              </thead>
              <tbody>
                {keys.length === 0 ? (
                  <tr>
                    <Td colSpan={6} style={{ textAlign: "center", color: THEME.textHint, padding: 20 }}>
                      暂无自定义密钥（环境变量主密钥不在此显示）
                    </Td>
                  </tr>
                ) : (
                  keys.map((k, i) => (
                    <tr key={i}>
                      <Td>{k.name}</Td>
                      <Td>
                        <Badge type={ROLE_BADGE[k.role]?.type || "default"}>
                          {ROLE_BADGE[k.role]?.label || k.role}
                        </Badge>
                      </Td>
                      <Td style={{ fontFamily: "monospace" }}>{k.masked}</Td>
                      <Td style={{ fontSize: 11 }}>{fmtTime(k.createdAt)}</Td>
                      <Td style={{ fontSize: 11 }}>{fmtTime(k.lastUsedAt)}</Td>
                      <Td>
                        <button onClick={() => handleRevoke(k.masked)} style={{ ...styles.btnDanger, padding: "3px 8px", fontSize: 11 }}>
                          <Trash2 size={11} style={{ verticalAlign: -1, marginRight: 3 }} />
                          吊销
                        </button>
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </AdminCard>
      )}

      {/* 审计日志 */}
      <AdminCard title={<span style={{ display: "flex", alignItems: "center", gap: 6 }}><LayoutDashboard size={15} /> 操作审计日志（最近50条）</span>}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                <Th>时间</Th>
                <Th>操作者</Th>
                <Th>动作</Th>
                <Th>对象</Th>
                <Th>变更</Th>
                <Th>原因</Th>
                <Th>IP</Th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr>
                  <Td colSpan={7} style={{ textAlign: "center", color: THEME.textHint, padding: 20 }}>
                    暂无审计记录
                  </Td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id}>
                    <Td style={{ fontSize: 11, whiteSpace: "nowrap" }}>{fmtTime(log.time)}</Td>
                    <Td>
                      {log.operator}
                      <div style={{ fontSize: 10, color: THEME.textHint }}>{log.operatorRole}</div>
                    </Td>
                    <Td style={{ fontFamily: "monospace", fontSize: 11 }}>{log.action}</Td>
                    <Td style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {log.target}
                    </Td>
                    <Td style={{ fontSize: 11, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {log.oldValue !== null && log.newValue !== null
                        ? `${JSON.stringify(log.oldValue)} → ${JSON.stringify(log.newValue)}`
                        : log.newValue !== null
                          ? JSON.stringify(log.newValue)
                          : "-"}
                    </Td>
                    <Td style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {log.reason || "-"}
                    </Td>
                    <Td style={{ fontSize: 11 }}>{log.ip || "-"}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AdminCard>

      {toastNode}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: "8px 10px",
        borderBottom: `2px solid ${THEME.border}`,
        color: THEME.textSub,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, colSpan, style }: { children?: React.ReactNode; colSpan?: number; style?: React.CSSProperties }) {
  return (
    <td colSpan={colSpan} style={{ padding: "8px 10px", borderBottom: `1px solid ${THEME.border}`, ...style }}>
      {children}
    </td>
  );
}
