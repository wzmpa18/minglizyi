"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { BrandHeader } from "@/components/shared";
import { useToolBack } from "@/lib/useToolBack";
import {
  getGroups,
  getGroupMessages,
  saveGroupMessage,
  type GroupInfo,
  type ChatMessage,
} from "@/lib/socialStore";

const BRAND = "#7B2FBE";

export default function GroupChatPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const { showResult, savedParams, saveParams } = useToolBack({
    pageKey: "group_chat_" + groupId,
  });

  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const chatListRef = useRef<HTMLDivElement>(null);

  const currentUserId = "current_user";
  const currentUserName = "我";

  useEffect(() => {
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

  useEffect(() => {
    if (chatListRef.current) {
      chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;

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

    setTimeout(() => {
      const autoReply: ChatMessage = {
        id: "greply_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
        senderId: "system_user",
        senderName: "群成员",
        content: "收到你的消息了",
        type: "text",
        timestamp: new Date().toISOString(),
      };
      saveGroupMessage(groupId, autoReply);
      setMessages((prev) => [...prev, autoReply]);
    }, 1000 + Math.random() * 1500);
  }, [inputText, groupId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleGoToInfo = () => {
    router.push("/groups/info/" + groupId);
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

  return (
    <div
      className="flex min-h-screen flex-col bg-[#ededed]"
      style={{ maxWidth: "420px", margin: "0 auto" }}
    >
      <BrandHeader title={groupName} showBack />

      <div
        ref={chatListRef}
        className="flex-1 overflow-y-auto px-3 py-4 space-y-3"
        style={{ paddingBottom: "80px" }}
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
          return (
            <div
              key={msg.id}
              className={"flex " + (isMe ? "justify-end" : "justify-start")}
            >
              {!isMe && (
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
                className="max-w-[70%] rounded-2xl px-3 py-2 text-sm leading-relaxed"
                style={{
                  backgroundColor: isMe ? BRAND : "white",
                  color: isMe ? "white" : "#333",
                  borderBottomRightRadius: isMe ? "4px" : "16px",
                  borderBottomLeftRadius: !isMe ? "4px" : "16px",
                }}
              >
                {!isMe && (
                  <p
                    className="mb-0.5 text-[11px] font-semibold"
                    style={{ color: BRAND }}
                  >
                    {msg.senderName}
                  </p>
                )}
                <p>{msg.content}</p>
                <p
                  className="mt-1 text-right text-[10px]"
                  style={{ opacity: isMe ? 0.7 : 0.5 }}
                >
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
      </div>

      <div className="py-3 text-center">
        <p className="text-[11px] text-gray-400">yandao.vip 分享下载有礼</p>
      </div>
    </div>
  );
}