"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { BrandHeader } from "@/components/shared";
import {
  getFriends,
  getGroups,
  getChatMessages,
  getGroupMessages,
  type Friend,
  type GroupInfo,
  type ChatMessage,
} from "@/lib/socialStore";

import { PageLoginGuard } from "@/components/PageLoginGuard";
const BRAND = "#7B2FBE";

// ==================== 类型定义 ====================
interface Conversation {
  id: string;
  type: "friend" | "group";
  name: string;
  avatar: string;
  lastMessage: string;
  lastTime: string;
  lastTimestamp: string;
  unread: number;
}

// ==================== 辅助函数 ====================
function formatTime(timestamp: string): string {
  try {
    const d = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "刚刚";
    if (diffMins < 60) return diffMins + "分钟前";
    if (diffHours < 24) {
      return d.toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    if (diffDays === 1) return "昨天";
    if (diffDays < 7) return diffDays + "天前";
    return d.toLocaleDateString("zh-CN", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

function getLastReadTime(key: string): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function computeUnread(
  msgs: ChatMessage[],
  lastReadTime: string
): number {
  if (!lastReadTime || msgs.length === 0) {
    // 从未读过且有消息，全部算未读
    return msgs.length > 0 ? msgs.length : 0;
  }
  return msgs.filter((m) => m.timestamp > lastReadTime).length;
}

// ==================== 主组件 ====================
export default function MessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  // 系统通知（统一消息中心）
  const [sysUnread, setSysUnread] = useState(0);
  const [sysLatest, setSysLatest] = useState<{ title: string } | null>(null);
  useEffect(() => {
    import("@/lib/notificationCenter").then(({ listNotifications, getUnreadCount, subscribeNotifications }) => {
      const load = () => {
        setSysUnread(getUnreadCount());
        const list = listNotifications();
        setSysLatest(list.length > 0 ? { title: list[0].title } : null);
      };
      load();
      const unsub = subscribeNotifications(load);
      return unsub;
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const friends = getFriends();
    const groups = getGroups();

    const convs: Conversation[] = [];

    // --- 好友私聊 ---
    for (const f of friends) {
      const chatKey = "private_" + f.id;
      const msgs = getChatMessages(chatKey);
      const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
      const lastReadTime = getLastReadTime("yandao_msg_read_" + chatKey);
      const unread = computeUnread(msgs, lastReadTime);

      convs.push({
        id: f.id,
        type: "friend",
        name: f.note || f.name,
        avatar: f.avatar || f.name.slice(0, 1),
        lastMessage: lastMsg ? lastMsg.content : "暂无消息",
        lastTime: lastMsg ? formatTime(lastMsg.timestamp) : "",
        lastTimestamp: lastMsg ? lastMsg.timestamp : "",
        unread,
      });
    }

    // --- 群聊 ---
    for (const g of groups) {
      const msgs = getGroupMessages(g.id);
      const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
      const lastReadTime = getLastReadTime("yandao_msg_read_group_" + g.id);
      const unread = computeUnread(msgs, lastReadTime);

      convs.push({
        id: g.id,
        type: "group",
        name: g.name,
        avatar: g.avatar || g.name.slice(0, 1),
        lastMessage: lastMsg
          ? lastMsg.senderName + ": " + lastMsg.content
          : "暂无消息",
        lastTime: lastMsg ? formatTime(lastMsg.timestamp) : "",
        lastTimestamp: lastMsg ? lastMsg.timestamp : "",
        unread,
      });
    }

    // 按最后消息时间倒序排列
    convs.sort((a, b) => {
      if (!a.lastTimestamp) return 1;
      if (!b.lastTimestamp) return -1;
      return b.lastTimestamp.localeCompare(a.lastTimestamp);
    });

    setConversations(convs);
  }, []);

  // 搜索过滤
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.lastMessage.toLowerCase().includes(q)
    );
  }, [conversations, searchQuery]);

  const handleClick = (conv: Conversation) => {
    if (conv.type === "friend") {
      router.push("/friends/chat?id=" + encodeURIComponent(conv.id));
    } else {
      router.push("/groups/chat?id=" + encodeURIComponent(conv.id));
    }
  };

  // ==================== 渲染 ====================
  return (
    <div
      className="flex min-h-screen flex-col bg-[#ededed]"
      style={{ maxWidth: "420px", margin: "0 auto", paddingBottom: "72px" }}
    >
  <PageLoginGuard />
      <BrandHeader title="信息" showBack />

      {/* 搜索栏 */}
      <div className="px-3 py-3">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#999"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索好友/群聊"
            className="w-full rounded-xl bg-white py-2.5 pl-10 pr-4 text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
            style={{ outline: "none" }}
          />
        </div>
      </div>

      {/* 会话列表 */}
      <div className="flex-1 overflow-y-auto px-3">
        {/* 系统通知入口（统一消息中心：提醒/订单/AI报告/奖励），始终置顶显示 */}
        <div className="space-y-2 pt-0">
          <button
            onClick={() => router.push("/messages/system")}
            className="flex w-full items-center gap-3 bg-white rounded-xl p-4 text-left active:bg-gray-50 transition-colors"
          >
            <div className="relative shrink-0">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-white text-xl"
                style={{ backgroundColor: "#0d9488" }}
              >
                🔔
              </div>
              {sysUnread > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                  {sysUnread > 99 ? "99+" : sysUnread}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-800">系统通知</span>
                <span className="ml-2 shrink-0 text-xs text-gray-400">{sysUnread > 0 ? "有新通知" : ""}</span>
              </div>
              <p className="mt-0.5 truncate text-xs text-gray-500">
                {sysLatest ? sysLatest.title : "记事提醒、订单进展、AI 报告结果"}
              </p>
            </div>
          </button>
        </div>
        {filtered.length === 0 ? (
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
            <p className="text-sm text-gray-500">
              {searchQuery ? "未找到匹配的会话" : "暂无消息"}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {searchQuery
                ? "换个关键词试试"
                : "添加好友或加入群聊开始聊天吧"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((conv) => (
              <button
                key={conv.type + "_" + conv.id}
                onClick={() => handleClick(conv)}
                className="flex w-full items-center gap-3 bg-white rounded-xl p-4 text-left active:bg-gray-50 transition-colors"
              >
                {/* 头像 */}
                <div className="relative shrink-0">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-full text-white font-bold"
                    style={{
                      backgroundColor:
                        conv.type === "group" ? "#5B2D8E" : BRAND,
                      fontSize: "18px",
                    }}
                  >
                    {conv.avatar.slice(0, 1)}
                  </div>
                  {/* 未读红点 */}
                  {conv.unread > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                      {conv.unread > 99 ? "99+" : conv.unread}
                    </span>
                  )}
                </div>

                {/* 信息区 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-800 truncate">
                      {conv.name}
                      {conv.type === "group" && (
                        <span className="text-xs font-normal text-gray-400 ml-1">
                          (群)
                        </span>
                      )}
                    </span>
                    <span className="ml-2 shrink-0 text-xs text-gray-400">
                      {conv.lastTime}
                    </span>
                  </div>
                  <p
                    className={`mt-0.5 truncate text-xs ${
                      conv.unread > 0 ? "text-gray-700 font-medium" : "text-gray-500"
                    }`}
                  >
                    {conv.lastMessage}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 底部品牌信息 */}
      <div className="py-3 text-center">
        <p className="text-[11px] text-gray-400">yandao.vip 分享下载有礼</p>
      </div>
    </div>
  );
}