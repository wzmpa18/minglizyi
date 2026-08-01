"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const THEME = "#7B2FBE";

// 底部Tab数据（严格对齐jishiyu: 排盘/档案/万年历/书库/我的）
const tabs = [
  { key: "paipan", label: "排盘", href: "/", icon: "/images/paipan.png" },
  { key: "files", label: "档案", href: "/files", icon: "/images/files.png" },
  { key: "calendar", label: "万年历", href: "/calendar", icon: "/images/calendar.png" },
  { key: "books", label: "书库", href: "/books", icon: "/images/books.png" },
  { key: "profile", label: "我的", href: "/profile", icon: "/images/profile.png" },
];

export function GlobalBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 969,
        height: "65px",
        display: "grid",
        gridTemplateColumns: "20% 20% 20% 20% 20%",
        lineHeight: "25px",
        padding: 0,
        boxShadow: "-1px 0 4px rgba(0,0,0,0.12)",
        backgroundColor: "rgba(250,250,250,0.69)",
        backdropFilter: "blur(15px)",
        WebkitBackdropFilter: "blur(15px)",
        maxWidth: "500px",
        margin: "0 auto",
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.key}
            href={tab.href}
            style={{
              color: isActive ? THEME : "#000",
              fontWeight: isActive ? 800 : "normal",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
              fontSize: "12px",
              paddingTop: "8px",
              gap: "2px",
              cursor: "pointer",
            }}
          >
            {/* 严格对齐jishiyu: background-image + background-blend-mode:lighten
                默认态: 无background-color，黑色图标正常显示
                选中态: background-color=主题色, blend-mode=lighten, 黑色→主题色, 白色保持白色 */}
            <div
              style={{
                width: "20px",
                height: "20px",
                backgroundImage: `url(${tab.icon})`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
                backgroundSize: "cover",
                borderWidth: 0,
                display: "inline-block",
                backgroundColor: isActive ? THEME : "transparent",
                backgroundBlendMode: isActive ? "lighten" : "normal",
                borderRadius: 0,
              }}
            />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
