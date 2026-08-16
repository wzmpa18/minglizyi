"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { BrandHeader } from "@/components/shared";
import { useToolBack } from "@/lib/useToolBack";
import {
  getUserById,
  getUserPosts,
  toggleFollowUser,
  togglePostLike,
  isFollowing as checkFollowing,
  getFollowStats,
  getCurrentUserId,
  type UserDirectoryEntry,
  type UserPost,
} from "@/lib/userStore";
import { getFriends, addFriendRequest, type Friend } from "@/lib/socialStore";

import { PageLoginGuard } from "@/components/PageLoginGuard";
const BRAND = "#7B2FBE";

// ==================== 工具函数 ====================

/** 相对时间格式化：刚刚 / x分钟前 / x小时前 / x天前 / 日期 */
function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return "刚刚";
  const min = Math.floor(diff / 60000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min}分钟前`;
  const hour = Math.floor(diff / 3600000);
  if (hour < 24) return `${hour}小时前`;
  const day = Math.floor(diff / 86400000);
  if (day < 30) return `${day}天前`;
  return new Date(iso).toLocaleDateString("zh-CN");
}

/** 性别显示 */
function formatGender(gender: "male" | "female" | "unknown"): string {
  if (gender === "male") return "男";
  if (gender === "female") return "女";
  return "保密";
}

// ==================== 页面组件 ====================

export default function FriendProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const { showResult, savedParams, saveParams } = useToolBack({
    pageKey: "friend_profile_" + userId,
  });

  const [user, setUser] = useState<UserDirectoryEntry | null>(null);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followStats, setFollowStats] = useState<{ following: number; fans: number }>({
    following: 0,
    fans: 0,
  });
  const [activeTab, setActiveTab] = useState<"posts" | "profile">("posts");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [isSelf, setIsSelf] = useState(false);

  // 初始化：加载用户资料、关注状态、动态列表
  useEffect(() => {
    const cid = getCurrentUserId();
    const found = getUserById(userId);
    if (!found) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setUser(found);
    setIsSelf(cid === userId);
    setIsFollowing(checkFollowing(userId));
    setFollowStats(getFollowStats(userId));

    const friends: Friend[] = getFriends();
    setIsFriend(friends.some((f) => f.id === userId));

    // 仅在允许查看动态或是自己时加载动态
    if (found.allowViewPosts || cid === userId) {
      setPosts(getUserPosts(userId).map((p) => ({ ...p })));
    } else {
      setPosts([]);
    }
    setLoading(false);
  }, [userId]);

  // 关注 / 取消关注
  const handleToggleFollow = () => {
    const result = toggleFollowUser(userId);
    setIsFollowing(result);
    setFollowStats(getFollowStats(userId));
    const updated = getUserById(userId);
    if (updated) setUser(updated);
  };

  // 跳转到聊天
  const handleSendMessage = () => {
    router.push("/friends/chat/" + userId);
  };

  // 跳转到资料编辑
  const handleEditProfile = () => {
    router.push("/profile/edit");
  };

  // 发送好友请求
  const handleAddFriend = () => {
    addFriendRequest({
      id: `req_${Date.now()}`,
      fromId: getCurrentUserId(),
      fromName: "当前用户",
      fromAvatar: "我",
      message: `我想加你为好友`,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
    setRequestSent(true);
  };

  // 点赞 / 取消点赞（从 store 刷新以避免与种子数据共享引用导致重复计数）
  const handleTogglePostLike = (postId: string) => {
    togglePostLike(userId, postId);
    setPosts(getUserPosts(userId).map((p) => ({ ...p })));
  };

  // ---------------- 加载中 ----------------
  if (loading) {
    return (
      <div
        className="flex min-h-screen flex-col bg-[#ededed]"
        style={{ maxWidth: "420px", margin: "0 auto" }}
      >
  <PageLoginGuard />
        <BrandHeader title="用户主页" showBack />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  // ---------------- 用户不存在 ----------------
  if (notFound || !user) {
    return (
      <div
        className="flex min-h-screen flex-col bg-[#ededed]"
        style={{ maxWidth: "420px", margin: "0 auto" }}
      >
        <BrandHeader title="用户主页" showBack />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-400">用户不存在</p>
        </div>
      </div>
    );
  }

  const canViewPosts = user.allowViewPosts || isSelf;

  return (
    <div
      className="flex min-h-screen flex-col bg-[#ededed]"
      style={{ maxWidth: "420px", margin: "0 auto" }}
    >
      <BrandHeader title="用户主页" showBack />

      <div className="flex-1 overflow-y-auto pb-4">
        {/* ============ 用户信息卡片 ============ */}
        <div className="bg-white mx-3 mt-3 rounded-xl p-5 shadow-sm relative">
          {/* 关注按钮（右上角），自己不显示 */}
          {!isSelf && (
            <button
              onClick={handleToggleFollow}
              className="absolute top-4 right-4 rounded-full px-3 py-1 text-xs font-semibold transition-colors"
              style={{
                backgroundColor: isFollowing ? "#f0f0f0" : BRAND,
                color: isFollowing ? "#666" : "white",
                border: isFollowing ? "1px solid #ddd" : "none",
              }}
            >
              {isFollowing ? "已关注" : "+ 关注"}
            </button>
          )}

          <div className="flex flex-col items-center">
            {/* 头像 */}
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full text-white font-bold mb-3"
              style={{ backgroundColor: BRAND, fontSize: "32px" }}
            >
              {user.avatar || user.nickname.slice(0, 1)}
            </div>

            {/* 昵称 */}
            <p className="text-lg font-bold text-gray-800">{user.nickname}</p>

            {/* 用户ID */}
            <p className="text-xs text-gray-400 mt-1">ID: {user.userId}</p>

            {/* 个性签名 */}
            {user.bio && (
              <p className="text-xs text-gray-500 mt-2 text-center px-2 leading-relaxed">
                {user.bio}
              </p>
            )}

            {/* 标签列表 */}
            {user.tags && user.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2 justify-center">
                {user.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full px-2.5 py-0.5 text-[11px]"
                    style={{ backgroundColor: BRAND + "15", color: BRAND }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* 统计数据行：关注 | 粉丝 | 动态 */}
            <div className="flex w-full mt-4 border-t border-gray-100 pt-3">
              <div className="flex-1 flex flex-col items-center">
                <p className="text-base font-bold text-gray-800">
                  {followStats.following}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">关注</p>
              </div>
              <div className="flex-1 flex flex-col items-center border-l border-gray-100">
                <p className="text-base font-bold text-gray-800">
                  {followStats.fans}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">粉丝</p>
              </div>
              <div className="flex-1 flex flex-col items-center border-l border-gray-100">
                <p className="text-base font-bold text-gray-800">
                  {user.postCount}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">动态</p>
              </div>
            </div>

            {/* 操作按钮行（根据关系不同） */}
            <div className="flex gap-3 mt-4 w-full">
              {isSelf ? (
                <button
                  onClick={handleEditProfile}
                  className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white"
                  style={{ backgroundColor: BRAND }}
                >
                  编辑资料
                </button>
              ) : isFriend ? (
                <button
                  onClick={handleSendMessage}
                  className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white"
                  style={{ backgroundColor: BRAND }}
                >
                  发消息
                </button>
              ) : (
                <>
                  <button
                    onClick={handleAddFriend}
                    disabled={requestSent}
                    className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors"
                    style={{
                      backgroundColor: requestSent ? "#f0f0f0" : BRAND,
                      color: requestSent ? "#999" : "white",
                    }}
                  >
                    {requestSent ? "已申请" : "加好友"}
                  </button>
                  <button
                    onClick={handleSendMessage}
                    className="flex-1 rounded-xl py-2.5 text-sm font-semibold"
                    style={{
                      backgroundColor: "white",
                      color: BRAND,
                      border: `1px solid ${BRAND}`,
                    }}
                  >
                    发消息
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ============ Tab 切换栏 ============ */}
        <div className="bg-white mx-3 mt-3 rounded-xl flex">
          <button
            onClick={() => setActiveTab("posts")}
            className="flex-1 py-3 text-sm font-semibold relative"
            style={{ color: activeTab === "posts" ? BRAND : "#999" }}
          >
            动态
            {activeTab === "posts" && (
              <span
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                style={{ backgroundColor: BRAND }}
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className="flex-1 py-3 text-sm font-semibold relative"
            style={{ color: activeTab === "profile" ? BRAND : "#999" }}
          >
            资料
            {activeTab === "profile" && (
              <span
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                style={{ backgroundColor: BRAND }}
              />
            )}
          </button>
        </div>

        {/* ============ Tab 内容 ============ */}
        {activeTab === "posts" ? (
          /* ---------- 动态 Tab ---------- */
          <div className="bg-white mx-3 mt-3 rounded-xl p-4 min-h-[120px]">
            {!canViewPosts ? (
              <div className="flex flex-col items-center justify-center py-10">
                <p className="text-sm text-gray-400">
                  该用户已设置动态不可见
                </p>
              </div>
            ) : posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10">
                <p className="text-sm text-gray-400">暂无动态</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="border-b border-gray-100 last:border-b-0 pb-4 last:pb-0"
                  >
                    {/* 动态内容 */}
                    <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {post.content}
                    </p>

                    {/* 话题标签 */}
                    {post.topic && (
                      <div className="mt-2">
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-[11px]"
                          style={{ backgroundColor: BRAND + "15", color: BRAND }}
                        >
                          #{post.topic}
                        </span>
                      </div>
                    )}

                    {/* 底部：时间 + 互动数据 */}
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-xs text-gray-400">
                        {formatTime(post.createdAt)}
                      </p>
                      <div className="flex items-center gap-4 text-xs">
                        {/* 点赞按钮：点击有变色反馈 */}
                        <button
                          onClick={() => handleTogglePostLike(post.id)}
                          className="flex items-center gap-1 transition-colors font-medium"
                          style={{ color: post.liked ? BRAND : "#999" }}
                        >
                          <span>{post.liked ? "已赞" : "赞"}</span>
                          <span>{post.likes}</span>
                        </button>
                        {/* 评论数 */}
                        <div
                          className="flex items-center gap-1"
                          style={{ color: "#999" }}
                        >
                          <span>评论</span>
                          <span>{post.comments}</span>
                        </div>
                        {/* 分享数 */}
                        <div
                          className="flex items-center gap-1"
                          style={{ color: "#999" }}
                        >
                          <span>分享</span>
                          <span>{post.shares}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ---------- 资料 Tab ---------- */
          <div className="bg-white mx-3 mt-3 rounded-xl p-4">
            <div className="flex flex-col">
              {/* 注册时间 */}
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <span className="text-sm text-gray-500">注册时间</span>
                <span className="text-sm text-gray-800">
                  {user.registeredAt
                    ? new Date(user.registeredAt).toLocaleDateString("zh-CN")
                    : "未知"}
                </span>
              </div>

              {/* 最后活跃时间 */}
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <span className="text-sm text-gray-500">最后活跃时间</span>
                <span className="text-sm text-gray-800">
                  {user.lastActiveAt ? formatTime(user.lastActiveAt) : "未知"}
                </span>
              </div>

              {/* 性别 */}
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <span className="text-sm text-gray-500">性别</span>
                <span className="text-sm text-gray-800">
                  {formatGender(user.gender)}
                </span>
              </div>

              {/* 兴趣标签 */}
              <div className="py-3">
                <span className="text-sm text-gray-500">兴趣标签</span>
                {user.tags && user.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {user.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full px-2.5 py-0.5 text-[11px]"
                        style={{ backgroundColor: BRAND + "15", color: BRAND }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 mt-2">暂无标签</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="py-3 text-center">
        <p className="text-[11px] text-gray-400">yandao.vip 分享下载有礼</p>
      </div>

      <div className="page-bottom-nav-safe" aria-hidden="true" />
    </div>
  );
}
