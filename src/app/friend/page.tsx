"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getLoginState } from "@/lib/auth";
import { addFriend, type Friend } from "@/lib/socialStore";
import { sendFriendRequest } from "@/lib/socialApi";
import { getUserById, findUserById } from "@/lib/userStore";
import { recordInviteLanding } from "@/lib/antiCheatStore";

const BRAND = "#7B2FBE";
// APK 直链 - 与 /download 页统一的正式包（FINAL-SEAL-03 品牌统一后旧文件名 guoxue-chuancheng-v1.0-release.apk 已从服务器删除，
// 服务器侧已补挂同名别名文件兼容存量分享链接；新代码统一指向正式包名）
const APK_URL = "https://yandaoguoxue.yandao.vip/app-download/yandao-guoxue-v25.0.47-release.apk";

// ==================== 检测微信/QQ内置浏览器 ====================
function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes("micromessenger") || ua.includes("qq/") || ua.includes("mqqbrowser");
}

function isWeChat(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.userAgent.toLowerCase().includes("micromessenger");
}

// ==================== 核心 Friend 页面内容 ====================
function FriendContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const referrerId = searchParams.get("ref") || "";
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const [toast, setToast] = useState("");
  const [friendAdded, setFriendAdded] = useState(false);
  const [isInApp, setIsInApp] = useState(false);
  const [downloadTriggered, setDownloadTriggered] = useState(false);
  const autoActionTriggered = useRef(false);

  useEffect(() => {
    // 检测是否在微信/QQ内置浏览器中
    const inApp = isInAppBrowser();
    setIsInApp(inApp);

    // 存储 referrer ID 到 localStorage，注册时自动绑定邀请关系
    if (referrerId) {
      localStorage.setItem("yandao_referrer_id", referrerId);
      // P6-TOOL-04 §5.2: 记录邀请链接首次落地时间（先到先得，用于有效期校验）
      try {
        recordInviteLanding();
      } catch { /* ignore */ }
    }

    // 检查登录状态
    const loginState = getLoginState();
    if (loginState.isLoggedIn && loginState.profile?.userId) {
      setIsLoggedIn(true);
      setCurrentUserId(loginState.profile.userId);
    }

    // 自动分流逻辑（只执行一次）
    if (autoActionTriggered.current) return;
    autoActionTriggered.current = true;

    if (loginState.isLoggedIn && loginState.profile?.userId) {
      // 场景B：已登录 → 自动添加好友
      if (referrerId && referrerId !== loginState.profile.userId) {
        setTimeout(() => {
          autoAddFriend(referrerId, loginState.profile!.userId);
        }, 800);
      } else if (referrerId && referrerId === loginState.profile.userId) {
        // 不能添加自己为好友
        setTimeout(() => {
          setToast("不能添加自己为好友");
          setTimeout(() => setToast(""), 4000);
        }, 500);
      }
    } else {
      // 场景A：未登录 → 直接触发下载（非微信/QQ环境）
      if (!inApp) {
        setTimeout(() => {
          triggerDownload();
        }, 500);
      }
    }
  }, [referrerId]);

  // 直接触发下载 - 使用 window.location 跳转（最可靠的方式）
  const triggerDownload = () => {
    if (downloadTriggered) return;
    setDownloadTriggered(true);
    setToast("正在下载言道国学APP...");
    try {
      window.location.href = APK_URL;
    } catch {
      setToast("下载失败，请点击下方按钮重试");
    }
  };

  // 手动下载按钮
  const handleManualDownload = () => {
    triggerDownload();
  };

  // 自动添加好友
  const autoAddFriend = async (targetId: string, myId: string) => {
    try {
      // 先通过后端API查找用户信息
      const targetUser = await findUserById(targetId);
      const friend: Friend = {
        id: targetId,
        name: targetUser?.nickname || "言道用户",
        avatar: targetUser?.avatar || "",
        online: false,
        lastSeen: new Date().toISOString(),
        note: "通过二维码添加",
        tags: [],
        addedAt: new Date().toISOString(),
      };
      addFriend(friend);
      // 后端真实好友申请：对方通过后双方好友列表同步（P7-整改-01修复：此前仅写本地，对方收不到申请）
      try {
        const myName = getLoginState().profile?.nickname || "言道用户";
        await sendFriendRequest(targetId, `我是${myName}，通过扫码添加你为好友`);
      } catch { /* 后端申请失败不阻断本地展示 */ }
      setFriendAdded(true);
      setToast("已发送好友申请，对方通过后自动成为好友");
      setTimeout(() => setToast(""), 4000);
    } catch {
      setToast("添加好友失败，请稍后重试");
      setTimeout(() => setToast(""), 3000);
    }
  };

  const handleRegister = () => {
    router.push("/register?ref=" + referrerId);
  };

  const handleLogin = () => {
    router.push("/login?ref=" + referrerId);
  };

  const handleViewFriends = () => {
    router.push("/friends");
  };

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      {/* 顶部渐变区 */}
      <div
        style={{
          background: `linear-gradient(135deg, ${BRAND} 0%, #9B59B6 100%)`,
          padding: "40px 24px 32px",
          textAlign: "center",
          color: "#fff",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            backgroundColor: "rgba(255,255,255,0.2)",
            border: "2px solid rgba(255,255,255,0.3)",
            margin: "0 auto 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: 24, fontWeight: 700 }}>言</span>
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>
          欢迎来到言道国学
        </h1>
        <p style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.5 }}>
          排盘・习医・会同道<br />
          一站式传统文化学习平台
        </p>
        {referrerId && (
          <div
            style={{
              display: "inline-block",
              marginTop: 12,
              padding: "5px 14px",
              borderRadius: 16,
              backgroundColor: "rgba(255,255,255,0.2)",
              fontSize: 11,
            }}
          >
            邀请码：{referrerId}
          </div>
        )}
      </div>

      {/* 微信/QQ 内置浏览器引导 */}
      {isInApp && !isLoggedIn && (
        <div
          style={{
            margin: "12px",
            padding: "16px",
            backgroundColor: "#FFF3CD",
            borderRadius: 10,
            border: "1px solid #FFEEBA",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, color: "#856404", marginBottom: 8 }}>
            检测到您在微信/QQ中打开
          </div>
          <div style={{ fontSize: 12, color: "#856404", lineHeight: 1.6 }}>
            请点击右上角「···」按钮<br />
            选择「在浏览器中打开」<br />
            即可自动下载APP
          </div>
          <button
            onClick={handleManualDownload}
            style={{
              marginTop: 10,
              padding: "8px 20px",
              borderRadius: 8,
              border: "none",
              backgroundColor: BRAND,
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            尝试下载
          </button>
        </div>
      )}

      {/* 已登录 - 自动加好友结果 */}
      {isLoggedIn ? (
        <div style={{ margin: "12px", backgroundColor: "#fff", borderRadius: 12, padding: "20px", textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          {friendAdded ? (
            <>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  backgroundColor: "#E8F5E9",
                  margin: "0 auto 12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p style={{ fontSize: 16, fontWeight: 600, color: "#333", marginBottom: 6 }}>
                已成功添加对方为好友
              </p>
              <p style={{ fontSize: 12, color: "#999" }}>
                邀请关系已自动绑定，可前往好友列表查看
              </p>
              <button
                onClick={handleViewFriends}
                style={{
                  marginTop: 16,
                  padding: "10px 24px",
                  borderRadius: 8,
                  border: "none",
                  backgroundColor: BRAND,
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                查看好友列表
              </button>
            </>
          ) : (
            <>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  backgroundColor: "#f5f0fa",
                  margin: "0 auto 12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}>
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#333" }}>
                正在添加好友...
              </p>
            </>
          )}
          {/* 可选下载入口 */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #f0f0f0" }}>
            <button
              onClick={handleManualDownload}
              style={{
                padding: "8px 20px",
                borderRadius: 8,
                border: `1px solid ${BRAND}`,
                backgroundColor: "transparent",
                color: BRAND,
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              下载APP
            </button>
          </div>
        </div>
      ) : !isInApp ? (
        /* 未登录 - 简洁下载页面 */
        <div style={{ margin: "12px", backgroundColor: "#fff", borderRadius: 12, padding: "24px", textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              backgroundColor: downloadTriggered ? "#E8F5E9" : "#f5f0fa",
              margin: "0 auto 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={downloadTriggered ? "#4CAF50" : BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </div>

          <p style={{ fontSize: 15, fontWeight: 600, color: "#333", marginBottom: 6 }}>
            {downloadTriggered ? "下载已开始" : "言道国学 APP"}
          </p>
          <p style={{ fontSize: 12, color: "#999", marginBottom: 16, lineHeight: 1.5 }}>
            {downloadTriggered
              ? "请查看浏览器下载栏，安装后打开APP注册，邀请关系自动绑定，无需填写邀请码"
              : referrerId ? `已记录邀请人（ID:${referrerId}），下载APP注册后自动绑定，无需填写邀请码` : "扫码下载APP，即刻体验国学文化"}
          </p>

          {/* 手动兜底按钮 */}
          <button
            onClick={handleManualDownload}
            style={{
              padding: "10px 24px",
              borderRadius: 8,
              border: "none",
              backgroundColor: BRAND,
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              marginBottom: 12,
            }}
          >
            {downloadTriggered ? "重新下载" : "立即下载APP"}
          </button>

          {/* 注册引导 */}
          <div style={{ paddingTop: 12, borderTop: "1px solid #f0f0f0" }}>
            <p style={{ fontSize: 12, color: "#999", marginBottom: 8 }}>
              已安装APP？直接注册，邀请关系自动绑定
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button
                onClick={handleRegister}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: `1px solid ${BRAND}`,
                  backgroundColor: "#f5f0fa",
                  color: BRAND,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                注册绑定
              </button>
              <button
                onClick={handleLogin}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "none",
                  backgroundColor: "transparent",
                  color: "#999",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                登录
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* 功能亮点 */}
      <div style={{ margin: "0 12px 12px", backgroundColor: "#fff", borderRadius: 12, padding: "14px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { icon: "🔮", title: "14款排盘工具", desc: "基础功能永久免费" },
            { icon: "📚", title: "中医典籍全库", desc: "随时查阅研习" },
            { icon: "🤝", title: "同道交流社区", desc: "同好互动学习" },
            { icon: "💰", title: "邀请赚佣金", desc: "一级15% 二级5%" },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: 6, backgroundColor: "#f9f5fc", borderRadius: 8 }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#333" }}>{item.title}</div>
                <div style={{ fontSize: 9, color: "#999", marginTop: 1 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 底部品牌 + 合规声明 */}
      <div style={{ padding: "12px 24px 20px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: 4,
              backgroundColor: BRAND,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            言
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#333" }}>东莞言道科技有限公司</span>
        </div>
        <p style={{ fontSize: 10, color: "#bbb", lineHeight: 1.4 }}>
          内容仅供传统文化学习参考，不构成任何决策建议
        </p>
      </div>

      <div className="page-bottom-nav-safe" aria-hidden="true" />

      {/* Toast 提示 */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 80,
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "rgba(0,0,0,0.8)",
            color: "#fff",
            padding: "10px 20px",
            borderRadius: 22,
            fontSize: 13,
            zIndex: 60,
            whiteSpace: "nowrap",
            maxWidth: "90vw",
          }}
        >
          {toast}
        </div>
      )}

      {/* 旋转动画 */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ==================== 页面导出（Suspense 包装 searchParams） ====================
export default function FriendPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            maxWidth: "420px",
            margin: "0 auto",
            minHeight: "100vh",
            backgroundColor: "#f5f5f5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ textAlign: "center", color: "#999" }}>
            <div style={{ fontSize: 14 }}>加载中...</div>
          </div>
        </div>
      }
    >
      <FriendContent />
    </Suspense>
  );
}
