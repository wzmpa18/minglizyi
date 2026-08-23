"use client";

// ============================================================================
// 言道国学 - 后台管理控制台布局
// 包含：管理员登录门禁、侧边栏导航、内容渲染区
// 所有 /admin/* 子页面均在此 Shell 内渲染，共享侧边栏
// ============================================================================

import { useState, useEffect, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  Crown,
  BarChart3,
  LogOut,
  Menu,
  X,
  Shield,
  Home,
  Newspaper,
  Receipt,
  Coins,
  Flag,
  Users,
  Wrench,
  Tag,
  GraduationCap,
  MessagesSquare,
  Megaphone,
  HandCoins,
  Banknote,
  ToggleLeft,
  ScrollText,
  Activity,
} from "lucide-react";
import { THEME, useMounted } from "./_shared";
import { getAdminKey, setAdminKey, clearAdminKey, isAdminAuthed, getAdminRole, setAdminRole } from "@/lib/admin/client";

// ==================== 导航项配置 ====================
// FINAL-ADMIN-COMMERCIAL-SEAL-02 第三章：后台左侧菜单（v25.0.47_13 增加密钥管理，共18项）
// 所有既有子页面（unified/dashboard/ai-control 等）保留，统一从本导航进入
// v25.0.47_13: scope 域——'finance'=财务菜单 / 'ops'=运营菜单 / 'super'=仅超管 / 'all'=全员
// 前端仅按角色渲染菜单；权限最终裁决在服务端（adminRoles.js 强校验）

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  desc: string;
  scope: "all" | "finance" | "ops" | "super";
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "总览", icon: <LayoutDashboard size={18} />, desc: "老板驾驶舱·20项核心指标", scope: "all" },
  { href: "/admin/moderation", label: "用户管理", icon: <Users size={18} />, desc: "搜索·封禁·禁言·风险记录", scope: "ops" },
  { href: "/admin/tool-control", label: "工具管理", icon: <Wrench size={18} />, desc: "14款工具·开关·收费·平台", scope: "ops" },
  { href: "/admin/pricing", label: "产品与价格", icon: <Tag size={18} />, desc: "价格SSOT·会员·AI产品", scope: "super" },
  { href: "/admin/membership", label: "会员与权益", icon: <Crown size={18} />, desc: "等级·价格·权益·上下架", scope: "super" },
  { href: "/admin/ai-control", label: "AI管理", icon: <Bot size={18} />, desc: "开关·配额·定价·健康", scope: "super" },
  { href: "/admin/loc", label: "学习 / 中医", icon: <GraduationCap size={18} />, desc: "考试配置·积分·机构管理", scope: "ops" },
  { href: "/admin/moderation?tab=group", label: "社交 / 群聊", icon: <MessagesSquare size={18} />, desc: "群管理·举报处理·禁言", scope: "ops" },
  { href: "/admin/sources", label: "发现 / 资讯", icon: <Newspaper size={18} />, desc: "资讯增删改·排序·合规", scope: "ops" },
  { href: "/admin/marketing", label: "营销 / 海报", icon: <Megaphone size={18} />, desc: "海报模板·分享文案·渠道", scope: "ops" },
  { href: "/admin/commission", label: "推广 / 分佣", icon: <HandCoins size={18} />, desc: "比例·冻结期·佣金明细", scope: "finance" },
  { href: "/admin/orders", label: "支付 / 订单", icon: <Receipt size={18} />, desc: "订单查询·补单·权益重试", scope: "finance" },
  { href: "/admin/commission?tab=withdrawals", label: "提现", icon: <Banknote size={18} />, desc: "提现审核·转账状态·导出", scope: "finance" },
  { href: "/admin/moderation?tab=report", label: "内容审核", icon: <Flag size={18} />, desc: "举报·动态·违规内容", scope: "ops" },
  { href: "/admin/feature-flags", label: "系统功能开关", icon: <ToggleLeft size={18} />, desc: "ON/OFF/维护·服务端强制", scope: "super" },
  { href: "/admin/unified", label: "审计日志", icon: <ScrollText size={18} />, desc: "操作留痕·角色·密钥", scope: "super" },
  { href: "/admin/dashboard", label: "系统状态", icon: <Activity size={18} />, desc: "数据看板·服务健康", scope: "all" },
  { href: "/admin/keys", label: "密钥管理", icon: <Shield size={18} />, desc: "子密钥签发·禁用·三级角色", scope: "super" },
];

// v25.0.47_13: 角色 → 可见 scope（与服务端 adminRoles.ROLE_SCOPES 保持一致）
const ROLE_SCOPES: Record<string, string[]> = {
  SUPER_ADMIN: ["*"],
  ADMIN: ["*"],
  FINANCE_ADMIN: ["finance"],
  OPERATOR_ADMIN: ["ops"],
  CONTENT_ADMIN: ["ops"],
  SUPPORT_ADMIN: ["ops"],
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "超级管理员",
  ADMIN: "管理员",
  FINANCE_ADMIN: "财务管理员",
  OPERATOR_ADMIN: "运营管理员",
  CONTENT_ADMIN: "内容管理员",
  SUPPORT_ADMIN: "客服支持",
};

function navVisible(item: NavItem, role: string | null): boolean {
  const scopes = ROLE_SCOPES[role || ""] || [];
  if (scopes.includes("*")) return true;
  return item.scope === "all" || scopes.includes(item.scope);
}

// ==================== 登录门禁 ====================

function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) {
      setError("请输入管理员密钥");
      return;
    }
    setError("");
    setLoading(true);
    // 通过调用统计接口验证密钥是否有效
    try {
      setAdminKey(key.trim());
      const res = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${key.trim()}` },
      });
      if (res.ok) {
        onLogin();
      } else {
        clearAdminKey();
        setError("密钥无效，请检查后重试");
      }
    } catch {
      clearAdminKey();
      setError("验证失败，请检查网络");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(135deg, ${THEME.primaryDark} 0%, ${THEME.primary} 100%)`,
        padding: 20,
      }}
    >
      <style>{`#app-bottom-nav { display: none !important; }`}</style>
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: 16,
          padding: 40,
          width: "100%",
          maxWidth: 400,
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              backgroundColor: THEME.primary,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Shield size={32} color="#fff" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: THEME.textMain, margin: 0 }}>
            言道国学 · 运营管理中心
          </h1>
          <p style={{ fontSize: 13, color: THEME.textSub, marginTop: 8 }}>
            请输入管理员密钥以继续
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: THEME.textSub, marginBottom: 6 }}>
            管理员密钥
          </label>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="请输入 ADMIN_API_KEY"
            autoFocus
            style={{
              width: "100%",
              padding: "12px 14px",
              border: `1px solid ${THEME.border}`,
              borderRadius: 10,
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.target.style.borderColor = THEME.primary)}
            onBlur={(e) => (e.target.style.borderColor = THEME.border)}
          />
          {error && (
            <div style={{ fontSize: 13, color: THEME.error, marginTop: 10, textAlign: "center" }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              marginTop: 20,
              padding: "12px",
              border: "none",
              borderRadius: 10,
              backgroundColor: THEME.primary,
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "验证中..." : "进 入 控 制 台"}
          </button>
        </form>
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            marginTop: 18,
            fontSize: 13,
            color: THEME.textHint,
            textDecoration: "none",
          }}
        >
          <Home size={14} /> 返回应用首页
        </Link>
      </div>
    </div>
  );
}

// ==================== 侧边栏 ====================

function Sidebar({
  active,
  onNavigate,
  role,
}: {
  active: string;
  onNavigate: () => void;
  role: string | null;
}) {
  const router = useRouter();
  const [confirmLogout, setConfirmLogout] = useState(false);

  const handleLogout = () => {
    clearAdminKey();
    router.refresh();
  };

  const sidebarStyle: CSSProperties = {
    width: 240,
    height: "100vh",
    backgroundColor: THEME.sidebarBg,
    display: "flex",
    flexDirection: "column",
    position: "fixed",
    left: 0,
    top: 0,
    zIndex: 100,
    flexShrink: 0,
  };

  return (
    <aside style={sidebarStyle}>
      {/* 品牌 */}
      <div
        style={{
          padding: "22px 20px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: THEME.primary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Shield size={20} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>言道国学</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>运营管理中心</div>
        </div>
      </div>

      {/* 导航：按角色 scope 过滤（服务端 adminRoles.js 为最终权限裁决） */}
      <nav style={{ flex: 1, padding: "14px 12px", overflowY: "auto" }}>
        {NAV_ITEMS.filter((item) => navVisible(item, role)).map((item) => {
          const base = item.href.split("?")[0];
          const isActive =
            base === "/admin" ? active === "/admin" : active.startsWith(base);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "11px 14px",
                borderRadius: 10,
                marginBottom: 4,
                textDecoration: "none",
                backgroundColor: isActive ? THEME.primary : "transparent",
                color: isActive ? "#fff" : "rgba(255,255,255,0.7)",
                fontWeight: isActive ? 600 : 500,
                fontSize: 14,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = THEME.sidebarBgHover;
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* 底部操作 */}
      <div style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            borderRadius: 10,
            textDecoration: "none",
            color: "rgba(255,255,255,0.6)",
            fontSize: 13,
            marginBottom: 4,
          }}
        >
          <Home size={16} /> 返回应用首页
        </Link>
        <button
          onClick={() => setConfirmLogout(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            borderRadius: 10,
            border: "none",
            backgroundColor: "transparent",
            color: "rgba(255,255,255,0.6)",
            fontSize: 13,
            cursor: "pointer",
            width: "100%",
          }}
        >
          <LogOut size={16} /> 退出登录
        </button>
      </div>

      {confirmLogout && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => setConfirmLogout(false)}
        >
          <div
            style={{ backgroundColor: "#fff", borderRadius: 12, padding: 24, maxWidth: 340, width: "90%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 700, color: THEME.textMain, marginBottom: 8 }}>退出登录</div>
            <div style={{ fontSize: 14, color: THEME.textSub, marginBottom: 20 }}>
              确定要退出管理控制台吗？退出后需重新输入密钥登录。
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                style={{ padding: "8px 16px", border: `1px solid ${THEME.border}`, borderRadius: 8, backgroundColor: "#fff", color: THEME.textMain, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                onClick={() => setConfirmLogout(false)}
              >
                取消
              </button>
              <button
                style={{ padding: "8px 16px", border: "none", borderRadius: 8, backgroundColor: THEME.error, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                onClick={handleLogout}
              >
                确认退出
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

// ==================== 主布局 ====================

export default function AdminLayout({ children }: { children: ReactNode }) {
  const mounted = useMounted();
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    setAuthed(isAdminAuthed());
  }, [pathname]);

  // v25.0.47_13: 登录/刷新后通过 whoami 拉取真实角色并缓存（菜单渲染依据；服务端仍是权限最终裁决）
  useEffect(() => {
    if (!authed) {
      setRole(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/unified/whoami", {
          headers: { Authorization: `Bearer ${getAdminKey() || ""}` },
        });
        const json = await res.json();
        if (!cancelled && res.ok && json.success && json.data?.role) {
          setRole(json.data.role);
          setAdminRole(json.data.role);
        }
      } catch {
        /* 网络异常时保留缓存角色 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authed, pathname]);

  // SSR 阶段返回占位，避免 hydration 不匹配
  if (!mounted) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: THEME.bg }}>
        <style>{`#app-bottom-nav { display: none !important; }`}</style>
      </div>
    );
  }

  // 未登录 → 登录门禁
  if (!authed) {
    return <AdminLogin onLogin={() => setAuthed(true)} />;
  }

  // 已登录 → 控制台 Shell（v25.0.47_13：全端统一抽屉式导航，默认收起，内容区全宽不被遮挡）
  return (
    <div style={{ minHeight: "100vh", backgroundColor: THEME.bg }}>
      <style>{`#app-bottom-nav { display: none !important; }`}</style>

      {/* 遮罩：抽屉打开时覆盖内容区 */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.45)",
            zIndex: 99,
          }}
        />
      )}

      {/* 侧边栏抽屉：全端统一，默认收起 */}
      <div
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          zIndex: 100,
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s ease",
        }}
      >
        <Sidebar active={pathname} onNavigate={() => setSidebarOpen(false)} role={role} />
      </div>

      {/* 主内容区：全宽，无左侧留白 */}
      <div style={{ minHeight: "100vh" }}>
        {/* 顶部工具栏：全端统一，汉堡按钮唤出抽屉 */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            height: 52,
            backgroundColor: THEME.sidebarBg,
            display: "flex",
            alignItems: "center",
            padding: "0 16px",
            gap: 12,
          }}
        >
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="打开导航菜单"
            style={{ border: "none", background: "transparent", cursor: "pointer", color: "#fff", display: "flex" }}
          >
          {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <span style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>言道国学 · 运营管理中心</span>
          {role && (
            <span
              style={{
                marginLeft: "auto",
                color: "#fff",
                fontSize: 12,
                fontWeight: 600,
                padding: "4px 12px",
                borderRadius: 999,
                backgroundColor: role === "SUPER_ADMIN" ? "rgba(220,38,38,0.85)" : "rgba(255,255,255,0.16)",
              }}
            >
              {ROLE_LABELS[role] || role}
            </span>
          )}
        </div>

        <div style={{ padding: "20px 24px", maxWidth: 1500, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
          <div className="yd-admin-page-inner">{children}</div>
        </div>
      </div>
    </div>
  );
}
