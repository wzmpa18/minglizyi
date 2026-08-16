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
    id: 'n001',
    title: '国家中医药管理局发布2026年中医药振兴发展重大工程实施方案',
    summary: '方案明确提出加强中医药传承创新、推进中医药文化弘扬传播、提升中医药服务能力等重点任务，为中医药高质量发展提供政策指引。',
    source: '国家中医药管理局',
    sourceUrl: 'https://www.satcm.gov.cn',
    publishedAt: '2026-08-06T09:00:00Z',
    category: 'zhongyi',
  },
  {
    id: 'n002',
    title: '中华中医药学会2026年学术年会在京召开',
    summary: '年会以"传承精华、守正创新"为主题，围绕经方临床应用、中医药现代化研究等议题展开深入研讨，千余名中医药专家参会。',
    source: '中华中医药学会',
    sourceUrl: 'https://www.cacm.org.cn',
    publishedAt: '2026-08-05T14:00:00Z',
    category: 'zhongyi',
  },
  {
    id: 'n003',
    title: '中国中医科学院发布中医药防治慢性病最新研究成果',
    summary: '研究团队基于传统经方与现代药理学结合，在心血管疾病、糖尿病等慢性病中医药防治领域取得重要进展，相关论文已发表。',
    source: '中国中医科学院',
    sourceUrl: 'https://www.catcm.ac.cn',
    publishedAt: '2026-08-04T08:30:00Z',
    category: 'zhongyi',
  },
  {
    id: 'n004',
    title: '中国社会科学院国学研究中心举办易学文化研讨会',
    summary: '研讨会围绕《周易》哲学思想与现代社会的关联、易学文化的传承与创新等主题展开学术交流，多位知名学者发表演讲。',
    source: '中国社会科学院',
    sourceUrl: 'https://www.cass.cn',
    publishedAt: '2026-08-05T10:00:00Z',
    category: 'yixue',
  },
  {
    id: 'n005',
    title: '世界中医药学会联合会推动中医药国际标准化建设',
    summary: '世界中联持续推动中医药术语、学术交流技术、教育标准等国际标准化工作，目前已有多项国际标准获ISO立项或发布。',
    source: '世界中医药学会联合会',
    sourceUrl: 'https://www.wfcms.org',
    publishedAt: '2026-08-03T16:00:00Z',
    category: 'zhongyi',
  },
  {
    id: 'n006',
    title: '北京大学国学研究院发布传统文化教育年度报告',
    summary: '报告系统梳理了过去一年全国高校国学教育开展情况，建议加强经典研读、推动传统文化课程体系建设。',
    source: '北京大学国学研究院',
    sourceUrl: 'https://guoxue.pku.edu.cn',
    publishedAt: '2026-08-03T09:30:00Z',
    category: 'yixue',
  },
  {
    id: 'n007',
    title: '中国中医药报：基层中医药服务能力提升工程取得显著成效',
    summary: '全国基层中医药服务能力提升工程实施以来，社区卫生服务中心、乡镇卫生院中医馆覆盖率显著提高，群众中医药服务可及性大幅增强。',
    source: '中国中医药报',
    sourceUrl: 'https://www.cntcm.com.cn',
    publishedAt: '2026-08-02T11:00:00Z',
    category: 'zhongyi',
  },
  {
    id: 'n008',
    title: '国学网：全国易学文化普及讲座惠及百万群众',
    summary: '由文化部门指导的易学文化普及系列讲座在全国各地开展，以通俗易懂的方式讲解《周易》基础知识和传统文化内涵。',
    source: '国学网',
    sourceUrl: 'https://www.guoxue.com',
    publishedAt: '2026-08-02T08:00:00Z',
    category: 'yixue',
  },
  {
    id: 'n009',
    title: '《黄帝内经》养生智慧与现代健康管理学术论坛举行',
    summary: '论坛聚焦《黄帝内经》"治未病"理念的现代化应用，探讨传统中医养生理论与现代预防医学的融合路径。',
    source: '中华中医药学会',
    sourceUrl: 'https://www.cacm.org.cn',
    publishedAt: '2026-08-01T14:30:00Z',
    category: 'zhongyi',
  },
  {
    id: 'n010',
    title: '中华传统文化论坛探讨易学在现代管理中的应用',
    summary: '论坛邀请管理学与易学交叉领域专家，探讨《周易》智慧在现代企业管理、决策科学中的应用价值与实践案例。',
    source: '北京大学国学研究院',
    sourceUrl: 'https://guoxue.pku.edu.cn',
    publishedAt: '2026-08-01T10:00:00Z',
    category: 'yixue',
  },
  {
    id: 'n011',
    title: '国家中医药管理局推进中医药文化进校园活动',
    summary: '活动旨在青少年群体中普及中医药文化知识，增强文化自信，目前已在多省市试点开展中医药文化课程。',
    source: '国家中医药管理局',
    sourceUrl: 'https://www.satcm.gov.cn',
    publishedAt: '2026-07-31T15:00:00Z',
    category: 'zhongyi',
  },
  {
    id: 'n012',
    title: '传统文化遗产保护：古籍数字化工程取得阶段性成果',
    summary: '国家图书馆古籍数字化项目已完成数千部珍贵古籍的高清扫描和文字识别，公众可通过数字平台免费阅读研究。',
    source: '中国社会科学院',
    sourceUrl: 'https://www.cass.cn',
    publishedAt: '2026-07-31T09:00:00Z',
    category: 'yixue',
  },
  {
    id: 'n013',
    title: '中药材质量标准体系建设取得新进展',
    summary: '新版《中国药典》进一步规范中药材质量标准，加强道地药材保护，推进中药材种植、采收、加工全链条标准化。',
    source: '中国中医科学院',
    sourceUrl: 'https://www.catcm.ac.cn',
    publishedAt: '2026-07-30T13:00:00Z',
    category: 'zhongyi',
  },
  {
    id: 'n014',
    title: '青少年经典诵读活动覆盖全国三百个城市',
    summary: '由文化部指导的青少年经典诵读工程持续推广，《论语》《道德经》《周易》等经典成为诵读重点，参与人数创新高。',
    source: '国学网',
    sourceUrl: 'https://www.guoxue.com',
    publishedAt: '2026-07-30T08:30:00Z',
    category: 'yixue',
  },
  {
    id: 'n015',
    title: '中国中医药报：针灸国际化发展进入新阶段',
    summary: '针灸已在多个国家获得合法地位，世界卫生组织持续更新针灸国际标准，中医药"走出去"战略取得实质性进展。',
    source: '中国中医药报',
    sourceUrl: 'https://www.cntcm.com.cn',
    publishedAt: '2026-07-29T14:00:00Z',
    category: 'zhongyi',
  },
  {
    id: 'n016',
    title: '世界中医药学会联合会发布中医药教育国际标准',
    summary: '标准对中医药国际教育的课程设置、师资要求、考核标准等作出规范，为全球中医药教育机构提供统一参考。',
    source: '世界中医药学会联合会',
    sourceUrl: 'https://www.wfcms.org',
    publishedAt: '2026-07-28T10:00:00Z',
    category: 'zhongyi',
  },
  // 广告过滤测试数据（含营销关键词，将被自动过滤不展示）
  {
    id: 'ad_test_01',
    title: '限时优惠！中医养生课程推广抢购',
    summary: '热销中医课程限时折扣，加微信咨询领取优惠券...',
    source: '某营销号',
    sourceUrl: 'https://example.com',
    publishedAt: '2026-08-05T10:00:00Z',
    category: 'zhongyi',
  },
  {
    id: 'ad_test_02',
    title: '代购正宗中药材，带货直销',
    summary: '代理各类中药材，招商加盟，购买链接见详情...',
    source: '商业推广号',
    sourceUrl: 'https://example.com',
    publishedAt: '2026-08-04T12:00:00Z',
    category: 'zhongyi',
  },
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
const BILIBILI_PATTERNS = [
  /bilibili\.com\/video\/(BV[\w]+)/i,
  /b23\.tv\/([\w]+)/i,
  /bilibili\.com\/video\/av(\d+)/i,
];

const IXIGUA_PATTERNS = [
  /ixigua\.com\/(\d+)/i,
  /toutiao\.com\/.*?video\/(\d+)/i,
];

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

  // 检查是否为http(s)链接
  if (!/^https?:\/\//i.test(trimmed)) {
    return { valid: false, error: '链接需以 http:// 或 https:// 开头' };
  }

  // 检查非法关键词
  for (const kw of VIDEO_BLOCK_KEYWORDS) {
    if (trimmed.toLowerCase().includes(kw.toLowerCase())) {
      return { valid: false, error: '该链接包含违规内容，已被系统拦截' };
    }
  }

  // 匹配B站
  for (const pattern of BILIBILI_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      const vid = match[1];
      // b23.tv 短链接无法直接解析出BV号，提示用户使用完整链接
      if (trimmed.includes('b23.tv')) {
        return {
          valid: false,
          error: 'b23.tv短链无法直接嵌入，请使用B站完整视频链接（含BV号）',
        };
      }
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

  // 匹配西瓜视频
  for (const pattern of IXIGUA_PATTERNS) {
    const match = trimmed.match(pattern);
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
