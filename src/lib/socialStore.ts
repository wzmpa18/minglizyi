"use client";

// ============================================================================
// 社交数据存储层 - v18.4
// 设计原则：localStorage 持久化，键名统一 yandao_ 前缀，历史数据兼容迁移
// ============================================================================

// --- 类型定义 ---
export interface Friend {
  id: string;
  name: string;
  avatar: string;
  online: boolean;
  lastSeen: string;
  note: string; // 好友备注
  tags: string[];
  addedAt: string;
}

export interface FriendRequest {
  id: string;
  fromId: string;
  fromName: string;
  fromAvatar: string;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  type: 'text' | 'image' | 'system';
  timestamp: string;
  /** v25.0.38 P0-2：发送状态（本地乐观消息专用；服务端确认后 id 统一为 srv_ 前缀） */
  status?: 'sending' | 'sent' | 'failed';
}

export interface GroupInfo {
  id: string;
  name: string;
  avatar: string;
  ownerId: string;
  ownerName: string;
  members: GroupMember[];
  announcement: string;
  maxMembers: number;
  level: 'small' | 'medium' | 'large' | 'vip';
  createdAt: string;
  tags: string[];
}

export interface GroupMember {
  userId: string;
  name: string;
  avatar: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  images: string[];
  topic: string;
  likes: number;
  comments: number;
  shares: number;
  liked: boolean;
  isAd: boolean;
  createdAt: string;
  /** P1 收敛：动态一级标签（八字/奇门/六爻/紫微/风水/中医/感情/事业/财运/生活/国学杂谈） */
  tags?: string[];
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
}

// --- 存储键名 ---
const KEYS = {
  FRIENDS: 'yandao_friends_list',
  FRIEND_REQUESTS: 'yandao_friend_requests',
  GROUPS: 'yandao_groups_list',
  GROUP_MESSAGES: 'yandao_group_messages_',
  POSTS: 'yandao_discover_posts',
  LIKED_POSTS: 'yandao_discover_liked',
  COMMENTS: 'yandao_discover_comments',
  FOLLOWS: 'yandao_follows',
  CHAT_PREFIX: 'yandao_friends_chat_',
  BLACKLIST: 'yandao_blacklist',
};

// 兼容旧键名
const OLD_KEYS: Record<string, string> = {
  [KEYS.POSTS]: 'discover_posts',
  [KEYS.LIKED_POSTS]: 'discover_liked',
};

// --- 通用存储工具 ---
function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    // 兼容旧键名
    if (!raw && OLD_KEYS[key]) {
      const oldRaw = localStorage.getItem(OLD_KEYS[key]);
      if (oldRaw) {
        localStorage.setItem(key, oldRaw);
        localStorage.removeItem(OLD_KEYS[key]);
        return JSON.parse(oldRaw);
      }
    }
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function safeSet<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// --- 好友管理 ---
export function getFriends(): Friend[] {
  return safeGet<Friend[]>(KEYS.FRIENDS, []);
}

export function saveFriends(friends: Friend[]): void {
  safeSet(KEYS.FRIENDS, friends);
}

export function addFriend(friend: Friend): void {
  const friends = getFriends();
  if (!friends.find(f => f.id === friend.id)) {
    friends.push(friend);
    saveFriends(friends);
  }
}

export function removeFriend(friendId: string): void {
  const friends = getFriends().filter(f => f.id !== friendId);
  saveFriends(friends);
}

export function updateFriendNote(friendId: string, note: string): void {
  const friends = getFriends().map(f => f.id === friendId ? { ...f, note } : f);
  saveFriends(friends);
}

// --- 好友请求 ---
export function getFriendRequests(): FriendRequest[] {
  return safeGet<FriendRequest[]>(KEYS.FRIEND_REQUESTS, []);
}

export function addFriendRequest(req: FriendRequest): void {
  const requests = getFriendRequests();
  requests.unshift(req);
  safeSet(KEYS.FRIEND_REQUESTS, requests);
}

export function updateFriendRequest(reqId: string, status: 'accepted' | 'rejected'): void {
  const requests = getFriendRequests().map(r => r.id === reqId ? { ...r, status } : r);
  safeSet(KEYS.FRIEND_REQUESTS, requests);
}

// --- 聊天消息 ---
export function getChatMessages(chatKey: string): ChatMessage[] {
  return safeGet<ChatMessage[]>(KEYS.CHAT_PREFIX + chatKey, []);
}

export function saveChatMessage(chatKey: string, msg: ChatMessage): void {
  const msgs = getChatMessages(chatKey);
  msgs.push(msg);
  safeSet(KEYS.CHAT_PREFIX + chatKey, msgs);
}

export function getUnreadCount(chatKey: string, lastReadTime: string): number {
  const msgs = getChatMessages(chatKey);
  return msgs.filter(m => m.timestamp > lastReadTime).length;
}

// v20.1: 聊天记录管理 - 单条删除
export function deleteChatMessage(chatKey: string, messageId: string): void {
  const msgs = getChatMessages(chatKey).filter(m => m.id !== messageId);
  safeSet(KEYS.CHAT_PREFIX + chatKey, msgs);
}

// v20.1: 聊天记录管理 - 批量删除
export function batchDeleteChatMessages(chatKey: string, messageIds: string[]): void {
  const idSet = new Set(messageIds);
  const msgs = getChatMessages(chatKey).filter(m => !idSet.has(m.id));
  safeSet(KEYS.CHAT_PREFIX + chatKey, msgs);
}

// v20.1: 聊天记录管理 - 清空全部
export function clearAllChatMessages(chatKey: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(KEYS.CHAT_PREFIX + chatKey);
  } catch {}
}

// v20.1: 聊天记录管理 - 获取所有聊天会话的存储占用（字节）
export function getChatStorageSize(): number {
  if (typeof window === 'undefined') return 0;
  let total = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(KEYS.CHAT_PREFIX)) {
        const val = localStorage.getItem(key) || '';
        total += val.length + key.length;
      }
      if (key && key.startsWith(KEYS.GROUP_MESSAGES)) {
        const val = localStorage.getItem(key) || '';
        total += val.length + key.length;
      }
    }
  } catch {}
  return total;
}

// v20.1: 聊天记录管理 - 清空所有聊天记录（释放本地存储空间）
export function clearAllChats(): number {
  if (typeof window === 'undefined') return 0;
  let cleared = 0;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith(KEYS.CHAT_PREFIX) || key.startsWith(KEYS.GROUP_MESSAGES))) {
        keysToRemove.push(key);
        cleared++;
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch {}
  return cleared;
}

// --- 群聊管理 ---
export function getGroups(): GroupInfo[] {
  return safeGet<GroupInfo[]>(KEYS.GROUPS, []);
}

// ==================== v25.0.47 P1-A：legacy group_* 假群治理 ====================
// LEGACY_GROUP_MIGRATION_RULE
// 历史版本建群时在本地生成 "group_<13位时间戳>_<随机串>" 业务ID，服务端从不承认这些ID，
// 用户点入只能看到"暂无消息"空壳页。迁移判定（三种情况）：
//  A. 能明确映射到服务器真实groupId → 本地记录不含任何服务器ID字段，不存在可明确映射的数据；
//     按名称/群主匹配属于猜测，绝对禁止
//  B. 服务端根本不存在 → INVALID_LEGACY_GROUP：群列表不再展示，聊天页显示失效提示
//  C. 不能确认映射 → 与 B 同一处理：提示"该旧群记录已失效，请返回群列表。"并提供本地删除按钮
// 服务端业务groupId一律为纯数字；group_<纯数字>（无随机后缀）是会话静音key命名空间，与本规则无关。
export function isLegacyLocalGroupId(id: string): boolean {
  return /^group_\d{10,}_[0-9a-z]+$/.test(id);
}

/** 清理本地全部失效旧群记录（含其本地消息），返回被清理的群ID列表 */
export function purgeLegacyGroups(): string[] {
  if (typeof window === 'undefined') return [];
  const groups = getGroups();
  const legacy = groups.filter((g) => isLegacyLocalGroupId(g.id));
  if (legacy.length === 0) return [];
  const legacyIds = new Set(legacy.map((g) => g.id));
  saveGroups(groups.filter((g) => !legacyIds.has(g.id)));
  legacy.forEach((g) => {
    try { localStorage.removeItem(KEYS.GROUP_MESSAGES + g.id); } catch {}
  });
  return legacy.map((g) => g.id);
}

export function saveGroups(groups: GroupInfo[]): void {
  safeSet(KEYS.GROUPS, groups);
}

export function createGroup(group: GroupInfo): void {
  const groups = getGroups();
  groups.push(group);
  saveGroups(groups);
}

export function updateGroup(groupId: string, updates: Partial<GroupInfo>): void {
  const groups = getGroups().map(g => g.id === groupId ? { ...g, ...updates } : g);
  saveGroups(groups);
}

export function deleteGroup(groupId: string): void {
  const groups = getGroups().filter(g => g.id !== groupId);
  saveGroups(groups);
}

export function getGroupMessages(groupId: string): ChatMessage[] {
  return safeGet<ChatMessage[]>(KEYS.GROUP_MESSAGES + groupId, []);
}

export function saveGroupMessage(groupId: string, msg: ChatMessage): void {
  const msgs = getGroupMessages(groupId);
  // v25.0.47：按ID幂等入库（轮询回包与发送回执可能先后落同一条服务端消息）
  if (msgs.some((m) => m.id === msg.id)) return;
  msgs.push(msg);
  safeSet(KEYS.GROUP_MESSAGES + groupId, msgs);
}

// v20.1: 群聊记录管理 - 单条删除
export function deleteGroupMessage(groupId: string, messageId: string): void {
  const msgs = getGroupMessages(groupId).filter(m => m.id !== messageId);
  safeSet(KEYS.GROUP_MESSAGES + groupId, msgs);
}

// v20.1: 群聊记录管理 - 批量删除
export function batchDeleteGroupMessages(groupId: string, messageIds: string[]): void {
  const idSet = new Set(messageIds);
  const msgs = getGroupMessages(groupId).filter(m => !idSet.has(m.id));
  safeSet(KEYS.GROUP_MESSAGES + groupId, msgs);
}

// v20.1: 群聊记录管理 - 清空全部
export function clearAllGroupMessages(groupId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(KEYS.GROUP_MESSAGES + groupId);
  } catch {}
}

// --- 社区动态 ---
export function getPosts(): Post[] {
  return safeGet<Post[]>(KEYS.POSTS, []);
}

export function savePosts(posts: Post[]): void {
  safeSet(KEYS.POSTS, posts);
}

export function addPost(post: Post): void {
  const posts = getPosts();
  posts.unshift(post);
  savePosts(posts);
}

export function getLikedPosts(): Set<string> {
  return new Set(safeGet<string[]>(KEYS.LIKED_POSTS, []));
}

export function toggleLikePost(postId: string): boolean {
  const liked = getLikedPosts();
  const posts = getPosts().map(p => {
    if (p.id === postId) {
      const wasLiked = liked.has(postId);
      if (wasLiked) {
        liked.delete(postId);
        return { ...p, likes: p.likes - 1, liked: false };
      } else {
        liked.add(postId);
        return { ...p, likes: p.likes + 1, liked: true };
      }
    }
    return p;
  });
  safeSet(KEYS.LIKED_POSTS, [...liked]);
  savePosts(posts);
  return liked.has(postId);
}

// --- 评论 ---
export function getComments(postId: string): Comment[] {
  return safeGet<Comment[]>(KEYS.COMMENTS + '_' + postId, []);
}

export function addComment(comment: Comment): void {
  const comments = getComments(comment.postId);
  comments.push(comment);
  safeSet(KEYS.COMMENTS + '_' + comment.postId, comments);
  // 更新帖子评论数
  const posts = getPosts().map(p => p.id === comment.postId ? { ...p, comments: p.comments + 1 } : p);
  savePosts(posts);
}

// --- 关注 ---
export function getFollows(): string[] {
  return safeGet<string[]>(KEYS.FOLLOWS, []);
}

export function toggleFollow(userId: string): boolean {
  const follows = getFollows();
  const idx = follows.indexOf(userId);
  if (idx >= 0) {
    follows.splice(idx, 1);
    safeSet(KEYS.FOLLOWS, follows);
    return false;
  } else {
    follows.push(userId);
    safeSet(KEYS.FOLLOWS, follows);
    return true;
  }
}

// --- 敏感词过滤 ---
const SENSITIVE_WORDS = [
  '违法', '赌博', '毒品', '枪支', '色情', '裸聊', '约炮',
  '诈骗', '传销', '洗钱', '高利贷', '假币', '炸药',
  '政治敏感', '邪教', '恐怖', '分裂',
];

export function filterSensitive(text: string): { filtered: string; hasSensitive: boolean } {
  let filtered = text;
  let hasSensitive = false;
  for (const word of SENSITIVE_WORDS) {
    if (filtered.includes(word)) {
      filtered = filtered.replaceAll(word, '***');
      hasSensitive = true;
    }
  }
  return { filtered, hasSensitive };
}

// --- 黑名单管理 ---
export function getBlacklist(): string[] {
  return safeGet<string[]>(KEYS.BLACKLIST, []);
}

export function addToBlacklist(userId: string): void {
  const list = getBlacklist();
  if (!list.includes(userId)) {
    list.push(userId);
    safeSet(KEYS.BLACKLIST, list);
  }
}

export function removeFromBlacklist(userId: string): void {
  const list = getBlacklist().filter(id => id !== userId);
  safeSet(KEYS.BLACKLIST, list);
}

export function isBlocked(userId: string): boolean {
  return getBlacklist().includes(userId);
}
