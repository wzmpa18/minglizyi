/**
 * userStore.ts - 用户服务层 v18.6
 * 功能：用户目录管理、ID搜索、关注/粉丝体系、个人主页数据
 * 存储：localStorage，键名前缀 yandao_user_
 */

// ==================== 类型定义 ====================
export interface UserDirectoryEntry {
  userId: string;
  nickname: string;
  avatar: string;
  bio: string;
  gender: "male" | "female" | "unknown";
  tags: string[];
  followCount: number;
  fanCount: number;
  postCount: number;
  allowSearch: boolean;
  allowViewPosts: boolean;
  allowNearby?: boolean;
  location?: { lat: number; lng: number; city?: string };
  registeredAt: string;
  lastActiveAt: string;
}

export interface UserPost {
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
  createdAt: string;
}

// ==================== 存储键名 ====================
const KEYS = {
  DIRECTORY: "yandao_user_directory",
  FOLLOWS: "yandao_follows",
  FANS: "yandao_fans_",
  USER_POSTS: "yandao_user_posts_",
};

// ==================== 内部工具 ====================
function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function safeGet<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeSet<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full
  }
}

// ==================== 目录管理 ====================
export function getDirectory(): UserDirectoryEntry[] {
  // 从本地存储读取真实用户数据，无数据则返回空列表
  return safeGet<UserDirectoryEntry[]>(KEYS.DIRECTORY, []);
}

export function addToDirectory(entry: Partial<UserDirectoryEntry>): void {
  const dir = getDirectory();
  const existing = dir.find(u => u.userId === entry.userId);
  if (existing) { Object.assign(existing, entry); }
  else {
    dir.push({ userId: entry.userId || "", nickname: entry.nickname || "言道用户", avatar: entry.avatar || "言", bio: entry.bio || "", gender: entry.gender || "unknown", tags: entry.tags || [], followCount: entry.followCount || 0, fanCount: entry.fanCount || 0, postCount: entry.postCount || 0, allowSearch: entry.allowSearch ?? true, allowViewPosts: entry.allowViewPosts ?? true, registeredAt: entry.registeredAt || new Date().toISOString(), lastActiveAt: new Date().toISOString() });
  }
  safeSet(KEYS.DIRECTORY, dir);
}

export function searchUsers(query: string, options?: { includeSelf?: boolean; currentUserId?: string }): UserDirectoryEntry[] {
  const dir = getDirectory();
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return dir.filter(u => {
    if (!u.allowSearch) return false;
    if (!options?.includeSelf && u.userId === options?.currentUserId) return false;
    if (u.userId.toLowerCase() === q) return true;
    if (u.userId.toLowerCase().startsWith(q)) return true;
    if (u.nickname.toLowerCase().includes(q)) return true;
    return false;
  });
}

export function getUserById(userId: string): UserDirectoryEntry | null {
  const dir = getDirectory();
  return dir.find(u => u.userId === userId) || null;
}

export function updatePrivacy(userId: string, settings: { allowSearch?: boolean; allowViewPosts?: boolean }): void {
  const dir = getDirectory();
  const user = dir.find(u => u.userId === userId);
  if (user) { if (settings.allowSearch !== undefined) user.allowSearch = settings.allowSearch; if (settings.allowViewPosts !== undefined) user.allowViewPosts = settings.allowViewPosts; safeSet(KEYS.DIRECTORY, dir); }
}

// ==================== 关注/粉丝体系 ====================
export function getFollowingList(): string[] { return safeGet<string[]>(KEYS.FOLLOWS, []); }
export function getFansList(userId: string): string[] { return safeGet<string[]>(`${KEYS.FANS}${userId}`, []); }

export function toggleFollowUser(targetUserId: string): boolean {
  const follows = getFollowingList();
  const isFollowing = follows.includes(targetUserId);
  const dir = getDirectory();
  const target = dir.find(u => u.userId === targetUserId);
  if (isFollowing) { safeSet(KEYS.FOLLOWS, follows.filter(id => id !== targetUserId)); if (target && target.fanCount > 0) { target.fanCount--; safeSet(KEYS.DIRECTORY, dir); } return false; }
  else { safeSet(KEYS.FOLLOWS, [...follows, targetUserId]); if (target) { target.fanCount++; safeSet(KEYS.DIRECTORY, dir); } return true; }
}

export function isFollowing(targetUserId: string): boolean { return getFollowingList().includes(targetUserId); }

export function getFollowStats(userId: string): { following: number; fans: number } {
  const dir = getDirectory();
  const user = dir.find(u => u.userId === userId);
  const currentId = typeof window !== "undefined" ? (localStorage.getItem("yandao_user_id") || "") : "";
  return { following: userId === currentId ? getFollowingList().length : user?.followCount || 0, fans: user?.fanCount || 0 };
}

// ==================== 用户动态 ====================
export function getUserPosts(userId: string): UserPost[] {
  const userPosts = safeGet<UserPost[]>(`${KEYS.USER_POSTS}${userId}`, []);
  return [...userPosts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function addUserPost(post: Omit<UserPost, "id" | "createdAt" | "likes" | "comments" | "shares" | "liked">): void {
  const posts = safeGet<UserPost[]>(`${KEYS.USER_POSTS}${post.authorId}`, []);
  posts.unshift({ ...post, id: `up_${Date.now()}`, createdAt: new Date().toISOString(), likes: 0, comments: 0, shares: 0, liked: false });
  safeSet(`${KEYS.USER_POSTS}${post.authorId}`, posts);
  const dir = getDirectory();
  const user = dir.find(u => u.userId === post.authorId);
  if (user) { user.postCount++; safeSet(KEYS.DIRECTORY, dir); }
}

export function togglePostLike(userId: string, postId: string): boolean {
  const posts = getUserPosts(userId);
  const post = posts.find(p => p.id === postId);
  if (!post) return false;
  post.liked = !post.liked;
  post.likes += post.liked ? 1 : -1;
  safeSet(`${KEYS.USER_POSTS}${userId}`, posts);
  return post.liked;
}

// ==================== 当前用户工具 ====================
export function getCurrentUserId(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("yandao_user_id") || "";
}

export function getCurrentUserEntry(): UserDirectoryEntry | null {
  const id = getCurrentUserId();
  if (!id) return null;
  return getUserById(id);
}

export function ensureCurrentUserInDirectory(): void {
  if (typeof window === "undefined") return;
  const id = localStorage.getItem("yandao_user_id");
  if (!id) return;
  try {
    const profileRaw = localStorage.getItem("yandao_user_profile");
    if (profileRaw) {
      const profile = JSON.parse(profileRaw);
      const entry = getUserById(id);
      if (!entry) {
        addToDirectory({ userId: id, nickname: profile.nickname || "言道用户", avatar: (profile.nickname || "言").slice(0, 1), bio: profile.bio || "", gender: profile.gender || "unknown", tags: [], allowSearch: true, allowViewPosts: true });
      } else {
        entry.lastActiveAt = new Date().toISOString();
        if (profile.nickname) entry.nickname = profile.nickname;
        if (profile.bio) entry.bio = profile.bio;
        const dir = getDirectory();
        safeSet(KEYS.DIRECTORY, dir);
      }
    }
  } catch { /* ignore */ }
}

// ==================== 后端API用户查找 ====================
/**
 * 通过后端API查找用户（用于扫码添加好友、搜索ID添加等场景）
 * 先查后端数据库，成功后同步到本地目录缓存
 * @param userId 用户ID（纯数字）
 * @returns 用户信息，查找失败返回null
 */
export async function lookupUserViaApi(userId: string): Promise<UserDirectoryEntry | null> {
  if (!userId || !userId.trim()) return null;
  const id = userId.trim();

  try {
    const resp = await fetch(`https://yandaoguoxue.yandao.vip/api/user/lookup?userId=${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data.success || !data.user) return null;

    const user = data.user;
    // 构造本地目录条目
    const entry: UserDirectoryEntry = {
      userId: String(user.userId),
      nickname: user.nickname || '言道用户',
      avatar: user.avatar || (user.nickname || '言').slice(0, 1),
      bio: user.bio || '',
      gender: 'unknown',
      tags: [],
      followCount: 0,
      fanCount: 0,
      postCount: 0,
      allowSearch: true,
      allowViewPosts: true,
      registeredAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };

    // 同步到本地目录缓存
    addToDirectory(entry);

    return entry;
  } catch (err) {
    console.error('[lookupUserViaApi] 查找失败:', err);
    return null;
  }
}

/**
 * 先查后端API，失败再查本地缓存
 */
export async function findUserById(userId: string): Promise<UserDirectoryEntry | null> {
  // 先尝试后端API查找
  const apiResult = await lookupUserViaApi(userId);
  if (apiResult) return apiResult;

  // API失败时回退到本地缓存
  return getUserById(userId);
}

// ==================== 推荐用户 ====================
export function getRecommendedUsers(limit: number = 6): UserDirectoryEntry[] {
  const dir = getDirectory();
  const following = getFollowingList();
  const currentId = getCurrentUserId();
  return dir.filter(u => u.userId !== currentId && !following.includes(u.userId) && u.allowSearch).sort((a, b) => b.fanCount - a.fanCount).slice(0, limit);
}

// ==================== 附近用户 ====================

/** Haversine公式计算两点间距离(公里) */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/** 获取附近用户列表（按距离排序） */
export function getNearbyUsers(limit: number = 20): Array<UserDirectoryEntry & { distanceKm: number }> {
  const currentId = getCurrentUserId();
  const dir = getDirectory();
  const currentUser = dir.find(u => u.userId === currentId);

  // 如果当前用户没有位置信息，返回允许附近展示的用户（不计算距离）
  if (!currentUser?.location) {
    return dir
      .filter(u => u.userId !== currentId && u.allowNearby)
      .slice(0, limit)
      .map(u => ({ ...u, distanceKm: 0 }));
  }

  return dir
    .filter(u => u.userId !== currentId && u.allowNearby && u.location)
    .map(u => ({
      ...u,
      distanceKm: haversineKm(currentUser.location!.lat, currentUser.location!.lng, u.location!.lat, u.location!.lng)
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

/** 设置当前用户的位置信息 */
export function setUserLocation(lat: number, lng: number, city?: string): void {
  if (typeof window === "undefined") return;
  const id = getCurrentUserId();
  if (!id) return;
  const dir = getDirectory();
  const user = dir.find(u => u.userId === id);
  if (user) {
    user.location = { lat, lng, city };
    safeSet(KEYS.DIRECTORY, dir);
  }
}

/** 切换附近展示开关 */
export function toggleAllowNearby(): boolean {
  if (typeof window === "undefined") return false;
  const id = getCurrentUserId();
  if (!id) return false;
  const dir = getDirectory();
  const user = dir.find(u => u.userId === id);
  if (user) {
    user.allowNearby = !user.allowNearby;
    safeSet(KEYS.DIRECTORY, dir);
    return user.allowNearby;
  }
  return false;
}

/** 设置附近展示开关（指定值） */
export function setAllowNearby(value: boolean): void {
  if (typeof window === "undefined") return;
  const id = getCurrentUserId();
  if (!id) return;
  const dir = getDirectory();
  const user = dir.find(u => u.userId === id);
  if (user) {
    user.allowNearby = value;
    safeSet(KEYS.DIRECTORY, dir);
  }
}

/** 获取当前用户的附近展示状态 */
export function getAllowNearby(): boolean {
  const user = getCurrentUserEntry();
  return user?.allowNearby || false;
}
