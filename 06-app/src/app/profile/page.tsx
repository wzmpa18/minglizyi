"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const BRAND = "#7B2FBE";

// ==================== Toggle Switch组件 ====================
function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors"
      style={{ backgroundColor: checked ? BRAND : "#ddd" }}
    >
      <span
        className="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? "translateX(22px)" : "translateX(2px)" }}
      />
    </button>
  );
}

// ==================== 列表项组件 ====================
function ListItem({
  icon,
  label,
  right,
  onClick,
  noBorder,
}: {
  icon: React.ReactNode;
  label: string;
  right?: React.ReactNode;
  onClick?: () => void;
  noBorder?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 bg-white px-4 py-3.5 text-left active:bg-gray-50"
      style={{ borderBottom: noBorder ? "none" : "1px solid #f5f5f5" }}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center">{icon}</div>
      <span className="flex-1 text-sm text-gray-800">{label}</span>
      {right || (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      )}
    </button>
  );
}

// ==================== 二维码弹窗（真实二维码 + 下载 + 浏览器打开） ====================
function QRModal({ onClose, userId }: { onClose: () => void; userId: string }) {
  const shareUrl = `https://yandao.vip/friend?ref=${userId}`;
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}&bgcolor=ffffff&color=7B2FBE`;

  const handleDownload = () => {
    // 创建下载链接
    const link = document.createElement("a");
    link.href = qrApiUrl;
    link.download = `yandao-qrcode-${userId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert("链接已复制到剪贴板！分享给好友即可添加");
    }).catch(() => {
      prompt("复制此链接分享给好友：", shareUrl);
    });
  };

  const handleOpenBrowser = () => {
    window.open(shareUrl, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6" onClick={onClose}>
      <div
        className="w-full max-w-xs rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">我的二维码</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* 真实二维码图片 */}
        <div className="mx-auto flex h-52 w-52 items-center justify-center rounded-xl border-2 overflow-hidden" style={{ borderColor: BRAND }}>
          <img
            src={qrApiUrl}
            alt="我的二维码"
            className="h-full w-full object-contain"
            onError={(e) => {
              // 备用：显示占位
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
            }}
          />
        </div>

        <p className="mt-3 text-center text-sm font-medium" style={{ color: BRAND }}>
          扫码添加好友，邀请享佣金
        </p>
        <p className="mt-1 text-center text-xs text-gray-400">
          我的邀请码：{userId}
        </p>

        {/* 操作按钮区 */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleDownload}
            className="flex-1 rounded-lg py-2.5 text-xs font-semibold text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: BRAND }}
          >
            保存二维码
          </button>
          <button
            onClick={handleCopyLink}
            className="flex-1 rounded-lg py-2.5 text-xs font-semibold transition-colors hover:opacity-90"
            style={{ backgroundColor: "#f5f0fa", color: BRAND, border: `1px solid ${BRAND}` }}
          >
            复制链接
          </button>
        </div>
        <button
          onClick={handleOpenBrowser}
          className="mt-2 w-full rounded-lg py-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          style={{ backgroundColor: "transparent" }}
        >
          在浏览器中打开 →
        </button>
      </div>
    </div>
  );
}

// ==================== 占位跳转提示 ====================
function PlaceholderModal({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" onClick={onClose}>
      <div className="w-full max-w-xs rounded-2xl bg-white p-6 shadow-xl text-center" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: "#f5f0fa" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-gray-800">{title}</h3>
        <p className="mt-2 text-sm text-gray-500">功能开发中，敬请期待</p>
        <button
          onClick={onClose}
          className="mt-4 w-full rounded-xl py-2.5 text-sm font-semibold text-white"
          style={{ backgroundColor: BRAND }}
        >
          我知道了
        </button>
      </div>
    </div>
  );
}

// ==================== 主页面组件 ====================
export default function ProfilePage() {
  const router = useRouter();
  // 开关状态
  const [allowSearch, setAllowSearch] = useState(true);
  const [allowNearby, setAllowNearby] = useState(true);
  const [notifyEnabled, setNotifyEnabled] = useState(true);

  // 弹窗状态
  const [showQR, setShowQR] = useState(false);
  const [placeholder, setPlaceholder] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // 生成随机用户ID
  const [userId] = useState(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("profile_userid") : null;
    if (stored) return stored;
    const id = "YD" + Math.floor(100000 + Math.random() * 900000);
    if (typeof window !== "undefined") localStorage.setItem("profile_userid", id);
    return id;
  });

  // 持久化开关状态
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("privacy_search", String(allowSearch));
    localStorage.setItem("privacy_nearby", String(allowNearby));
    localStorage.setItem("notify_enabled", String(notifyEnabled));
  }, [allowSearch, allowNearby, notifyEnabled]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const s = localStorage.getItem("privacy_search");
    const n = localStorage.getItem("privacy_nearby");
    const nf = localStorage.getItem("notify_enabled");
    if (s !== null) setAllowSearch(s === "true");
    if (n !== null) setAllowNearby(n === "true");
    if (nf !== null) setNotifyEnabled(nf === "true");
  }, []);

  const handleLogout = () => {
    setShowLogoutConfirm(false);
    // 模拟退出登录
    alert("已退出登录（模拟）");
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f5f5f5", maxWidth: "420px", margin: "0 auto", paddingBottom: "72px" }}>
      {/* ===== 1. 用户信息区 ===== */}
      <div className="flex flex-col items-center px-4 pt-8 pb-6" style={{ backgroundColor: BRAND }}>
        {/* 大圆形头像 */}
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full"
          style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        {/* 昵称 */}
        <h2 className="mt-3 text-lg font-bold text-white">言道用户</h2>
        {/* 用户ID */}
        <p className="mt-1 text-xs text-white/70">ID: {userId}</p>
        {/* 普通会员标签 */}
        <div
          className="mt-2 rounded-full px-3 py-0.5 text-xs font-medium text-white"
          style={{ backgroundColor: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.4)" }}
        >
          普通会员
        </div>
      </div>

      {/* ===== 2. 核心功能区（卡片） ===== */}
      <div className="mx-3 -mt-4 rounded-xl bg-white shadow-sm overflow-hidden">
        {/* 我的二维码 */}
        <button
          onClick={() => setShowQR(true)}
          className="flex w-full items-center gap-3 px-4 py-4 text-left active:bg-gray-50"
          style={{ borderBottom: "1px solid #f5f5f5" }}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: "#f5f0fa" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">我的二维码</p>
            <p className="text-xs text-gray-400">扫码添加好友</p>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
        </button>

        {/* 我的客户 */}
        <button
          onClick={() => router.push("/clients")}
          className="flex w-full items-center gap-3 px-4 py-4 text-left active:bg-gray-50"
          style={{ borderBottom: "1px solid #f5f5f5" }}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: "#f5f0fa" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">我的客户</p>
            <p className="text-xs text-gray-400">客户档案列表</p>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
        </button>

        {/* 我的小店 */}
        <button
          onClick={() => setPlaceholder("我的小店")}
          className="flex w-full items-center gap-3 px-4 py-4 text-left active:bg-gray-50"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-400">我的小店</p>
            <p className="text-xs text-gray-400">合规校验中，即将开放</p>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </button>
      </div>

      {/* ===== 3. 权益与资产区 ===== */}
      <div className="mx-3 mt-3 rounded-xl bg-white shadow-sm overflow-hidden">
        <div className="px-4 pt-3 pb-1">
          <p className="text-xs font-medium text-gray-400">权益与资产</p>
        </div>
        <ListItem
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill={BRAND} stroke={BRAND} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l2.09 6.26L20 9l-5 4.87L16.18 21 12 17.77 7.82 21 9 13.87 4 9l5.91-.74L12 2z" />
            </svg>
          }
          label="会员中心"
          onClick={() => setPlaceholder("会员中心")}
        />
        <ListItem
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
              <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
              <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
            </svg>
          }
          label="余额充值"
          onClick={() => setPlaceholder("余额充值")}
        />
        <ListItem
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
          label="我的记录"
          onClick={() => setPlaceholder("我的记录")}
        />
        <ListItem
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          }
          label="我的收藏"
          onClick={() => setPlaceholder("我的收藏")}
          noBorder
        />
      </div>

      {/* ===== 4. 设置与规则区 ===== */}
      <div className="mx-3 mt-3 rounded-xl bg-white shadow-sm overflow-hidden">
        <div className="px-4 pt-3 pb-1">
          <p className="text-xs font-medium text-gray-400">设置</p>
        </div>

        {/* 隐私设置 */}
        <div style={{ borderBottom: "1px solid #f5f5f5" }}>
          <div className="px-4 pt-3">
            <p className="text-sm text-gray-500">隐私设置</p>
          </div>
          <ListItem
            icon={<span className="text-sm text-gray-600 w-0" />}
            label="允许被搜索"
            right={<ToggleSwitch checked={allowSearch} onChange={setAllowSearch} />}
          />
          <ListItem
            icon={<span className="text-sm text-gray-600 w-0" />}
            label="允许附近展示"
            right={<ToggleSwitch checked={allowNearby} onChange={setAllowNearby} />}
          />
        </div>

        {/* 通知设置 */}
        <div style={{ borderBottom: "1px solid #f5f5f5" }}>
          <div className="px-4 pt-3">
            <p className="text-sm text-gray-500">通知设置</p>
          </div>
          <ListItem
            icon={<span className="text-sm text-gray-600 w-0" />}
            label="接收推送通知"
            right={<ToggleSwitch checked={notifyEnabled} onChange={setNotifyEnabled} />}
          />
        </div>

        <Link href="/profile/theme" className="block" style={{ borderBottom: "1px solid #f5f5f5" }}>
          <div className="flex w-full items-center gap-3 bg-white px-4 py-3.5 text-left active:bg-gray-50">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="13.5" cy="6.5" r="0.5" fill={BRAND} />
                <circle cx="17.5" cy="10.5" r="0.5" fill={BRAND} />
                <circle cx="8.5" cy="7.5" r="0.5" fill={BRAND} />
                <circle cx="6.5" cy="12.5" r="0.5" fill={BRAND} />
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.8.7-1.5 1.5-1.5H16c3.3 0 6-2.7 6-6 0-5-4.5-9-10-9z" />
              </svg>
            </div>
            <span className="flex-1 text-sm text-gray-800">主题与配色</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </Link>

        <ListItem
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          }
          label="用户协议"
          onClick={() => setPlaceholder("用户协议")}
        />
        <ListItem
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          }
          label="隐私政策"
          onClick={() => setPlaceholder("隐私政策")}
        />
        <ListItem
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          }
          label="关于我们"
          right={<span className="text-xs text-gray-400">v1.0.0</span>}
          onClick={() => setPlaceholder("关于我们 v1.0.0")}
        />
      </div>

      {/* 退出登录 */}
      <div className="mx-3 mt-3 rounded-xl bg-white shadow-sm overflow-hidden">
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full py-4 text-center text-sm font-medium text-red-500 active:bg-gray-50"
        >
          退出登录
        </button>
      </div>

      <div className="py-4 text-center text-xs text-gray-400">
        言道 v1.0.0
      </div>

      {/* ===== 弹窗 ===== */}
      {showQR && <QRModal onClose={() => setShowQR(false)} userId={userId} />}
      {placeholder && <PlaceholderModal title={placeholder} onClose={() => setPlaceholder(null)} />}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" onClick={() => setShowLogoutConfirm(false)}>
          <div className="w-full max-w-xs rounded-2xl bg-white shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 text-center">
              <h3 className="text-base font-bold text-gray-800">确认退出登录？</h3>
              <p className="mt-2 text-sm text-gray-500">退出后需要重新登录</p>
            </div>
            <div className="flex border-t border-gray-100">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 text-sm text-gray-600 active:bg-gray-50"
                style={{ borderRight: "1px solid #f5f5f5" }}
              >
                取消
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-3 text-sm font-medium text-red-500 active:bg-gray-50"
              >
                退出
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
