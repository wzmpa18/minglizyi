"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 四Tab配置：首页/好友/发现/我的（顺序不可变）
const TABS = [
  {
    key: "home",
    label: "首页",
    href: "/",
    Icon: HomeIcon,
  },
  {
    key: "friends",
    label: "好友",
    href: "/friends",
    Icon: FriendsIcon,
  },
  {
    key: "discover",
    label: "发现",
    href: "/discover",
    Icon: DiscoverIcon,
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

function DiscoverIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
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

  // 判断当前激活的Tab（P1.5整改后统一规则）
  const getActiveKey = (): string => {
    if (
      pathname === "/friends" || pathname.startsWith("/friends/") ||
      pathname === "/messages" || pathname.startsWith("/messages/") ||
      pathname === "/contacts" || pathname.startsWith("/contacts/") ||
      pathname === "/social" || pathname.startsWith("/social/")
    ) return "friends";
    if (pathname === "/discover" || pathname.startsWith("/discover/")) return "discover";
    if (
      pathname === "/profile" || pathname.startsWith("/profile/") ||
      pathname === "/clients" || pathname.startsWith("/clients/")
    ) return "profile";
    return "home";
  };

  const activeKey = getActiveKey();

  // 隐藏底部导航的路径
  const HIDDEN_PATHS: string[] = [];
  if (HIDDEN_PATHS.some((p) => pathname.startsWith(p))) return null;

  return (
    <nav
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
