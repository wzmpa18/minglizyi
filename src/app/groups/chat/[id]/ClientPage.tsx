"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { BrandHeader } from "@/components/shared";
import { useToolBack } from "@/lib/useToolBack";
import {
  getGroups,
  getGroupMessages,
  saveGroupMessage,
  deleteGroupMessage,
  isLegacyLocalGroupId,
  purgeLegacyGroups,
  type GroupInfo,
  type ChatMessage,
} from "@/lib/socialStore";
import { getCurrentUserId } from "@/lib/auth";
import {
  sendGroupMessage,
  fetchGroupMessages,
  fetchGroupDetail,
  reportMessage,
  type GroupMemberVo,
} from "@/lib/socialApi";

import { PageLoginGuard } from "@/components/PageLoginGuard";
const BRAND = "#7B2FBE";

export default function GroupChatPage({ routeId }: { routeId?: string }) {
  const params = useParams();
  const router = useRouter();
  const groupId = routeId || (params.id as string);

  const { showResult, savedParams, saveParams } = useToolBack({
    pageKey: "group_chat_" + groupId,
  });

  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const chatListRef = useRef<HTMLDivElement>(null);

  // v25.0.47 P1-A：legacy group_* 假群不再进入空壳聊天页，显示失效提示
  const [invalidLegacy, setInvalidLegacy] = useState(false);
  // v25.0.47 P1-A：服务端明确返回404（群已解散/已被移出）时提示，网络异常不误报
  const [serverMissing, setServerMissing] = useState(false);
  // v25.0.47：服务端明确返回403（非成员/已被移出）——禁止可输入但永远发送失败的空壳页
  const [notMember, setNotMember] = useState(false);

  // v25.0.41：群角色/禁言/成员（@功能与禁言拦截）
  const [myRole, setMyRole] = useState<"owner" | "admin" | "member">("member");
  const [muteAll, setMuteAll] = useState(false);
  const [myMuteRemain, setMyMuteRemain] = useState(0);
  const [members, setMembers] = useState<GroupMemberVo[]>([]);
  const [atPicker, setAtPicker] = useState(false);
  const [failIds, setFailIds] = useState<Set<string>>(new Set());
  const [reportTarget, setReportTarget] = useState<{ serverId: string; name: string } | null>(null);
  const [toast, setToast] = useState("");

  const currentUserId = getCurrentUserId() || "current_user";
  const currentUserName = (() => {
    try {
      const profileRaw = typeof window !== "undefined" ? localStorage.getItem("yandao_user_profile") : null;
      if (profileRaw) {
        const profile = JSON.parse(profileRaw);
        return profile.nickname || "我";
      }
    } catch {}
    return "我";
  })();

  useEffect(() => {
    // v25.0.47 P1-A：legacy group_* 本地旧ID直接判失效（INVALID_LEGACY_GROUP），禁止进入空壳聊天页
    if (isLegacyLocalGroupId(groupId)) {
      setInvalidLegacy(true);
      return;
    }
    setInvalidLegacy(false);
    setServerMissing(false);
    const groups = getGroups();
    const found = groups.find((g) => g.id === groupId);
    if (found) {
      setGroup(found);
    } else {
      setGroup({
        id: groupId,
        name: "群聊 " + groupId.slice(0, 6),
        avatar: "群",
        ownerId: "",
        ownerName: "",
        members: [],
        announcement: "",
        maxMembers: 50,
        level: "small",
        createdAt: "",
        tags: [],
      });
    }

    const msgs = getGroupMessages(groupId);
    setMessages(msgs);
  }, [groupId]);

  // v25.0.41：拉取群详情（我的角色/全员禁言/我的禁言状态/成员列表供@选择）
  useEffect(() => {
    let stopped = false;
    const loadDetail = async () => {
      try {
        const r = await fetchGroupDetail(groupId);
        if (stopped) return;
        if (!r || !r.success) {
          // v25.0.47 P1-A：服务端明确404=群不存在/已退出，不再静默吞掉
          if (r && (r as { code?: number }).code === 404) { setServerMissing(true); setNotMember(false); return; }
          // v25.0.47：服务端明确403=非成员（被踢/从未入群）——不再显示可输入的空壳页
          if (r && (r as { code?: number }).code === 403) { setNotMember(true); setServerMissing(false); return; }
          return;
        }
        setNotMember(false);
        setServerMissing(false);
        setMyRole(r.myRole || "member");
        setMuteAll(!!r.group?.muteAll);
        setMyMuteRemain(r.myMuteRemain || 0);
        setMembers(r.members || []);
        if (r.group?.name && !groupId.startsWith("grp_")) {
          setGroup((prev) => (prev && prev.name !== r.group!.name ? { ...prev, name: r.group!.name } : prev));
        }
      } catch { /* 网络异常静默，不误报群缺失 */ }
    };
    void loadDetail();
    const t = setInterval(loadDetail, 30000);
    return () => { stopped = true; clearInterval(t); };
  }, [groupId]);

  useEffect(() => {
    if (chatListRef.current) {
      chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
    }
  }, [messages]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;

    // v25.0.41：禁言拦截（全员禁言仅群主/管理员可发；个人禁言到期前不可发）
    const canSpeak = (myRole === "owner" || myRole === "admin") || (!muteAll && myMuteRemain <= 0);
    if (!canSpeak) {
      showToast(muteAll ? "群主已开启全员禁言" : `你已被禁言，剩余${Math.ceil(myMuteRemain / 60000)}分钟`);
      return;
    }

    // v25.0.19: 真实发送到后端群聊（全体成员可见），本地同步保存
    const newMsg: ChatMessage = {
      id: "gmsg_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
      senderId: currentUserId,
      senderName: currentUserName,
      content: text,
      type: "text",
      timestamp: new Date().toISOString(),
    };

    saveGroupMessage(groupId, newMsg);
    setMessages((prev) => [...prev, newMsg]);
    setInputText("");

    void sendGroupMessage(groupId, text, newMsg.id).then((r) => {
      if (r && r.success && r.message) {
        const serverId = parseInt(r.message.id, 10) || 0;
        lastServerMsgIdRef.current = Math.max(lastServerMsgIdRef.current, serverId);
        setFailIds((prev) => { const n = new Set(prev); n.delete(newMsg.id); return n; });
        // v25.0.47：乐观消息改用服务端规范ID落库，换设备/清缓存重登后自己的历史消息也能从服务端拉回
        const canonicalId = "gsrv_" + r.message.id;
        deleteGroupMessage(groupId, newMsg.id);
        saveGroupMessage(groupId, { ...newMsg, id: canonicalId });
        setMessages((prev) => {
          if (prev.some((m) => m.id === canonicalId)) return prev.filter((m) => m.id !== newMsg.id);
          return prev.map((m) => (m.id === newMsg.id ? { ...m, id: canonicalId } : m));
        });
      } else {
        // v25.0.41：发送失败标记（可重发）
        setFailIds((prev) => new Set(prev).add(newMsg.id));
      }
    }).catch(() => {
      setFailIds((prev) => new Set(prev).add(newMsg.id));
    });
  }, [inputText, groupId, currentUserId, currentUserName, myRole, muteAll, myMuteRemain]);

  // v25.0.41：失败重发（v25.0.47：沿用原clientMsgId幂等，成功后同样落规范ID）
  const handleResend = (msg: ChatMessage) => {
    void sendGroupMessage(groupId, msg.content, msg.id.startsWith("gsrv_") ? undefined : msg.id).then((r) => {
      if (r && r.success && r.message) {
        setFailIds((prev) => { const n = new Set(prev); n.delete(msg.id); return n; });
        const canonicalId = "gsrv_" + r.message.id;
        if (msg.id !== canonicalId) {
          deleteGroupMessage(groupId, msg.id);
          saveGroupMessage(groupId, { ...msg, id: canonicalId });
          setMessages((prev) => {
            if (prev.some((m) => m.id === canonicalId)) return prev.filter((m) => m.id !== msg.id);
            return prev.map((m) => (m.id === msg.id ? { ...m, id: canonicalId } : m));
          });
        }
      } else {
        showToast((r && r.error) || "重发失败，请检查网络");
      }
    }).catch(() => showToast("重发失败，请检查网络"));
  };

  // v25.0.19: 轮询拉取群内真实消息（v25.0.47：含自己的消息，换设备/清缓存重登可拉回完整历史）
  const lastServerMsgIdRef = useRef(0);
  useEffect(() => {
    let stopped = false;
    const poll = async () => {
      if (stopped || document.visibilityState === "hidden") return;
      try {
        const r = await fetchGroupMessages(groupId, lastServerMsgIdRef.current);
        if (r && r.success && r.messages && r.messages.length) {
          for (const m of r.messages) {
            lastServerMsgIdRef.current = Math.max(lastServerMsgIdRef.current, parseInt(m.id, 10) || 0);
          }
          const incoming: ChatMessage[] = r.messages.map((m) => ({
            id: "gsrv_" + m.id,
            senderId: m.senderId,
            senderName: m.senderName,
            content: m.content,
            type: (m.type === "image" || m.type === "system" ? m.type : "text") as ChatMessage["type"],
            timestamp: m.createdAt,
          }));
          if (incoming.length) {
            setMessages((prev) => {
              const existIds = new Set(prev.map((x) => x.id));
              const fresh = incoming.filter((x) => !existIds.has(x.id));
              // v25.0.47：清理与自身历史重复的旧版乐观缓存（gmsg_本地消息 vs 服务端gsrv_历史）
              const ownFresh = new Set(fresh.filter((x) => String(x.senderId) === String(currentUserId)).map((x) => x.content));
              let base = prev;
              if (ownFresh.size) {
                const dups = prev.filter((x) => x.id.startsWith("gmsg_") && String(x.senderId) === String(currentUserId) && ownFresh.has(x.content));
                if (dups.length) {
                  dups.forEach((x) => deleteGroupMessage(groupId, x.id));
                  base = prev.filter((x) => !dups.includes(x));
                }
              }
              for (const f of fresh) saveGroupMessage(groupId, f);
              return fresh.length || base !== prev ? [...base, ...fresh] : prev;
            });
          }
        }
      } catch { /* 网络异常静默 */ }
    };
    void poll();
    const timer = setInterval(poll, 5000);
    const onVisible = () => { if (document.visibilityState === "visible") void poll(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [groupId, currentUserId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleGoToInfo = () => {
    router.push("/groups/info?id=" + encodeURIComponent(groupId));
  };

  const formatTime = (timestamp: string) => {
    try {
      const d = new Date(timestamp);
      return d.toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const groupName = group ? group.name : "群聊";

  // v25.0.47 P1-A：legacy group_* 失效旧群页——只提示+可删除本地记录，禁止空壳聊天页
  if (invalidLegacy) {
    return (
      <div
        className="flex min-h-screen flex-col bg-[#ededed]"
        style={{ maxWidth: "420px", margin: "0 auto" }}
      >
        <PageLoginGuard />
        <BrandHeader title="群聊" showBack />
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <div
            className="mb-4 flex h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: "#f0e8f9" }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-700">该旧群记录已失效，请返回群列表。</p>
          <p className="mt-2 text-xs text-gray-400">此群为历史版本本地创建，服务器不存在该群，消息无法收发。</p>
          <button
            onClick={() => {
              purgeLegacyGroups();
              showToast("已删除本地失效旧群记录");
              setTimeout(() => router.replace("/friends"), 600);
            }}
            className="mt-6 rounded-xl px-6 py-2.5 text-sm font-semibold"
            style={{ backgroundColor: "#fff", color: BRAND, border: "1px solid " + BRAND }}
          >
            删除本地失效记录
          </button>
          <button
            onClick={() => router.replace("/friends")}
            className="mt-3 rounded-xl px-8 py-2.5 text-sm font-semibold text-white"
            style={{ backgroundColor: BRAND }}
          >
            返回群列表
          </button>
        </div>
      </div>
    );
  }

  // v25.0.47：服务端明确403（非成员/已被移出）——被踢用户访问失败提示，禁止空壳聊天页
  if (notMember) {
    return (
      <div
        className="flex min-h-screen flex-col bg-[#ededed]"
        style={{ maxWidth: "420px", margin: "0 auto" }}
      >
        <PageLoginGuard />
        <BrandHeader title="群聊" showBack />
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <p className="text-sm font-semibold text-gray-700">你不是该群成员</p>
          <p className="mt-2 text-xs text-gray-400">你已被移出该群，或从未加入该群聊。</p>
          <button
            onClick={() => router.replace("/friends")}
            className="mt-6 rounded-xl px-8 py-2.5 text-sm font-semibold text-white"
            style={{ backgroundColor: BRAND }}
          >
            返回群列表
          </button>
        </div>
      </div>
    );
  }

  // v25.0.47 P1-A：服务端明确404（群已解散/已被移出）——不再显示空壳聊天页
  if (serverMissing) {
    return (
      <div
        className="flex min-h-screen flex-col bg-[#ededed]"
        style={{ maxWidth: "420px", margin: "0 auto" }}
      >
        <PageLoginGuard />
        <BrandHeader title="群聊" showBack />
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <p className="text-sm font-semibold text-gray-700">群不存在或你已退出该群</p>
          <p className="mt-2 text-xs text-gray-400">该群可能已被解散，或你已被移出群聊。</p>
          <button
            onClick={() => router.replace("/friends")}
            className="mt-6 rounded-xl px-8 py-2.5 text-sm font-semibold text-white"
            style={{ backgroundColor: BRAND }}
          >
            返回群列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen flex-col bg-[#ededed]"
      style={{
        maxWidth: "420px",
        margin: "0 auto",
        paddingBottom: "calc(80px + var(--bottom-nav-height, 56px) + env(safe-area-inset-bottom, 0px))",
      }}
    >
  <PageLoginGuard />
      {/* v25.0.41：点击群名/···进入群详情（群资料+管理） */}
      <div className="relative">
        <BrandHeader title={groupName} showBack onTitleClick={handleGoToInfo} />
        <button
          onClick={handleGoToInfo}
          className="absolute right-2 top-0 flex h-10 w-10 items-center justify-center text-white"
          aria-label="群详情"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="5" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="19" cy="12" r="2" />
          </svg>
        </button>
      </div>

      {/* 全员禁言提示条 */}
      {muteAll && myRole === "member" && (
        <div className="px-3 py-1.5 text-center text-xs" style={{ backgroundColor: "#fff7e6", color: "#d48806" }}>
          群主已开启全员禁言，仅管理员可发言
        </div>
      )}

      <div
        ref={chatListRef}
        className="flex-1 overflow-y-auto px-3 py-4 space-y-3"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full mb-4"
              style={{ backgroundColor: "#f0e8f9" }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke={BRAND}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">暂无消息</p>
            <p className="text-xs text-gray-400 mt-1">发送一条消息开始群聊吧</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.senderId === currentUserId;
          const failed = failIds.has(msg.id);
          // 服务端消息ID（举报用）：gsrv_123 → 123；本地消息暂无服务端ID则不可举报
          const serverId = msg.id.startsWith("gsrv_") ? msg.id.slice(5) : "";
          return (
            <div
              key={msg.id}
              className={"flex " + (isMe ? "justify-end" : "justify-start")}
            >
              {!isMe && (
                /* v25.0.41：点击头像进入唯一用户资料页 */
                <button
                  onClick={() => router.push(`/user?uid=${encodeURIComponent(msg.senderId)}`)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white font-bold mr-2"
                  style={{
                    backgroundColor: BRAND,
                    fontSize: "14px",
                  }}
                >
                  {msg.senderName.slice(0, 1)}
                </button>
              )}

              <div
                className="max-w-[70%] rounded-2xl px-3 py-2 text-sm leading-relaxed"
                style={{
                  backgroundColor: isMe ? BRAND : "white",
                  color: isMe ? "white" : "#333",
                  borderBottomRightRadius: isMe ? "4px" : "16px",
                  borderBottomLeftRadius: !isMe ? "4px" : "16px",
                }}
                onContextMenu={(e) => {
                  // v25.0.41：长按/右键举报消息
                  if (serverId) { e.preventDefault(); setReportTarget({ serverId, name: msg.senderName }); }
                }}
                onTouchStart={(e) => {
                  const touch = e.touches[0];
                  const timer = setTimeout(() => {
                    if (touch && serverId) setReportTarget({ serverId, name: msg.senderName });
                  }, 600);
                  const clear = () => {
                    clearTimeout(timer);
                    document.removeEventListener("touchend", clear);
                    document.removeEventListener("touchmove", clear);
                  };
                  document.addEventListener("touchend", clear);
                  document.addEventListener("touchmove", clear);
                }}
              >
                {!isMe && (
                  <p
                    className="mb-0.5 text-[11px] font-semibold cursor-pointer"
                    style={{ color: BRAND }}
                    onClick={() => router.push(`/user?uid=${encodeURIComponent(msg.senderId)}`)}
                  >
                    {msg.senderName}
                  </p>
                )}
                <p>{msg.content}</p>
                <p
                  className="mt-1 text-right text-[10px] flex items-center justify-end gap-1"
                  style={{ opacity: isMe ? 0.7 : 0.5 }}
                >
                  {failed && (
                    <button
                      onClick={() => handleResend(msg)}
                      className="rounded px-1 text-[10px]"
                      style={{ color: "#F44336" }}
                    >
                      发送失败，点击重发
                    </button>
                  )}
                  {formatTime(msg.timestamp)}
                </p>
              </div>

              {isMe && (
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white font-bold ml-2"
                  style={{
                    backgroundColor: BRAND,
                    fontSize: "14px",
                  }}
                >
                  我
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* @成员选择条（v25.0.41：@成员 / @全体[仅群主和管理员]） */}
      {atPicker && (
        <div className="border-t border-gray-200 bg-white px-3 py-2" style={{ maxHeight: "180px", overflowY: "auto" }}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-500">选择要@的成员</p>
            <button onClick={() => setAtPicker(false)} className="text-xs text-gray-400">收起</button>
          </div>
          {(myRole === "owner" || myRole === "admin") && (
            <button
              onClick={() => { setInputText((prev) => prev + "@全体成员 "); setAtPicker(false); }}
              className="flex w-full items-center gap-2 border-b border-gray-50 py-2 text-left"
            >
              <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: "#F39C12" }}>全体</span>
              <span className="text-sm text-gray-800">@全体成员</span>
            </button>
          )}
          {members.filter((m) => String(m.userId) !== String(currentUserId)).map((m) => (
            <button
              key={m.userId}
              onClick={() => { setInputText((prev) => prev + `@${m.nickname} `); setAtPicker(false); }}
              className="flex w-full items-center gap-2 border-b border-gray-50 py-2 text-left last:border-0"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ backgroundColor: m.role === "owner" ? "#F39C12" : m.role === "admin" ? "#3498DB" : "#B39DDB" }}>
                {(m.nickname || "友").slice(0, 1)}
              </span>
              <span className="text-sm text-gray-800 truncate">@{m.nickname}</span>
            </button>
          ))}
          {members.length === 0 && <p className="py-3 text-center text-xs text-gray-400">成员加载中…</p>}
        </div>
      )}

      <div
        className="fixed left-1/2 flex w-full items-center gap-2 border-t border-gray-200 bg-white px-3 py-2"
        style={{
          maxWidth: "420px",
          bottom: "calc(var(--bottom-nav-height, 56px) + env(safe-area-inset-bottom, 0px))",
          transform: "translateX(-50%)",
        }}
      >
        {/* v25.0.41：@成员快捷入口 */}
        <button
          onClick={() => setAtPicker(!atPicker)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold"
          style={{ color: BRAND }}
          aria-label="艾特成员"
        >
          @
        </button>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息..."
          className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none"
          style={{ outline: "none" }}
        />
        <button
          onClick={handleSend}
          disabled={!inputText.trim()}
          className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors"
          style={{
            backgroundColor: inputText.trim() ? BRAND : "#ccc",
          }}
        >
          发送
        </button>
      </div>

      {/* 消息举报弹窗（v25.0.41） */}
      {reportTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-8" onClick={() => setReportTarget(null)}>
          <div className="w-full rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <p className="mb-2 text-center text-sm font-semibold text-gray-800">举报 {reportTarget.name} 的消息</p>
            <p className="mb-3 text-center text-xs text-gray-400">举报后平台将尽快核实处理</p>
            <div className="flex gap-3">
              <button onClick={() => setReportTarget(null)} className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm text-gray-600">取消</button>
              <button
                onClick={async () => {
                  const r = await reportMessage(reportTarget.serverId, "群聊消息举报").catch(() => null);
                  setReportTarget(null);
                  showToast(r && r.success ? "举报已提交" : (r && r.error) || "举报失败");
                }}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white"
                style={{ backgroundColor: "#F44336" }}
              >
                确认举报
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed left-1/2 top-16 z-[60] -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-xs text-white">
          {toast}
        </div>
      )}

      <div className="py-3 text-center">
        <p className="text-[11px] text-gray-400">yandao.vip 分享下载有礼</p>
      </div>
    </div>
  );
}