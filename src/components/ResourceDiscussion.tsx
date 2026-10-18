"use client";

import {useAccountScope} from "@/lib/useAccountScope";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  addResourceComment,
  deleteResourceComment,
  fetchResourceComments,
  isLoggedIn,
  reportResourceComment,
  addServerBlacklist,
  fetchServerBlacklist,
  type ResourceComment,
} from "@/lib/socialApi";
import { PUBLIC_SOCIAL_ENABLED } from "@/lib/releaseFeatures";
import {countStudyCharacters,validateStudyText} from "@/lib/studyComments";
import {ConfirmDialog} from "@/components/ui/ConfirmDialog";
import {InterfaceButton} from "@/components/InterfaceControls";
import { getUserProfile } from "@/lib/auth";

interface ResourceDiscussionProps {
  resourceType: "acupoint" | "classic" | "yixue" | "academy";
  resourceId: string;
  title?: string;
  accent?: string;
}

export function ResourceDiscussion(props: ResourceDiscussionProps) {
  const owner=useAccountScope();
  if (!PUBLIC_SOCIAL_ENABLED) return null;
  return <ResourceDiscussionEnabled key={`${owner}:${props.resourceType}:${props.resourceId}`} {...props} />;
}

function ResourceDiscussionEnabled({
  resourceType,
  resourceId,
  title = "学习讨论",
  accent = "#7B2FBE",
}: ResourceDiscussionProps) {
  const [confirm,setConfirm]=useState<{message:string;run:()=>void}|null>(null);
  const [comments, setComments] = useState<ResourceComment[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [blocking, setBlocking] = useState(false);
  const loadVersion = useRef(0);
  const myId = getUserProfile()?.userId;
  let count=0;try{count=countStudyCharacters(content);}catch{count=501;}

  const load = useCallback(async () => {
    const version = ++loadVersion.current;
    setLoading(true);
    setComments([]);
    const [result, blacklist] = await Promise.all([
      fetchResourceComments(resourceType, resourceId),
      isLoggedIn() ? fetchServerBlacklist() : Promise.resolve(null),
    ]);
    if (version !== loadVersion.current) return;
    setBlockedIds(blacklist?.success ? (blacklist.blacklist || []).map(user => String(user.userId)) : []);
    if (result.success) {
      setComments(result.comments || []);
      setMessage(blacklist && !blacklist.success ? "屏蔽列表暂未读到，请稍后刷新。" : "");
    } else {
      setMessage(result.error || "讨论区暂时不可用");
    }
    setLoading(false);
  }, [resourceId, resourceType]);

  useEffect(() => { void load(); return () => { loadVersion.current++; }; }, [load]);

  const block = async (authorId: string) => {
    if (blocking) return;
    if (!isLoggedIn()) { setMessage("登录后可以屏蔽用户"); return; }
    setBlocking(true);
    const result = await addServerBlacklist(authorId);
    if (result.success) { setBlockedIds(ids => [...new Set([...ids, authorId])]); setMessage("已屏蔽，可在黑名单管理中恢复。"); }
    else setMessage(result.error || "屏蔽失败，请重试");
    setBlocking(false);
  };
  const visibleComments = comments.filter(comment => !blockedIds.includes(String(comment.authorId)));

  const submit = async () => {
    const check=validateStudyText(content);
    if(!check.ok){setMessage(check.error||"请检查文字");return;}
    const text = check.text!;
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
    const result = await reportResourceComment(commentId);
    setMessage(result.message || result.error || (result.success ? "举报已提交" : "举报失败，请稍后重试"));
  };

  return (
    <section style={{ margin: "12px", padding: "14px", borderRadius: 16, background: "#FFF", boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <strong style={{ color: "#333", fontSize: 14 }}>💬 {title}</strong>
        <span style={{ color: "#999", fontSize: 11 }}>{visibleComments.length} 条</span>
      </div>
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder="交流学习心得、典籍理解或使用体会（仅支持文字）…"
        rows={3}
        className="placeholder:text-white/70"
        style={{ width: "100%", resize: "vertical", boxSizing: "border-box", border: "1px solid rgba(255,255,255,.38)", borderRadius: 10, padding: "10px 11px", fontSize: 13, lineHeight: 1.6, outlineColor: "#FFF", background: accent, color: "#FFF", caretColor: "#FFF", WebkitTextFillColor: "#FFF" }}
      />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 8 }}>
        <span style={{ color: "#999", fontSize: 10 }}>{count}/500 · 仅限文字，审核后展示，不作为诊疗依据</span>
        <InterfaceButton type="button" onClick={() => void submit()} disabled={!content.trim() || count>500 || submitting}
          style={{ border: 0, borderRadius: 999, padding: "7px 14px", color: "#FFF", background: accent, opacity: !content.trim() || submitting ? .5 : 1, fontSize: 12, fontWeight: 700 }}>
          {submitting ? "发布中…" : "发布"}
        </InterfaceButton>
      </div>
      {message && <div style={{ marginTop: 8, color: "#C62828", fontSize: 11 }}>{message}</div>}
      <div style={{ marginTop: 12, borderTop: "1px solid #F1F1F1" }}>
        {loading ? (
          <div style={{ padding: "14px 0", color: "#999", fontSize: 12 }}>正在加载讨论…</div>
        ) : visibleComments.length === 0 ? (
          <div style={{ padding: "14px 0", color: "#999", fontSize: 12 }}>还没有讨论，欢迎分享学习心得。</div>
        ) : visibleComments.map((comment) => (
          <article key={comment.id} style={{ padding: "11px 0", borderBottom: "1px solid #F5F5F5" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 5 }}>
              <strong style={{ color: accent, fontSize: 12 }}>{comment.authorName || "国学爱好者"}</strong>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <time style={{ color: "#AAA", fontSize: 10 }}>{comment.createdAt}</time>
                <InterfaceButton type="button" onClick={() => setConfirm({message:"举报这条评论？",run:()=>{void report(comment.id);}})} style={{ border: 0, padding: 0, color: "#AAA", background: "transparent", fontSize: 10 }}>举报</InterfaceButton>
                {String(comment.authorId) === String(myId) && <InterfaceButton type="button" onClick={()=>setConfirm({message:"删除自己的这条评论？",run:()=>{void deleteResourceComment(comment.id).then(result=>{if(result.success)void load();else setMessage(result.error||"删除失败");});}})}>删除</InterfaceButton>}
                {String(comment.authorId) !== String(myId) && <InterfaceButton type="button" disabled={blocking} onClick={() => setConfirm({message:"屏蔽此用户并解除已有好友关系？",run:()=>{void block(String(comment.authorId));}})} style={{ border: 0, padding: 0, color: "#777", background: "transparent", fontSize: 10 }}>屏蔽用户</InterfaceButton>}
              </span>
            </div>
            <div style={{ color: "#444", fontSize: 13, lineHeight: 1.65, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{comment.content}</div>
          </article>
        ))}
      </div>
      <ConfirmDialog open={!!confirm} title="请确认" message={confirm?.message} onCancel={()=>setConfirm(null)} onConfirm={()=>{const run=confirm?.run;setConfirm(null);run?.();}}/>
    </section>
  );
}
