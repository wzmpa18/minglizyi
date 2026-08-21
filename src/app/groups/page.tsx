"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BrandHeader } from "@/components/shared";
import { useToolBack } from "@/lib/useToolBack";
import {
  getGroups,
  getGroupMessages,
  isLegacyLocalGroupId,
  type GroupInfo,
} from "@/lib/socialStore";
import { fetchGroups as apiFetchGroups, fetchConversations, type ConversationVo } from "@/lib/socialApi";

import { PageLoginGuard } from "@/components/PageLoginGuard";
const BRAND = "#7B2FBE";

export default function GroupsPage() {
  const router = useRouter();
  const { showResult, savedParams, saveParams } = useToolBack({
    pageKey: "groups_list",
  });

  const [groups, setGroups] = useState<GroupInfo[]>([]);
  // v25.0.46：服务端会话数据（最后消息/未读数），键为群ID字符串
  const [convMap, setConvMap] = useState<Map<string, ConversationVo>>(new Map());

  useEffect(() => {
    // v25.0.47 P1-A：legacy group_* 本地假群一律不展示（服务端不承认这些ID，点入只会空壳页）
    setGroups(getGroups().filter((g) => !isLegacyLocalGroupId(g.id)));
    // v25.0.19：合并后端真实群组（跨设备/多成员可见）
    void apiFetchGroups().then((r) => {
      const serverGroupsRaw = r && r.success ? r.groups : undefined;
      if (serverGroupsRaw) {
        setGroups((prev) => {
          const ids = new Set(prev.map((g) => g.id));
          const serverGroups: GroupInfo[] = serverGroupsRaw
            .filter((g) => !ids.has(g.groupId))
            .map((g) => ({
              id: g.groupId,
              name: g.name,
              avatar: g.name.slice(0, 1),
              ownerId: g.ownerId,
              ownerName: g.ownerName || "",
              // v25.0.46：填充服务端成员，列表成员数真实显示
              members: (g.memberIds || []).map((id) => ({
                userId: id,
                name: String(id) === String(g.ownerId) ? (g.ownerName || "群主") : "群成员",
                avatar: "友",
                role: String(id) === String(g.ownerId) ? ("owner" as const) : ("member" as const),
                joinedAt: g.createdAt || "",
              })),
              announcement: g.announcement || "",
              maxMembers: 50,
              level: "small" as const,
              createdAt: g.createdAt || "",
              tags: [],
            }));
          return [...prev, ...serverGroups];
        });
      }
    }).catch(() => {});
    // v25.0.46：统一会话接口拉取群最后消息/未读数
    void fetchConversations().then((r) => {
      if (r && r.success && r.conversations) {
        const m = new Map<string, ConversationVo>();
        for (const c of r.conversations) {
          if (c.type === "group" && c.groupId !== undefined) {
            m.set(String(c.groupId), c);
          }
        }
        setConvMap(m);
      }
    }).catch(() => {});
  }, []);

  const handleGoToChat = (group: GroupInfo) => {
    router.push("/groups/chat?id=" + encodeURIComponent(group.id));
  };

  const handleCreateGroup = () => {
    router.push("/groups/create");
  };

  const getLastMessage = (group: GroupInfo) => {
    // v25.0.46：优先服务端会话的最后一条消息
    const conv = convMap.get(String(group.id));
    if (conv && conv.lastMessage && conv.lastMessage.content) {
      const prefix = conv.type === "group" ? (conv.lastMessage.senderName ? conv.lastMessage.senderName + "：" : "") : "";
      return prefix + conv.lastMessage.content;
    }
    const msgs = getGroupMessages(group.id);
    if (msgs.length === 0) return "暂无消息";
    const last = msgs[msgs.length - 1];
    return last.senderName + ": " + last.content;
  };

  const getLastTime = (group: GroupInfo) => {
    const conv = convMap.get(String(group.id));
    if (conv && conv.lastMessage && conv.lastMessage.createdAt) {
      try {
        return new Date(conv.lastMessage.createdAt).toLocaleTimeString(
          "zh-CN",
          { hour: "2-digit", minute: "2-digit" }
        );
      } catch {
        return "";
      }
    }
    const msgs = getGroupMessages(group.id);
    if (msgs.length === 0) return "";
    try {
      return new Date(msgs[msgs.length - 1].timestamp).toLocaleTimeString(
        "zh-CN",
        { hour: "2-digit", minute: "2-digit" }
      );
    } catch {
      return "";
    }
  };

  const getUnread = (group: GroupInfo) => {
    const conv = convMap.get(String(group.id));
    return conv ? conv.unread : 0;
  };

  const levelLabel: Record<string, string> = {
    small: "小群(50人)",
    medium: "中群(100人)",
    large: "大群(200人)",
    vip: "VIP群(500人)",
  };

  return (
    <div
      className="flex min-h-screen flex-col bg-[#ededed]"
      style={{ maxWidth: "420px", margin: "0 auto" }}
    >
  <PageLoginGuard />
      <BrandHeader title="群聊" showBack />

      <div className="flex-1 overflow-y-auto">
        {groups.length === 0 ? (
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
            <p className="text-sm text-gray-500">暂无群聊</p>
            <p className="text-xs text-gray-400 mt-1">
              创建一个群聊或加入已有群聊
            </p>
          </div>
        ) : (
          <div className="mt-3 mx-3 space-y-2">
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => handleGoToChat(group)}
                className="flex w-full items-center gap-3 bg-white rounded-xl p-4 text-left active:bg-gray-50 transition-colors"
              >
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white font-bold"
                  style={{
                    backgroundColor: BRAND,
                    fontSize: "18px",
                  }}
                >
                  {group.avatar || group.name.slice(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-800 truncate">
                      {group.name}
                    </span>
                    <span className="ml-2 shrink-0 text-xs text-gray-400">
                      {getLastTime(group)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500 truncate">
                    {getLastMessage(group)}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] text-gray-400">
                  {group.members.length}位成员
                </span>
                <span
                  className="text-[11px] rounded px-1.5 py-0.5"
                  style={{
                    backgroundColor: BRAND + "15",
                    color: BRAND,
                  }}
                >
                  {levelLabel[group.level] || group.level}
                </span>
              </div>
              {getUnread(group) > 0 && (
                <span
                  className="mt-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white"
                  style={{ backgroundColor: "#F44336" }}
                >
                  {getUnread(group) > 99 ? "99+" : getUnread(group)}
                </span>
              )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-3 py-3">
        <button
          onClick={handleCreateGroup}
          className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-colors active:opacity-90"
          style={{ backgroundColor: BRAND }}
        >
          创建群聊
        </button>
      </div>

      <div className="py-2 text-center">
        <p className="text-[11px] text-gray-400">yandao.vip 分享下载有礼</p>
      </div>

      <div className="page-bottom-nav-safe" aria-hidden="true" />
    </div>
  );
}