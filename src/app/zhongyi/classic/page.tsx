'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getAllBooks, getBookById, getChapterById, searchClassics } from '@/algorithm-core/modules/tcm/classics';
import type { ClassicBook, ClassicChapter } from '@/algorithm-core/modules/tcm/classics';
import { addRecentItem } from '@/lib/tcmRecent';
import { useToolBack } from "@/lib/useToolBack";

// 阅读设置类型
interface ReaderSettings {
  fontSize: number; // 14-24
  nightMode: boolean;
  eyeCareMode: boolean;
}

// 书签类型
interface Bookmark {
  bookId: string;
  chapterId: string;
  bookName: string;
  chapterTitle: string;
  time: string;
}

const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: 18,
  nightMode: false,
  eyeCareMode: false,
};

function ClassicPageInner() {
  const searchParams = useSearchParams();
  const bookId = searchParams.get('book');
  const chapterId = searchParams.get('chapter');
  const searchQuery = searchParams.get('q');

  if (searchQuery) return <ClassicSearchPage keyword={searchQuery} />;
  if (bookId && chapterId) return <ReaderPage bookId={bookId} chapterId={chapterId} />;
  if (bookId) return <BookTocPage bookId={bookId} />;
  return <ClassicHomePage />;
}

export default function ClassicPage() {
  useToolBack({ pageKey: "zhongyi_classic", eventName: "zhongyi-back", globalFlag: "__zhongyiBackHandled" });
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA' }}>
        <div style={{ textAlign: 'center', color: '#7B1FA2' }}>加载中...</div>
      </div>
    }>
      <ClassicPageInner />
    </Suspense>
  );
}

// ==================== 典籍首页 ====================
function ClassicHomePage() {
  const books = getAllBooks();
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    // 迁移兼容：先尝试新键名，没有则读取旧键名并迁移
    let saved = localStorage.getItem('yandao_zhongyi_classic_bookmarks');
    if (!saved) {
      saved = localStorage.getItem('tcm_classic_bookmarks');
      if (saved) {
        localStorage.setItem('yandao_zhongyi_classic_bookmarks', saved);
        localStorage.removeItem('tcm_classic_bookmarks');
      }
    }
    if (saved) setBookmarks(JSON.parse(saved));
  }, []);

  const handleSearch = () => {
    if (searchText.trim()) {
      router.push(`/zhongyi/classic?q=${encodeURIComponent(searchText.trim())}`);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAFAFA', paddingBottom: '80px' }}>
      <div style={{ backgroundColor: '#7B1FA2', padding: '16px', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          
          <h1 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>中医典籍</h1>
          
          <div style={{ flex: 1 }} />
          <button onClick={() => setShowBookmarks(!showBookmarks)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }}>⭐</button>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="全文检索典籍..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            style={{
              flex: 1, padding: '10px 14px', borderRadius: '8px', border: 'none',
              fontSize: '14px', outline: 'none',
            }}
          />
          <button onClick={handleSearch} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#9C27B0', color: '#fff', fontSize: '14px', cursor: 'pointer' }}>搜索</button>
        </div>
      </div>

      {showBookmarks && bookmarks.length > 0 && (
        <div style={{ margin: '12px', padding: '12px', backgroundColor: '#FFF8E1', borderRadius: '8px' }}>
          <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}>我的书签 ({bookmarks.length})</div>
          {bookmarks.slice(0, 5).map((b, i) => (
            <button
              key={i}
              onClick={() => router.push(`/zhongyi/classic?book=${b.bookId}&chapter=${b.chapterId}`)}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px',
                marginBottom: '4px', borderRadius: '6px', border: '1px solid #FFE082',
                backgroundColor: '#fff', cursor: 'pointer', fontSize: '13px',
              }}
            >
              {b.bookName} - {b.chapterTitle}
            </button>
          ))}
        </div>
      )}

      <div style={{ padding: '16px' }}>
        <div style={{ fontSize: '13px', color: '#999', marginBottom: '12px' }}>共 {books.length} 部经典</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {books.map((book) => (
            <Link
              key={book.id}
              href={`/zhongyi/classic?book=${book.id}`}
              style={{
                display: 'block', padding: '16px', backgroundColor: '#fff', borderRadius: '12px',
                textDecoration: 'none', color: 'inherit', boxShadow: '0 1px 4px rgba(123,31,162,0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  width: '48px', height: '64px', backgroundColor: '#7B1FA2', borderRadius: '6px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                  fontSize: '20px', fontWeight: 600, flexShrink: 0,
                }}>
                  {book.name.charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#333', marginBottom: '4px' }}>{book.name}</div>
                  <div style={{ fontSize: '12px', color: '#9C27B0', marginBottom: '6px' }}>{book.dynasty} · {book.author}</div>
                  <div style={{ fontSize: '13px', color: '#666', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{book.description}</div>
                  <div style={{ fontSize: '11px', color: '#999', marginTop: '6px' }}>共 {book.chapters.length} 篇</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <ComplianceFooter text="原文仅供中医学习研究，不构成诊疗指导" />
    </div>
  );
}

// ==================== 目录页 ====================
function BookTocPage({ bookId }: { bookId: string }) {
  const router = useRouter();
  const book = getBookById(bookId);
  const [searchText, setSearchText] = useState('');

  if (!book) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <p>典籍不存在</p>
        <Link href="/zhongyi/classic" style={{ color: '#7B1FA2' }}>返回典籍首页</Link>
      </div>
    );
  }

  const filteredChapters = searchText
    ? book.chapters.filter(c => c.title.includes(searchText) || c.content.includes(searchText))
    : book.chapters;

  const openChapter = (chapterId: string) => {
    addRecentItem({ type: 'classic', id: `${bookId}/${chapterId}`, name: `${book.name}·${book.chapters.find(c => c.id === chapterId)?.title || ''}`, category: '中医典籍' });
    router.push(`/zhongyi/classic?book=${bookId}&chapter=${chapterId}`);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAFAFA', paddingBottom: '80px' }}>
      <div style={{ backgroundColor: '#7B1FA2', padding: '16px', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          
          <h1 style={{ fontSize: '18px', fontWeight: 600, margin: 0, flex: 1 }}>{book.name}</h1>
        </div>
        <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '12px' }}>{book.dynasty} · {book.author} · 共{book.chapters.length}篇</div>
        <input
          type="text"
          placeholder="搜索本篇章节..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: '8px', border: 'none',
            fontSize: '14px', outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', backgroundColor: '#E0E0E0', borderRadius: '8px', overflow: 'hidden' }}>
          {filteredChapters.map((chapter, idx) => (
            <button
              key={chapter.id}
              onClick={() => openChapter(chapter.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                backgroundColor: '#fff', border: 'none', textAlign: 'left', cursor: 'pointer',
              }}
            >
              <span style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#F3E5F5', color: '#7B1FA2', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{idx + 1}</span>
              <span style={{ flex: 1, fontSize: '15px', color: '#333' }}>{chapter.title}</span>
              <span style={{ color: '#ccc', fontSize: '16px' }}>›</span>
            </button>
          ))}
        </div>
        {filteredChapters.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999', fontSize: '14px' }}>未找到匹配章节</div>
        )}
      </div>

      <ComplianceFooter text="原文仅供中医学习研究，不构成诊疗指导" />
    </div>
  );
}

// ==================== 阅读页 ====================
function ReaderPage({ bookId, chapterId }: { bookId: string; chapterId: string }) {
  const router = useRouter();
  const book = getBookById(bookId);
  const chapter = getChapterById(bookId, chapterId);
  const [showToc, setShowToc] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isBookmarked, setIsBookmarked] = useState(false);

  // 加载设置和书签 (含旧键名迁移兼容)
  useEffect(() => {
    let savedSettings = localStorage.getItem('yandao_zhongyi_classic_settings');
    if (!savedSettings) {
      savedSettings = localStorage.getItem('tcm_classic_settings');
      if (savedSettings) {
        localStorage.setItem('yandao_zhongyi_classic_settings', savedSettings);
        localStorage.removeItem('tcm_classic_settings');
      }
    }
    if (savedSettings) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
    let savedBookmarks = localStorage.getItem('yandao_zhongyi_classic_bookmarks');
    if (!savedBookmarks) {
      savedBookmarks = localStorage.getItem('tcm_classic_bookmarks');
      if (savedBookmarks) {
        localStorage.setItem('yandao_zhongyi_classic_bookmarks', savedBookmarks);
        localStorage.removeItem('tcm_classic_bookmarks');
      }
    }
    if (savedBookmarks) {
      const bms: Bookmark[] = JSON.parse(savedBookmarks);
      setBookmarks(bms);
      setIsBookmarked(bms.some(b => b.bookId === bookId && b.chapterId === chapterId));
    }
    // 添加最近浏览
    if (book && chapter) {
      addRecentItem({ type: 'classic', id: `${bookId}/${chapterId}`, name: `${book.name}·${chapter.title}`, category: '中医典籍' });
    }
  }, [bookId, chapterId]);

  // 保存设置
  const saveSettings = (newSettings: ReaderSettings) => {
    setSettings(newSettings);
    localStorage.setItem('yandao_zhongyi_classic_settings', JSON.stringify(newSettings));
  };

  // 切换书签
  const toggleBookmark = () => {
    if (!book || !chapter) return;
    let newBookmarks: Bookmark[];
    if (isBookmarked) {
      newBookmarks = bookmarks.filter(b => !(b.bookId === bookId && b.chapterId === chapterId));
    } else {
      newBookmarks = [...bookmarks, {
        bookId, chapterId, bookName: book.name, chapterTitle: chapter.title,
        time: new Date().toISOString(),
      }];
    }
    setBookmarks(newBookmarks);
    setIsBookmarked(!isBookmarked);
    localStorage.setItem('yandao_zhongyi_classic_bookmarks', JSON.stringify(newBookmarks));
  };

  // 章节导航
  const chapterIndex = useMemo(() => {
    if (!book) return -1;
    return book.chapters.findIndex(c => c.id === chapterId);
  }, [book, chapterId]);

  const prevChapter = book && chapterIndex > 0 ? book.chapters[chapterIndex - 1] : null;
  const nextChapter = book && chapterIndex < book.chapters.length - 1 ? book.chapters[chapterIndex + 1] : null;

  const goToChapter = (cid: string) => {
    router.push(`/zhongyi/classic?book=${bookId}&chapter=${cid}`);
    setShowToc(false);
  };

  if (!book || !chapter) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <p>章节不存在</p>
        <button onClick={() => router.back()} style={{ color: '#7B1FA2', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>返回目录</button>
      </div>
    );
  }

  // 主题样式
  const getThemeStyle = () => {
    if (settings.nightMode) {
      return { bg: '#1a1a1a', text: '#e0e0e0', meta: '#888', cardBg: '#2a2a2a', border: '#333' };
    }
    if (settings.eyeCareMode) {
      return { bg: '#C7EDCC', text: '#2c3e2c', meta: '#5a7a5a', cardBg: '#d8f0d8', border: '#a8d8a8' };
    }
    return { bg: '#FAF5F0', text: '#2c1810', meta: '#8B7355', cardBg: '#fff', border: '#e8ddd0' };
  };

  const theme = getThemeStyle();

  // 分段处理正文
  const paragraphs = chapter.content.split('\n').filter(p => p.trim());

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: theme.bg, paddingBottom: '120px',
      transition: 'background-color 0.3s',
    }}>
      {/* 顶部导航 */}
      <div style={{
        position: 'static', height: '56px',
        backgroundColor: settings.nightMode ? '#2a2a2a' : '#7B1FA2',
        display: 'flex', alignItems: 'center', padding: '0 12px', zIndex: 100,
        gap: '4px',
      }}>
        
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#fff', fontSize: '15px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chapter.title}</div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>{book.name}</div>
        </div>
        <button onClick={() => setShowToc(!showToc)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer', padding: '8px' }}>☰</button>
        <button onClick={toggleBookmark} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '8px' }}>
          {isBookmarked ? '⭐' : '☆'}
        </button>
        <button onClick={() => setShowSettings(!showSettings)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer', padding: '8px' }}>Aa</button>
      </div>

      {/* 目录侧栏 */}
      {showToc && (
        <>
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 150 }} onClick={() => setShowToc(false)} />
          <div style={{
            position: 'fixed', top: 0, left: 0, bottom: 0, width: '280px', backgroundColor: theme.cardBg,
            zIndex: 200, overflowY: 'auto', paddingTop: '56px',
          }}>
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.border}` }}>
              <div style={{ fontWeight: 600, fontSize: '15px', color: theme.text }}>{book.name} · 目录</div>
              <div style={{ fontSize: '12px', color: theme.meta }}>共 {book.chapters.length} 篇</div>
            </div>
            {book.chapters.map((c, idx) => (
              <button
                key={c.id}
                onClick={() => goToChapter(c.id)}
                style={{
                  display: 'block', width: '100%', padding: '12px 16px', textAlign: 'left',
                  border: 'none', borderBottom: `1px solid ${theme.border}`, cursor: 'pointer',
                  backgroundColor: c.id === chapterId ? (settings.nightMode ? '#3a3a3a' : '#F3E5F5') : 'transparent',
                  color: c.id === chapterId ? '#7B1FA2' : theme.text, fontSize: '14px',
                }}
              >
                {idx + 1}. {c.title}
              </button>
            ))}
          </div>
        </>
      )}

      {/* 设置面板 */}
      {showSettings && (
        <>
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 150 }} onClick={() => setShowSettings(false)} />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: theme.cardBg,
            borderTopLeftRadius: '16px', borderTopRightRadius: '16px', padding: '20px', zIndex: 200,
          }}>
            <div style={{ fontSize: '16px', fontWeight: 600, color: theme.text, marginBottom: '16px' }}>阅读设置</div>
            
            {/* 字体大小 */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', color: theme.meta, marginBottom: '8px' }}>字体大小: {settings.fontSize}px</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '14px', color: theme.text }}>A</span>
                <input
                  type="range" min="14" max="24" value={settings.fontSize}
                  onChange={(e) => saveSettings({ ...settings, fontSize: parseInt(e.target.value) })}
                  style={{ flex: 1, accentColor: '#7B1FA2' }}
                />
                <span style={{ fontSize: '20px', color: theme.text }}>A</span>
              </div>
            </div>

            {/* 主题 */}
            <div>
              <div style={{ fontSize: '14px', color: theme.meta, marginBottom: '8px' }}>阅读主题</div>
              <div style={{ display: 'flex', gap: '12px' }}>
                {[
                  { key: 'default', bg: '#FAF5F0', label: '白底', nightMode: false, eyeCare: false },
                  { key: 'eye', bg: '#C7EDCC', label: '护眼', nightMode: false, eyeCare: true },
                  { key: 'night', bg: '#1a1a1a', label: '夜间', nightMode: true, eyeCare: false },
                ].map(t => (
                  <button
                    key={t.key}
                    onClick={() => saveSettings({ ...settings, nightMode: t.nightMode, eyeCareMode: t.eyeCare })}
                    style={{
                      flex: 1, padding: '12px', borderRadius: '8px', border: `2px solid ${settings.nightMode === t.nightMode && settings.eyeCareMode === t.eyeCare ? '#7B1FA2' : theme.border}`,
                      backgroundColor: t.bg, cursor: 'pointer', fontSize: '13px',
                      color: t.key === 'night' ? '#e0e0e0' : '#333',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* 正文 */}
      <div style={{ padding: '20px 18px' }}>
        <h1 style={{ fontSize: `${settings.fontSize + 6}px`, fontWeight: 600, color: theme.text, textAlign: 'center', marginBottom: '8px', lineHeight: 1.4 }}>{chapter.title}</h1>
        <div style={{ textAlign: 'center', fontSize: '13px', color: theme.meta, marginBottom: '24px', paddingBottom: '16px', borderBottom: `1px solid ${theme.border}` }}>
          {book.name} · {book.dynasty} · {book.author}
        </div>
        <div style={{ fontSize: `${settings.fontSize}px`, lineHeight: 2, color: theme.text }}>
          {paragraphs.map((p, i) => (
            <p key={i} style={{ marginBottom: '1em', textIndent: '2em', textAlign: 'justify' }}>{p.trim()}</p>
          ))}
        </div>
      </div>

      {/* 章节导航 */}
      <div style={{
        position: 'static', left: 0, right: 0, padding: '12px 16px',
        backgroundColor: theme.cardBg, borderTop: `1px solid ${theme.border}`,
        display: 'flex', gap: '12px',
      }}>
        {prevChapter ? (
          <button onClick={() => goToChapter(prevChapter.id)} style={{
            flex: 1, padding: '12px', borderRadius: '8px', border: `1px solid ${theme.border}`,
            backgroundColor: 'transparent', color: '#7B1FA2', fontSize: '14px', cursor: 'pointer',
          }}>上一章</button>
        ) : <div style={{ flex: 1 }} />}
        <button onClick={() => setShowToc(true)} style={{
          padding: '12px 20px', borderRadius: '8px', border: 'none',
          backgroundColor: '#7B1FA2', color: '#fff', fontSize: '14px', cursor: 'pointer',
        }}>目录</button>
        {nextChapter ? (
          <button onClick={() => goToChapter(nextChapter.id)} style={{
            flex: 1, padding: '12px', borderRadius: '8px', border: 'none',
            backgroundColor: '#7B1FA2', color: '#fff', fontSize: '14px', cursor: 'pointer',
          }}>下一章</button>
        ) : <div style={{ flex: 1 }} />}
      </div>

      <ComplianceFooter text="原文仅供中医学习研究，不构成诊疗指导" darkMode={settings.nightMode} fixed />
    </div>
  );
}

// ==================== 搜索结果页 ====================
function ClassicSearchPage({ keyword }: { keyword: string }) {
  const router = useRouter();
  const results = useMemo(() => searchClassics(keyword), [keyword]);
  const [searchText, setSearchText] = useState(keyword);

  const handleSearch = () => {
    if (searchText.trim()) {
      router.push(`/zhongyi/classic?q=${encodeURIComponent(searchText.trim())}`);
    }
  };

  const highlightText = (text: string) => {
    if (!keyword) return text;
    const parts = text.split(new RegExp(`(${keyword})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === keyword.toLowerCase()
        ? <mark key={i} style={{ backgroundColor: '#FFEB3B', padding: '0 2px', borderRadius: '2px' }}>{part}</mark>
        : part
    );
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAFAFA', paddingBottom: '80px' }}>
      <div style={{ backgroundColor: '#7B1FA2', padding: '16px', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          
          <h1 style={{ fontSize: '18px', fontWeight: 600, margin: 0, flex: 1 }}>全文检索</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="搜索典籍原文..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            style={{
              flex: 1, padding: '10px 14px', borderRadius: '8px', border: 'none',
              fontSize: '14px', outline: 'none',
            }}
          />
          <button onClick={handleSearch} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#9C27B0', color: '#fff', fontSize: '14px', cursor: 'pointer' }}>搜索</button>
        </div>
      </div>

      <div style={{ padding: '12px 16px' }}>
        <div style={{ fontSize: '13px', color: '#999', marginBottom: '12px' }}>
          关键词「{keyword}」共找到 {results.length} 处
        </div>
        {results.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📖</div>
            <div>未找到相关内容</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => router.push(`/zhongyi/classic?book=${r.bookId}&chapter=${r.chapterId}`)}
                style={{
                  display: 'block', width: '100%', padding: '14px', backgroundColor: '#fff',
                  borderRadius: '8px', border: 'none', textAlign: 'left', cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#7B1FA2', marginBottom: '4px' }}>
                  {r.bookName} · {r.chapterTitle}
                </div>
                <div style={{ fontSize: '13px', color: '#666', lineHeight: 1.6 }}>
                  ...{highlightText(r.snippet)}...
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <ComplianceFooter text="原文仅供中医学习研究，不构成诊疗指导" />
    </div>
  );
}

// ==================== 合规底部提示 ====================
function ComplianceFooter({ text, darkMode, fixed }: { text: string; darkMode?: boolean; fixed?: boolean }) {
  const bgColor = darkMode ? '#B71C1C' : '#FFEBEE';
  const textColor = darkMode ? '#fff' : '#C62828';
  const borderColor = darkMode ? '#7f0000' : '#FFCDD2';

  return (
    <div style={{
      ...(fixed ? {} : {}),
      padding: '10px 16px', backgroundColor: bgColor, borderTop: `2px solid ${borderColor}`,
      textAlign: 'center', zIndex: 50,
    }}>
      <div style={{ fontSize: '12px', color: textColor, lineHeight: 1.5, fontWeight: 500 }}>
        ⚠️ {text}
      </div>
    </div>
  );
}
