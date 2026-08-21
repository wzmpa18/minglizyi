"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// v25.0.41：五Tab配置：首页/发现/聊天/学习/我的（"好友"正式更名"聊天"，入口含消息+通讯录）
const TABS = [
  {
    key: "home",
    label: "首页",
    href: "/",
    Icon: HomeIcon,
  },
  {
    key: "discover",
    label: "发现",
    href: "/discover",
    Icon: DiscoverIcon,
  },
  {
    key: "friends",
    label: "聊天",
    href: "/friends",
    Icon: ChatIcon,
  },
  {
    key: "study",
    label: "学习",
    href: "/academy",
    Icon: StudyIcon,
  },
  {
    key: "profile",
    label: "我的",
    href: "/profile",
    Icon: ProfileIcon,
  },
];

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function DiscoverIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

function ChatIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function MessagesIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <line x1="8" y1="9" x2="16" y2="9" />
      <line x1="8" y1="13" x2="14" y2="13" />
    </svg>
  );
}

function StudyIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export default function BottomNav() {
  const pathname = usePathname();

  // P7-社交修复-01：私聊页隐藏底部Tab栏（聊天输入栏 fixed bottom-0 与Tab栏重叠互斥，
  // Tab栏 zIndex 1000 会完全盖住输入框，导致"打不开对话框无法发消息"）
  if (pathname === "/friends/chat" || pathname.startsWith("/friends/chat")) {
    return null;
  }

  const getActiveKey = (): string => {
    // 发现路由
    if (pathname === "/discover" || pathname.startsWith("/discover/")) return "discover";
    // 学习路由（言道学堂及子页面）
    if (pathname === "/academy" || pathname.startsWith("/academy/")) return "study";
    // 积分/邀请路由（积分已移入个人中心，归入「我的」高亮）
    if (pathname === "/points" || pathname.startsWith("/points/") || pathname === "/invite" || pathname.startsWith("/invite/")) return "profile";
    // 好友路由（含私聊、好友请求、通讯录、社交、消息等）
    if (
      pathname === "/friends" || pathname.startsWith("/friends/") ||
      pathname === "/contacts" || pathname.startsWith("/contacts/") ||
      pathname === "/social" || pathname.startsWith("/social/") ||
      pathname === "/messages" || pathname.startsWith("/messages/") ||
      pathname === "/groups" || pathname.startsWith("/groups/")
    ) return "friends";
    // 我的路由（含个人资料、客户、主题、登录等）
    if (
      pathname === "/profile" || pathname.startsWith("/profile/") ||
      pathname === "/clients" || pathname.startsWith("/clients/") ||
      pathname === "/login" || pathname.startsWith("/login/") ||
      pathname === "/register" || pathname.startsWith("/register/") ||
      pathname === "/forgot-password"
    ) return "profile";
    return "home";
  };

  const activeKey = getActiveKey();

  return (
    <nav
      id="app-bottom-nav"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        height: "var(--bottom-nav-height, 56px)",
        backgroundColor: "var(--theme-card-bg)",
        borderTop: "1px solid var(--theme-border)",
        display: "flex",
        alignItems: "stretch",
        justifyContent: "space-around",
        paddingBottom: "env(safe-area-inset-bottom)",
        maxWidth: "420px",
        margin: "0 auto",
      }}
    >
      {TABS.map((tab) => {
        const isActive = activeKey === tab.key;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            onClick={() => {
              // P1-REOPEN: 仅在弹窗打开时标记跳过垫层清理（无弹窗时设置会残留，
              // 污染下一个弹窗的正常关闭，导致幽灵历史条目）
              if (typeof document !== "undefined" && document.body.classList.contains("modal-open")) {
                (window as unknown as { __skipPopupCleanup?: boolean }).__skipPopupCleanup = true;
              }
            }}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "2px",
              textDecoration: "none",
              color: isActive ? "var(--theme-primary)" : "var(--theme-text-secondary)",
              fontWeight: isActive ? 600 : 400,
              fontSize: "11px",
              transition: "color 0.2s",
            }}
          >
            <tab.Icon active={isActive} />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}