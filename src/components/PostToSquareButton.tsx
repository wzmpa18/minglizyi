"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { addPost, filterSensitive } from "@/lib/socialStore";
import { getUserProfile } from "@/lib/auth";
import { communityActivity } from "@/lib/pointsStore";
import { FEED_TAGS, defaultTagForTool, sanitizeTags, TAG_COLORS, type FeedTag } from "@/lib/feedTags";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { usePopupBackHandler } from "@/hooks/usePopupBackHandler";

const BRAND = "#7B2FBE";

export interface PostToSquareButtonProps {
  /** 工具名，如 "八字"、"奇门遁甲" */
  tool: string;
  /** 核心结论摘要（自动填充正文模板） */
  summary: string;
  /** 自动标题，默认「我的{tool}测算结果」 */
  title?: string;
  /** 额外标签（如 感情/事业/财运） */
  extraTags?: string[];
  /** block=块级按钮（结果页底部），inline=行内小按钮 */
  variant?: "block" | "inline";
}

/**
 * 排盘结果页「发布到广场」按钮（社交冷启动核心入口）
 * 点击后弹底部面板：自动填充标题/正文模板/工具标签，可编辑可改标签，一键发布。
 */
export function PostToSquareButton({
  tool,
  summary,
  title,
  extraTags = [],
  variant = "block",
}: PostToSquareButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [published, setPublished] = useState(false);

  const autoTitle = useMemo(() => title || `我的${tool}测算结果`, [title, tool]);
  const autoContent = useMemo(
    () => `今天通过言道国学做了测算，AI 解读认为：${summary}，大家怎么看？`,
    [summary]
  );
  const defaultTags = useMemo(() => {
    const base = defaultTagForTool(tool);
    return sanitizeTags([base || undefined, ...extraTags]);
  }, [tool, extraTags]);

  return (
    <>
      {variant === "block" ? (
        <button
          onClick={() => { setPublished(false); setOpen(true); }}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold active:opacity-80"
          style={{ backgroundColor: "#f3ebfa", color: BRAND, border: `1px solid ${BRAND}` }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          发布到广场
        </button>
      ) : (
        <button
          onClick={() => { setPublished(false); setOpen(true); }}
          className="flex items-center gap-1 text-xs transition-colors"
          style={{ color: BRAND }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          发布到广场
        </button>
      )}

      {open && (
        <PublishSheet
          tool={tool}
          autoTitle={autoTitle}
          autoContent={autoContent}
          defaultTags={defaultTags}
          published={published}
          onPublished={() => setPublished(true)}
          onClose={() => setOpen(false)}
          goSquare={() => { setOpen(false); router.push("/discover"); }}
        />
      )}
    </>
  );
}

// ==================== 发布底部面板 ====================
function PublishSheet({
  tool,
  autoTitle,
  autoContent,
  defaultTags,
  published,
  onPublished,
  onClose,
  goSquare,
}: {
  tool: string;
  autoTitle: string;
  autoContent: string;
  defaultTags: FeedTag[];
  published: boolean;
  onPublished: () => void;
  onClose: () => void;
  goSquare: () => void;
}) {
  const [content, setContent] = useState(autoContent);
  const [tags, setTags] = useState<FeedTag[]>(defaultTags);
  const [submitting, setSubmitting] = useState(false);

  useBodyScrollLock(true);
  usePopupBackHandler(onClose, true);

  const toggleTag = (t: FeedTag) => {
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const handlePublish = () => {
    if (submitting) return;
    const trimmed = content.trim();
    if (trimmed.length < 5) return;
    setSubmitting(true);
    try {
      const { filtered } = filterSensitive(trimmed);
      const user = getUserProfile();
      addPost({
        id: `user_${Date.now()}`,
        authorId: user?.userId || "anonymous",
        authorName: user?.nickname || "言道用户",
        authorAvatar: user?.avatar || "",
        content: filtered,
        images: [],
        topic: "",
        likes: 0,
        comments: 0,
        shares: 0,
        liked: false,
        isAd: false,
        createdAt: new Date().toISOString(),
        tags: tags.length > 0 ? tags : defaultTagForTool(tool) ? [defaultTagForTool(tool)!] : [],
      });
      try { communityActivity("发布动态"); } catch { /* ignore */ }
      onPublished();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[95] bg-black/50" onClick={onClose} />
      <div
        className="modal-bottom-sheet fixed bottom-0 left-1/2 z-[100] w-full max-w-[420px] -translate-x-1/2 rounded-t-2xl bg-white shadow-xl"
        style={{ maxHeight: "85vh", display: "flex", flexDirection: "column" }}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <span className="text-base font-bold text-gray-800">{published ? "发布成功" : `分享${tool}结果`}</span>
          <button onClick={onClose} className="text-gray-400 active:text-gray-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {published ? (
          <div className="flex flex-col items-center px-6 py-10">
            <div
              className="mb-4 flex h-16 w-16 items-center justify-center rounded-full"
              style={{ backgroundColor: "#e8f8f0" }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1e8e5a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-800">动态已发布到广场</p>
            <p className="mt-1 text-xs text-gray-400">其他用户可以在动态广场看到你的分享</p>
            <button
              onClick={goSquare}
              className="mt-6 w-full rounded-xl py-3 text-sm font-semibold text-white active:opacity-80"
              style={{ backgroundColor: BRAND }}
            >
              去广场看看
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {/* 自动标题预览 */}
              <div className="mb-3 rounded-xl px-3 py-2.5" style={{ backgroundColor: "#f8f5fc" }}>
                <p className="text-xs text-gray-400">动态标题（自动生成）</p>
                <p className="mt-0.5 text-sm font-bold text-gray-800">#{autoTitle.replace(/^我的|测算结果$/g, "") || tool}</p>
              </div>

              {/* 正文编辑 */}
              <label className="mb-1.5 block text-xs text-gray-500">动态内容（可编辑）</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                maxLength={500}
                className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-[#7B2FBE]"
                placeholder="分享你的测算结果..."
              />
              <p className="mt-1 text-right text-[10px] text-gray-400">{content.length}/500</p>

              {/* 标签选择 */}
              <p className="mb-1.5 mt-2 text-xs text-gray-500">话题标签（自动匹配，可调整）</p>
              <div className="flex flex-wrap gap-2">
                {FEED_TAGS.map((t) => {
                  const active = tags.includes(t);
                  const color = TAG_COLORS[t];
                  return (
                    <button
                      key={t}
                      onClick={() => toggleTag(t)}
                      className="rounded-full px-3 py-1 text-xs font-medium transition-all active:scale-95"
                      style={{
                        backgroundColor: active ? color.bg : "#f5f5f5",
                        color: active ? color.fg : "#999",
                        border: active ? `1px solid ${color.fg}55` : "1px solid #eee",
                      }}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>

              <p className="mt-4 text-[10px] leading-relaxed text-gray-400">
                发布后将公开展示在动态广场，请勿包含个人隐私信息与违规内容
              </p>
            </div>

            {/* 发布按钮 */}
            <div className="modal-safe-bottom border-t border-gray-100 px-4 py-3">
              <button
                onClick={handlePublish}
                disabled={submitting || content.trim().length < 5}
                className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-opacity active:opacity-80 disabled:opacity-40"
                style={{ backgroundColor: BRAND }}
              >
                {submitting ? "发布中..." : "一键发布"}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
