"use client";

// ============================================================================
// 言道国学 - 公众号运营管理台（WECHAT-OFFICIAL-ACCOUNT-AI-CONTENT-FINAL-SEAL-10）
// 服务号状态 / 菜单发布 / 每日选题 / AI文章审核与微信草稿同步 / 关注者 / 设置 / 任务日志
// 纪律：本页只能"同步至微信草稿箱"，发布必须去微信公众平台人工确认（第六十七章）
// 数据源：/api/wechat/official/admin/*
// ============================================================================

import { useCallback, useEffect, useState } from "react";
import { Newspaper, Send, Settings2, Users, ListChecks, Menu as MenuIcon, Activity, RefreshCw } from "lucide-react";
import { THEME, AdminCard, Badge, LoadingSpinner, useMounted, useToast } from "../_shared";
import { getAdminKey } from "@/lib/admin/client";

type Tab = "overview" | "menu" | "topics" | "articles" | "followers" | "settings" | "jobs";

interface WxStatus {
  followers: number; todayNew: number; todayUnfollow: number; todayArticles: number;
  synced: number; riskBlocked: number; pendingReview: number; bindings: number;
  aiCostToday: number; draftCount: number | null; callbackVerified: boolean;
  token: { configured: boolean; enabled: boolean; accessToken: { present: boolean; valid: boolean }; jsapiTicket: { present: boolean; valid: boolean } };
  config: { appId: string; appSecret: string; token: string; aesKey: string; oauthDomain: string; jsDomain: string };
  switches: { autoPublish: boolean; autoMassSend: boolean };
  lastJob: { stage: string; status: string; run_date: string } | null;
}
interface Topic { topic_id: number; keyword: string; cluster: string; source: string; internal_score: number; trend_score: number | null; content_gap_score: number; final_score: number; status: string; pinned: number; run_date: string }
interface Article { article_id: number; topic_id: number; title: string; digest: string; status: string; safety_status: string; wechat_media_id: string; ai_model: string; word_count: number; created_at: string }
interface ArticleDetail extends Article { content_html: string; author: string; source_refs: string }
interface Follower { openid: string; subscribe: number; subscribe_time: string; nickname: string; source_scene: string; user_id: number }
interface WxSettings { automation: string; draftSync: string; dailyArticleLimit: number; maxArticleTokens: number; dailyCostCap: number; topicTopN: number; authorName: string; ctaText: string; keywordBlacklist: string[] }
interface Job { job_id: number; run_date: string; stage: string; status: string; started_at: string; finished_at: string; error: string }

async function woFetch<T>(path: string, options: RequestInit = {}): Promise<{ success: boolean; data?: T; error?: string }> {
  const key = getAdminKey();
  if (!key) return { success: false, error: "未登录，请先输入管理员密钥" };
  try {
    const res = await fetch(path, { ...options, headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, ...(options.headers || {}) } });
    const json = await res.json();
    return json;
  } catch (e: unknown) {
    return { success: false, error: `网络异常：${e instanceof Error ? e.message : String(e)}` };
  }
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  LOCAL_DRAFT: { label: "本地草稿", color: "#6B7280" },
  SAFETY_PASSED: { label: "安全通过", color: THEME.success },
  RISK_BLOCKED: { label: "风险拦截", color: THEME.error },
  DUPLICATE: { label: "重复拦截", color: THEME.warning },
  SYNCING: { label: "同步中", color: THEME.warning },
  WECHAT_DRAFT: { label: "已同步微信草稿", color: "#2563EB" },
  OWNER_REVIEWED: { label: "已复核", color: "#7C3AED" },
  PUBLISHED_MANUALLY: { label: "已人工发布", color: "#059669" },
  ARCHIVED: { label: "已归档", color: "#9CA3AF" },
};

export default function WechatOaPage() {
  const mounted = useMounted();
  const { show, toastNode } = useToast();
  const [tab, setTab] = useState<Tab>("overview");
  const [status, setStatus] = useState<WxStatus | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [detail, setDetail] = useState<ArticleDetail | null>(null);
  const [menuJson, setMenuJson] = useState<string>("");
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [settings, setSettings] = useState<WxSettings | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    const r = await woFetch<WxStatus>("/api/wechat/official/admin/status");
    if (r.success && r.data) setStatus(r.data);
    else show(r.error || "状态加载失败", "error");
  }, [show]);

  const loadTopics = useCallback(async () => {
    const r = await woFetch<{ topics: Topic[] }>("/api/wechat/official/admin/topics");
    if (r.success && r.data) setTopics(r.data.topics);
  }, []);

  const loadArticles = useCallback(async () => {
    const r = await woFetch<Article[]>("/api/wechat/official/admin/articles");
    if (r.success && r.data) setArticles(r.data);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadStatus(), loadTopics(), loadArticles()]);
    setLoading(false);
  }, [loadStatus, loadTopics, loadArticles]);

  useEffect(() => { if (mounted) loadAll(); }, [mounted, loadAll]);

  useEffect(() => {
    if (!mounted) return;
    if (tab === "menu" && !menuJson) woFetch<{ data: unknown }>("/api/wechat/official/admin/menu/default").then((r) => setMenuJson(JSON.stringify(r.data, null, 2)));
    if (tab === "followers" && !followers.length) woFetch<Follower[]>("/api/wechat/official/admin/followers").then((r) => { if (r.success && r.data) setFollowers(r.data); });
    if (tab === "settings" && !settings) woFetch<WxSettings>("/api/wechat/official/admin/settings").then((r) => { if (r.success && r.data) setSettings(r.data); });
    if (tab === "jobs" && !jobs.length) woFetch<Job[]>("/api/wechat/official/admin/jobs").then((r) => { if (r.success && r.data) setJobs(r.data); });
  }, [mounted, tab, menuJson, followers.length, settings, jobs.length]);

  const act = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try { await fn(); } finally { setBusy(null); }
  };

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "概览", icon: <Activity size={15} /> },
    { id: "menu", label: "自定义菜单", icon: <MenuIcon size={15} /> },
    { id: "topics", label: "每日选题", icon: <ListChecks size={15} /> },
    { id: "articles", label: "文章管理", icon: <Newspaper size={15} /> },
    { id: "followers", label: "关注者", icon: <Users size={15} /> },
    { id: "settings", label: "设置", icon: <Settings2 size={15} /> },
    { id: "jobs", label: "任务日志", icon: <Send size={15} /> },
  ];

  if (!mounted || loading) return <LoadingSpinner text="公众号运营数据加载中..." />;

  return (
    <div style={{ padding: "24px", maxWidth: 1200, margin: "0 auto" }}>
      {toastNode}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: THEME.text }}>公众号运营</h1>
          <p style={{ fontSize: 13, color: THEME.textSecondary, marginTop: 4 }}>服务号「言道国学研习」· 选题 → AI文章 → 安全门 → 微信草稿箱（发布需人工确认）</p>
        </div>
        <button onClick={loadAll} style={{ ...styles.btnGhost, display: "flex", gap: 6, alignItems: "center" }}><RefreshCw size={14} />刷新</button>
      </div>

      {status && status.config.appSecret === "MISSING" && (
        <div style={{ ...styles.warnBanner }}>
          服务号凭据未配置：请在服务器 .env 安全配置 WECHAT_OA_APP_SECRET 后重启后端（AppSecret 不允许出现在聊天或代码库中）。
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ ...styles.tab, ...(tab === t.id ? styles.tabActive : {}) }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && status && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
            <StatBox label="关注用户" value={status.followers} />
            <StatBox label="今日新增关注" value={status.todayNew} color={THEME.success} />
            <StatBox label="今日取关" value={status.todayUnfollow} color={THEME.error} />
            <StatBox label="今日生成稿件" value={status.todayArticles} />
            <StatBox label="累计同步微信草稿" value={status.synced} />
            <StatBox label="待审核（近2日）" value={status.pendingReview} color={THEME.warning} />
            <StatBox label="风险拦截" value={status.riskBlocked} color={THEME.error} />
            <StatBox label="今日AI成本(¥)" value={status.aiCostToday.toFixed(3)} />
          </div>
          <AdminCard title="服务号配置状态">
            <KV k="AppID" v={status.config.appId || "未配置"} />
            <KV k="AppSecret" v={status.config.appSecret} badge />
            <KV k="Token" v={status.config.token} badge />
            <KV k="EncodingAESKey" v={status.config.aesKey} badge />
            <KV k="access_token" v={status.token.accessToken.present ? (status.token.accessToken.valid ? "有效" : "已过期") : "未获取"} badge />
            <KV k="jsapi_ticket" v={status.token.jsapiTicket.present ? (status.token.jsapiTicket.valid ? "有效" : "已过期") : "未获取"} badge />
            <KV k="回调验证" v={status.callbackVerified ? "已通过" : "未验证（需微信平台配置服务器）"} badge />
            <KV k="微信草稿总数" v={status.draftCount === null ? "—" : String(status.draftCount)} />
            <KV k="网页授权域名" v={status.config.oauthDomain} />
            <KV k="JS安全域名" v={status.config.jsDomain} />
            <KV k="自动发布" v="强制关闭（发布仅限人工）" badge />
            <KV k="自动群发" v="强制关闭" badge />
            <KV k="账号绑定数" v={String(status.bindings)} />
            {status.lastJob && <KV k="最近任务" v={`${status.lastJob.stage} · ${status.lastJob.status} · ${status.lastJob.run_date}`} />}
          </AdminCard>
        </div>
      )}

      {tab === "menu" && (
        <AdminCard title="自定义菜单（发布到微信）">
          <p style={{ fontSize: 13, color: THEME.textSecondary, marginBottom: 10 }}>
            默认菜单结构：【国学工具】专业罗盘/七政四余/八字排盘/更多工具 ·【学习】七政学习/中医学习/医考题库/国学资料 ·【我的】网页版/下载APP/会员中心。全部链接带 source=wechat_oa 追踪参数。
          </p>
          <textarea value={menuJson} onChange={(e) => setMenuJson(e.target.value)} style={styles.textarea} rows={18} />
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button disabled={busy === "menu"} style={styles.btnPrimary} onClick={() => act("menu", async () => {
              let body: unknown = undefined;
              try { body = JSON.parse(menuJson); } catch { /* 用默认 */ }
              const r = await woFetch("/api/wechat/official/admin/menu/publish", { method: "POST", body: body ? JSON.stringify(body) : "{}" });
              show(r.success ? "菜单已发布到微信（手机端可能需重新进入公众号可见）" : `发布失败：${r.error}`, r.success ? "success" : "error");
            })}>{busy === "menu" ? "发布中..." : "发布菜单到微信"}</button>
            <button style={styles.btnGhost} onClick={() => act("menuRead", async () => {
              const r = await woFetch<unknown>("/api/wechat/official/admin/menu/current");
              if (r.success) setMenuJson(JSON.stringify(r.data, null, 2));
              else show(`读取失败：${r.error}`, "error");
            })}>读取微信当前菜单</button>
            <button style={styles.btnGhost} onClick={() => woFetch<{ data: unknown }>("/api/wechat/official/admin/menu/default").then((r) => r.success && setMenuJson(JSON.stringify(r.data, null, 2)))}>恢复默认结构</button>
          </div>
        </AdminCard>
      )}

      {tab === "topics" && (
        <AdminCard title={`每日选题（${topics[0]?.run_date || "今日"}）`}>
          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <button style={styles.btnPrimary} disabled={busy === "genTopics"} onClick={() => act("genTopics", async () => {
              const r = await woFetch("/api/wechat/official/admin/topics/generate", { method: "POST", body: "{}" });
              show(r.success ? "选题已生成（内部真实数据评分）" : `失败：${r.error}`, r.success ? "success" : "error");
              await loadTopics();
            })}>{busy === "genTopics" ? "生成中..." : "生成今日选题"}</button>
            <button style={styles.btnPrimary} disabled={busy === "genArts"} onClick={() => act("genArts", async () => {
              const r = await woFetch("/api/wechat/official/admin/generate", { method: "POST", body: "{}" });
              show(r.success ? "文章生成任务完成" : `失败：${r.error}`, r.success ? "success" : "error");
              await loadArticles();
            })}>{busy === "genArts" ? "AI生成中..." : "为已批准选题生成文章"}</button>
          </div>
          <table style={styles.table}>
            <thead><tr><th>关键词</th><th>集群</th><th>内部需求分</th><th>内容缺口</th><th>综合分</th><th>状态</th><th>操作</th></tr></thead>
            <tbody>
              {topics.map((t) => (
                <tr key={t.topic_id}>
                  <td>{t.pinned ? "📌 " : ""}{t.keyword}</td>
                  <td>{t.cluster}</td>
                  <td>{t.internal_score}</td>
                  <td>{t.content_gap_score}</td>
                  <td><b>{t.final_score}</b></td>
                  <td><Badge type={t.status === "APPROVED" ? "success" : t.status === "REJECTED" ? "error" : t.status === "USED" ? "warning" : "default"}>{t.status}</Badge></td>
                  <td style={{ display: "flex", gap: 6 }}>
                    {t.status === "PENDING" && <>
                      <button style={styles.btnMini} onClick={() => woFetch(`/api/wechat/official/admin/topics/${t.topic_id}/approve`, { method: "POST" }).then(loadTopics)}>批准</button>
                      <button style={{ ...styles.btnMini, color: THEME.error }} onClick={() => woFetch(`/api/wechat/official/admin/topics/${t.topic_id}/reject`, { method: "POST" }).then(loadTopics)}>拒绝</button>
                    </>}
                    <button style={styles.btnMini} onClick={() => woFetch(`/api/wechat/official/admin/topics/${t.topic_id}/${t.pinned ? "unpin" : "pin"}`, { method: "POST" }).then(loadTopics)}>{t.pinned ? "取消置顶" : "置顶"}</button>
                  </td>
                </tr>
              ))}
              {!topics.length && <tr><td colSpan={7} style={{ textAlign: "center", color: THEME.textSecondary, padding: 20 }}>今日暂无选题，点击「生成今日选题」</td></tr>}
            </tbody>
          </table>
        </AdminCard>
      )}

      {tab === "articles" && (
        <div style={{ display: "grid", gridTemplateColumns: detail ? "1fr 1fr" : "1fr", gap: 16 }}>
          <AdminCard title={`文章列表（${articles.length}）`}>
            <table style={styles.table}>
              <thead><tr><th>标题</th><th>状态</th><th>安全</th><th>字数</th><th>操作</th></tr></thead>
              <tbody>
                {articles.map((a) => (
                  <tr key={a.article_id}>
                    <td style={{ maxWidth: 260, cursor: "pointer" }} onClick={() => woFetch<ArticleDetail>(`/api/wechat/official/admin/articles/${a.article_id}`).then((r) => r.success && r.data && setDetail(r.data))}>
                      <div style={{ fontWeight: 600 }}>{a.title}</div>
                      <div style={{ fontSize: 11, color: THEME.textSecondary }}>{a.created_at} · {a.ai_model}</div>
                    </td>
                    <td><Badge type={a.status === "WECHAT_DRAFT" ? "success" : a.status === "RISK_BLOCKED" || a.status === "DUPLICATE" ? "error" : "default"}>{STATUS_LABEL[a.status]?.label || a.status}</Badge></td>
                    <td><Badge type={a.safety_status === "PASS" ? "success" : "error"}>{a.safety_status}</Badge></td>
                    <td>{a.word_count}</td>
                    <td style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      <button style={styles.btnMini} onClick={() => woFetch<ArticleDetail>(`/api/wechat/official/admin/articles/${a.article_id}`).then((r) => r.success && r.data && setDetail(r.data))}>预览</button>
                      <button style={styles.btnMini} onClick={() => woFetch(`/api/wechat/official/admin/articles/${a.article_id}/safety`, { method: "POST" }).then(loadArticles)}>Safety</button>
                      <button style={{ ...styles.btnMini, color: "#2563EB" }} onClick={() => act(`sync${a.article_id}`, async () => {
                        const r = await woFetch(`/api/wechat/official/admin/articles/${a.article_id}/sync`, { method: "POST" });
                        show(r.success ? "已同步至微信草稿箱（请到公众平台人工确认发布）" : `同步失败：${r.error}`, r.success ? "success" : "error");
                        await loadArticles();
                      })}>{busy === `sync${a.article_id}` ? "同步中" : "同步草稿"}</button>
                      <button style={{ ...styles.btnMini, color: THEME.warning }} onClick={() => act(`re${a.article_id}`, async () => {
                        const r = await woFetch(`/api/wechat/official/admin/articles/${a.article_id}/regenerate`, { method: "POST" });
                        show(r.success ? "已重新生成" : `失败：${r.error}`, r.success ? "success" : "error");
                        await loadArticles();
                      })}>重生成</button>
                      <button style={{ ...styles.btnMini, color: THEME.error }} onClick={() => { if (confirm(`删除文章「${a.title}」？${a.wechat_media_id ? "将同时删除微信草稿。" : ""}`)) woFetch(`/api/wechat/official/admin/articles/${a.article_id}`, { method: "DELETE" }).then(loadArticles); }}>删除</button>
                    </td>
                  </tr>
                ))}
                {!articles.length && <tr><td colSpan={5} style={{ textAlign: "center", color: THEME.textSecondary, padding: 20 }}>暂无文章</td></tr>}
              </tbody>
            </table>
          </AdminCard>
          {detail && (
            <AdminCard title={`预览：${detail.title}`} action={<button style={styles.btnMini} onClick={() => setDetail(null)}>关闭</button>}>
              <div style={{ fontSize: 13, color: THEME.textSecondary, marginBottom: 8 }}>摘要：{detail.digest}</div>
              <div style={{ ...styles.previewBox }} dangerouslySetInnerHTML={{ __html: detail.content_html }} />
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button style={styles.btnMini} onClick={() => {
                  const title = prompt("新标题", detail.title);
                  if (title) woFetch(`/api/wechat/official/admin/articles/${detail.article_id}`, { method: "PATCH", body: JSON.stringify({ title }) }).then(() => { show("标题已更新", "success"); loadArticles(); });
                }}>改标题</button>
                <button style={styles.btnMini} onClick={() => {
                  const digest = prompt("新摘要（60字内）", detail.digest);
                  if (digest !== null) woFetch(`/api/wechat/official/admin/articles/${detail.article_id}`, { method: "PATCH", body: JSON.stringify({ digest }) }).then(() => { show("摘要已更新", "success"); loadArticles(); });
                }}>改摘要</button>
                <button style={styles.btnMini} onClick={() => woFetch(`/api/wechat/official/admin/articles/${detail.article_id}/archive`, { method: "POST" }).then(() => { setDetail(null); loadArticles(); })}>归档</button>
              </div>
            </AdminCard>
          )}
        </div>
      )}

      {tab === "followers" && (
        <AdminCard title={`关注者（${followers.length}）`}>
          <table style={styles.table}>
            <thead><tr><th>openid（脱敏）</th><th>状态</th><th>昵称</th><th>关注时间</th><th>来源</th><th>绑定用户</th></tr></thead>
            <tbody>
              {followers.map((f, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: "monospace" }}>{f.openid}</td>
                  <td><Badge type={f.subscribe ? "success" : "error"}>{f.subscribe ? "关注中" : "已取关"}</Badge></td>
                  <td>{f.nickname || "—"}</td>
                  <td>{f.subscribe_time || "—"}</td>
                  <td>{f.source_scene || "—"}</td>
                  <td>{f.user_id || "—"}</td>
                </tr>
              ))}
              {!followers.length && <tr><td colSpan={6} style={{ textAlign: "center", color: THEME.textSecondary, padding: 20 }}>暂无关注者数据（需微信平台完成服务器配置后产生）</td></tr>}
            </tbody>
          </table>
        </AdminCard>
      )}

      {tab === "settings" && settings && (
        <AdminCard title="内容自动化设置">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
            <Field label="公众号运营总开关">
              <select value={settings.automation} onChange={(e) => setSettings({ ...settings, automation: e.target.value })} style={styles.input}>
                <option value="ON">ON</option><option value="OFF">OFF</option><option value="MAINTENANCE">MAINTENANCE</option>
              </select>
            </Field>
            <Field label="草稿同步开关">
              <select value={settings.draftSync} onChange={(e) => setSettings({ ...settings, draftSync: e.target.value })} style={styles.input}>
                <option value="ON">ON</option><option value="OFF">OFF</option>
              </select>
            </Field>
            <Field label="每日文章数（1~5）">
              <input type="number" min={1} max={5} value={settings.dailyArticleLimit} onChange={(e) => setSettings({ ...settings, dailyArticleLimit: Number(e.target.value) })} style={styles.input} />
            </Field>
            <Field label="单篇Token上限">
              <input type="number" value={settings.maxArticleTokens} onChange={(e) => setSettings({ ...settings, maxArticleTokens: Number(e.target.value) })} style={styles.input} />
            </Field>
            <Field label="每日AI成本上限(¥)">
              <input type="number" step="0.5" value={settings.dailyCostCap} onChange={(e) => setSettings({ ...settings, dailyCostCap: Number(e.target.value) })} style={styles.input} />
            </Field>
            <Field label="每日选题TOP N">
              <input type="number" value={settings.topicTopN} onChange={(e) => setSettings({ ...settings, topicTopN: Number(e.target.value) })} style={styles.input} />
            </Field>
            <Field label="作者名"><input value={settings.authorName} onChange={(e) => setSettings({ ...settings, authorName: e.target.value })} style={styles.input} /></Field>
            <Field label="关键词黑名单（逗号分隔）">
              <input value={settings.keywordBlacklist.join(",")} onChange={(e) => setSettings({ ...settings, keywordBlacklist: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} style={styles.input} />
            </Field>
          </div>
          <Field label="结尾CTA文案"><textarea value={settings.ctaText} onChange={(e) => setSettings({ ...settings, ctaText: e.target.value })} style={{ ...styles.textarea, height: 70 }} /></Field>
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button style={styles.btnPrimary} onClick={() => act("saveSettings", async () => {
              const r = await woFetch("/api/wechat/official/admin/settings", { method: "PUT", body: JSON.stringify(settings) });
              show(r.success ? "设置已保存" : `保存失败：${r.error}`, r.success ? "success" : "error");
            })}>{busy === "saveSettings" ? "保存中..." : "保存设置"}</button>
            <span style={{ fontSize: 12, color: THEME.error, alignSelf: "center" }}>自动发布/自动群发为代码层强制关闭，不可开启。</span>
          </div>
        </AdminCard>
      )}

      {tab === "jobs" && (
        <AdminCard title="任务执行日志（最近50条）">
          <table style={styles.table}>
            <thead><tr><th>日期</th><th>阶段</th><th>状态</th><th>开始</th><th>结束</th><th>错误</th></tr></thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.job_id}>
                  <td>{j.run_date}</td><td>{j.stage}</td>
                  <td><Badge type={j.status === "SUCCESS" ? "success" : j.status === "RUNNING" ? "warning" : "error"}>{j.status}</Badge></td>
                  <td>{j.started_at}</td><td>{j.finished_at}</td>
                  <td style={{ color: THEME.error, fontSize: 12, maxWidth: 300 }}>{j.error || "—"}</td>
                </tr>
              ))}
              {!jobs.length && <tr><td colSpan={6} style={{ textAlign: "center", color: THEME.textSecondary, padding: 20 }}>暂无任务记录（定时任务 06:30 起执行）</td></tr>}
            </tbody>
          </table>
        </AdminCard>
      )}
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 10, padding: 14 }}>
      <div style={{ fontSize: 12, color: THEME.textSecondary }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: color || THEME.text, marginTop: 4 }}>{value}</div>
    </div>
  );
}
function KV({ k, v, badge }: { k: string; v: string; badge?: boolean }) {
  const ok = /PRESENT|有效|已通过|强制关闭/.test(v);
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F3F4F6", fontSize: 13 }}>
      <span style={{ color: THEME.textSecondary }}>{k}</span>
      {badge ? <Badge type={ok ? "success" : "error"}>{v}</Badge> : <span style={{ fontWeight: 600 }}>{v}</span>}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
      <label style={{ fontSize: 12, color: THEME.textSecondary }}>{label}</label>
      {children}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  tab: { padding: "8px 14px", borderRadius: 8, border: "1px solid #E5E7EB", background: "#fff", fontSize: 13, color: THEME.textSecondary, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 },
  tabActive: { background: THEME.primary, color: "#fff", borderColor: THEME.primary },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13, background: "#fff" },
  btnPrimary: { padding: "9px 18px", borderRadius: 8, border: "none", background: THEME.primary, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnGhost: { padding: "8px 14px", borderRadius: 8, border: "1px solid #E5E7EB", background: "#fff", fontSize: 13, color: THEME.text, cursor: "pointer" },
  btnMini: { padding: "4px 10px", borderRadius: 6, border: "1px solid #E5E7EB", background: "#fff", fontSize: 12, cursor: "pointer", color: THEME.text },
  input: { padding: "8px 10px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, background: "#fff", color: THEME.text },
  textarea: { width: "100%", padding: 10, borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 12, fontFamily: "monospace", background: "#fff", color: THEME.text, boxSizing: "border-box" },
  previewBox: { border: "1px solid #E5E7EB", borderRadius: 8, padding: 14, maxHeight: 420, overflow: "auto", fontSize: 14, lineHeight: 1.8, background: "#fff", color: THEME.text },
  warnBanner: { background: "#FEF3C7", border: "1px solid #F59E0B", color: "#92400E", borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 16 },
};
