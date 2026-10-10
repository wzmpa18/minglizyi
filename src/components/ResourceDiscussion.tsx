"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addResourceComment,
  fetchResourceComments,
  isLoggedIn,
  reportResourceComment,
  type ResourceComment,
} from "@/lib/socialApi";
import { PUBLIC_SOCIAL_ENABLED } from "@/lib/releaseFeatures";

interface ResourceDiscussionProps {
  resourceType: "acupoint" | "classic" | "yixue" | "academy";
  resourceId: string;
  title?: string;
  accent?: string;
}

export function ResourceDiscussion(props: ResourceDiscussionProps) {
  if (!PUBLIC_SOCIAL_ENABLED) return null;
  return <ResourceDiscussionEnabled {...props} />;
}

function ResourceDiscussionEnabled({
  resourceType,
  resourceId,
  title = "学习讨论",
  accent = "#7B2FBE",
}: ResourceDiscussionProps) {
  const [comments, setComments] = useState<ResourceComment[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchResourceComments(resourceType, resourceId);
    if (result.success) {
      setComments(result.comments || []);
      setMessage("");
    } else {
      setMessage(result.error || "讨论区暂时不可用");
    }
    setLoading(false);
  }, [resourceId, resourceType]);

  useEffect(() => { void load(); }, [load]);

  const submit = async () => {
    const text = content.trim();
    if (!text || submitting) return;
    if (!isLoggedIn()) {
      setMessage("登录后可以参与讨论");
      return;
    }
    setSubmitting(true);
    const result = await addResourceComment(resourceType, resourceId, text);
    if (result.success && result.comment) {
      setComments((old) => [result.comment!, ...old]);
      setContent("");
      setMessage("");
    } else if (result.success && result.pendingReview) {
      setContent("");
      setMessage(result.message || "评论已提交，审核通过后展示");
    } else {
      setMessage(result.error || "发布失败，请稍后重试");
    }
    setSubmitting(false);
  };

  const report = async (commentId: string) => {
    if (!isLoggedIn()) {
      setMessage("登录后可以举报不当内容");
      return;
    }
    if (!window.confirm("确认举报这条评论吗？")) return;
    const result = await reportResourceComment(commentId);
    setMessage(result.message || result.error || (result.success ? "举报已提交" : "举报失败，请稍后重试"));
  };

  return (
    <section style={{ margin: "12px", padding: "14px", borderRadius: 16, background: "#FFF", boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <strong style={{ color: "#333", fontSize: 14 }}>💬 {title}</strong>
        <span style={{ color: "#999", fontSize: 11 }}>{comments.length} 条</span>
      </div>
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value.slice(0, 500))}
        placeholder="交流学习心得、典籍理解或使用体会（仅支持文字）…"
        rows={3}
        className="placeholder:text-white/70"
        style={{ width: "100%", resize: "vertical", boxSizing: "border-box", border: "1px solid rgba(255,255,255,.38)", borderRadius: 10, padding: "10px 11px", fontSize: 13, lineHeight: 1.6, outlineColor: "#FFF", background: accent, color: "#FFF", caretColor: "#FFF", WebkitTextFillColor: "#FFF" }}
      />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 8 }}>
        <span style={{ color: "#999", fontSize: 10 }}>仅限文字交流；内容经审核后展示，不作为诊疗依据</span>
        <button type="button" onClick={() => void submit()} disabled={!content.trim() || submitting}
          style={{ border: 0, borderRadius: 999, padding: "7px 14px", color: "#FFF", background: accent, opacity: !content.trim() || submitting ? .5 : 1, fontSize: 12, fontWeight: 700 }}>
          {submitting ? "发布中…" : "发布"}
        </button>
      </div>
      {message && <div style={{ marginTop: 8, color: "#C62828", fontSize: 11 }}>{message}</div>}
      <div style={{ marginTop: 12, borderTop: "1px solid #F1F1F1" }}>
        {loading ? (
          <div style={{ padding: "14px 0", color: "#999", fontSize: 12 }}>正在加载讨论…</div>
        ) : comments.length === 0 ? (
          <div style={{ padding: "14px 0", color: "#999", fontSize: 12 }}>还没有讨论，欢迎分享学习心得。</div>
        ) : comments.map((comment) => (
          <article key={comment.id} style={{ padding: "11px 0", borderBottom: "1px solid #F5F5F5" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 5 }}>
              <strong style={{ color: accent, fontSize: 12 }}>{comment.authorName || "国学爱好者"}</strong>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <time style={{ color: "#AAA", fontSize: 10 }}>{comment.createdAt}</time>
                <button type="button" onClick={() => void report(comment.id)} style={{ border: 0, padding: 0, color: "#AAA", background: "transparent", fontSize: 10 }}>举报</button>
              </span>
            </div>
            <div style={{ color: "#444", fontSize: 13, lineHeight: 1.65, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{comment.content}</div>
          </article>
        ))}
      </div>
    </section>
  );
}
