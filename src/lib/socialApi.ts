"use client";

// ============================================================================
// 社交体系后端 API 客户端 - v25.0.19
// 动态广场/评论/点赞/关注/好友/私聊/群聊/通知 的真实多人互通通道
// 后端：/api/social/*（socialApiRoutes.js，SQLite social.db）
// ============================================================================

import { getUserToken } from "./auth";

const API_BASE = typeof window !== "undefined" ? window.location.origin : "";

function tokenHeader(): Record<string, string> {
  const token = getUserToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...tokenHeader(), ...(init?.headers || {}) },
  });
  return res.json();
}

export function isLoggedIn(): boolean {
  return !!getUserToken();
}

// ==================== 动态 ====================

export interface SocialPost {
  id: string; postId: string; authorId: string; authorName: string; authorAvatar: string;
  content: string; images: string[]; tags: string[]; toolType: string;
  circle: string; circleLabel: string;
  likeCount: number; commentCount: number; liked: boolean; createdAt: string;
}

// P6-I-PLUS 规则5：8 个固定圈层（永久冻结，与学习模块分类一一对应）
export const SOCIAL_CIRCLES: Array<{ key: string; label: string; track: string }> = [
  { key: "TCM", label: "中医", track: "zhongyi" },
  { key: "ZWDS", label: "紫微", track: "yixue" },
  { key: "Bazi", label: "八字", track: "yixue" },
  { key: "LiuRen", label: "六壬", track: "yixue" },
  { key: "QiMen", label: "奇门", track: "yixue" },
  { key: "FengShui", label: "风水", track: "yixue" },
  { key: "GuoXue", label: "国学", track: "guoxue" },
  { key: "Life", label: "生活", track: "" },
];

export async function fetchPosts(opts?: { tag?: string; circle?: string; cursor?: number; limit?: number }) {
  const q = new URLSearchParams();
  if (opts?.tag) q.set("tag", opts.tag);
  if (opts?.circle) q.set("circle", opts.circle);
  if (opts?.cursor) q.set("cursor", String(opts.cursor));
  if (opts?.limit) q.set("limit", String(opts.limit));
  return api<{ success: boolean; posts?: SocialPost[]; nextCursor?: number; error?: string }>(`/api/social/posts?${q.toString()}`);
}

export async function fetchMyPosts() {
  return api<{ success: boolean; posts?: SocialPost[] }>(`/api/social/posts/mine`, { method: "GET" });
}

export async function createPost(data: { content: string; images?: string[]; tags?: string[]; toolType?: string; circle?: string }) {
  return api<{ success: boolean; post?: SocialPost; error?: string }>(`/api/social/posts`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deletePost(postId: string) {
  return api<{ success: boolean; error?: string }>(`/api/social/posts/${postId}`, { method: "DELETE" });
}

export async function toggleLike(postId: string) {
  return api<{ success: boolean; liked?: boolean; likeCount?: number; error?: string }>(`/api/social/posts/${postId}/like`, { method: "POST" });
}

export interface SocialComment {
  id: string; postId: string; authorId: string; authorName: string; content: string; createdAt: string;
}

export async function fetchComments(postId: string) {
  return api<{ success: boolean; comments?: SocialComment[] }>(`/api/social/posts/${postId}/comments`);
}

export async function addComment(postId: string, content: string) {
  return api<{ success: boolean; comment?: SocialComment; error?: string }>(`/api/social/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

// ==================== 关注 ====================

export async function toggleFollow(userId: string) {
  return api<{ success: boolean; following?: boolean }>(`/api/social/follow/${userId}`, { method: "POST" });
}

export async function fetchFollowStatus(userId: string) {
  return api<{ success: boolean; following: boolean }>(`/api/social/follow/status/${userId}`);
}

// ==================== 好友 ====================

export async function sendFriendRequest(toId: string, message?: string) {
  return api<{ success: boolean; autoAccepted?: boolean; message?: string; error?: string }>(`/api/social/friends/request`, {
    method: "POST",
    body: JSON.stringify({ toId, message }),
  });
}

export async function fetchFriendRequests() {
  return api<{ success: boolean; requests?: Array<{ id: string; fromId: string; fromName: string; message: string; createdAt: string }> }>(`/api/social/friends/requests`);
}

export async function respondFriendRequest(requestId: string, action: "accept" | "reject") {
  return api<{ success: boolean; error?: string }>(`/api/social/friends/requests/${requestId}/${action}`, { method: "POST" });
}

export async function fetchFriends() {
  return api<{ success: boolean; friends?: Array<{ userId: string; nickname: string; avatar: string; memberLevel: string; friendSince: string }> }>(`/api/social/friends/list`);
}

export async function removeFriend(userId: string) {
  return api<{ success: boolean }>(`/api/social/friends/${userId}`, { method: "DELETE" });
}

// ==================== 私聊 ====================

export interface ChatMessage {
  id: string; senderId: string; senderName: string; content: string; type: string; createdAt: string;
}

export async function fetchPrivateMessages(peerId: string, afterId = 0) {
  return api<{ success: boolean; messages?: ChatMessage[] }>(`/api/social/messages/private/${peerId}?afterId=${afterId}`);
}

export async function sendPrivateMessage(peerId: string, content: string) {
  return api<{ success: boolean; message?: ChatMessage; error?: string }>(`/api/social/messages/private/${peerId}`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

// ==================== 群聊 ====================

export interface GroupVo {
  id: string; groupId: string; name: string; ownerId: string; ownerName: string;
  announcement: string; memberIds: string[]; createdAt: string;
}

export async function fetchGroups() {
  return api<{ success: boolean; groups?: GroupVo[] }>(`/api/social/groups`);
}

export async function createGroup(name: string) {
  return api<{ success: boolean; group?: GroupVo; error?: string }>(`/api/social/groups`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function joinGroup(groupId: string) {
  return api<{ success: boolean; group?: GroupVo; error?: string }>(`/api/social/groups/${groupId}/join`, { method: "POST" });
}

export async function fetchGroupMessages(groupId: string, afterId = 0) {
  return api<{ success: boolean; messages?: ChatMessage[]; group?: GroupVo; error?: string }>(`/api/social/groups/${groupId}/messages?afterId=${afterId}`);
}

export async function sendGroupMessage(groupId: string, content: string) {
  return api<{ success: boolean; message?: ChatMessage; error?: string }>(`/api/social/groups/${groupId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

// ==================== 通知 ====================

export interface NotificationVo {
  id: string; type: string; actorId: string; actorName: string; content: string;
  link: string; read: boolean; createdAt: string;
}

export async function fetchNotifications() {
  return api<{ success: boolean; unread?: number; notifications?: NotificationVo[] }>(`/api/social/notifications`);
}

export async function markNotificationsRead() {
  return api<{ success: boolean }>(`/api/social/notifications/read-all`, { method: "POST" });
}

// ==================== 用户公开信息 ====================

export async function fetchUserProfile(userId: string) {
  return api<{ success: boolean; user?: { userId: string; nickname: string; avatar: string; bio: string; memberLevel: string; postCount: number; followerCount: number; followingCount: number } }>(`/api/social/users/${userId}/profile`);
}
