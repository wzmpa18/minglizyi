"use client";

// ============================================================================
// 言道国学 - 社交/内容审核后台（FINAL-SEAL-03 第十七章）
//   · 用户管理：搜索 / 封禁 / 解封 / 禁言（含时长与原因）
//   · 会员调整：改档位/补发/撤销（v25.0.60 P1-9，改单不再依赖 SQL 直改库）
//   · 动态管理：状态筛选 / 下架 / 恢复
//   · 举报处理：待处理列表 / 处理 / 驳回
//   · 群管理：群列表 / 关闭违规群 / 重开
//   · 全部操作写审计日志（操作者/时间/原因/IP）
// ============================================================================

import { useCallback, useEffect, useState } from "react";
import { Users, FileText, Flag, UsersRound, RefreshCw, Ban, CheckCircle2, VolumeX, Unlock, Crown, Activity } from "lucide-react";
import { THEME, styles, AdminCard, Badge, LoadingSpinner, useMounted, useToast } from "../_shared";
import {
  fetchModerationUsers,
  userAction,
  userMembershipAction,
  fetchModerationPosts,
  postAction,
  fetchModerationReports,
  reportAction,
  fetchModerationGroups,
  groupAction,
  fetchActivityDaily,
  type ModerationUser,
  type ModerationPost,
  type ModerationReport,
  type ModerationGroup,
  type ActivityDailyData,
  type ActivityDailySort,
} from "@/lib/admin/unifiedService";

type TabKey = "users" | "activity" | "posts" | "reports" | "groups";

function fmtTime(iso?: string | null): string {
  if (!iso) return "-";
  return iso.slice(0, 16).replace("T", " ");
}

/** 秒 → 「X小时Y分」/「Y分钟」/「Z秒」可读时长 */
function fmtDuration(sec?: number | null): string {
  if (!sec || sec <= 0) return "0分钟";
  if (sec < 60) return `${sec}秒`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}分钟`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}小时${rm}分` : `${h}小时`;
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
  // v25.0.47_25: 用户列表分页（浏览全部用户，支持 20/50/100/全部 每页条数）
  const [usersPage, setUsersPage] = useState(1);
  const [usersPageSize, setUsersPageSize] = useState(20);

  const [posts, setPosts] = useState<ModerationPost[]>([]);
  const [postsTotal, setPostsTotal] = useState(0);
  const [postStatus, setPostStatus] = useState("");

  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [reportsTotal, setReportsTotal] = useState(0);
  const [reportStatus, setReportStatus] = useState("pending");

  const [groups, setGroups] = useState<ModerationGroup[]>([]);
  const [groupsTotal, setGroupsTotal] = useState(0);

  // v25.0.71 活跃用户日报：每天查看各活跃用户登录次数/在线时长/工具使用
  const [activityData, setActivityData] = useState<ActivityDailyData | null>(null);
  const [activityDate, setActivityDate] = useState(""); // 空 = 北京时间今天
  const [activityQuery, setActivityQuery] = useState("");
  const [activitySort, setActivitySort] = useState<ActivityDailySort>("duration");
  const [activityPage, setActivityPage] = useState(1);
  const [activityPageSize, setActivityPageSize] = useState(20);

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

  // v25.0.60 P1-9：会员调整弹窗
  const [memberTarget, setMemberTarget] = useState<{ userId: number; nickname: string; current: string } | null>(null);
  const [memberLevel, setMemberLevel] = useState("monthly");
  const [memberDays, setMemberDays] = useState("");
  const [memberReason, setMemberReason] = useState("");

  const loadUsers = useCallback(
    async (pageToLoad?: number, sizeToLoad?: number) => {
      const page = pageToLoad ?? usersPage;
      const size = sizeToLoad ?? usersPageSize;
      const d = await fetchModerationUsers(userQuery, page, size);
      if (d) {
        setUsers(d.users || []);
        setUsersTotal(d.total || 0);
        setUsersPage(page);
      }
    },
    [userQuery, usersPage, usersPageSize]
  );

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

  const loadActivity = useCallback(
    async (pageToLoad?: number, sizeToLoad?: number) => {
      const page = pageToLoad ?? activityPage;
      const size = sizeToLoad ?? activityPageSize;
      const d = await fetchActivityDaily(activityDate, page, size, activityQuery, activitySort);
      if (d) {
        setActivityData(d);
        setActivityPage(page);
      }
    },
    [activityDate, activityPage, activityPageSize, activityQuery, activitySort]
  );

  useEffect(() => {
    if (!mounted || tab !== "activity") return;
    loadActivity(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, tab, activityDate, activitySort]);

  useEffect(() => {
    if (!mounted) return;
    (async () => {
      setLoading(true);
      await Promise.all([loadUsers(1), loadPosts(), loadReports(), loadGroups()]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  const reloadCurrent = () => {
    if (tab === "users") loadUsers();
    else if (tab === "activity") loadActivity();
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

  const submitMemberAction = async () => {
    if (!memberTarget) return;
    if (memberReason.trim().length < 2) {
      show("必须填写调整原因（写入审计）", "error");
      return;
    }
    setBusy(true);
    const days = memberDays.trim() ? parseInt(memberDays, 10) : undefined;
    if (memberDays.trim() && (!Number.isFinite(days) || !days || days <= 0)) {
      show("自定义天数需为正整数", "error");
      setBusy(false);
      return;
    }
    const r = await userMembershipAction(memberTarget.userId, memberLevel, memberReason.trim(), days);
    setBusy(false);
    if (r.ok) {
      show("会员调整成功（已记录审计）");
      setMemberTarget(null);
      setMemberDays("");
      setMemberReason("");
      loadUsers();
    } else {
      show(r.error || "调整失败", "error");
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
            { key: "activity", label: `活跃用户${activityData ? `（${activityData.stat?.active_users ?? 0}）` : ""}`, icon: <Activity size={14} /> },
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
              onKeyDown={(e) => e.key === "Enter" && loadUsers(1)}
            />
            <button onClick={() => loadUsers(1)} style={styles.btnPrimary}>
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
                <Th>会员</Th>
                <Th>邀请成员</Th>
                <Th>状态</Th>
                <Th>禁言至</Th>
                <Th>当日活跃</Th>
                <Th>最近登录</Th>
                <Th>操作</Th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <EmptyRow colSpan={11} />
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
                      {u.member_level && u.member_level !== "basic" ? (
                        <Badge type={u.member_level === "lifetime" ? "warning" : "success"}>
                          {{ monthly: "月度", quarterly: "季度", yearly: "年度", lifetime: "终身", premium: "高级" }[u.member_level] || u.member_level}
                        </Badge>
                      ) : (
                        <Badge type="default">普通</Badge>
                      )}
                    </Td>
                    <Td>
                      {u.invite_count ? (
                        <div>
                          <span style={{ fontWeight: 700, color: THEME.primary }}>
                            {u.invite_count} 人
                          </span>
                          <div style={{ fontSize: 11, color: THEME.textHint }}>
                            一级 {u.invite_level1 ?? 0} · 二级 {u.invite_level2 ?? 0}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: THEME.textHint }}>-</span>
                      )}
                    </Td>
                    <Td>
                      <Badge type={u.status === "banned" ? "error" : u.status === "muted" ? "warning" : "success"}>
                        {u.status === "banned" ? "已封禁" : u.status === "muted" ? "禁言中" : "正常"}
                      </Badge>
                    </Td>
                    <Td style={{ fontSize: 11 }}>{u.muted_until ? fmtTime(u.muted_until) : "-"}</Td>
                    <Td style={{ fontSize: 11 }}>
                      {u.today_active_seconds || u.today_login_count || u.today_tool_events ? (
                        <div>
                          <span style={{ fontWeight: 700, color: THEME.primary }}>
                            {fmtDuration(u.today_active_seconds)}
                          </span>
                          <div style={{ fontSize: 11, color: THEME.textHint }}>
                            登录 {u.today_login_count ?? 0} 次 · 工具 {u.today_tool_events ?? 0} 次
                          </div>
                          {u.today_last_active_at && (
                            <div style={{ fontSize: 10, color: THEME.textHint }}>
                              最后 {fmtTime(u.today_last_active_at)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: THEME.textHint }}>今日未活跃</span>
                      )}
                    </Td>
                    <Td style={{ fontSize: 11 }}>{fmtTime(u.last_login_at)}</Td>
                    <Td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <OpBtn
                          label="会员"
                          icon={<Crown size={11} />}
                          onClick={() => {
                            setMemberTarget({
                              userId: u.user_id,
                              nickname: u.nickname || String(u.user_id),
                              current: u.member_level || "basic",
                            });
                            setMemberLevel(u.member_level && u.member_level !== "basic" ? u.member_level : "monthly");
                            setMemberDays("");
                            setMemberReason("");
                          }}
                        />
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
          {/* v25.0.47_25: 分页控件（分页浏览全部用户） */}
          <Pager
            total={usersTotal}
            page={usersPage}
            pageSize={usersPageSize}
            onLoad={(p, s) => {
              if (s !== undefined && s !== usersPageSize) setUsersPageSize(s);
              loadUsers(p, s);
            }}
          />
        </AdminCard>
      )}

      {/* ===== v25.0.71 活跃用户日报 ===== */}
      {tab === "activity" && (
        <AdminCard>
          <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="date"
              value={activityDate}
              max={activityData?.today || undefined}
              onChange={(e) => {
                setActivityDate(e.target.value);
                setActivityPage(1);
              }}
              style={{ ...styles.input, width: 160 }}
              title="北京时间自然日，可回看最近 90 天"
            />
            <input
              type="text"
              placeholder="搜索昵称 / 手机号 / 用户ID"
              value={activityQuery}
              onChange={(e) => setActivityQuery(e.target.value)}
              style={{ ...styles.input, width: 220 }}
              onKeyDown={(e) => e.key === "Enter" && loadActivity(1)}
            />
            <select
              value={activitySort}
              onChange={(e) => setActivitySort(e.target.value as ActivityDailySort)}
              style={{ ...styles.input, width: 150 }}
            >
              <option value="duration">按在线时长排序</option>
              <option value="logins">按登录次数排序</option>
              <option value="tools">按工具使用排序</option>
              <option value="lastActive">按最后活跃排序</option>
            </select>
            <button onClick={() => loadActivity(1)} style={styles.btnPrimary}>
              <RefreshCw size={12} style={{ verticalAlign: -1, marginRight: 4 }} />
              查询
            </button>
            <span style={{ fontSize: 11, color: THEME.textHint }}>
              口径：北京时间自然日；在线时长=页面前台可见时长（60秒心跳上报）
            </span>
          </div>

          {activityData && (
            <>
              {/* 当日汇总指标条 */}
              <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                {[
                  { label: "活跃用户", value: String(activityData.stat?.active_users ?? 0), sub: `${activityData.date}（北京时间）` },
                  { label: "总登录次数", value: String(activityData.stat?.total_logins ?? 0), sub: "含注册与各端登录" },
                  { label: "总在线时长", value: fmtDuration(activityData.stat?.total_active_seconds), sub: "全部活跃用户合计" },
                  { label: "总工具使用", value: `${activityData.stat?.total_tool_events ?? 0} 次`, sub: "埋点口径 tool_* 事件" },
                ].map((m) => (
                  <div
                    key={m.label}
                    style={{
                      flex: 1,
                      minWidth: 150,
                      border: `1px solid ${THEME.border}`,
                      borderRadius: 8,
                      padding: "10px 14px",
                    }}
                  >
                    <div style={{ fontSize: 11, color: THEME.textSub }}>{m.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: THEME.primary, margin: "2px 0" }}>{m.value}</div>
                    <div style={{ fontSize: 10, color: THEME.textHint }}>{m.sub}</div>
                  </div>
                ))}
              </div>

              {/* 近 7 日趋势 */}
              {activityData.trend && activityData.trend.length > 0 && (
                <div style={{ marginBottom: 14, border: `1px solid ${THEME.border}`, borderRadius: 8, padding: "10px 14px" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: THEME.textMain, marginBottom: 8 }}>近 7 日活跃趋势</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {[...activityData.trend]
                      .sort((a, b) => (a.stat_date < b.stat_date ? -1 : 1))
                      .map((t) => (
                        <div
                          key={t.stat_date}
                          style={{
                            flex: 1,
                            minWidth: 90,
                            borderRadius: 6,
                            padding: "6px 10px",
                            backgroundColor: t.stat_date === activityData.date ? "#f3e8ff" : "#f7f7f8",
                            fontSize: 11,
                            color: THEME.textSub,
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>{t.stat_date.slice(5)}</div>
                          <div>
                            活跃 <b style={{ color: THEME.primary }}>{t.active_users}</b>
                          </div>
                          <div>时长 {fmtDuration(t.total_active_seconds)}</div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}

          <Table>
            <thead>
              <tr>
                <Th>ID</Th>
                <Th>昵称</Th>
                <Th>手机号</Th>
                <Th>会员</Th>
                <Th>状态</Th>
                <Th>登录次数</Th>
                <Th>在线时长</Th>
                <Th>工具使用</Th>
                <Th>最后活跃</Th>
              </tr>
            </thead>
            <tbody>
              {!activityData || activityData.users.length === 0 ? (
                <EmptyRow colSpan={9} />
              ) : (
                activityData.users.map((a) => (
                  <tr key={a.user_id}>
                    <Td>{a.user_id}</Td>
                    <Td>{a.nickname}</Td>
                    <Td style={{ whiteSpace: "nowrap" }}>{a.phone || "-"}</Td>
                    <Td>
                      {a.member_level && a.member_level !== "basic" ? (
                        <Badge type={a.member_level === "lifetime" ? "warning" : "success"}>
                          {{ monthly: "月度", quarterly: "季度", yearly: "年度", lifetime: "终身", premium: "高级" }[a.member_level] || a.member_level}
                        </Badge>
                      ) : (
                        <Badge type="default">普通</Badge>
                      )}
                    </Td>
                    <Td>
                      <Badge type={a.status === "banned" ? "error" : "success"}>
                        {a.status === "banned" ? "已封禁" : "正常"}
                      </Badge>
                    </Td>
                    <Td>
                      <b style={{ color: THEME.primary }}>{a.login_count}</b>
                    </Td>
                    <Td style={{ fontWeight: 700 }}>{fmtDuration(a.active_seconds)}</Td>
                    <Td>{a.tool_events} 次</Td>
                    <Td style={{ fontSize: 11 }}>{fmtTime(a.last_active_at)}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
          <Pager
            total={activityData?.total ?? 0}
            page={activityPage}
            pageSize={activityPageSize}
            onLoad={(p, s) => {
              if (s !== undefined && s !== activityPageSize) setActivityPageSize(s);
              loadActivity(p, s);
            }}
          />
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

      {/* ===== v25.0.60 P1-9：会员调整弹窗（写审计） ===== */}
      {memberTarget && (
        <div
          onClick={() => setMemberTarget(null)}
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
            style={{ backgroundColor: "#fff", borderRadius: 12, padding: 20, width: 400, maxWidth: "92vw" }}
          >
            <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: THEME.textMain }}>
              <Crown size={14} style={{ verticalAlign: -2, marginRight: 4, color: "#d98324" }} />
              会员调整 · {memberTarget.nickname}({memberTarget.userId})
            </h3>
            <div style={{ fontSize: 12, color: THEME.textSub, marginBottom: 12 }}>
              当前档位：
              <b>
                {{ basic: "普通", monthly: "月度", quarterly: "季度", yearly: "年度", lifetime: "终身", premium: "高级(旧映射)" }[memberTarget.current] || memberTarget.current}
              </b>
            </div>

            <label style={styles.label}>调整为</label>
            <select value={memberLevel} onChange={(e) => setMemberLevel(e.target.value)} style={{ ...styles.input, marginBottom: 12 }}>
              <option value="monthly">月度会员（30天）</option>
              <option value="quarterly">季度会员（90天）</option>
              <option value="yearly">年度会员（365天）</option>
              <option value="lifetime">终身会员（永久）</option>
              <option value="basic">撤销会员（降为普通）</option>
            </select>

            {memberLevel !== "basic" && memberLevel !== "lifetime" && (
              <>
                <label style={styles.label}>自定义天数（留空 = 按档位标准；有效期内操作将顺延）</label>
                <input
                  type="number"
                  min={1}
                  max={3650}
                  value={memberDays}
                  onChange={(e) => setMemberDays(e.target.value)}
                  placeholder="如补发 15 天填 15"
                  style={{ ...styles.input, marginBottom: 12 }}
                />
              </>
            )}

            <label style={styles.label}>调整原因（必填，写入审计日志）</label>
            <textarea
              value={memberReason}
              onChange={(e) => setMemberReason(e.target.value)}
              rows={3}
              placeholder="例如：用户充值错误，按客服工单改为月度会员"
              style={{ ...styles.input, resize: "none" }}
            />

            <div style={{ fontSize: 11, color: THEME.textSub, marginTop: 8, lineHeight: 1.6 }}>
              到期时间按北京时间当日 23:59:59 计；用户端下次进入「我的」页自动同步。
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 14, justifyContent: "flex-end" }}>
              <button onClick={() => setMemberTarget(null)} style={styles.btnSecondary}>
                取消
              </button>
              <button onClick={submitMemberAction} disabled={busy} style={styles.btnPrimary}>
                {busy ? "处理中..." : "确认调整"}
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

// ==================== 分页控件（v25.0.47_25：用户列表分页浏览全部） ====================

function Pager({
  total,
  page,
  pageSize,
  onLoad,
}: {
  total: number;
  page: number;
  pageSize: number;
  onLoad: (page: number, size?: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const cur = Math.min(page, totalPages);
  const pages: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    const start = Math.max(2, cur - 1);
    const end = Math.min(totalPages - 1, cur + 1);
    if (start > 2) pages.push("…");
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push("…");
    pages.push(totalPages);
  }

  const btn = (label: React.ReactNode, key: string, target: number, disabled?: boolean, active?: boolean) => (
    <button
      key={key}
      disabled={disabled}
      onClick={() => onLoad(target)}
      style={{
        minWidth: 28,
        height: 28,
        padding: "0 6px",
        borderRadius: 6,
        border: `1px solid ${active ? THEME.primary : THEME.border}`,
        backgroundColor: active ? THEME.primary : "#fff",
        color: active ? "#fff" : THEME.textSub,
        fontSize: 12,
        fontWeight: 600,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
      <span style={{ fontSize: 12, color: THEME.textSub, marginRight: 4 }}>
        共 {total} 条 · 第 {cur}/{totalPages} 页
      </span>
      {btn("上一页", "prev", cur - 1, cur <= 1)}
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`ellipsis-${i}`} style={{ fontSize: 12, color: THEME.textHint, padding: "0 2px" }}>
            …
          </span>
        ) : (
          btn(p, `p-${p}`, p, false, p === cur)
        )
      )}
      {btn("下一页", "next", cur + 1, cur >= totalPages)}
      <select
        value={pageSize}
        onChange={(e) => onLoad(1, Number(e.target.value))}
        style={{ ...styles.input, width: 104, height: 28, padding: "0 4px", marginLeft: 4 }}
      >
        <option value={20}>20 条/页</option>
        <option value={50}>50 条/页</option>
        <option value={100}>100 条/页</option>
        <option value={500}>全部显示</option>
      </select>
    </div>
  );
}
