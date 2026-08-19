"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { BrandHeader } from "@/components/shared";
import { useToolBack } from "@/lib/useToolBack";
import {
  getChatMessages,
  saveChatMessage,
  deleteChatMessage,
  batchDeleteChatMessages,
  clearAllChatMessages,
  getFriends,
  saveFriends,
  type ChatMessage,
} from "@/lib/socialStore";
import { getCurrentUserId, getLoginState } from "@/lib/auth";
import { sendPrivateMessage, fetchPrivateMessages, fetchUserProfile } from "@/lib/socialApi";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { usePopupBackHandler } from "@/hooks/usePopupBackHandler";

import { PageLoginGuard } from "@/components/PageLoginGuard";
const BRAND = "#7B2FBE";

export default function FriendChatPage({ routeId }: { routeId?: string }) {
  const params = useParams();
  const router = useRouter();
  const friendId = routeId || (params.id as string);
  const chatKey = "private_" + friendId;

  const { showResult, savedParams, saveParams } = useToolBack({
    pageKey: "friends_chat_" + friendId,
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [friendName, setFriendName] = useState("好友");
  // v25.0.38 P0-1：对方最新昵称（强制从后端用户接口实时拉取，禁止仅靠本地缓存渲染）
  const [peerNickname, setPeerNickname] = useState("");
  // v25.0.38 P0-2：发送防抖（未收到后端返回前禁止重复提交）与登录态异常提示
  const [sending, setSending] = useState(false);
  const [authExpired, setAuthExpired] = useState(false);
  const chatListRef = useRef<HTMLDivElement>(null);

  // v20.1: 消息管理模式
  const [manageMode, setManageMode] = useState(false); // 批量管理模式
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set()); // 选中的消息ID
  const [contextMenuMsg, setContextMenuMsg] = useState<string | null>(null); // 长按弹出的单条操作菜单
  const [showClearConfirm, setShowClearConfirm] = useState(false); // 清空确认弹窗
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // P1 弹窗规范：消息操作菜单 / 清空确认弹窗 —— 返回键优先关闭弹窗 + 背景滚动锁
  const anyDialogOpen = !!contextMenuMsg || showClearConfirm;
  useBodyScrollLock(anyDialogOpen);
  usePopupBackHandler(() => {
    if (contextMenuMsg) setContextMenuMsg(null);
    else if (showClearConfirm) setShowClearConfirm(false);
  }, anyDialogOpen);

  // v25.0.33（P7-整改-01）：消息方向判断改用登录态服务器 userId（原匿名ID会导致自发消息被渲染到对方侧）
  const currentUserId = (typeof window !== "undefined" ? getLoginState().profile?.userId : undefined) || getCurrentUserId() || "current_user";
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
    // v25.0.38 P0-1：昵称渲染规则——本地备注(用户主动设置) > 后端实时昵称 > 本地缓存兜底
    const friends = getFriends();
    const friend = friends.find((f) => f.id === friendId);
    if (friend) {
      setFriendName(friend.note || friend.name);
    }

    const msgs = getChatMessages(chatKey);
    setMessages(msgs);

    // 强制从后端用户接口拉取最新昵称：好友改昵称后，聊天页标题与消息旁昵称实时同步
    void fetchUserProfile(friendId).then((r) => {
      if (r && r.success && r.user && r.user.nickname) {
        setPeerNickname(r.user.nickname);
        const local = getFriends();
        const localFriend = local.find((f) => f.id === friendId);
        // 同步刷新本地缓存，保证好友列表/信息页与聊天页昵称一致
        if (localFriend) {
          localFriend.name = r.user.nickname;
          localFriend.avatar = r.user.avatar || localFriend.avatar;
          saveFriends(local);
        }
        setFriendName((localFriend && localFriend.note) || r.user.nickname);
      }
    }).catch(() => { /* 拉取失败保留本地兜底显示 */ });
  }, [friendId, chatKey]);

  useEffect(() => {
    if (chatListRef.current) {
      chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
    }
  }, [messages]);

  // 刷新消息列表
  const refreshMessages = useCallback(() => {
    const msgs = getChatMessages(chatKey);
    setMessages(msgs);
  }, [chatKey]);

  // v25.0.38 P0-2：服务端消息游标（增量轮询用）
  const lastServerMsgIdRef = useRef(0);

  // v25.0.38 P0-2：服务端确认后用 srv_ 版本替换本地乐观消息（ID 统一，跨设备刷新不重复不丢失）
  const confirmServerMessage = useCallback((optimisticId: string, serverMsg: { id: string; senderId: string; senderName: string; content: string; type: string; createdAt: string }) => {
    deleteChatMessage(chatKey, optimisticId);
    const confirmed: ChatMessage = {
      id: "srv_" + serverMsg.id,
      senderId: serverMsg.senderId,
      senderName: serverMsg.senderName,
      content: serverMsg.content,
      type: (serverMsg.type === "image" || serverMsg.type === "system" ? serverMsg.type : "text") as ChatMessage["type"],
      timestamp: serverMsg.createdAt,
      status: "sent",
    };
    const local = getChatMessages(chatKey);
    if (!local.find((m) => m.id === confirmed.id)) saveChatMessage(chatKey, confirmed);
    setMessages((prev) => {
      const withoutOptimistic = prev.filter((m) => m.id !== optimisticId);
      return withoutOptimistic.find((m) => m.id === confirmed.id) ? withoutOptimistic : [...withoutOptimistic, confirmed];
    });
    lastServerMsgIdRef.current = Math.max(lastServerMsgIdRef.current, parseInt(serverMsg.id, 10) || 0);
  }, [chatKey]);

  // v25.0.38 P0-2：发送失败标记（保留消息 + 红色感叹号，点击可重发）；401 显式提示重新登录
  const markMessageFailed = useCallback((optimisticId: string, err: string, isAuth: boolean) => {
    const local = getChatMessages(chatKey);
    const target = local.find((m) => m.id === optimisticId);
    if (target) {
      deleteChatMessage(chatKey, optimisticId);
      saveChatMessage(chatKey, { ...target, status: "failed" });
    }
    setMessages((prev) => prev.map((m) => (m.id === optimisticId ? { ...m, status: "failed" as const } : m)));
    if (isAuth) setAuthExpired(true);
    else alert(err || "消息发送失败，请重试");
  }, [chatKey]);

  // v25.0.40: 统一文本发送通道（手动输入与邀请分享共用，含防抖/乐观更新/失败标记重发）
  const sendTextMessage = useCallback((text: string) => {
    if (!text || sending) return;

    const optimistic: ChatMessage = {
      id: "msg_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
      senderId: currentUserId,
      senderName: currentUserName,
      content: text,
      type: "text",
      timestamp: new Date().toISOString(),
      status: "sending",
    };

    saveChatMessage(chatKey, optimistic);
    setMessages((prev) => [...prev, optimistic]);
    setSending(true);

    void sendPrivateMessage(friendId, text).then((r) => {
      setSending(false);
      if (r && r.success && r.message) {
        confirmServerMessage(optimistic.id, r.message);
        return;
      }
      // 失败：敏感词拦截/开关关闭/登录过期/网络异常——保留消息标记失败，可点击重发
      markMessageFailed(optimistic.id, (r && r.error) || "消息发送失败，请重试", !!(r && (r as any).code === 401));
    }).catch(() => {
      setSending(false);
      markMessageFailed(optimistic.id, "网络连接失败，请检查网络后重试", false);
    });
  }, [chatKey, friendId, currentUserId, currentUserName, sending, confirmServerMessage, markMessageFailed]);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;
    // v25.0.38 P0-3：发送防抖——未收到后端返回前禁止重复提交
    if (sending) return;
    setInputText("");
    sendTextMessage(text);
  }, [inputText, sending, sendTextMessage]);

  // v25.0.40 社交×营销绑定：聊天内邀请分享入口——把我的专属邀请链接作为消息发给好友
  const [inviteSharing, setInviteSharing] = useState(false);
  const handleShareInvite = useCallback(async () => {
    if (sending || inviteSharing) return;
    setInviteSharing(true);
    try {
      const { getInviteLink } = await import("@/lib/inviteApi");
      const linkData = await getInviteLink();
      if (!linkData || !linkData.inviteLink) {
        alert("邀请链接获取失败，请稍后重试");
        return;
      }
      sendTextMessage(`我邀请你一起学国学（排盘/学堂/题库一站学习）：${linkData.inviteLink}`);
    } catch (e) {
      alert("邀请分享失败，请稍后重试");
    } finally {
      setInviteSharing(false);
    }
  }, [sending, inviteSharing, sendTextMessage]);

  // v25.0.38 P0-2：失败消息点击重发
  const handleResend = useCallback((msgId: string) => {
    const target = messages.find((m) => m.id === msgId);
    if (!target || target.senderId !== currentUserId) return;
    if (target.type !== "text") { alert("图片消息请重新选择发送"); return; }
    deleteChatMessage(chatKey, msgId);
    setMessages((prev) => prev.filter((m) => m.id !== msgId));

    const optimistic: ChatMessage = { ...target, id: "msg_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8), status: "sending" };
    saveChatMessage(chatKey, optimistic);
    setMessages((prev) => [...prev, optimistic]);
    setSending(true);
    void sendPrivateMessage(friendId, target.content).then((r) => {
      setSending(false);
      if (r && r.success && r.message) {
        confirmServerMessage(optimistic.id, r.message);
        return;
      }
      markMessageFailed(optimistic.id, (r && r.error) || "消息发送失败，请重试", !!(r && (r as any).code === 401));
    }).catch(() => {
      setSending(false);
      markMessageFailed(optimistic.id, "网络连接失败，请检查网络后重试", false);
    });
  }, [messages, chatKey, friendId, currentUserId, sending, confirmServerMessage, markMessageFailed]);

  // v25.0.33: 图片消息（压缩至720px JPEG后发送）
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleSendImage = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("请选择图片文件");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("图片大小不能超过5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX = 720;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          alert("图片处理失败，请重试");
          return;
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);

        const optimistic: ChatMessage = {
          id: "msg_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
          senderId: currentUserId,
          senderName: currentUserName,
          content: dataUrl,
          type: "image",
          timestamp: new Date().toISOString(),
          status: "sending",
        };
        saveChatMessage(chatKey, optimistic);
        setMessages((prev) => [...prev, optimistic]);
        setSending(true);

        void sendPrivateMessage(friendId, dataUrl, "image").then((r) => {
          setSending(false);
          if (r && r.success && r.message) {
            confirmServerMessage(optimistic.id, r.message);
            return;
          }
          markMessageFailed(optimistic.id, (r && r.error) || "图片发送失败，请重试", !!(r && (r as any).code === 401));
        }).catch(() => {
          setSending(false);
          markMessageFailed(optimistic.id, "网络连接失败，请检查网络后重试", false);
        });
      };
      img.onerror = () => alert("图片读取失败，请重试");
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }, [chatKey, friendId, currentUserId, currentUserName, confirmServerMessage, markMessageFailed]);

  // v25.0.38 P0-2：消息拉取统一走服务端——首轮全量（afterId=0）含双方消息，后续增量；
  // 本地仅作渲染兜底，进入聊天页强制以后端数据为准，禁止纯本地缓存渲染
  useEffect(() => {
    let stopped = false;
    const poll = async () => {
      if (stopped || document.visibilityState === "hidden") return;
      try {
        const r = await fetchPrivateMessages(friendId, lastServerMsgIdRef.current);
        if (r && (r as any).code === 401) {
          setAuthExpired(true);
          return;
        }
        if (r && r.success && r.messages && r.messages.length) {
          for (const m of r.messages) {
            lastServerMsgIdRef.current = Math.max(lastServerMsgIdRef.current, parseInt(m.id, 10) || 0);
          }
          // 不过滤发送方：自己发的消息同样入列（跨设备/换机后历史可见），按 srv_ ID 去重
          const incoming: ChatMessage[] = r.messages.map((m) => ({
            id: "srv_" + m.id,
            senderId: m.senderId,
            senderName: m.senderName,
            content: m.content,
            type: (m.type === "image" || m.type === "system" ? m.type : "text") as ChatMessage["type"],
            timestamp: m.createdAt,
            status: "sent" as const,
          }));
          setMessages((prev) => {
            const existIds = new Set(prev.map((x) => x.id));
            const fresh = incoming.filter((x) => !existIds.has(x.id));
            for (const f of fresh) saveChatMessage(chatKey, f);
            return fresh.length ? [...prev, ...fresh] : prev;
          });
        }
      } catch { /* 网络异常静默，下轮重试 */ }
    };
    void poll();
    const timer = setInterval(poll, 4000);
    const onVisible = () => { if (document.visibilityState === "visible") void poll(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [friendId, chatKey]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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

  // v20.1: 单条删除
  const handleDeleteSingle = useCallback((msgId: string) => {
    deleteChatMessage(chatKey, msgId);
    setContextMenuMsg(null);
    refreshMessages();
  }, [chatKey, refreshMessages]);

  // v20.1: 进入管理模式
  const handleEnterManage = useCallback(() => {
    setManageMode(true);
    setSelectedIds(new Set());
  }, []);

  // v20.1: 退出管理模式
  const handleExitManage = useCallback(() => {
    setManageMode(false);
    setSelectedIds(new Set());
  }, []);

  // v20.1: 切换选中状态
  const handleToggleSelect = useCallback((msgId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) {
        next.delete(msgId);
      } else {
        next.add(msgId);
      }
      return next;
    });
  }, []);

  // v20.1: 全选/取消全选
  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === messages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(messages.map((m) => m.id)));
    }
  }, [selectedIds.size, messages]);

  // v20.1: 批量删除选中
  const handleBatchDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    batchDeleteChatMessages(chatKey, Array.from(selectedIds));
    setSelectedIds(new Set());
    setManageMode(false);
    refreshMessages();
  }, [chatKey, selectedIds, refreshMessages]);

  // v20.1: 清空全部
  const handleClearAll = useCallback(() => {
    clearAllChatMessages(chatKey);
    setShowClearConfirm(false);
    setManageMode(false);
    setSelectedIds(new Set());
    refreshMessages();
  }, [chatKey, refreshMessages]);

  // v20.1: 长按消息（触发单条操作菜单）
  const handleMessageLongPress = useCallback((msgId: string) => {
    if (manageMode) return;
    setContextMenuMsg(msgId);
  }, [manageMode]);

  const startLongPress = useCallback((msgId: string) => {
    if (manageMode) return;
    longPressTimer.current = setTimeout(() => {
      handleMessageLongPress(msgId);
    }, 500);
  }, [manageMode, handleMessageLongPress]);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  return (
    <div
      className="flex min-h-screen flex-col bg-[#ededed]"
      style={{ maxWidth: "420px", margin: "0 auto" }}
    >
  <PageLoginGuard />
      {/* 头部 - 管理模式下显示退出按钮 */}
      {manageMode ? (
        <div
          className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200"
          style={{ paddingTop: "calc(12px + env(safe-area-inset-top))" }}
        >
          <button
            onClick={handleExitManage}
            className="text-sm font-medium"
            style={{ color: "#666" }}
          >
            取消
          </button>
          <span className="text-sm font-bold" style={{ color: "#333" }}>
            已选 {selectedIds.size} 条
          </span>
          <button
            onClick={handleSelectAll}
            className="text-sm font-medium"
            style={{ color: BRAND }}
          >
            {selectedIds.size === messages.length && messages.length > 0 ? "取消全选" : "全选"}
          </button>
        </div>
      ) : (
        <BrandHeader title={friendName} showBack />
      )}

      {/* v25.0.38 P0-2：登录过期提示条（此前 401 被静默吞掉，消息收发全断且无任何提示） */}
      {authExpired && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs" style={{ backgroundColor: "#fff3cd", color: "#856404" }}>
          <span>登录已过期，消息无法收发，请重新登录</span>
          <button
            className="shrink-0 rounded-lg px-2.5 py-1 font-semibold text-white"
            style={{ backgroundColor: BRAND }}
            onClick={() => router.push(`/login?redirect=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname + window.location.search : "/friends")}`)}
          >
            去登录
          </button>
        </div>
      )}

      {/* 消息列表 */}
      <div
        ref={chatListRef}
        className="flex-1 overflow-y-auto px-3 py-4 space-y-3"
        style={{ paddingBottom: manageMode ? "120px" : "80px" }}
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
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">暂无消息</p>
            <p className="text-xs text-gray-400 mt-1">发送一条消息开始聊天吧</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.senderId === currentUserId;
          const isSelected = selectedIds.has(msg.id);
          return (
            <div
              key={msg.id}
              className={"flex items-center gap-2 " + (isMe ? "justify-end" : "justify-start")}
              onTouchStart={() => startLongPress(msg.id)}
              onTouchEnd={cancelLongPress}
              onTouchMove={cancelLongPress}
            >
              {/* 管理模式下的复选框 */}
              {manageMode && (
                <button
                  onClick={() => handleToggleSelect(msg.id)}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2"
                  style={{
                    borderColor: isSelected ? BRAND : "#ccc",
                    backgroundColor: isSelected ? BRAND : "transparent",
                  }}
                >
                  {isSelected && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                </button>
              )}

              {!isMe && !manageMode && (
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white font-bold mr-2"
                  style={{
                    backgroundColor: BRAND,
                    fontSize: "14px",
                  }}
                >
                  {(peerNickname || msg.senderName || "友").slice(0, 1)}
                </div>
              )}

              {/* v25.0.38 P0-2：发送失败红色感叹号，点击重发 */}
              {isMe && !manageMode && msg.status === "failed" && (
                <button
                  aria-label="重发消息"
                  className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-red-100"
                  onClick={() => handleResend(msg.id)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc3545" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 8v5" />
                    <circle cx="12" cy="17" r="0.5" fill="#dc3545" />
                  </svg>
                </button>
              )}
              {/* v25.0.38 P0-2：发送中时钟图标 */}
              {isMe && !manageMode && msg.status === "sending" && (
                <div className="shrink-0 flex h-6 w-6 items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 3" />
                  </svg>
                </div>
              )}

              <div
                onClick={() => {
                  if (manageMode) handleToggleSelect(msg.id);
                }}
                className="max-w-[70%] rounded-2xl px-3 py-2 text-sm leading-relaxed"
                style={{
                  backgroundColor: manageMode
                    ? (isSelected ? "#f3e8ff" : (isMe ? BRAND : "white"))
                    : (isMe ? BRAND : "white"),
                  color: manageMode && !isSelected && isMe ? "white" : (isMe && !manageMode ? "white" : "#333"),
                  borderBottomRightRadius: isMe ? "4px" : "16px",
                  borderBottomLeftRadius: !isMe ? "4px" : "16px",
                  border: manageMode && isSelected ? `2px solid ${BRAND}` : "2px solid transparent",
                  cursor: manageMode ? "pointer" : "default",
                }}
              >
                {msg.type === "image" && /^data:image\/|^https?:\/\//.test(msg.content) ? (
                  <img
                    src={msg.content}
                    alt="图片消息"
                    className="max-w-[180px] max-h-[220px] rounded-lg object-cover cursor-pointer"
                    onClick={(e) => {
                      if (manageMode) {
                        e.stopPropagation();
                        handleToggleSelect(msg.id);
                      }
                    }}
                  />
                ) : (
                  <p className="break-words">{msg.content}</p>
                )}
                <p
                  className="mt-1 text-right text-[10px]"
                  style={{ opacity: isMe ? 0.7 : 0.5 }}
                >
                  {formatTime(msg.timestamp)}
                </p>
              </div>

              {isMe && !manageMode && (
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

      {/* 底部区域 - 管理模式 vs 正常模式 */}
      {manageMode ? (
        <div
          className="fixed left-1/2 flex w-full items-center gap-2 border-t border-gray-200 bg-white px-3 py-3"
          style={{
            maxWidth: "420px",
            bottom: "0",
            transform: "translateX(-50%)",
            zIndex: 1001,
            paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
          }}
        >
          <button
            onClick={() => setShowClearConfirm(true)}
            disabled={messages.length === 0}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-40"
            style={{
              border: `1px solid #ddd`,
              color: "#666",
            }}
          >
            清空全部
          </button>
          <button
            onClick={handleBatchDelete}
            disabled={selectedIds.size === 0}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-40"
            style={{
              backgroundColor: selectedIds.size > 0 ? "#dc3545" : "#ccc",
            }}
          >
            删除选中 ({selectedIds.size})
          </button>
        </div>
      ) : (
        <>
          <div
            className="fixed left-1/2 flex w-full items-center gap-2 border-t border-gray-200 bg-white px-3 py-2"
            style={{
              maxWidth: "420px",
              bottom: "0",
              transform: "translateX(-50%)",
              zIndex: 1001,
              paddingBottom: "calc(8px + env(safe-area-inset-bottom))",
            }}
          >
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleSendImage}
            />
            <button
              onClick={() => imageInputRef.current?.click()}
              aria-label="发送图片"
              className="shrink-0 rounded-xl p-2.5 transition-colors"
              style={{ border: `1px solid ${BRAND}40`, color: BRAND, backgroundColor: "#f9f5fc" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </button>            <button
              onClick={handleShareInvite}
              disabled={inviteSharing || sending}
              aria-label="分享邀请链接"
              className="shrink-0 rounded-xl p-2.5 transition-colors disabled:opacity-40"
              style={{ border: `1px solid ${BRAND}40`, color: BRAND, backgroundColor: "#f9f5fc" }}
              title="把我的邀请链接发给好友"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
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
              disabled={!inputText.trim() || sending}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors"
              style={{
                backgroundColor: inputText.trim() && !sending ? BRAND : "#ccc",
              }}
            >
              {sending ? "发送中" : "发送"}
            </button>
            {messages.length > 0 && (
              <button
                onClick={handleEnterManage}
                className="rounded-xl px-3 py-2.5 text-xs font-medium transition-colors"
                style={{
                  border: `1px solid ${BRAND}40`,
                  color: BRAND,
                  backgroundColor: "#f9f5fc",
                }}
              >
                管理
              </button>
            )}
          </div>
        </>
      )}

      <div className="py-3 text-center">
        <p className="text-[11px] text-gray-400">yandao.vip 分享下载有礼</p>
      </div>

      {/* v20.1: 单条消息操作菜单（长按触发） */}
      {contextMenuMsg && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40"
          onClick={() => setContextMenuMsg(null)}
        >
          <div
            className="w-72 rounded-2xl bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 text-center border-b border-gray-100">
              <p className="text-sm font-bold text-gray-700">消息操作</p>
            </div>
            <button
              onClick={() => handleDeleteSingle(contextMenuMsg)}
              className="w-full px-4 py-3 text-center text-sm font-medium text-red-500 hover:bg-gray-50 transition-colors"
            >
              删除该消息
            </button>
            <button
              onClick={() => setContextMenuMsg(null)}
              className="w-full px-4 py-3 text-center text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors border-t border-gray-100"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* v20.1: 清空全部确认弹窗 */}
      {showClearConfirm && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-6"
          onClick={() => setShowClearConfirm(false)}
        >
          <div
            className="w-full max-w-xs rounded-2xl bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-2 text-center">
              <div
                className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: "#fee" }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc3545" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-gray-800">清空所有聊天记录</h3>
              <p className="mt-2 text-sm text-gray-500">
                确定要清空与{friendName}的所有聊天记录吗？此操作不可撤销。
              </p>
            </div>
            <div className="flex gap-3 px-6 pb-6 pt-4">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium text-gray-600"
                style={{ backgroundColor: "#f5f5f5" }}
              >
                取消
              </button>
              <button
                onClick={handleClearAll}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white"
                style={{ backgroundColor: "#dc3545" }}
              >
                确认清空
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
