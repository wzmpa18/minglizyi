"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// v18.7：五Tab配置：首页/发现/好友/积分/我的
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
    label: "好友",
    href: "/friends",
    Icon: FriendsIcon,
  },
  {
    key: "points",
    label: "积分",
    href: "/points",
    Icon: PointsIcon,
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

function FriendsIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
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

function PointsIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="12 6 13.5 10.5 18 10.5 14.5 13.5 15.5 18 12 15.5 8.5 18 9.5 13.5 6 10.5 10.5 10.5" />
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

  const getActiveKey = (): string => {
    // 发现路由
    if (pathname === "/discover" || pathname.startsWith("/discover/")) return "discover";
    // 积分路由（含子路由：兑换、明细、邀请等）
    if (pathname === "/points" || pathname.startsWith("/points/") || pathname === "/invite" || pathname.startsWith("/invite/")) return "points";
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
        height: "56px",
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