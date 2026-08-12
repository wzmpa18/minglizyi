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
} from "lucide-react";
import { THEME, useMounted } from "./_shared";
import { getAdminKey, setAdminKey, clearAdminKey, isAdminAuthed } from "@/lib/admin/client";

// ==================== 导航项配置 ====================

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  desc: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "控制台概览", icon: <LayoutDashboard size={18} />, desc: "系统总览与快捷入口" },
  { href: "/admin/dashboard", label: "数据看板", icon: <BarChart3 size={18} />, desc: "用户·邀请·浏览·会员·AI" },
  { href: "/admin/ai-control", label: "AI功能管控", icon: <Bot size={18} />, desc: "开关·配额·定价" },
  { href: "/admin/membership", label: "会员管理", icon: <Crown size={18} />, desc: "等级·价格·权益·上下架" },
];

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
            言道国学 · 管理控制台
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
}: {
  active: string;
  onNavigate: () => void;
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
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>管理控制台</div>
        </div>
      </div>

      {/* 导航 */}
      <nav style={{ flex: 1, padding: "14px 12px", overflowY: "auto" }}>
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/admin" ? active === "/admin" : active.startsWith(item.href);
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

  useEffect(() => {
    setAuthed(isAdminAuthed());
  }, [pathname]);

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

  // 已登录 → 控制台 Shell
  return (
    <div style={{ minHeight: "100vh", backgroundColor: THEME.bg }}>
      <style>{`#app-bottom-nav { display: none !important; }`}</style>

      {/* 移动端遮罩 */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.4)",
            zIndex: 99,
            display: "none",
          }}
          className="yd-admin-overlay"
        />
      )}

      {/* 侧边栏 - 桌面端固定，移动端抽屉 */}
      <div
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          zIndex: 100,
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.3s",
        }}
        className="yd-admin-sidebar-mobile"
      >
        <Sidebar active={pathname} onNavigate={() => setSidebarOpen(false)} />
      </div>
      <div className="yd-admin-sidebar-desktop">
        <Sidebar active={pathname} onNavigate={() => setSidebarOpen(false)} />
      </div>

      {/* 主内容区 */}
      <div
        style={{
          marginLeft: 0,
          minHeight: "100vh",
        }}
        className="yd-admin-content"
      >
        {/* 移动端顶栏 */}
        <div
          className="yd-admin-topbar"
          style={{
            display: "none",
            position: "sticky",
            top: 0,
            zIndex: 50,
            height: 52,
            backgroundColor: THEME.sidebarBg,
            alignItems: "center",
            padding: "0 16px",
            gap: 12,
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ border: "none", background: "transparent", cursor: "pointer", color: "#fff", display: "flex" }}
          >
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <span style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>言道国学 · 管理控制台</span>
        </div>

        <div style={{ padding: "24px 28px", maxWidth: 1400 }}>
          <div className="yd-admin-page-inner">{children}</div>
        </div>
      </div>

      {/* 响应式样式：桌面显示固定侧边栏并留出左边距，移动端使用抽屉 */}
      <style>{`
        /* 桌面端 */
        @media (min-width: 900px) {
          .yd-admin-sidebar-mobile { display: none !important; }
          .yd-admin-sidebar-desktop { display: block; }
          .yd-admin-content { margin-left: 240px; }
          .yd-admin-topbar { display: none !important; }
          .yd-admin-overlay { display: none !important; }
        }
        /* 移动端 */
        @media (max-width: 899px) {
          .yd-admin-sidebar-mobile { display: block; }
          .yd-admin-sidebar-desktop { display: none; }
          .yd-admin-content { margin-left: 0; }
          .yd-admin-topbar { display: flex !important; }
          .yd-admin-page-inner { padding: 0; }
        }
      `}</style>
    </div>
  );
}
