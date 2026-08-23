"use client";

// ============================================================================
// 言道国学 - 密钥管理（v25.0.47_13 FIX-WITHDRAW-V13-FINAL）
// 三级角色权限体系 + 子密钥签发/禁用（仅 SUPER_ADMIN 可见，服务端强校验）
//   - GET    /api/admin/unified/keys        列表（脱敏掩码）
//   - POST   /api/admin/unified/keys        签发（明文仅返回一次）
//   - DELETE /api/admin/unified/keys/:mask  禁用（写审计）
// 主密钥（ADMIN_API_KEY）修改：服务器 .env → PM2 重启，见页面底部说明
// ============================================================================

import { useCallback, useEffect, useState } from "react";
import { Shield, KeyRound, Plus, Ban, Copy, Check, Info } from "lucide-react";
import { THEME, useMounted, useToast, ConfirmDialog, LoadingSpinner } from "../_shared";
import { AdminCard, Badge } from "../_shared";
import { fetchAdminKeys, createAdminKey, revokeAdminKey } from "@/lib/admin/unifiedService";

interface KeyRow {
  role: string;
  name: string;
  createdAt: string;
  masked: string;
  status?: string;
  lastUsedAt?: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "超级管理员",
  ADMIN: "管理员",
  FINANCE_ADMIN: "财务管理员",
  OPERATOR_ADMIN: "运营管理员",
  CONTENT_ADMIN: "内容管理员",
  SUPPORT_ADMIN: "客服支持",
};

const SUB_KEY_ROLES = ["FINANCE_ADMIN", "OPERATOR_ADMIN", "CONTENT_ADMIN", "SUPPORT_ADMIN"];

const ROLE_MATRIX: { role: string; scope: string; allow: string; deny: string; login: string }[] = [
  {
    role: "SUPER_ADMIN",
    scope: "全后台最高权限",
    allow: "价格配置、密钥管理、用户封禁、财务终审、系统开关、审计日志、分佣比例",
    deny: "无限制",
    login: "主管理员密钥（服务器 .env 的 ADMIN_API_KEY，全系统唯一）",
  },
  {
    role: "FINANCE_ADMIN",
    scope: "财务域（finance）",
    allow: "提现审核（单笔/批量/驳回）、转账状态同步、订单流水、佣金报表、财务对账、提现记录导出",
    deny: "修改产品价格、修改系统开关、管理密钥、封禁用户、修改分佣比例",
    login: "独立财务密钥（本页签发，YD-FIN 前缀）",
  },
  {
    role: "OPERATOR_ADMIN",
    scope: "运营域（ops）",
    allow: "用户管理、资讯内容管理、工具开关配置、营销海报、数据总览",
    deny: "所有资金操作、价格修改、密钥管理、财务报表导出",
    login: "独立运营密钥（本页签发，YD-OPS 前缀）",
  },
];

export default function AdminKeysPage() {
  const mounted = useMounted();
  const { show, toastNode } = useToast();
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [newRole, setNewRole] = useState("FINANCE_ADMIN");
  const [newName, setNewName] = useState("");
  const [newReason, setNewReason] = useState("");
  const [issuedKey, setIssuedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [disableTarget, setDisableTarget] = useState<KeyRow | null>(null);
  const [disableReason, setDisableReason] = useState("");
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const list = await fetchAdminKeys();
    if (!list) {
      setForbidden(true);
    } else {
      setForbidden(false);
      setKeys(list as KeyRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (mounted) load();
  }, [mounted, load]);

  const handleIssue = async () => {
    if (!newName.trim()) {
      show("请填写密钥名称（如：财务-张三）", "error");
      return;
    }
    setIssuing(true);
    const r = await createAdminKey(newRole, newName.trim(), newReason.trim() || "后台签发");
    setIssuing(false);
    if (r.ok && r.key) {
      setIssuedKey(r.key);
      setCopied(false);
      setNewName("");
      setNewReason("");
      show("签发成功，请立即复制保存（明文仅显示这一次）", "success");
      load();
    } else {
      show(r.error || "签发失败", "error");
    }
  };

  const handleCopy = async () => {
    if (!issuedKey) return;
    try {
      await navigator.clipboard.writeText(issuedKey);
      setCopied(true);
      show("已复制到剪贴板", "success");
    } catch {
      show("复制失败，请手动选择复制", "error");
    }
  };

  const handleDisable = async () => {
    if (!disableTarget) return;
    const r = await revokeAdminKey(disableTarget.masked, disableReason.trim() || "停用");
    if (r.ok) {
      show("已禁用，该密钥立即失效", "success");
      setDisableTarget(null);
      setDisableReason("");
      load();
    } else {
      show(r.error || "禁用失败", "error");
    }
  };

  if (!mounted) return <LoadingSpinner text="加载中..." />;

  if (forbidden) {
    return (
      <AdminCard title={<><Shield size={16} /> 密钥管理</>}>
        <div style={{ padding: 24, textAlign: "center", color: THEME.error, fontSize: 14, fontWeight: 600 }}>
          权限不足：密钥管理仅超级管理员可访问，服务端已拦截本次请求并记录审计日志。
        </div>
      </AdminCard>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ===== 角色权限说明 ===== */}
      <AdminCard title={<><Shield size={16} /> 三级角色权限体系</>}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 720 }}>
            <thead>
              <tr style={{ backgroundColor: THEME.primaryBg }}>
                {["角色", "权限域", "专属权限", "禁止权限", "登录方式"].map((h) => (
                  <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: THEME.primary, fontWeight: 700, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROLE_MATRIX.map((r) => (
                <tr key={r.role} style={{ borderBottom: `1px solid ${THEME.border}` }}>
                  <td style={{ padding: "10px 12px", fontWeight: 700, color: THEME.textMain, whiteSpace: "nowrap" }}>
                    {ROLE_LABELS[r.role]}
                    <div style={{ fontSize: 11, color: THEME.textHint, fontWeight: 400 }}>{r.role}</div>
                  </td>
                  <td style={{ padding: "10px 12px", color: THEME.textSub, whiteSpace: "nowrap" }}>{r.scope}</td>
                  <td style={{ padding: "10px 12px", color: THEME.textSub, lineHeight: 1.6 }}>{r.allow}</td>
                  <td style={{ padding: "10px 12px", color: THEME.error, lineHeight: 1.6 }}>{r.deny}</td>
                  <td style={{ padding: "10px 12px", color: THEME.textSub, lineHeight: 1.6 }}>{r.login}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 12, padding: "10px 14px", backgroundColor: THEME.infoBg, borderRadius: 8, fontSize: 12.5, color: THEME.textSub, lineHeight: 1.8 }}>
          强制规则：所有权限由服务端 adminRoles.js 中间件强校验，前端仅按角色渲染菜单；越权操作一律 403 拦截并写入审计日志；
          子密钥仅以 SHA-256 哈希存储于服务端 data/admin_keys_v13.json，明文只在签发时显示一次，严禁写入代码、文档或 GitHub。
        </div>
      </AdminCard>

      {/* ===== 签发子密钥 ===== */}
      <AdminCard title={<><KeyRound size={16} /> 签发子密钥</>}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: THEME.textSub, marginBottom: 4 }}>角色</label>
            <select value={newRole} onChange={(e) => setNewRole(e.target.value)} style={{ width: "100%", padding: "8px 12px", border: `1px solid ${THEME.border}`, borderRadius: 8, fontSize: 14, backgroundColor: "#fff", color: THEME.textMain, outline: "none" }}>
              {SUB_KEY_ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}（{r}）</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: THEME.textSub, marginBottom: 4 }}>密钥名称（必填）</label>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="如：财务-张三" style={{ width: "100%", padding: "8px 12px", border: `1px solid ${THEME.border}`, borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: THEME.textSub, marginBottom: 4 }}>签发原因（选填，写审计）</label>
            <input value={newReason} onChange={(e) => setNewReason(e.target.value)} placeholder="如：财务岗入职" style={{ width: "100%", padding: "8px 12px", border: `1px solid ${THEME.border}`, borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button onClick={handleIssue} disabled={issuing} style={{ width: "100%", padding: "10px 16px", border: "none", borderRadius: 8, backgroundColor: THEME.primary, color: "#fff", fontSize: 13, fontWeight: 700, cursor: issuing ? "not-allowed" : "pointer", opacity: issuing ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Plus size={15} /> {issuing ? "签发中..." : "签发并生成密钥"}
            </button>
          </div>
        </div>

        {issuedKey && (
          <div style={{ marginTop: 14, padding: 16, borderRadius: 10, backgroundColor: THEME.warningBg, border: `1px solid ${THEME.warning}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: THEME.warning, marginBottom: 8 }}>
              新密钥已生成（明文仅显示这一次，请立即复制保存）
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <code style={{ flex: 1, padding: "10px 12px", backgroundColor: "#fff", borderRadius: 8, fontSize: 13, wordBreak: "break-all", border: `1px solid ${THEME.border}` }}>
                {issuedKey}
              </code>
              <button onClick={handleCopy} style={{ padding: "10px 14px", border: "none", borderRadius: 8, backgroundColor: THEME.primary, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "已复制" : "复制"}
              </button>
            </div>
            <div style={{ fontSize: 12, color: THEME.textSub, marginTop: 8 }}>
              该密钥角色：{ROLE_LABELS[newRole]}；使用此密钥登录后台，菜单将只显示其权限域内的功能，越权操作由服务端拦截。
            </div>
          </div>
        )}
      </AdminCard>

      {/* ===== 子密钥列表 ===== */}
      <AdminCard title={<><Ban size={16} /> 子密钥列表（{keys.length}）</>}>
        {loading ? (
          <LoadingSpinner text="加载密钥列表..." />
        ) : keys.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: THEME.textHint, fontSize: 13 }}>
            暂无子密钥，使用上方「签发并生成密钥」为财务/运营人员创建独立密钥
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 640 }}>
              <thead>
                <tr style={{ backgroundColor: THEME.primaryBg }}>
                  {["密钥（脱敏）", "角色", "名称", "状态", "创建时间", "操作"].map((h) => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: THEME.primary, fontWeight: 700, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.masked} style={{ borderBottom: `1px solid ${THEME.border}` }}>
                    <td style={{ padding: "10px 12px", fontFamily: "monospace", color: THEME.textMain }}>{k.masked}</td>
                    <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                      <Badge type={k.role === "FINANCE_ADMIN" ? "warning" : k.role === "OPERATOR_ADMIN" ? "info" : "primary"}>
                        {ROLE_LABELS[k.role] || k.role}
                      </Badge>
                    </td>
                    <td style={{ padding: "10px 12px", color: THEME.textSub }}>{k.name}</td>
                    <td style={{ padding: "10px 12px" }}>
                      {k.status === "disabled" ? <Badge type="error">已禁用</Badge> : <Badge type="success">生效中</Badge>}
                    </td>
                    <td style={{ padding: "10px 12px", color: THEME.textHint, whiteSpace: "nowrap" }}>
                      {k.createdAt ? new Date(k.createdAt).toLocaleString("zh-CN", { hour12: false }) : "-"}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      {k.status === "disabled" ? (
                        <span style={{ fontSize: 12, color: THEME.textHint }}>—</span>
                      ) : (
                        <button onClick={() => setDisableTarget(k)} style={{ padding: "6px 12px", border: "none", borderRadius: 8, backgroundColor: THEME.errorBg, color: THEME.error, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                          禁用
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      {/* ===== 主密钥修改说明 ===== */}
      <AdminCard title={<><Info size={16} /> 主密钥（ADMIN_API_KEY）如何修改</>}>
        <div style={{ fontSize: 13, color: THEME.textSub, lineHeight: 2 }}>
          <div>主密钥即超级管理员密钥，<b style={{ color: THEME.textMain }}>可以修改</b>，且只能由你本人在服务器上操作，后台与代码中均无法查看明文：</div>
          <div style={{ padding: "10px 14px", backgroundColor: THEME.primaryBgLight, borderRadius: 8, fontFamily: "monospace", fontSize: 12.5, margin: "8px 0", border: `1px solid ${THEME.border}` }}>
            ① 编辑 /www/yandaoguoxue-backend/.env 中的 ADMIN_API_KEY=新密钥<br />
            ② pm2 restart yandaoguoxue-backend（立即生效，旧密钥全部失效）
          </div>
          <div>建议每季度轮换一次；轮换后所有已登录的后台会话将失效，需用新密钥重新登录。子密钥不受主密钥轮换影响，可在此页单独禁用。</div>
        </div>
      </AdminCard>

      {/* 禁用确认 */}
      <ConfirmDialog
        open={!!disableTarget}
        title="禁用子密钥"
        message={`确定禁用「${disableTarget?.name}」（${ROLE_LABELS[disableTarget?.role || ""] || disableTarget?.role}）吗？禁用后该密钥立即失效，操作将写入审计日志。`}
        confirmText="确认禁用"
        danger
        onConfirm={handleDisable}
        onCancel={() => { setDisableTarget(null); setDisableReason(""); }}
      />
      {disableTarget && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10001, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.45)" }} onClick={() => { setDisableTarget(null); setDisableReason(""); }}>
          <div style={{ backgroundColor: "#fff", borderRadius: 12, padding: 24, maxWidth: 380, width: "90%" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, color: THEME.textMain, marginBottom: 10 }}>禁用原因（写审计）</div>
            <input value={disableReason} onChange={(e) => setDisableReason(e.target.value)} placeholder="如：人员离职" style={{ width: "100%", padding: "8px 12px", border: `1px solid ${THEME.border}`, borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
              <button onClick={() => { setDisableTarget(null); setDisableReason(""); }} style={{ padding: "8px 16px", border: `1px solid ${THEME.border}`, borderRadius: 8, backgroundColor: "#fff", color: THEME.textMain, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>取消</button>
              <button onClick={handleDisable} style={{ padding: "8px 16px", border: "none", borderRadius: 8, backgroundColor: THEME.error, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>确认禁用</button>
            </div>
          </div>
        </div>
      )}

      {toastNode}
    </div>
  );
}
