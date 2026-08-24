"use client";

// ============================================================================
// 言道国学 - 社交/内容审核后台（FINAL-SEAL-03 第十七章）
//   · 用户管理：搜索 / 封禁 / 解封 / 禁言（含时长与原因）
//   · 动态管理：状态筛选 / 下架 / 恢复
//   · 举报处理：待处理列表 / 处理 / 驳回
//   · 群管理：群列表 / 关闭违规群 / 重开
//   · 全部操作写审计日志（操作者/时间/原因/IP）
// ============================================================================

import { useCallback, useEffect, useState } from "react";
import { Users, FileText, Flag, UsersRound, RefreshCw, Ban, CheckCircle2, VolumeX, Unlock } from "lucide-react";
import { THEME, styles, AdminCard, Badge, LoadingSpinner, useMounted, useToast } from "../_shared";
import {
  fetchModerationUsers,
  userAction,
  fetchModerationPosts,
  postAction,
  fetchModerationReports,
  reportAction,
  fetchModerationGroups,
  groupAction,
  type ModerationUser,
  type ModerationPost,
  type ModerationReport,
  type ModerationGroup,
} from "@/lib/admin/unifiedService";

type TabKey = "users" | "posts" | "reports" | "groups";

function fmtTime(iso?: string | null): string {
  if (!iso) return "-";
  return iso.slice(0, 16).replace("T", " ");
}

export default function AdminModerationPage() {
  const mounted = useMounted();
  const { show, toastNode } = useToast();

  const [tab, setTab] = useState<TabKey>("users");
  const [loading, setLoading] = useState(true);

  // 各列表
  const [users, setUsers] = useState<ModerationUser[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [userQuery, setUserQuery] = useState("");

  const [posts, setPosts] = useState<ModerationPost[]>([]);
  const [postsTotal, setPostsTotal] = useState(0);
  const [postStatus, setPostStatus] = useState("");

  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [reportsTotal, setReportsTotal] = useState(0);
  const [reportStatus, setReportStatus] = useState("pending");

  const [groups, setGroups] = useState<ModerationGroup[]>([]);
  const [groupsTotal, setGroupsTotal] = useState(0);

  // 通用操作弹窗（原因必填）
  const [actionTarget, setActionTarget] = useState<{
    kind: TabKey;
    id: string;
    title: string;
    actions: { label: string; value: string; danger?: boolean; needHours?: boolean }[];
  } | null>(null);
  const [actionValue, setActionValue] = useState("");
  const [actionReason, setActionReason] = useState("");
  const [actionHours, setActionHours] = useState(24);
  const [busy, setBusy] = useState(false);

  const loadUsers = useCallback(async () => {
    const d = await fetchModerationUsers(userQuery);
    if (d) {
      setUsers(d.users || []);
      setUsersTotal(d.total || 0);
    }
  }, [userQuery]);

  const loadPosts = useCallback(async () => {
    const d = await fetchModerationPosts(postStatus);
    if (d) {
      setPosts(d.posts || []);
      setPostsTotal(d.total || 0);
    }
  }, [postStatus]);

  const loadReports = useCallback(async () => {
    const d = await fetchModerationReports(reportStatus);
    if (d) {
      setReports(d.reports || []);
      setReportsTotal(d.total || 0);
    }
  }, [reportStatus]);

  const loadGroups = useCallback(async () => {
    const d = await fetchModerationGroups();
    if (d) {
      setGroups(d.groups || []);
      setGroupsTotal(d.total || 0);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    (async () => {
      setLoading(true);
      await Promise.all([loadUsers(), loadPosts(), loadReports(), loadGroups()]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  const reloadCurrent = () => {
    if (tab === "users") loadUsers();
    else if (tab === "posts") loadPosts();
    else if (tab === "reports") loadReports();
    else loadGroups();
  };

  const submitAction = async () => {
    if (!actionTarget || !actionValue) {
      show("请选择操作类型", "error");
      return;
    }
    if (actionReason.trim().length < 2) {
      show("必须填写操作原因（写入审计）", "error");
      return;
    }
    setBusy(true);
    let r: { ok: boolean; error?: string };
    if (actionTarget.kind === "users") {
      r = await userAction(
        parseInt(actionTarget.id, 10),
        actionValue,
        actionValue === "mute" ? actionHours : undefined,
        actionReason.trim()
      );
    } else if (actionTarget.kind === "posts") {
      r = await postAction(actionTarget.id, actionValue, actionReason.trim());
    } else if (actionTarget.kind === "reports") {
      r = await reportAction(parseInt(actionTarget.id, 10), actionValue, actionReason.trim());
    } else {
      r = await groupAction(actionTarget.id, actionValue, actionReason.trim());
    }
    setBusy(false);
    if (r.ok) {
      show("操作成功（已记录审计）");
      setActionTarget(null);
      reloadCurrent();
    } else {
      show(r.error || "操作失败", "error");
    }
  };

  if (!mounted || loading) {
    return (
      <div style={{ padding: 24 }}>
        <LoadingSpinner text="加载审核数据..." />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Tab */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(
          [
            { key: "users", label: `用户（${usersTotal}）`, icon: <Users size={14} /> },
            { key: "posts", label: `动态（${postsTotal}）`, icon: <FileText size={14} /> },
            { key: "reports", label: `举报（${reportsTotal}）`, icon: <Flag size={14} /> },
            { key: "groups", label: `群聊（${groupsTotal}）`, icon: <UsersRound size={14} /> },
          ] as { key: TabKey; label: string; icon: React.ReactNode }[]
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: `1px solid ${tab === t.key ? THEME.primary : THEME.border}`,
              backgroundColor: tab === t.key ? THEME.primary : "#fff",
              color: tab === t.key ? "#fff" : THEME.textSub,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ===== 用户管理 ===== */}
      {tab === "users" && (
        <AdminCard>
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <input
              type="text"
              placeholder="搜索昵称 / 用户ID / 手机号 / 邮箱"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              style={{ ...styles.input, width: 260 }}
              onKeyDown={(e) => e.key === "Enter" && loadUsers()}
            />
            <button onClick={loadUsers} style={styles.btnPrimary}>
              搜索
            </button>
          </div>
          <Table>
            <thead>
              <tr>
                <Th>ID</Th>
                <Th>昵称</Th>
                <Th>手机号</Th>
                <Th>邮箱</Th>
                <Th>状态</Th>
                <Th>禁言至</Th>
                <Th>最近登录</Th>
                <Th>操作</Th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <EmptyRow colSpan={8} />
              ) : (
                users.map((u) => (
                  <tr key={u.user_id}>
                    <Td>{u.user_id}</Td>
                    <Td>{u.nickname}</Td>
                    <Td style={{ whiteSpace: "nowrap" }}>{u.phone || "-"}</Td>
                    <Td style={{ fontSize: 11, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {u.email || "-"}
                    </Td>
                    <Td>
                      <Badge type={u.status === "banned" ? "error" : u.status === "muted" ? "warning" : "success"}>
                        {u.status === "banned" ? "已封禁" : u.status === "muted" ? "禁言中" : "正常"}
                      </Badge>
                    </Td>
                    <Td style={{ fontSize: 11 }}>{u.muted_until ? fmtTime(u.muted_until) : "-"}</Td>
                    <Td style={{ fontSize: 11 }}>{fmtTime(u.last_login_at)}</Td>
                    <Td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <OpBtn
                          label="禁言"
                          icon={<VolumeX size={11} />}
                          onClick={() =>
                            setActionTarget({
                              kind: "users",
                              id: String(u.user_id),
                              title: `禁言用户 ${u.nickname}(${u.user_id})`,
                              actions: [{ label: `禁言`, value: "mute", needHours: true, danger: true }],
                            })
                          }
                        />
                        {u.status === "banned" ? (
                          <OpBtn
                            label="解封"
                            icon={<Unlock size={11} />}
                            onClick={() =>
                              setActionTarget({
                                kind: "users",
                                id: String(u.user_id),
                                title: `解封用户 ${u.nickname}(${u.user_id})`,
                                actions: [{ label: "解封", value: "unban" }],
                              })
                            }
                          />
                        ) : (
                          <OpBtn
                            label="封禁"
                            icon={<Ban size={11} />}
                            danger
                            onClick={() =>
                              setActionTarget({
                                kind: "users",
                                id: String(u.user_id),
                                title: `封禁用户 ${u.nickname}(${u.user_id})`,
                                actions: [{ label: "封禁账号", value: "ban", danger: true }],
                              })
                            }
                          />
                        )}
                      </div>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </AdminCard>
      )}

      {/* ===== 动态管理 ===== */}
      {tab === "posts" && (
        <AdminCard>
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <select value={postStatus} onChange={(e) => setPostStatus(e.target.value)} style={{ ...styles.input, width: 140 }}>
              <option value="">全部状态</option>
              <option value="active">正常</option>
              <option value="removed">已下架</option>
              <option value="pending">待审核</option>
            </select>
            <button onClick={loadPosts} style={styles.btnPrimary}>
              <RefreshCw size={12} style={{ verticalAlign: -1, marginRight: 4 }} />
              刷新
            </button>
          </div>
          <Table>
            <thead>
              <tr>
                <Th>动态ID</Th>
                <Th>作者</Th>
                <Th>内容摘要</Th>
                <Th>状态</Th>
                <Th>发布时间</Th>
                <Th>操作</Th>
              </tr>
            </thead>
            <tbody>
              {posts.length === 0 ? (
                <EmptyRow colSpan={6} />
              ) : (
                posts.map((p) => (
                  <tr key={p.post_id}>
                    <Td style={{ fontFamily: "monospace", fontSize: 11 }}>{p.post_id.slice(0, 12)}</Td>
                    <Td>{p.nickname || p.user_id}</Td>
                    <Td style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {(p.content || p.title || "-").slice(0, 50)}
                    </Td>
                    <Td>
                      <Badge type={p.status === "active" ? "success" : "error"}>
                        {p.status === "active" ? "正常" : p.status === "removed" ? "已下架" : p.status}
                      </Badge>
                    </Td>
                    <Td style={{ fontSize: 11 }}>{fmtTime(p.created_at)}</Td>
                    <Td>
                      {p.status === "active" ? (
                        <OpBtn
                          label="下架"
                          icon={<Ban size={11} />}
                          danger
                          onClick={() =>
                            setActionTarget({
                              kind: "posts",
                              id: p.post_id,
                              title: "下架动态",
                              actions: [{ label: "下架（用户不可见）", value: "takedown", danger: true }],
                            })
                          }
                        />
                      ) : (
                        <OpBtn
                          label="恢复"
                          icon={<CheckCircle2 size={11} />}
                          onClick={() =>
                            setActionTarget({
                              kind: "posts",
                              id: p.post_id,
                              title: "恢复动态",
                              actions: [{ label: "恢复展示", value: "restore" }],
                            })
                          }
                        />
                      )}
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </AdminCard>
      )}

      {/* ===== 举报处理 ===== */}
      {tab === "reports" && (
        <AdminCard>
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <select value={reportStatus} onChange={(e) => setReportStatus(e.target.value)} style={{ ...styles.input, width: 140 }}>
              <option value="pending">待处理</option>
              <option value="resolved">已处理</option>
              <option value="rejected">已驳回</option>
              <option value="">全部</option>
            </select>
            <button onClick={loadReports} style={styles.btnPrimary}>
              刷新
            </button>
          </div>
          <Table>
            <thead>
              <tr>
                <Th>ID</Th>
                <Th>举报对象</Th>
                <Th>对象ID</Th>
                <Th>原因</Th>
                <Th>状态</Th>
                <Th>时间</Th>
                <Th>操作</Th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <EmptyRow colSpan={7} />
              ) : (
                reports.map((r) => (
                  <tr key={r.id}>
                    <Td>{r.id}</Td>
                    <Td>{r.target_type}</Td>
                    <Td style={{ fontFamily: "monospace", fontSize: 11 }}>{String(r.target_id).slice(0, 16)}</Td>
                    <Td style={{ maxWidth: 200 }}>{r.reason || "-"}</Td>
                    <Td>
                      <Badge type={r.status === "pending" ? "warning" : r.status === "resolved" ? "success" : "default"}>
                        {r.status === "pending" ? "待处理" : r.status === "resolved" ? "已处理" : "已驳回"}
                      </Badge>
                    </Td>
                    <Td style={{ fontSize: 11 }}>{fmtTime(r.created_at)}</Td>
                    <Td>
                      {r.status === "pending" && (
                        <OpBtn
                          label="处理"
                          icon={<CheckCircle2 size={11} />}
                          onClick={() =>
                            setActionTarget({
                              kind: "reports",
                              id: String(r.id),
                              title: `处理举报 #${r.id}（${r.target_type}）`,
                              actions: [
                                { label: "标记已处理", value: "resolve" },
                                { label: "驳回举报", value: "reject" },
                              ],
                            })
                          }
                        />
                      )}
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </AdminCard>
      )}

      {/* ===== 群管理 ===== */}
      {tab === "groups" && (
        <AdminCard>
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <button onClick={loadGroups} style={styles.btnPrimary}>
              <RefreshCw size={12} style={{ verticalAlign: -1, marginRight: 4 }} />
              刷新
            </button>
          </div>
          <Table>
            <thead>
              <tr>
                <Th>群ID</Th>
                <Th>群名</Th>
                <Th>群主</Th>
                <Th>成员数</Th>
                <Th>状态</Th>
                <Th>创建时间</Th>
                <Th>操作</Th>
              </tr>
            </thead>
            <tbody>
              {groups.length === 0 ? (
                <EmptyRow colSpan={7} />
              ) : (
                groups.map((g) => (
                  <tr key={g.id}>
                    <Td style={{ fontFamily: "monospace", fontSize: 11 }}>{g.id}</Td>
                    <Td>{g.name}</Td>
                    <Td>{g.owner_name || g.owner_id}</Td>
                    <Td>{g.member_count}</Td>
                    <Td>
                      <Badge type={g.status === "closed" ? "error" : "success"}>
                        {g.status === "closed" ? "已关闭" : "正常"}
                      </Badge>
                    </Td>
                    <Td style={{ fontSize: 11 }}>{fmtTime(g.created_at)}</Td>
                    <Td>
                      {g.status === "closed" ? (
                        <OpBtn
                          label="重开"
                          onClick={() =>
                            setActionTarget({
                              kind: "groups",
                              id: g.id,
                              title: `重开群「${g.name}」`,
                              actions: [{ label: "重新开放", value: "reopen" }],
                            })
                          }
                        />
                      ) : (
                        <OpBtn
                          label="关闭"
                          icon={<Ban size={11} />}
                          danger
                          onClick={() =>
                            setActionTarget({
                              kind: "groups",
                              id: g.id,
                              title: `关闭群「${g.name}」`,
                              actions: [{ label: "关闭违规群", value: "close", danger: true }],
                            })
                          }
                        />
                      )}
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </AdminCard>
      )}

      {/* ===== 操作弹窗（原因必填，写审计） ===== */}
      {actionTarget && (
        <div
          onClick={() => setActionTarget(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.45)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: "#fff", borderRadius: 12, padding: 20, width: 380, maxWidth: "92vw" }}
          >
            <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: THEME.textMain }}>
              {actionTarget.title}
            </h3>

            <label style={styles.label}>操作类型</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
              {actionTarget.actions.map((a) => (
                <label
                  key={a.value}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                    color: a.danger ? THEME.error : THEME.textMain,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="actionValue"
                    checked={actionValue === a.value}
                    onChange={() => setActionValue(a.value)}
                  />
                  {a.label}
                </label>
              ))}
            </div>

            {actionTarget.actions.find((a) => a.value === actionValue)?.needHours && (
              <>
                <label style={styles.label}>禁言时长（小时）</label>
                <input
                  type="number"
                  min={1}
                  max={720}
                  value={actionHours}
                  onChange={(e) => setActionHours(Number(e.target.value))}
                  style={{ ...styles.input, marginBottom: 12 }}
                />
              </>
            )}

            <label style={styles.label}>操作原因（必填，写入审计日志）</label>
            <textarea
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              rows={3}
              placeholder="例如：发布违规营销内容"
              style={{ ...styles.input, resize: "none" }}
            />

            <div style={{ display: "flex", gap: 10, marginTop: 14, justifyContent: "flex-end" }}>
              <button onClick={() => setActionTarget(null)} style={styles.btnSecondary}>
                取消
              </button>
              <button onClick={submitAction} disabled={busy} style={styles.btnPrimary}>
                {busy ? "处理中..." : "确认执行"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toastNode}
    </div>
  );
}

// ==================== 小组件 ====================

function OpBtn({
  label,
  icon,
  onClick,
  danger,
}: {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "3px 8px",
        borderRadius: 6,
        border: `1px solid ${danger ? THEME.error : THEME.border}`,
        backgroundColor: danger ? THEME.errorBg : "#fff",
        color: danger ? THEME.error : THEME.textSub,
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        whiteSpace: "nowrap",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function Table({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>{children}</table>
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

function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <Td colSpan={colSpan} style={{ textAlign: "center", color: THEME.textHint, padding: 24 }}>
        暂无数据
      </Td>
    </tr>
  );
}
