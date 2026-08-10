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
  type ChatMessage,
} from "@/lib/socialStore";
import { getCurrentUserId } from "@/lib/auth";

const BRAND = "#7B2FBE";

export default function FriendChatPage() {
  const params = useParams();
  const router = useRouter();
  const friendId = params.id as string;
  const chatKey = "private_" + friendId;

  const { showResult, savedParams, saveParams } = useToolBack({
    pageKey: "friends_chat_" + friendId,
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [friendName, setFriendName] = useState("好友");
  const chatListRef = useRef<HTMLDivElement>(null);

  // v20.1: 消息管理模式
  const [manageMode, setManageMode] = useState(false); // 批量管理模式
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set()); // 选中的消息ID
  const [contextMenuMsg, setContextMenuMsg] = useState<string | null>(null); // 长按弹出的单条操作菜单
  const [showClearConfirm, setShowClearConfirm] = useState(false); // 清空确认弹窗
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    const friends = getFriends();
    const friend = friends.find((f) => f.id === friendId);
    if (friend) {
      setFriendName(friend.note || friend.name);
    }

    const msgs = getChatMessages(chatKey);
    setMessages(msgs);
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

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;

    const newMsg: ChatMessage = {
      id: "msg_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
      senderId: currentUserId,
      senderName: currentUserName,
      content: text,
      type: "text",
      timestamp: new Date().toISOString(),
    };

    saveChatMessage(chatKey, newMsg);
    setMessages((prev) => [...prev, newMsg]);
    setInputText("");

    setTimeout(() => {
      const autoReply: ChatMessage = {
        id: "reply_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
        senderId: friendId,
        senderName: friendName,
        content: "收到你的消息了，稍后回复你~",
        type: "text",
        timestamp: new Date().toISOString(),
      };
      saveChatMessage(chatKey, autoReply);
      setMessages((prev) => [...prev, autoReply]);
    }, 1000 + Math.random() * 1500);
  }, [inputText, chatKey, friendId, friendName, currentUserId, currentUserName]);

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
                  {msg.senderName.slice(0, 1)}
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
                <p>{msg.content}</p>
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
            }}
          >
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
