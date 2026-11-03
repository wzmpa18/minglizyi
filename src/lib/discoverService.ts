"use client";

// ============================================================================
// 发现页服务层 - v18.5
// 站内动态质量排序 + 行业资讯聚合 + 本地缓存
// 分层原则：页面层只调用本模块接口，不写业务逻辑
// ============================================================================

import { getPosts, type Post } from './socialStore';

// --- 类型定义 ---
export interface QualityPost extends Post {
  qualityScore: number;
}

export type NewsCategory = 'zhongyi' | 'yixue';

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  sourceUrl: string;
  publishedAt: string;
  category: NewsCategory;
}

export interface QualityPostResult {
  posts: QualityPost[];
  hasMore: boolean;
}

export interface NewsResult {
  news: NewsItem[];
  hasMore: boolean;
}

// --- 违规/水帖关键词 ---
const SPAM_KEYWORDS = [
  '加微信', '加V', '微信号', '加群', '扫码加',
  '免费领', '限时抢', '秒杀', '优惠券', '折扣',
  '代购', '带货', '微商', '刷单', '兼职赚钱',
  '投资理财', '稳赚不赔', '日入过万', '零风险',
  '色情', '裸聊', '约炮', '赌博', '彩票',
];

// --- 资讯广告过滤关键词 ---
const NEWS_AD_KEYWORDS = [
  '推广', '广告', '热销', '加微信', '带货',
  '限时优惠', '抢购', '下单', '购买链接',
  '代购', '代理', '招商', '加盟', '砍价',
];

// --- 专业内容关键词（质量加分项）---
const QUALITY_KEYWORDS = [
  '排盘', '八字', '紫微', '六爻', '梅花易数', '奇门',
  '六壬', '太乙', '玄空', '择日', '黄历', '历法',
  '六经辨证', '伤寒论', '金匮要略', '方剂', '中药', '针灸',
  '推拿', '经络', '穴位', '气血', '阴阳', '五行',
  '学习心得', '经验分享', '笔记', '科普', '解析', '详解',
  '命理', '风水', '堪舆', '易理', '卦象', '爻辞',
  '黄帝内经', '本草', '辨证', '干支', '养生',
];

// ============================================================================
// 站内动态 - 质量排序
// 排序权重：点赞数*3 + 评论数*2 + 专业内容加分 - 系统帖降权
// ============================================================================

export function getQualityPosts(
  page: number = 1,
  pageSize: number = 20,
  tag?: string
): QualityPostResult {
  let posts = getPosts();

  // 0. P1 收敛：按一级标签筛选（帖子无 tags 的旧数据在"全部"标签下仍可见）
  if (tag) {
    posts = posts.filter(p => Array.isArray(p.tags) && p.tags.includes(tag));
  }

  // 1. 过滤广告帖
  posts = posts.filter(p => !p.isAd);

  // 2. 过滤违规/营销关键词
  posts = posts.filter(p => {
    return !SPAM_KEYWORDS.some(kw =>
      p.content.includes(kw) || p.authorName.includes(kw)
    );
  });

  // 3. 过滤水帖（非系统帖内容少于5字）
  posts = posts.filter(p => {
    if (p.authorId === 'system') return true;
    return p.content.trim().length >= 5;
  });

  // 4. 计算质量分数
  const scored: QualityPost[] = posts.map(p => {
    let score = p.likes * 3 + p.comments * 2;
    QUALITY_KEYWORDS.forEach(kw => {
      if (p.content.includes(kw)) score += 5;
    });
    if (p.authorId === 'system') score = Math.floor(score * 0.8);
    return { ...p, qualityScore: score };
  });

  // 5. 按质量分数降序，同分按时间降序
  scored.sort((a, b) => {
    if (b.qualityScore !== a.qualityScore) {
      return b.qualityScore - a.qualityScore;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // 6. 分页
  const start = (page - 1) * pageSize;
  const pagePosts = scored.slice(start, start + pageSize);

  return {
    posts: pagePosts,
    hasMore: start + pageSize < scored.length,
  };
}

// ============================================================================
// 行业资讯 - 聚合与过滤
// 仅聚合公开可访问资讯，严格广告过滤，不展示全文
// ============================================================================

const NEWS_DATA: NewsItem[] = [
    {
        "id": "n20261030-zhongyi",
        "title": "国家中医药管理局、国家卫生健康委联合印发《关于推进基层中医适宜技术推广应用的通知》",
        "summary": "通知提出健全基层中医适宜技术推广网络、加强培训和质量管理，推动适宜技术在基层医疗卫生机构规范应用。",
        "source": "淄博市卫生健康委员会",
        "sourceUrl": "https://ws.zibo.gov.cn/art/2026/10/30/art_812_3028917.html",
        "publishedAt": "2026-10-30T00:00:00+08:00",
        "category": "zhongyi"
    },
    {
        "id": "n20261026-yixue",
        "title": "2026年度山东省古籍保护工作会议在济南召开",
        "summary": "会议总结山东古籍保护工作，并讨论馆藏协作、典籍研究阐释与传播推广。",
        "source": "中国古籍保护网",
        "sourceUrl": "https://www.nlc.cn/pcab/zx/xw/20261026_2654954.shtml",
        "publishedAt": "2026-10-26T00:00:00+08:00",
        "category": "yixue"
    },
    {
        "id": "n20261010-zhongyi",
        "title": "2026世界传统医药大会新闻发布会在京举行",
        "summary": "发布会介绍大会主题、论坛安排，以及人工智能与传统医药相关议题。",
        "source": "北京市中医药管理局",
        "sourceUrl": "https://zyj.beijing.gov.cn/zyyxw/202610/t20261010_4895735.html",
        "publishedAt": "2026-10-10T00:00:00+08:00",
        "category": "zhongyi"
    },
    {
        "id": "n20261003-yixue",
        "title": "北京大学举办第四届中国传统文化体验周系列活动",
        "summary": "北京大学勺园、中关新园举办传统文化体验活动，邀请中外学生参与手作与文化交流。",
        "source": "北京大学新闻网",
        "sourceUrl": "https://news.pku.edu.cn/info/7921/3306471.htm",
        "publishedAt": "2026-10-03T00:00:00+08:00",
        "category": "yixue"
    }
];

export function getIndustryNews(
  page: number = 1,
  pageSize: number = 20,
  category?: NewsCategory | 'all'
): NewsResult {
  let items = [...NEWS_DATA];

  // 0. 分类过滤（中医/易学）
  if (category && category !== 'all') {
    items = items.filter(item => item.category === category);
  }

  // 1. 广告关键词过滤（标题+摘要+来源）
  items = items.filter(item => {
    const text = item.title + item.summary + item.source;
    return !NEWS_AD_KEYWORDS.some(kw => text.includes(kw));
  });

  // 2. 按发布时间降序
  items.sort((a, b) => {
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });

  // 3. 分页
  const start = (page - 1) * pageSize;
  const pageNews = items.slice(start, start + pageSize);

  return {
    news: pageNews,
    hasMore: start + pageSize < items.length,
  };
}

// ============================================================================
// 本地缓存
// ============================================================================

const CACHE_KEY = 'yandao_discover_cache';
const NEWS_CACHE_KEY = 'yandao_news_cache';
const NEWS_CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24小时

/** 缓存首页10条站内动态，提升二次打开速度 */
export function setCachedPosts(posts: QualityPost[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data: posts.slice(0, 10),
      timestamp: Date.now(),
    }));
  } catch {}
}

/** 获取缓存的站内动态 */
export function getCachedPosts(): QualityPost[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.data || null;
  } catch {
    return null;
  }
}

/** 缓存行业资讯（24小时过期） */
export function setCachedNews(items: NewsItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify({
      data: items,
      timestamp: Date.now(),
    }));
  } catch {}
}

/** 获取缓存的行业资讯（超过24小时返回null） */
export function getCachedNews(): NewsItem[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(NEWS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > NEWS_CACHE_EXPIRY) {
      localStorage.removeItem(NEWS_CACHE_KEY);
      return null;
    }
    return parsed.data || null;
  } catch {
    return null;
  }
}

// ============================================================================
// 学习视频外链聚合 - v18.7
// 用户提交B站/西瓜视频公开学习视频链接，系统解析后在应用内嵌入播放
// 视频始终保留在原平台，本应用不存储视频内容，仅做链接聚合
// ============================================================================

export type VideoPlatform = 'bilibili' | 'ixigua';

export interface VideoComment {
  id: string;
  videoId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
}

export interface VideoItem {
  id: string;
  url: string;            // 用户提交的原始链接
  platform: VideoPlatform;
  videoId: string;        // 从链接解析出的视频ID
  embedUrl: string;       // 嵌入播放器地址
  title: string;          // 用户填写的标题
  description: string;    // 用户填写的简介
  author: string;         // 提交者昵称
  authorId: string;       // 提交者ID
  authorAvatar: string;   // 提交者头像
  sourceLabel: string;    // 来源标注，如「来源：B站」
  likes: number;
  favorites: number;
  comments: number;
  liked: boolean;
  favorited: boolean;
  createdAt: string;
  reported?: boolean;     // 是否被举报侵权
}

// --- 视频存储键名 ---
const VIDEO_KEYS = {
  VIDEOS: 'yandao_discover_videos',
  LIKED: 'yandao_video_liked',
  FAVORITED: 'yandao_video_favorited',
  COMMENTS: 'yandao_video_comments_',
};

// --- 视频 illegal/无效关键词过滤 ---
const VIDEO_BLOCK_KEYWORDS = [
  '色情', '裸聊', '约炮', '赌博', '彩票', '博彩',
  '诈骗', '传销', '洗钱', '高利贷',
  '枪支', '弹药', '炸药', '毒品',
  '邪教', '恐怖', '分裂', '政治敏感',
  '代购', '带货', '微商', '刷单', '兼职赚钱',
  '加微信', '加V', '微信号', '加群', '扫码加',
  '投资理财', '稳赚不赔', '日入过万', '零风险',
];

// --- 平台域名白名单 ---
const BILIBILI_HOSTS = new Set(['bilibili.com', 'www.bilibili.com', 'm.bilibili.com']);
const IXIGUA_HOSTS = new Set(['ixigua.com', 'www.ixigua.com', 'm.ixigua.com']);
const TOUTIAO_HOSTS = new Set(['toutiao.com', 'www.toutiao.com', 'm.toutiao.com']);

export interface VideoParseResult {
  valid: boolean;
  platform?: VideoPlatform;
  videoId?: string;
  embedUrl?: string;
  sourceLabel?: string;
  error?: string;
}

/**
 * 解析视频链接，提取平台和视频ID，生成嵌入地址
 * 仅支持B站和西瓜视频公开链接
 */
export function parseVideoLink(url: string): VideoParseResult {
  const trimmed = url.trim();
  if (!trimmed) {
    return { valid: false, error: '请输入视频链接' };
  }

  let parsed: URL;
  try { parsed = new URL(trimmed); }
  catch { return { valid: false, error: '请输入有效的视频网址' }; }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { valid: false, error: '链接需以 http:// 或 https:// 开头' };
  }
  if (parsed.username || parsed.password || parsed.port || /[\u0000-\u0020\u007f\\]/.test(trimmed)) {
    return { valid: false, error: '请使用不含账号、特殊端口或空白的视频公开链接' };
  }

  // 检查非法关键词
  for (const kw of VIDEO_BLOCK_KEYWORDS) {
    if (trimmed.toLowerCase().includes(kw.toLowerCase())) {
      return { valid: false, error: '该链接包含违规内容，已被系统拦截' };
    }
  }

  if (parsed.hostname === 'b23.tv') {
    return { valid: false, error: 'b23.tv短链无法直接嵌入，请使用B站完整视频链接（含BV号）' };
  }
  // Validate the actual host and pathname; text in a query is not a platform URL.
  if (BILIBILI_HOSTS.has(parsed.hostname)) {
    const match = parsed.pathname.match(/^\/video\/(BV[A-Za-z0-9]+|av\d+)\/?$/i);
    if (match) {
      const vid = match[1];
      // av号转aid
      const isAv = /^av/i.test(vid);
      const embedUrl = isAv
        ? `https://player.bilibili.com/player.html?aid=${vid.replace(/^av/i, '')}`
        : `https://player.bilibili.com/player.html?bvid=${vid}`;
      return {
        valid: true,
        platform: 'bilibili',
        videoId: vid,
        embedUrl,
        sourceLabel: 'B站（哔哩哔哩）',
      };
    }
  }

  if (IXIGUA_HOSTS.has(parsed.hostname) || TOUTIAO_HOSTS.has(parsed.hostname)) {
    const match = IXIGUA_HOSTS.has(parsed.hostname)
      ? parsed.pathname.match(/^\/(\d+)\/?$/)
      : parsed.pathname.match(/^\/(?:[^/]+\/)*video\/(\d+)\/?$/);
    if (match) {
      const vid = match[1];
      const embedUrl = `https://www.ixigua.com/iframe/${vid}`;
      return {
        valid: true,
        platform: 'ixigua',
        videoId: vid,
        embedUrl,
        sourceLabel: '西瓜视频',
      };
    }
  }

  return { valid: false, error: '暂仅支持B站(bilibili.com)和西瓜视频(ixigua.com)的公开链接' };
}

/** 检查标题/简介是否含违规内容 */
export function checkVideoContent(title: string, description: string): { valid: boolean; error?: string } {
  const text = title + description;
  for (const kw of VIDEO_BLOCK_KEYWORDS) {
    if (text.includes(kw)) {
      return { valid: false, error: `标题或简介包含违规关键词「${kw}」，请修改后提交` };
    }
  }
  if (title.trim().length < 2) {
    return { valid: false, error: '标题至少需要2个字符' };
  }
  return { valid: true };
}

// --- 通用存储工具 ---
function videoSafeGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function videoSafeSet<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

/** 获取所有视频列表（按提交时间降序，过滤已举报的） */
export function getVideos(): VideoItem[] {
  const videos = videoSafeGet<VideoItem[]>(VIDEO_KEYS.VIDEOS, []);
  return videos.filter(v => !v.reported).sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/** 添加视频 */
export function addVideo(video: VideoItem): void {
  const videos = videoSafeGet<VideoItem[]>(VIDEO_KEYS.VIDEOS, []);
  videos.unshift(video);
  videoSafeSet(VIDEO_KEYS.VIDEOS, videos);
}

/** 获取已点赞视频ID集合 */
export function getLikedVideos(): Set<string> {
  return new Set(videoSafeGet<string[]>(VIDEO_KEYS.LIKED, []));
}

/** 切换视频点赞 */
export function toggleVideoLike(videoId: string): boolean {
  const liked = getLikedVideos();
  const videos = videoSafeGet<VideoItem[]>(VIDEO_KEYS.VIDEOS, []);
  const video = videos.find(v => v.id === videoId);
  if (!video) return false;
  const nowLiked = liked.has(videoId);
  if (nowLiked) {
    liked.delete(videoId);
    video.likes = Math.max(0, video.likes - 1);
    video.liked = false;
  } else {
    liked.add(videoId);
    video.likes += 1;
    video.liked = true;
  }
  videoSafeSet(VIDEO_KEYS.LIKED, [...liked]);
  videoSafeSet(VIDEO_KEYS.VIDEOS, videos);
  return liked.has(videoId);
}

/** 获取已收藏视频ID集合 */
export function getFavoritedVideos(): Set<string> {
  return new Set(videoSafeGet<string[]>(VIDEO_KEYS.FAVORITED, []));
}

/** 切换视频收藏 */
export function toggleVideoFavorite(videoId: string): boolean {
  const favorited = getFavoritedVideos();
  const videos = videoSafeGet<VideoItem[]>(VIDEO_KEYS.VIDEOS, []);
  const video = videos.find(v => v.id === videoId);
  if (!video) return false;
  const nowFav = favorited.has(videoId);
  if (nowFav) {
    favorited.delete(videoId);
    video.favorites = Math.max(0, video.favorites - 1);
    video.favorited = false;
  } else {
    favorited.add(videoId);
    video.favorites += 1;
    video.favorited = true;
  }
  videoSafeSet(VIDEO_KEYS.FAVORITED, [...favorited]);
  videoSafeSet(VIDEO_KEYS.VIDEOS, videos);
  return favorited.has(videoId);
}

/** 获取视频评论列表 */
export function getVideoComments(videoId: string): VideoComment[] {
  return videoSafeGet<VideoComment[]>(VIDEO_KEYS.COMMENTS + videoId, []);
}

/** 添加视频评论 */
export function addVideoComment(comment: VideoComment): void {
  const comments = getVideoComments(comment.videoId);
  comments.push(comment);
  videoSafeSet(VIDEO_KEYS.COMMENTS + comment.videoId, comments);
  // 更新评论计数
  const videos = videoSafeGet<VideoItem[]>(VIDEO_KEYS.VIDEOS, []);
  const video = videos.find(v => v.id === comment.videoId);
  if (video) { video.comments += 1; videoSafeSet(VIDEO_KEYS.VIDEOS, videos); }
}

/** 举报视频侵权 */
export function reportVideo(videoId: string): void {
  const videos = videoSafeGet<VideoItem[]>(VIDEO_KEYS.VIDEOS, []);
  const video = videos.find(v => v.id === videoId);
  if (video) {
    video.reported = true;
    videoSafeSet(VIDEO_KEYS.VIDEOS, videos);
  }
}
