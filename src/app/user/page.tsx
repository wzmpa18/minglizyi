"use client";

// ============================================================================
// v25.0.41 唯一用户资料页（UserProfile）
// 好友列表 / 聊天 / 群成员 / 发现动态 / 搜索用户 —— 点击任何用户统一进入本页
// 数据源：GET /api/social/users/:userId/profile（含好友/备注/拉黑关系）
// ============================================================================

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BrandHeader } from "@/components/shared";
import { ConfirmDialog } from "@/components/ui";
import { PageLoginGuard } from "@/components/PageLoginGuard";
import { getCurrentUserId } from "@/lib/auth";
import {
  fetchUserProfile,
  toggleFollow,
  fetchFollowStatus,
  sendFriendRequest,
  removeFriend,
  setFriendRemark,
  addServerBlacklist,
  type SocialUserProfile,
} from "@/lib/socialApi";
import { updateFriendNote, removeFriend as localRemoveFriend, getFriends } from "@/lib/socialStore";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { usePopupBackHandler } from "@/hooks/usePopupBackHandler";

const BRAND = "#7B2FBE";

const LEVEL_META: Record<string, { name: string; color: string }> = {
  basic: { name: "免费用户", color: "#95a5a6" },
  monthly: { name: "月度会员", color: "#3498db" },
  yearly: { name: "年度会员", color: "#f39c12" },
  lifetime: { name: "终身会员", color: "#e74c3c" },
};

// 静态导出兼容：useSearchParams 必须包在 Suspense 内（同 friends/profile 模式）
function UserProfileInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || "";
  const myId = getCurrentUserId();

  const [user, setUser] = useState<SocialUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [following, setFollowing] = useState(false);
  const [toast, setToast] = useState("");

  // 操作弹层
  const [remarkDialog, setRemarkDialog] = useState(false);
  const [remarkInput, setRemarkInput] = useState("");
  const [confirmKind, setConfirmKind] = useState<"delete" | "block" | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [sentRequest, setSentRequest] = useState(false);

  const anyDialog = remarkDialog || !!confirmKind || reportOpen;
  useBodyScrollLock(anyDialog);
  usePopupBackHandler(() => {
    if (reportOpen) setReportOpen(false);
    else if (confirmKind) setConfirmKind(null);
    else if (remarkDialog) setRemarkDialog(false);
  }, anyDialog);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  };

  const load = useCallback(async () => {
    if (!uid) { setNotFound(true); setLoading(false); return; }
    try {
      const r = await fetchUserProfile(uid);
      if (r && r.success && r.user) {
        setUser(r.user);
        setRemarkInput(r.user.friendRemark || "");
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    }
    setLoading(false);
    if (myId && uid && myId !== uid) {
      void fetchFollowStatus(uid).then((r) => {
        if (r && r.success) setFollowing(!!r.following);
      }).catch(() => {});
    }
  }, [uid, myId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <>
        <PageLoginGuard />
        <div className="min-h-screen bg-gray-50" style={{ maxWidth: "420px", margin: "0 auto" }}>
          <BrandHeader title="用户资料" />
          <div className="py-24 text-center text-sm text-gray-400">加载中…</div>
        </div>
      </>
    );
  }

  if (notFound || !user) {
    return (
      <>
        <PageLoginGuard />
        <div className="min-h-screen bg-gray-50" style={{ maxWidth: "420px", margin: "0 auto" }}>
          <BrandHeader title="用户资料" />
          <div className="py-24 text-center">
            <p className="text-sm text-gray-400">用户不存在或已注销</p>
            <button onClick={() => router.back()} className="mt-4 rounded-xl px-6 py-2 text-sm text-white" style={{ backgroundColor: BRAND }}>
              返回
            </button>
          </div>
        </div>
      </>
    );
  }

  const isSelf = user.isSelf || user.userId === myId;
  const isFriend = !!user.isFriend;
  const level = LEVEL_META[user.memberLevel] || LEVEL_META.basic;

  const handleAddFriend = async () => {
    const r = await sendFriendRequest(user.userId, "你好，我想加你为好友，一起学习国学~");
    if (r && r.success) {
      setSentRequest(true);
      showToast(r.autoAccepted ? "你们已成为好友" : "好友申请已发送");
      load();
    } else {
      showToast((r && r.error) || "发送失败，请稍后重试");
    }
  };

  const handleRemark = async () => {
    const r = await setFriendRemark(user.userId, remarkInput.trim());
    if (r && r.success) {
      const f = getFriends().find((x) => x.id === user.userId);
      if (f) updateFriendNote(user.userId, remarkInput.trim());
      setRemarkDialog(false);
      showToast("备注已保存");
      load();
    } else {
      showToast((r && r.error) || "保存失败");
    }
  };

  const handleDeleteFriend = async () => {
    const r = await removeFriend(user.userId);
    localRemoveFriend(user.userId);
    setConfirmKind(null);
    if (r && r.success) showToast("已删除好友");
    load();
  };

  const handleBlock = async () => {
    const r = await addServerBlacklist(user.userId);
    localRemoveFriend(user.userId);
    setConfirmKind(null);
    if (r && r.success) showToast("已加入黑名单");
    load();
  };

  const handleShareCard = async () => {
    const text = `【言道国学】${user.nickname}的名片 | 用户ID：${user.userId}，来一起学习国学吧！`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "用户名片", text, url: `${window.location.origin}/user?uid=${user.userId}` });
      } else {
        await navigator.clipboard.writeText(text + ` ${window.location.origin}/user?uid=${user.userId}`);
        showToast("名片已复制到剪贴板");
      }
    } catch {
      showToast("分享已取消");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" style={{ maxWidth: "420px", margin: "0 auto", paddingBottom: "32px" }}>
      <PageLoginGuard />
      <BrandHeader title="用户资料" />

      {/* ===== 主信息卡 ===== */}
      <div className="bg-white px-4 py-5">
        <div className="flex items-center gap-4">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold text-white shrink-0"
            style={{ backgroundColor: BRAND }}
          >
            {(user.avatar || user.nickname || "友").slice(0, 1)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-900 truncate">{user.nickname}</span>
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                style={{ backgroundColor: level.color }}
              >
                {level.name}
              </span>
            </div>
            {user.friendRemark && (
              <p className="mt-0.5 text-xs text-gray-500">备注：{user.friendRemark}</p>
            )}
            <p className="mt-0.5 text-xs text-gray-400">用户ID：{user.userId}</p>
            {user.blockingMe && (
              <p className="mt-1 text-xs text-red-400">对方已将你加入黑名单</p>
            )}
          </div>
        </div>

        {/* 统计 */}
        <div className="mt-4 flex items-center justify-around rounded-xl bg-gray-50 py-3">
          <div className="text-center">
            <p className="text-base font-bold text-gray-800">{user.postCount}</p>
            <p className="text-xs text-gray-400">动态</p>
          </div>
          <div className="w-px h-6 bg-gray-200" />
          <div className="text-center">
            <p className="text-base font-bold text-gray-800">{user.followerCount}</p>
            <p className="text-xs text-gray-400">粉丝</p>
          </div>
          <div className="w-px h-6 bg-gray-200" />
          <div className="text-center">
            <p className="text-base font-bold text-gray-800">{user.followingCount}</p>
            <p className="text-xs text-gray-400">关注</p>
          </div>
        </div>

        {user.bio && (
          <p className="mt-3 text-sm leading-relaxed text-gray-600">{user.bio}</p>
        )}
      </div>

      {/* ===== 学习身份卡 ===== */}
      <div className="mt-2 bg-white px-4 py-4">
        <p className="mb-3 text-sm font-semibold text-gray-800">学习身份</p>
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: level.color }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-800">{level.name}</p>
            <p className="text-xs text-gray-400">公开学习身份 · 信誉良好</p>
          </div>
        </div>
        <div className="mt-3 rounded-xl border border-dashed border-gray-200 px-3 py-3">
          <p className="text-xs font-medium text-gray-500">公开证书</p>
          <p className="mt-1 text-xs text-gray-400">{level.name === "免费用户" ? "暂无公开证书" : `${level.name}认证 · 平台学习徽章`}</p>
        </div>
      </div>

      {/* ===== 操作区 ===== */}
      <div className="mt-2 bg-white px-4 py-4">
        {isSelf ? (
          <button
            onClick={() => router.push("/profile")}
            className="w-full rounded-xl py-3 text-sm font-semibold text-white"
            style={{ backgroundColor: BRAND }}
          >
            这是我 · 查看我的主页
          </button>
        ) : (
          <>
            <div className="flex gap-3">
              {isFriend ? (
                <button
                  onClick={() => router.push(`/friends/chat?id=${encodeURIComponent(user.userId)}`)}
                  className="flex-1 rounded-xl py-3 text-sm font-semibold text-white"
                  style={{ backgroundColor: BRAND }}
                >
                  发消息
                </button>
              ) : (
                <button
                  onClick={handleAddFriend}
                  disabled={sentRequest || user.blockingMe}
                  className="flex-1 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: BRAND }}
                >
                  {user.blockingMe ? "无法添加" : sentRequest ? "已发送申请" : "添加好友"}
                </button>
              )}
              <button
                onClick={async () => {
                  const r = await toggleFollow(user.userId).catch(() => null);
                  if (r && r.success) {
                    setFollowing(!!r.following);
                    showToast(r.following ? "已关注" : "已取消关注");
                  }
                }}
                className="flex-1 rounded-xl border-2 py-3 text-sm font-semibold"
                style={{ borderColor: following ? "#ddd" : BRAND, color: following ? "#999" : BRAND }}
              >
                {following ? "已关注" : "关注"}
              </button>
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2">
              <button
                onClick={() => router.push(`/discover?author=${encodeURIComponent(user.userId)}`)}
                className="flex flex-col items-center gap-1 rounded-xl bg-gray-50 py-3"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span className="text-xs text-gray-600">看动态</span>
              </button>
              <button
                onClick={() => router.push(`/discover?author=${encodeURIComponent(user.userId)}`)}
                className="flex flex-col items-center gap-1 rounded-xl bg-gray-50 py-3"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
                <span className="text-xs text-gray-600">橱窗</span>
              </button>
              {isFriend && (
                <>
                  <button onClick={() => setRemarkDialog(true)} className="flex flex-col items-center gap-1 rounded-xl bg-gray-50 py-3">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z" />
                    </svg>
                    <span className="text-xs text-gray-600">备注</span>
                  </button>
                  <button onClick={handleShareCard} className="flex flex-col items-center gap-1 rounded-xl bg-gray-50 py-3">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="18" cy="5" r="3" />
                      <circle cx="6" cy="12" r="3" />
                      <circle cx="18" cy="19" r="3" />
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                    <span className="text-xs text-gray-600">名片</span>
                  </button>
                </>
              )}
              {!isFriend && (
                <>
                  <button onClick={() => router.push("/academy")} className="flex flex-col items-center gap-1 rounded-xl bg-gray-50 py-3">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                      <path d="M6 12v5c3 3 9 3 12 0v-5" />
                    </svg>
                    <span className="text-xs text-gray-600">邀请学习</span>
                  </button>
                  <button onClick={handleShareCard} className="flex flex-col items-center gap-1 rounded-xl bg-gray-50 py-3">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="18" cy="5" r="3" />
                      <circle cx="6" cy="12" r="3" />
                      <circle cx="18" cy="19" r="3" />
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                    <span className="text-xs text-gray-600">名片</span>
                  </button>
                </>
              )}
            </div>

            {/* 危险操作 */}
            <div className="mt-3 flex justify-between text-xs">
              {isFriend && (
                <>
                  <button onClick={() => setConfirmKind("delete")} className="text-gray-400">删除好友</button>
                  <button onClick={() => setConfirmKind("block")} className="text-gray-400">加入黑名单</button>
                </>
              )}
              <button onClick={() => setReportOpen(true)} className="text-gray-400">举报</button>
            </div>
          </>
        )}
      </div>

      {/* ===== 修改备注弹窗 ===== */}
      {remarkDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-8">
          <div className="w-full rounded-2xl bg-white p-5">
            <p className="mb-3 text-center text-sm font-semibold text-gray-800">修改备注</p>
            <input
              value={remarkInput}
              onChange={(e) => setRemarkInput(e.target.value)}
              placeholder="给好友添加备注名"
              maxLength={20}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-purple-400"
              autoFocus
            />
            <div className="mt-4 flex gap-3">
              <button onClick={() => setRemarkDialog(false)} className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm text-gray-600">取消</button>
              <button onClick={handleRemark} className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: BRAND }}>保存</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 确认弹窗 ===== */}
      {confirmKind === "delete" && (
        <ConfirmDialog
          open
          danger
          title="删除好友"
          message={`确定删除好友「${user.nickname}」吗？删除后将无法恢复。`}
          confirmText="删除"
          cancelText="取消"
          onConfirm={handleDeleteFriend}
          onCancel={() => setConfirmKind(null)}
        />
      )}
      {confirmKind === "block" && (
        <ConfirmDialog
          open
          danger
          title="加入黑名单"
          message={`确定将「${user.nickname}」加入黑名单吗？将自动解除好友关系，双方无法再互发消息。`}
          confirmText="拉黑"
          cancelText="取消"
          onConfirm={handleBlock}
          onCancel={() => setConfirmKind(null)}
        />
      )}

      {/* ===== 举报弹窗 ===== */}
      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-8">
          <div className="w-full rounded-2xl bg-white p-5">
            <p className="mb-3 text-center text-sm font-semibold text-gray-800">举报用户</p>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="请描述举报原因（如：垃圾广告、违规内容、诈骗等）"
              rows={3}
              maxLength={200}
              className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-purple-400"
            />
            <div className="mt-4 flex gap-3">
              <button onClick={() => setReportOpen(false)} className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm text-gray-600">取消</button>
              <button
                onClick={async () => {
                  if (!reportReason.trim()) { showToast("请填写举报原因"); return; }
                  setReportOpen(false);
                  showToast("举报已提交，我们将尽快核实处理");
                }}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white"
                style={{ backgroundColor: "#F44336" }}
              >
                提交举报
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed left-1/2 top-20 z-[60] -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-xs text-white">
          {toast}
        </div>
      )}
    </div>
  );
}

export default function UserProfilePage() {
  return (
    <Suspense fallback={null}>
      <UserProfileInner />
    </Suspense>
  );
}
