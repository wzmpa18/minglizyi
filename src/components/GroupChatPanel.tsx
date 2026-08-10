"use client";

import { useState, useCallback, useEffect } from "react";
import {
  createGroupChat,
  sendGroupMessage,
  getGroupMessages,
  getUserGroups,
  GROUP_CONFIG,
  type GroupChatInfo,
  type GroupMessage,
} from "@/lib/groupChatService";

/**
 * v20.0 群聊生态升级 - 群聊面板组件
 *
 * 功能：
 * 1. Tab 切换：我的群聊 / 创建群聊
 * 2. 我的群聊：展示用户参与的群聊列表（群名、人数、最后活跃时间、角色）
 * 3. 创建群聊：输入群名和描述，生成邀请码
 * 4. 点击群聊进入消息界面（消息列表 + 输入框）
 * 5. 消息发送后 AI 审核提示（敏感词拦截）
 * 6. 群聊容量限制提示（基础 50 人 / VIP 200 人）
 *
 * 合规声明：群聊内容仅供学习交流，禁止发布违规信息
 */

interface GroupChatPanelProps {
  show: boolean;
  onClose: () => void;
}

type TabType = "myGroups" | "create";

// 紫色主题
const THEME = {
  primary: "#7B2FBE",
  primaryLight: "#f5f0fa",
  primaryDark: "#6A1FA8",
};

export default function GroupChatPanel({ show, onClose }: GroupChatPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("myGroups");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  // 群聊列表
  const [groups, setGroups] = useState<GroupChatInfo[]>([]);
  const [groupTotal, setGroupTotal] = useState(0);

  // 创建群聊
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [createdGroupId, setCreatedGroupId] = useState("");

  // 消息界面
  const [selectedGroup, setSelectedGroup] = useState<GroupChatInfo | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const [moderationTip, setModerationTip] = useState("");
  const [msgLoading, setMsgLoading] = useState(false);

  // 锁定 body 滚动
  useEffect(() => {
    document.body.style.overflow = show ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [show]);

  // 显示提示
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }, []);

  // 加载群聊列表
  const loadGroups = useCallback(async () => {
    setLoading(true);
    const result = await getUserGroups();
    if (result) {
      setGroups(result.groups || []);
      setGroupTotal(result.total || 0);
    } else {
      setGroups([]);
      setGroupTotal(0);
    }
    setLoading(false);
  }, []);

  // 面板显示且在「我的群聊」Tab 时加载数据
  useEffect(() => {
    if (!show) return;
    if (activeTab === "myGroups") {
      loadGroups();
    }
  }, [show, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // 格式化时间
  const formatLastActive = useCallback((iso: string): string => {
    if (!iso) return "未知";
    try {
      const date = new Date(iso);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);
      if (diffMin < 1) return "刚刚";
      if (diffMin < 60) return `${diffMin} 分钟前`;
      if (diffHour < 24) return `${diffHour} 小时前`;
      if (diffDay < 7) return `${diffDay} 天前`;
      return `${date.getMonth() + 1}月${date.getDate()}日`;
    } catch {
      return "未知";
    }
  }, []);

  // 格式化消息时间
  const formatMsgTime = useCallback((iso: string): string => {
    if (!iso) return "";
    try {
      const date = new Date(iso);
      return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    } catch {
      return "";
    }
  }, []);

  // 获取角色显示文案
  const getRoleLabel = useCallback((role: string): string => {
    switch (role) {
      case "owner":
        return "群主";
      case "admin":
        return "管理员";
      default:
        return "成员";
    }
  }, []);

  // 获取角色颜色
  const getRoleColor = useCallback((role: string): string => {
    switch (role) {
      case "owner":
        return THEME.primary;
      case "admin":
        return "#e67e22";
      default:
        return "#999";
    }
  }, []);

  // 容量百分比
  const getCapacityPercent = useCallback((current: number, max: number): number => {
    if (max <= 0) return 0;
    return Math.min(100, Math.round((current / max) * 100));
  }, []);

  // 创建群聊
  const handleCreateGroup = useCallback(async () => {
    if (!createName.trim()) {
      showToast("请输入群聊名称");
      return;
    }
    if (createName.trim().length > 20) {
      showToast("群聊名称不能超过20个字");
      return;
    }
    setCreating(true);
    const result = await createGroupChat(createName.trim(), createDesc.trim());
    setCreating(false);
    if (result.success && result.groupId && result.inviteCode) {
      setInviteCode(result.inviteCode);
      setCreatedGroupId(result.groupId);
      showToast("群聊创建成功！");
    } else {
      showToast(result.error || "创建失败，请重试");
    }
  }, [createName, createDesc, showToast]);

  // 复制邀请码
  const handleCopyInviteCode = useCallback(() => {
    if (!inviteCode) return;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(inviteCode).then(
        () => showToast("邀请码已复制到剪贴板"),
        () => showToast("复制失败，请手动复制")
      );
    } else {
      showToast("邀请码：" + inviteCode);
    }
  }, [inviteCode, showToast]);

  // 重置创建表单
  const handleResetCreate = useCallback(() => {
    setCreateName("");
    setCreateDesc("");
    setInviteCode("");
    setCreatedGroupId("");
  }, []);

  // 选择群聊 -> 进入消息界面
  const handleSelectGroup = useCallback(async (group: GroupChatInfo) => {
    setSelectedGroup(group);
    setMessages([]);
    setMessageInput("");
    setModerationTip("");
    setMsgLoading(true);
    const result = await getGroupMessages(group.id, 1, 50);
    if (result) {
      setMessages(result.messages || []);
    }
    setMsgLoading(false);
  }, []);

  // 返回群聊列表
  const handleBackToList = useCallback(() => {
    setSelectedGroup(null);
    setMessages([]);
    setMessageInput("");
    setModerationTip("");
  }, []);

  // 发送消息
  const handleSendMessage = useCallback(async () => {
    if (!selectedGroup) return;
    const content = messageInput.trim();
    if (!content) {
      showToast("请输入消息内容");
      return;
    }
    if (content.length > 500) {
      showToast("消息不能超过500字");
      return;
    }
    setSending(true);
    setModerationTip("");
    const result = await sendGroupMessage(selectedGroup.id, content, "text");
    setSending(false);
    if (result.success && result.data) {
      // AI 审核通过
      setMessages(prev => [...prev, result.data!]);
      setMessageInput("");
      if (!result.data!.moderationPassed) {
        setModerationTip("您的消息包含敏感词，已被系统拦截审核");
      } else {
        showToast("消息发送成功");
      }
    } else {
      // 发送失败 - 可能是 AI 审核未通过
      if (result.error && (result.error.includes("敏感") || result.error.includes("违规") || result.error.includes("审核"))) {
        setModerationTip(result.error);
      } else {
        showToast(result.error || "发送失败，请重试");
      }
    }
  }, [selectedGroup, messageInput, showToast]);

  // 键盘回车发送
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      {/* 遮罩层 */}
      <div
        onClick={onClose}
        style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.4)" }}
      />

      {/* 面板主体 */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "420px",
          maxHeight: "85vh",
          backgroundColor: "#fff",
          borderTopLeftRadius: "16px",
          borderTopRightRadius: "16px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* 头部 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            borderBottom: "1px solid #f0f0f0",
            flexShrink: 0,
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1a1a1a" }}>
            💬 群聊生态 · v20.0
          </h3>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "none",
              backgroundColor: "#f5f5f5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            ✕
          </button>
        </div>

        {/* 合规提示 */}
        <div
          style={{
            padding: "8px 16px",
            backgroundColor: "#fff8e1",
            fontSize: 11,
            color: "#e65100",
            textAlign: "center",
            flexShrink: 0,
          }}
        >
          群聊内容仅供学习交流，禁止发布违规信息
        </div>

        {/* 消息界面（覆盖在 Tab 之上） */}
        {selectedGroup ? (
          <>
            {/* 消息界面头部 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 16px",
                borderBottom: "1px solid #f0f0f0",
                flexShrink: 0,
                backgroundColor: THEME.primaryLight,
              }}
            >
              <button
                onClick={handleBackToList}
                style={{
                  border: "none",
                  background: "none",
                  fontSize: 18,
                  cursor: "pointer",
                  color: THEME.primary,
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                ‹
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {selectedGroup.name}
                </div>
                <div style={{ fontSize: 11, color: "#999" }}>
                  {selectedGroup.memberCount}/{selectedGroup.maxMembers} 人 ·{" "}
                  {getRoleLabel(selectedGroup.role)}
                </div>
              </div>
              {/* 容量提示 */}
              <div style={{ fontSize: 11, color: THEME.primary, fontWeight: 600, flexShrink: 0 }}>
                {selectedGroup.maxMembers >= GROUP_CONFIG.MAX_MEMBERS_VIP ? "VIP群" : "基础群"}
              </div>
            </div>

            {/* 容量进度条 */}
            <div
              style={{
                padding: "6px 16px",
                backgroundColor: "#fafafa",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#999", marginBottom: 4 }}>
                <span>群聊容量</span>
                <span>
                  {selectedGroup.memberCount}/{selectedGroup.maxMembers} 人
                </span>
              </div>
              <div
                style={{
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: "#eee",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    borderRadius: 2,
                    width: `${getCapacityPercent(selectedGroup.memberCount, selectedGroup.maxMembers)}%`,
                    backgroundColor:
                      getCapacityPercent(selectedGroup.memberCount, selectedGroup.maxMembers) >= 90
                        ? "#e74c3c"
                        : THEME.primary,
                    transition: "width 0.3s",
                  }}
                />
              </div>
            </div>

            {/* AI 审核提示 */}
            {moderationTip && (
              <div
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#fde8e8",
                  fontSize: 12,
                  color: "#c0392b",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: 14 }}>⚠</span>
                <span style={{ flex: 1 }}>{moderationTip}</span>
                <button
                  onClick={() => setModerationTip("")}
                  style={{
                    border: "none",
                    background: "none",
                    fontSize: 12,
                    color: "#c0392b",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  ✕
                </button>
              </div>
            )}

            {/* 消息列表 */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "12px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                backgroundColor: "#f9f9f9",
              }}
            >
              {msgLoading ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#999", fontSize: 14 }}>
                  加载中...
                </div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#999", fontSize: 14 }}>
                  暂无消息，发送第一条消息吧！
                </div>
              ) : (
                messages.map(msg => (
                  <div
                    key={msg.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      alignItems: msg.userId === selectedGroup.creatorId ? "flex-start" : "flex-start",
                    }}
                  >
                    {/* 昵称 + 时间 */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: THEME.primary }}>
                        {msg.nickname}
                      </span>
                      <span style={{ fontSize: 10, color: "#bbb" }}>
                        {formatMsgTime(msg.timestamp)}
                      </span>
                      {msg.userId === selectedGroup.creatorId && (
                        <span
                          style={{
                            fontSize: 9,
                            padding: "1px 4px",
                            borderRadius: 3,
                            backgroundColor: THEME.primary,
                            color: "#fff",
                            fontWeight: 600,
                          }}
                        >
                          群主
                        </span>
                      )}
                    </div>
                    {/* 消息气泡 */}
                    <div
                      style={{
                        maxWidth: "75%",
                        padding: "8px 12px",
                        borderRadius: 10,
                        backgroundColor: msg.moderationPassed ? "#fff" : "#fff3cd",
                        border: msg.moderationPassed ? "1px solid #eee" : "1px solid #ffe082",
                        fontSize: 14,
                        color: msg.moderationPassed ? "#333" : "#856404",
                        lineHeight: 1.5,
                        wordBreak: "break-word",
                      }}
                    >
                      {msg.content}
                      {!msg.moderationPassed && (
                        <div style={{ fontSize: 10, color: "#e65100", marginTop: 4 }}>
                          ⚠ 该消息疑似包含敏感词
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 输入框区域 */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 8,
                padding: "10px 12px",
                borderTop: "1px solid #f0f0f0",
                flexShrink: 0,
                backgroundColor: "#fff",
              }}
            >
              <textarea
                value={messageInput}
                onChange={e => setMessageInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入消息（回车发送，Shift+回车换行）..."
                rows={1}
                style={{
                  flex: 1,
                  resize: "none",
                  border: "1px solid #e0d0ea",
                  borderRadius: 8,
                  padding: "8px 12px",
                  fontSize: 14,
                  outline: "none",
                  maxHeight: 80,
                  lineHeight: 1.5,
                  fontFamily: "inherit",
                }}
              />
              <button
                onClick={handleSendMessage}
                disabled={sending || !messageInput.trim()}
                style={{
                  flexShrink: 0,
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: 8,
                  backgroundColor: sending || !messageInput.trim() ? "#ccc" : THEME.primary,
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: sending || !messageInput.trim() ? "not-allowed" : "pointer",
                }}
              >
                {sending ? "发送中" : "发送"}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Tab 切换 */}
            <div
              style={{
                display: "flex",
                padding: "8px 12px",
                gap: 8,
                flexShrink: 0,
                borderBottom: "1px solid #f0f0f0",
              }}
            >
              {(
                [
                  { key: "myGroups", label: "我的群聊" },
                  { key: "create", label: "创建群聊" },
                ] as const
              ).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    border: "none",
                    borderRadius: 8,
                    backgroundColor: activeTab === tab.key ? THEME.primary : THEME.primaryLight,
                    color: activeTab === tab.key ? "#fff" : THEME.primary,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 内容区域 */}
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
              {/* ===================== 我的群聊 ===================== */}
              {activeTab === "myGroups" && (
                <div>
                  {/* 容量说明 */}
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      padding: "10px 12px",
                      marginBottom: 12,
                      borderRadius: 8,
                      backgroundColor: THEME.primaryLight,
                      fontSize: 12,
                      color: THEME.primaryDark,
                    }}
                  >
                    <span style={{ fontSize: 14 }}>📋</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, marginBottom: 2 }}>群聊容量限制</div>
                      <div style={{ color: "#666" }}>
                        基础用户：每群上限 {GROUP_CONFIG.MAX_MEMBERS_BASIC} 人 ｜ VIP 用户：每群上限{" "}
                        {GROUP_CONFIG.MAX_MEMBERS_VIP} 人
                      </div>
                    </div>
                  </div>

                  {loading && groups.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 0", color: "#999", fontSize: 14 }}>
                      加载中...
                    </div>
                  ) : groups.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 0", color: "#999", fontSize: 14 }}>
                      您还没有加入任何群聊
                      <br />
                      <span style={{ fontSize: 12, color: "#bbb" }}>点击「创建群聊」发起第一个学习群组</span>
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: 12, color: "#999", marginBottom: 12 }}>
                        共 {groupTotal} 个群聊
                      </div>
                      {groups.map(group => {
                        const capacityPercent = getCapacityPercent(group.memberCount, group.maxMembers);
                        const isNearFull = capacityPercent >= 80;
                        const isVip = group.maxMembers >= GROUP_CONFIG.MAX_MEMBERS_VIP;
                        return (
                          <div
                            key={group.id}
                            onClick={() => handleSelectGroup(group)}
                            style={{
                              display: "flex",
                              gap: 12,
                              padding: 12,
                              marginBottom: 8,
                              borderRadius: 10,
                              border: "1px solid #f0f0f0",
                              backgroundColor: "#fafafa",
                              cursor: "pointer",
                              transition: "all 0.2s",
                            }}
                            onMouseEnter={e => {
                              (e.currentTarget as HTMLDivElement).style.borderColor = THEME.primary;
                              (e.currentTarget as HTMLDivElement).style.backgroundColor = THEME.primaryLight;
                            }}
                            onMouseLeave={e => {
                              (e.currentTarget as HTMLDivElement).style.borderColor = "#f0f0f0";
                              (e.currentTarget as HTMLDivElement).style.backgroundColor = "#fafafa";
                            }}
                          >
                            {/* 群头像 */}
                            <div
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: 10,
                                backgroundColor: THEME.primary,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 20,
                                flexShrink: 0,
                                color: "#fff",
                              }}
                            >
                              {group.name.charAt(0) || "群"}
                            </div>
                            {/* 群信息 */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                <span
                                  style={{
                                    fontSize: 14,
                                    fontWeight: 600,
                                    color: "#333",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    maxWidth: 140,
                                  }}
                                >
                                  {group.name}
                                </span>
                                <span
                                  style={{
                                    fontSize: 10,
                                    padding: "1px 6px",
                                    borderRadius: 4,
                                    backgroundColor: getRoleColor(group.role),
                                    color: "#fff",
                                    fontWeight: 600,
                                  }}
                                >
                                  {getRoleLabel(group.role)}
                                </span>
                                {isVip && (
                                  <span
                                    style={{
                                      fontSize: 10,
                                      padding: "1px 6px",
                                      borderRadius: 4,
                                      backgroundColor: "#f39c12",
                                      color: "#fff",
                                      fontWeight: 600,
                                    }}
                                  >
                                    VIP
                                  </span>
                                )}
                              </div>
                              {/* 人数 + 活跃时间 */}
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, fontSize: 12, color: "#999" }}>
                                <span>
                                  👥 {group.memberCount}/{group.maxMembers} 人
                                </span>
                                <span style={{ color: "#ddd" }}>|</span>
                                <span>🕒 {formatLastActive(group.lastActiveAt)}</span>
                              </div>
                              {/* 容量进度 */}
                              <div
                                style={{
                                  marginTop: 6,
                                  height: 4,
                                  borderRadius: 2,
                                  backgroundColor: "#eee",
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    height: "100%",
                                    borderRadius: 2,
                                    width: `${capacityPercent}%`,
                                    backgroundColor: isNearFull ? "#e74c3c" : THEME.primary,
                                  }}
                                />
                              </div>
                              {isNearFull && (
                                <div style={{ fontSize: 10, color: "#e74c3c", marginTop: 4 }}>
                                  群聊即将满员（{capacityPercent}%）
                                </div>
                              )}
                              {/* 未读消息 */}
                              {group.unreadCount > 0 && (
                                <div style={{ marginTop: 4 }}>
                                  <span
                                    style={{
                                      display: "inline-block",
                                      fontSize: 10,
                                      padding: "1px 6px",
                                      borderRadius: 8,
                                      backgroundColor: "#e74c3c",
                                      color: "#fff",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {group.unreadCount} 条未读
                                  </span>
                                </div>
                              )}
                            </div>
                            {/* 进入箭头 */}
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                fontSize: 18,
                                color: "#ccc",
                                flexShrink: 0,
                              }}
                            >
                              ›
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              )}

              {/* ===================== 创建群聊 ===================== */}
              {activeTab === "create" && (
                <div>
                  {/* 容量说明 */}
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      padding: "10px 12px",
                      marginBottom: 16,
                      borderRadius: 8,
                      backgroundColor: THEME.primaryLight,
                      fontSize: 12,
                      color: THEME.primaryDark,
                    }}
                  >
                    <span style={{ fontSize: 14 }}>💡</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, marginBottom: 2 }}>创建说明</div>
                      <div style={{ color: "#666", lineHeight: 1.6 }}>
                        · 基础用户群聊容量上限 {GROUP_CONFIG.MAX_MEMBERS_BASIC} 人
                        <br />· VIP 用户群聊容量上限 {GROUP_CONFIG.MAX_MEMBERS_VIP} 人
                        <br />· 创建成功后将生成专属邀请码，可分享给好友加入
                      </div>
                    </div>
                  </div>

                  {/* 邀请码展示（创建成功后） */}
                  {inviteCode ? (
                    <div
                      style={{
                        padding: 16,
                        borderRadius: 10,
                        border: "2px dashed " + THEME.primary,
                        backgroundColor: THEME.primaryLight,
                        textAlign: "center",
                        marginBottom: 16,
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 600, color: THEME.primary, marginBottom: 8 }}>
                        🎉 群聊创建成功！
                      </div>
                      <div style={{ fontSize: 12, color: "#666", marginBottom: 12 }}>
                        群聊名称：{createName}
                      </div>
                      <div style={{ fontSize: 12, color: "#999", marginBottom: 4 }}>您的邀请码</div>
                      <div
                        style={{
                          fontSize: 24,
                          fontWeight: 700,
                          letterSpacing: 4,
                          color: THEME.primary,
                          fontFamily: "monospace",
                          padding: "8px 0",
                          backgroundColor: "#fff",
                          borderRadius: 8,
                          marginBottom: 12,
                        }}
                      >
                        {inviteCode}
                      </div>
                      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                        <button
                          onClick={handleCopyInviteCode}
                          style={{
                            padding: "8px 20px",
                            border: "none",
                            borderRadius: 8,
                            backgroundColor: THEME.primary,
                            color: "#fff",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          复制邀请码
                        </button>
                        <button
                          onClick={() => {
                            handleResetCreate();
                            setActiveTab("myGroups");
                          }}
                          style={{
                            padding: "8px 20px",
                            border: "1px solid " + THEME.primary,
                            borderRadius: 8,
                            backgroundColor: "#fff",
                            color: THEME.primary,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          查看我的群聊
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* 群聊名称输入 */}
                      <div style={{ marginBottom: 16 }}>
                        <label
                          style={{
                            display: "block",
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#333",
                            marginBottom: 6,
                          }}
                        >
                          群聊名称 <span style={{ color: "#e74c3c" }}>*</span>
                        </label>
                        <input
                          type="text"
                          value={createName}
                          onChange={e => setCreateName(e.target.value)}
                          maxLength={20}
                          placeholder="例如：紫微斗数学习交流群"
                          style={{
                            width: "100%",
                            boxSizing: "border-box",
                            padding: "10px 12px",
                            border: "1px solid #e0d0ea",
                            borderRadius: 8,
                            fontSize: 14,
                            outline: "none",
                            fontFamily: "inherit",
                          }}
                        />
                        <div style={{ fontSize: 11, color: "#bbb", marginTop: 4, textAlign: "right" }}>
                          {createName.length}/20
                        </div>
                      </div>

                      {/* 群聊描述输入 */}
                      <div style={{ marginBottom: 16 }}>
                        <label
                          style={{
                            display: "block",
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#333",
                            marginBottom: 6,
                          }}
                        >
                          群聊描述
                        </label>
                        <textarea
                          value={createDesc}
                          onChange={e => setCreateDesc(e.target.value)}
                          maxLength={100}
                          placeholder="简要描述群聊主题和规则，方便成员了解..."
                          rows={3}
                          style={{
                            width: "100%",
                            boxSizing: "border-box",
                            padding: "10px 12px",
                            border: "1px solid #e0d0ea",
                            borderRadius: 8,
                            fontSize: 14,
                            outline: "none",
                            resize: "none",
                            fontFamily: "inherit",
                            lineHeight: 1.5,
                          }}
                        />
                        <div style={{ fontSize: 11, color: "#bbb", marginTop: 4, textAlign: "right" }}>
                          {createDesc.length}/100
                        </div>
                      </div>

                      {/* 提交按钮 */}
                      <button
                        onClick={handleCreateGroup}
                        disabled={creating || !createName.trim()}
                        style={{
                          width: "100%",
                          padding: "12px 0",
                          border: "none",
                          borderRadius: 8,
                          backgroundColor: creating || !createName.trim() ? "#ccc" : THEME.primary,
                          color: "#fff",
                          fontSize: 15,
                          fontWeight: 700,
                          cursor: creating || !createName.trim() ? "not-allowed" : "pointer",
                        }}
                      >
                        {creating ? "创建中..." : "创建群聊"}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Toast 提示 */}
        {toast && (
          <div
            style={{
              position: "absolute",
              bottom: 20,
              left: "50%",
              transform: "translateX(-50%)",
              padding: "8px 20px",
              borderRadius: 8,
              backgroundColor: "rgba(0,0,0,0.75)",
              color: "#fff",
              fontSize: 13,
              whiteSpace: "nowrap",
              zIndex: 10000,
              animation: "fadeIn 0.3s",
            }}
          >
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
