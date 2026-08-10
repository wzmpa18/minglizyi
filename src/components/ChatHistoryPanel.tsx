"use client";

import { useState, useCallback, useEffect } from "react";
import {
  getChatHistoryList,
  getChatHistoryDetail,
  deleteChatHistory,
  batchDeleteChatHistories,
  clearAllChatHistories,
  exportChatHistory,
  backupUserChats,
  restoreBackup,
  formatHistoryTime,
  CHAT_HISTORY_CONFIG,
  type ChatHistoryItem,
  type ChatHistoryDetail,
  type BackupInfo,
} from "@/lib/chatHistoryService";

/**
 * v20.0 聊天记录管理与云端备份 - 前端展示组件
 *
 * 功能区域：
 * 1. Tab 切换：聊天记录 / 云端备份
 * 2. 聊天记录 Tab：展示用户历史聊天记录列表（工具名称、消息数、时间、预览）
 * 3. 详情展示：点击列表项查看完整消息对话记录
 * 4. 删除单条记录
 * 5. 导出功能：支持 json / txt / csv 三种格式下载
 * 6. 云端备份 Tab：一键备份所有聊天记录、显示备份信息、支持恢复备份
 * 7. 容量提示：免费用户 100 条上限、VIP 用户 10000 条上限
 *
 * 数据安全声明：聊天记录云端加密备份，仅本人可查看
 */

// --- 紫色主题 ---
const THEME = {
  primary: "#7B2FBE",
  primaryLight: "#9B5ECF",
  primaryBg: "#f3edf7",
  primaryDark: "#6A1FA8",
};

// --- 消息角色标签 ---
const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  user: { label: "我", color: THEME.primary },
  assistant: { label: "AI", color: "#27ae60" },
  system: { label: "系统", color: "#999" },
};

// --- 导出格式配置 ---
const EXPORT_FORMATS: { key: "json" | "txt" | "csv"; label: string; icon: string }[] = [
  { key: "json", label: "JSON", icon: "{}" },
  { key: "txt", label: "TXT", icon: "TXT" },
  { key: "csv", label: "CSV", icon: "CSV" },
];

// --- 工具函数：格式化备份大小 ---
function formatBackupSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// --- 工具函数：下载文件 ---
function downloadFile(content: string, fileName: string, format: string) {
  if (typeof window === "undefined") return;
  const mimeTypes: Record<string, string> = {
    json: "application/json;charset=utf-8",
    txt: "text/plain;charset=utf-8",
    csv: "text/csv;charset=utf-8",
  };
  const blob = new Blob([content], { type: mimeTypes[format] || "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// --- 组件 Props ---
interface ChatHistoryPanelProps {
  show: boolean;
  onClose: () => void;
}

type TabType = "history" | "backup";

export default function ChatHistoryPanel({ show, onClose }: ChatHistoryPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("history");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  // 聊天记录列表
  const [histories, setHistories] = useState<ChatHistoryItem[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);

  // 详情视图
  const [selectedDetail, setSelectedDetail] = useState<ChatHistoryDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [exporting, setExporting] = useState<string>("");

  // 删除确认
  const [deletingId, setDeletingId] = useState<string>("");

  // v20.1: 批量管理模式
  const [manageMode, setManageMode] = useState(false); // 是否处于批量管理模式
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set()); // 选中的记录ID
  const [batchDeleting, setBatchDeleting] = useState(false); // 批量删除进行中
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false); // 清空全部确认弹窗
  const [clearingAll, setClearingAll] = useState(false); // 清空全部进行中

  // 云端备份
  const [backupInfo, setBackupInfo] = useState<BackupInfo | null>(null);
  const [backing, setBacking] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // 显示提示
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }, []);

  // 锁定 body 滚动
  useEffect(() => {
    document.body.style.overflow = show ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [show]);

  // 加载聊天记录列表
  const loadList = useCallback(async () => {
    setLoading(true);
    const result = await getChatHistoryList(1, 50);
    if (result) {
      setHistories(result.histories || []);
      setHistoryTotal(result.total || 0);
    } else {
      setHistories([]);
      setHistoryTotal(0);
    }
    setLoading(false);
  }, []);

  // 面板显示时首次加载数据
  useEffect(() => {
    if (show && activeTab === "history") {
      loadList();
    }
  }, [show, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // 查看详情
  const handleViewDetail = useCallback(async (historyId: string) => {
    setDetailLoading(true);
    setSelectedDetail(null);
    const detail = await getChatHistoryDetail(historyId);
    if (detail) {
      setSelectedDetail(detail);
    } else {
      showToast("获取详情失败，请重试");
    }
    setDetailLoading(false);
  }, [showToast]);

  // 返回列表
  const handleBackToList = useCallback(() => {
    setSelectedDetail(null);
  }, []);

  // 删除单条记录
  const handleDelete = useCallback(async (historyId: string) => {
    setDeletingId(historyId);
    const result = await deleteChatHistory(historyId);
    setDeletingId("");
    if (result.success) {
      showToast("删除成功");
      // 从列表中移除
      setHistories(prev => prev.filter(h => h.id !== historyId));
      setHistoryTotal(prev => Math.max(0, prev - 1));
      // 如果在详情视图，返回列表
      if (selectedDetail && selectedDetail.id === historyId) {
        setSelectedDetail(null);
      }
    } else {
      showToast(result.error || "删除失败，请重试");
    }
  }, [showToast, selectedDetail]);

  // v20.1: 进入批量管理模式
  const handleEnterManage = useCallback(() => {
    setManageMode(true);
    setSelectedIds(new Set());
  }, []);

  // v20.1: 退出批量管理模式
  const handleExitManage = useCallback(() => {
    setManageMode(false);
    setSelectedIds(new Set());
  }, []);

  // v20.1: 切换选中状态
  const handleToggleSelect = useCallback((historyId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(historyId)) {
        next.delete(historyId);
      } else {
        next.add(historyId);
      }
      return next;
    });
  }, []);

  // v20.1: 全选/取消全选
  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === histories.length && histories.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(histories.map(h => h.id)));
    }
  }, [selectedIds.size, histories]);

  // v20.1: 批量删除选中记录
  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBatchDeleting(true);
    const idsToDelete = Array.from(selectedIds);
    const result = await batchDeleteChatHistories(idsToDelete);
    setBatchDeleting(false);
    if (result.deletedCount > 0) {
      showToast(`成功删除 ${result.deletedCount} 条记录${result.failedIds.length > 0 ? `，${result.failedIds.length} 条失败` : ""}`);
      // 从列表中移除已删除的记录
      const failedSet = new Set(result.failedIds);
      setHistories(prev => prev.filter(h => failedSet.has(h.id)));
      setHistoryTotal(prev => Math.max(0, prev - result.deletedCount));
      setSelectedIds(new Set());
      setManageMode(false);
    } else {
      showToast("删除失败，请重试");
    }
  }, [selectedIds, showToast]);

  // v20.1: 清空全部聊天记录
  const handleClearAll = useCallback(async () => {
    setClearingAll(true);
    const result = await clearAllChatHistories();
    setClearingAll(false);
    setShowClearAllConfirm(false);
    if (result.success || result.deletedCount > 0) {
      showToast(`成功清空 ${result.deletedCount} 条记录`);
      setHistories([]);
      setHistoryTotal(0);
      setSelectedIds(new Set());
      setManageMode(false);
    } else {
      showToast(result.error || "清空失败，请重试");
    }
  }, [showToast]);

  // 导出聊天记录
  const handleExport = useCallback(async (historyId: string, format: "json" | "txt" | "csv") => {
    setExporting(format);
    const result = await exportChatHistory(historyId, format);
    setExporting("");
    if (result) {
      downloadFile(result.content, result.fileName, result.format);
      showToast(`${format.toUpperCase()} 导出成功`);
    } else {
      showToast("导出失败，请重试");
    }
  }, [showToast]);

  // 一键备份
  const handleBackup = useCallback(async () => {
    setBacking(true);
    const info = await backupUserChats();
    setBacking(false);
    if (info) {
      setBackupInfo(info);
      showToast("云端备份成功");
    } else {
      showToast("备份失败，请重试");
    }
  }, [showToast]);

  // 恢复备份
  const handleRestore = useCallback(async () => {
    if (!backupInfo) {
      showToast("暂无可恢复的备份");
      return;
    }
    setRestoring(true);
    const result = await restoreBackup(backupInfo.backupId);
    setRestoring(false);
    if (result.success) {
      showToast(`恢复成功，共恢复 ${result.restoredCount || 0} 条记录`);
      // 刷新列表
      loadList();
    } else {
      showToast(result.error || "恢复失败，请重试");
    }
  }, [backupInfo, showToast, loadList]);

  // 获取角色信息
  const getRoleInfo = useCallback((role?: string) => {
    if (!role) return { label: "消息", color: "#999" };
    return ROLE_LABELS[role] || { label: role, color: "#999" };
  }, []);

  // 格式化消息时间
  const formatMsgTime = useCallback((iso?: string): string => {
    if (!iso) return "";
    try {
      const date = new Date(iso);
      return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    } catch {
      return "";
    }
  }, []);

  if (!show) return null;

  // 容量百分比
  const capacityPercent = Math.min(100, Math.round((historyTotal / CHAT_HISTORY_CONFIG.MAX_FREE_HISTORY) * 100));

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
        style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.45)" }}
      />

      {/* 主面板 */}
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
            flexShrink: 0,
            background: `linear-gradient(135deg, ${THEME.primary} 0%, ${THEME.primaryLight} 100%)`,
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#fff" }}>
            💬 聊天记录 · v20.0
          </h3>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "none",
              backgroundColor: "rgba(255,255,255,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: 16,
              color: "#fff",
            }}
          >
            ✕
          </button>
        </div>

        {/* ==================== 详情视图（覆盖在 Tab 之上） ==================== */}
        {selectedDetail || detailLoading ? (
          <>
            {/* 详情头部 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 16px",
                borderBottom: "1px solid #f0f0f0",
                flexShrink: 0,
                backgroundColor: THEME.primaryBg,
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
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#1a1a1a",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {selectedDetail?.toolName || "加载中..."}
                </div>
                <div style={{ fontSize: 11, color: "#999" }}>
                  {selectedDetail ? `${selectedDetail.messageCount} 条消息 · ${formatHistoryTime(selectedDetail.lastUpdated)}` : ""}
                </div>
              </div>
              {selectedDetail?.synced && (
                <span
                  style={{
                    fontSize: 10,
                    padding: "2px 6px",
                    borderRadius: 4,
                    backgroundColor: "#27ae60",
                    color: "#fff",
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  已同步
                </span>
              )}
            </div>

            {/* 消息对话记录 */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "12px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                backgroundColor: "#f9f9f9",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {detailLoading ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#999", fontSize: 14 }}>
                  加载中...
                </div>
              ) : selectedDetail && selectedDetail.messages && selectedDetail.messages.length > 0 ? (
                selectedDetail.messages.map((msg, idx) => {
                  const roleInfo = getRoleInfo(msg.role);
                  const isUser = msg.role === "user";
                  return (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                        alignItems: isUser ? "flex-end" : "flex-start",
                      }}
                    >
                      {/* 角色标签 + 时间 */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: roleInfo.color,
                          }}
                        >
                          {roleInfo.label}
                        </span>
                        {msg.timestamp && (
                          <span style={{ fontSize: 10, color: "#bbb" }}>
                            {formatMsgTime(msg.timestamp)}
                          </span>
                        )}
                      </div>
                      {/* 消息气泡 */}
                      <div
                        style={{
                          maxWidth: "80%",
                          padding: "8px 12px",
                          borderRadius: 10,
                          backgroundColor: isUser ? THEME.primary : "#fff",
                          color: isUser ? "#fff" : "#333",
                          border: isUser ? "none" : "1px solid #eee",
                          fontSize: 14,
                          lineHeight: 1.5,
                          wordBreak: "break-word",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {msg.content || "(空消息)"}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#999", fontSize: 14 }}>
                  暂无消息记录
                </div>
              )}
            </div>

            {/* 详情底部操作栏 */}
            {selectedDetail && (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  padding: "10px 12px",
                  borderTop: "1px solid #f0f0f0",
                  flexShrink: 0,
                  backgroundColor: "#fff",
                }}
              >
                {/* 导出按钮组 */}
                {EXPORT_FORMATS.map(fmt => (
                  <button
                    key={fmt.key}
                    onClick={() => handleExport(selectedDetail.id, fmt.key)}
                    disabled={!!exporting}
                    style={{
                      flex: 1,
                      padding: "8px 0",
                      border: `1px solid ${THEME.primary}`,
                      borderRadius: 8,
                      backgroundColor: exporting === fmt.key ? THEME.primaryBg : "#fff",
                      color: THEME.primary,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: exporting ? "not-allowed" : "pointer",
                      opacity: exporting && exporting !== fmt.key ? 0.5 : 1,
                    }}
                  >
                    {exporting === fmt.key ? "导出中..." : `导出 ${fmt.label}`}
                  </button>
                ))}
                {/* 删除按钮 */}
                <button
                  onClick={() => handleDelete(selectedDetail.id)}
                  disabled={!!deletingId}
                  style={{
                    flexShrink: 0,
                    padding: "8px 14px",
                    border: "1px solid #e74c3c",
                    borderRadius: 8,
                    backgroundColor: deletingId ? "#fde8e8" : "#fff",
                    color: "#e74c3c",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: deletingId ? "not-allowed" : "pointer",
                  }}
                >
                  {deletingId ? "删除中..." : "删除"}
                </button>
              </div>
            )}
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
                backgroundColor: THEME.primaryBg,
              }}
            >
              {(
                [
                  { key: "history", label: "聊天记录" },
                  { key: "backup", label: "云端备份" },
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
                    backgroundColor: activeTab === tab.key ? THEME.primary : "#fff",
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
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "12px 16px",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {/* ==================== 聊天记录 Tab ==================== */}
              {activeTab === "history" && (
                <div>
                  {/* 容量提示 */}
                  <div
                    style={{
                      marginBottom: 12,
                      padding: "10px 12px",
                      borderRadius: 8,
                      backgroundColor: THEME.primaryBg,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: THEME.primaryDark }}>
                        📊 存储容量
                      </span>
                      <span style={{ fontSize: 12, color: "#666" }}>
                        {historyTotal} / {CHAT_HISTORY_CONFIG.MAX_FREE_HISTORY} 条
                      </span>
                    </div>
                    {/* 容量进度条 */}
                    <div
                      style={{
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: "#e8dff0",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          borderRadius: 3,
                          width: `${capacityPercent}%`,
                          backgroundColor: capacityPercent >= 90 ? "#e74c3c" : THEME.primary,
                          transition: "width 0.3s",
                        }}
                      />
                    </div>
                    <div style={{ fontSize: 11, color: "#999", marginTop: 6, lineHeight: 1.5 }}>
                      免费用户上限 {CHAT_HISTORY_CONFIG.MAX_FREE_HISTORY} 条 ｜ VIP 用户上限 {CHAT_HISTORY_CONFIG.MAX_VIP_HISTORY} 条
                    </div>
                  </div>

                  {/* 列表 */}
                  {loading && histories.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 0", color: "#999", fontSize: 14 }}>
                      加载中...
                    </div>
                  ) : histories.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 0", color: "#999", fontSize: 14 }}>
                      暂无聊天记录
                      <br />
                      <span style={{ fontSize: 12, color: "#bbb" }}>使用工具后，记录将自动保存</span>
                    </div>
                  ) : (
                    <>
                      {/* v20.1: 批量管理模式下的操作栏 */}
                      {manageMode ? (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: 10,
                            padding: "8px 10px",
                            borderRadius: 8,
                            backgroundColor: THEME.primaryBg,
                          }}
                        >
                          <button
                            onClick={handleExitManage}
                            style={{
                              border: "none",
                              backgroundColor: "transparent",
                              color: "#666",
                              fontSize: 13,
                              cursor: "pointer",
                              padding: 0,
                            }}
                          >
                            取消
                          </button>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>
                            已选 {selectedIds.size} 条
                          </span>
                          <button
                            onClick={handleSelectAll}
                            style={{
                              border: "none",
                              backgroundColor: "transparent",
                              color: THEME.primary,
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: "pointer",
                              padding: 0,
                            }}
                          >
                            {selectedIds.size === histories.length && histories.length > 0 ? "取消全选" : "全选"}
                          </button>
                        </div>
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: 10,
                          }}
                        >
                          <span style={{ fontSize: 12, color: "#999" }}>共 {historyTotal} 条记录</span>
                          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                            <button
                              onClick={handleEnterManage}
                              disabled={histories.length === 0}
                              style={{
                                border: "none",
                                backgroundColor: "transparent",
                                color: histories.length > 0 ? THEME.primary : "#ccc",
                                fontSize: 12,
                                cursor: histories.length > 0 ? "pointer" : "default",
                                padding: 0,
                              }}
                            >
                              批量管理
                            </button>
                            <button
                              onClick={loadList}
                              style={{
                                border: "none",
                                backgroundColor: "transparent",
                                color: THEME.primary,
                                fontSize: 12,
                                cursor: "pointer",
                                padding: 0,
                              }}
                            >
                              刷新
                            </button>
                          </div>
                        </div>
                      )}
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {histories.map(item => {
                          const isSelected = selectedIds.has(item.id);
                          return (
                          <div
                            key={item.id}
                            style={{
                              borderRadius: 10,
                              border: manageMode && isSelected
                                ? `2px solid ${THEME.primary}`
                                : "1px solid #f0f0f0",
                              backgroundColor: manageMode && isSelected ? THEME.primaryBg : "#fafafa",
                              overflow: "hidden",
                              transition: "all 0.2s",
                            }}
                          >
                            {/* 列表项主体 */}
                            <div
                              onClick={() => {
                                if (manageMode) {
                                  handleToggleSelect(item.id);
                                } else {
                                  handleViewDetail(item.id);
                                }
                              }}
                              style={{
                                display: "flex",
                                gap: 10,
                                padding: 12,
                                cursor: "pointer",
                              }}
                              onMouseEnter={e => {
                                if (!manageMode) {
                                  (e.currentTarget as HTMLDivElement).style.borderColor = THEME.primary;
                                  (e.currentTarget as HTMLDivElement).style.backgroundColor = THEME.primaryBg;
                                }
                              }}
                              onMouseLeave={e => {
                                if (!manageMode) {
                                  (e.currentTarget as HTMLDivElement).style.borderColor = "transparent";
                                  (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent";
                                }
                              }}
                            >
                              {/* v20.1: 管理模式下的复选框 */}
                              {manageMode && (
                                <div
                                  style={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: "50%",
                                    border: `2px solid ${isSelected ? THEME.primary : "#ccc"}`,
                                    backgroundColor: isSelected ? THEME.primary : "transparent",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                    alignSelf: "center",
                                  }}
                                >
                                  {isSelected && (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                      <path d="M20 6 9 17l-5-5" />
                                    </svg>
                                  )}
                                </div>
                              )}
                              {/* 工具图标 */}
                              <div
                                style={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: 10,
                                  backgroundColor: THEME.primary,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 16,
                                  fontWeight: 700,
                                  color: "#fff",
                                  flexShrink: 0,
                                }}
                              >
                                {(item.toolName || "?").charAt(0)}
                              </div>
                              {/* 记录信息 */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 8,
                                    marginBottom: 4,
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: 14,
                                      fontWeight: 600,
                                      color: "#1a1a1a",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {item.toolName || "未知工具"}
                                  </span>
                                  <span style={{ fontSize: 11, color: "#bbb", flexShrink: 0 }}>
                                    {formatHistoryTime(item.lastUpdated)}
                                  </span>
                                </div>
                                {/* 预览 */}
                                <div
                                  style={{
                                    fontSize: 12,
                                    color: "#999",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    marginBottom: 4,
                                  }}
                                >
                                  {item.preview || "暂无预览"}
                                </div>
                                {/* 消息数 */}
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <span
                                    style={{
                                      fontSize: 10,
                                      padding: "1px 6px",
                                      borderRadius: 4,
                                      backgroundColor: THEME.primaryBg,
                                      color: THEME.primary,
                                      fontWeight: 600,
                                    }}
                                  >
                                    {item.messageCount} 条消息
                                  </span>
                                </div>
                              </div>
                              {/* 进入箭头（仅非管理模式） */}
                              {!manageMode && (
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
                              )}
                            </div>
                            {/* 列表项操作栏（删除 + 导出） - 仅非管理模式显示 */}
                            {!manageMode && (
                            <div
                              style={{
                                display: "flex",
                                gap: 6,
                                padding: "6px 12px 8px",
                                borderTop: "1px solid #f0f0f0",
                              }}
                            >
                              {EXPORT_FORMATS.map(fmt => (
                                <button
                                  key={fmt.key}
                                  onClick={() => handleExport(item.id, fmt.key)}
                                  style={{
                                    flex: 1,
                                    padding: "4px 0",
                                    border: "1px solid #e0d0ea",
                                    borderRadius: 6,
                                    backgroundColor: "#fff",
                                    color: THEME.primary,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                  }}
                                >
                                  {fmt.label}
                                </button>
                              ))}
                              <button
                                onClick={() => handleDelete(item.id)}
                                disabled={deletingId === item.id}
                                style={{
                                  flexShrink: 0,
                                  padding: "4px 10px",
                                  border: "1px solid #fde8e8",
                                  borderRadius: 6,
                                  backgroundColor: "#fff",
                                  color: "#e74c3c",
                                  fontSize: 11,
                                  fontWeight: 600,
                                  cursor: deletingId === item.id ? "not-allowed" : "pointer",
                                }}
                              >
                                {deletingId === item.id ? "删除中..." : "删除"}
                              </button>
                            </div>
                            )}
                          </div>
                          );
                        })}
                      </div>
                      {/* v20.1: 批量管理模式下的底部操作栏 */}
                      {manageMode && (
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            marginTop: 12,
                            padding: "10px 0",
                          }}
                        >
                          <button
                            onClick={() => setShowClearAllConfirm(true)}
                            disabled={histories.length === 0 || batchDeleting}
                            style={{
                              flex: 1,
                              padding: "10px 0",
                              border: "1px solid #ddd",
                              borderRadius: 8,
                              backgroundColor: "#fff",
                              color: "#666",
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: histories.length === 0 || batchDeleting ? "not-allowed" : "pointer",
                              opacity: histories.length === 0 || batchDeleting ? 0.5 : 1,
                            }}
                          >
                            清空全部
                          </button>
                          <button
                            onClick={handleBatchDelete}
                            disabled={selectedIds.size === 0 || batchDeleting}
                            style={{
                              flex: 1,
                              padding: "10px 0",
                              border: "none",
                              borderRadius: 8,
                              backgroundColor: selectedIds.size > 0 && !batchDeleting ? "#e74c3c" : "#ccc",
                              color: "#fff",
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: selectedIds.size === 0 || batchDeleting ? "not-allowed" : "pointer",
                            }}
                          >
                            {batchDeleting ? "删除中..." : `删除选中 (${selectedIds.size})`}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ==================== 云端备份 Tab ==================== */}
              {activeTab === "backup" && (
                <div>
                  {/* 数据安全提示 */}
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      padding: "10px 12px",
                      marginBottom: 16,
                      borderRadius: 8,
                      backgroundColor: "#e8f5e9",
                      fontSize: 12,
                      color: "#2e7d32",
                    }}
                  >
                    <span style={{ fontSize: 14 }}>🔒</span>
                    <div style={{ flex: 1, lineHeight: 1.5 }}>
                      聊天记录云端加密备份，仅本人可查看
                    </div>
                  </div>

                  {/* 备份操作卡片 */}
                  <div
                    style={{
                      padding: "16px",
                      borderRadius: 12,
                      background: `linear-gradient(135deg, ${THEME.primary} 0%, ${THEME.primaryLight} 100%)`,
                      color: "#fff",
                      marginBottom: 16,
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
                      ☁️ 一键云端备份
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.85, lineHeight: 1.6, marginBottom: 14 }}>
                      将您的所有聊天记录加密上传至云端，安全可靠，随时可恢复。
                    </div>
                    <button
                      onClick={handleBackup}
                      disabled={backing}
                      style={{
                        width: "100%",
                        padding: "12px 0",
                        border: "none",
                        borderRadius: 8,
                        backgroundColor: backing ? "rgba(255,255,255,0.3)" : "#fff",
                        color: backing ? "#fff" : THEME.primary,
                        fontSize: 15,
                        fontWeight: 700,
                        cursor: backing ? "not-allowed" : "pointer",
                      }}
                    >
                      {backing ? "备份中..." : "立即备份"}
                    </button>
                  </div>

                  {/* 备份信息展示 */}
                  {backupInfo ? (
                    <div
                      style={{
                        padding: "16px",
                        borderRadius: 12,
                        backgroundColor: THEME.primaryBg,
                        marginBottom: 16,
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", marginBottom: 12 }}>
                        📋 备份详情
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div
                          style={{
                            padding: "10px",
                            backgroundColor: "#fff",
                            borderRadius: 8,
                            textAlign: "center",
                          }}
                        >
                          <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>记录数</div>
                          <div style={{ fontSize: 20, fontWeight: 700, color: THEME.primary }}>
                            {backupInfo.historyCount}
                          </div>
                        </div>
                        <div
                          style={{
                            padding: "10px",
                            backgroundColor: "#fff",
                            borderRadius: 8,
                            textAlign: "center",
                          }}
                        >
                          <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>消息数</div>
                          <div style={{ fontSize: 20, fontWeight: 700, color: THEME.primary }}>
                            {backupInfo.totalMessages}
                          </div>
                        </div>
                        <div
                          style={{
                            padding: "10px",
                            backgroundColor: "#fff",
                            borderRadius: 8,
                            textAlign: "center",
                            gridColumn: "1 / -1",
                          }}
                        >
                          <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>备份大小</div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: THEME.primary }}>
                            {formatBackupSize(backupInfo.backupSize)}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: "#999", marginTop: 10, textAlign: "center" }}>
                        备份 ID：{backupInfo.backupId}
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: "30px 16px",
                        borderRadius: 12,
                        backgroundColor: "#fafafa",
                        border: "1px dashed #ddd",
                        textAlign: "center",
                        marginBottom: 16,
                      }}
                    >
                      <div style={{ fontSize: 32, marginBottom: 8 }}>☁️</div>
                      <div style={{ fontSize: 13, color: "#999" }}>
                        暂无备份记录
                      </div>
                      <div style={{ fontSize: 11, color: "#bbb", marginTop: 4 }}>
                        点击上方按钮创建您的第一个云端备份
                      </div>
                    </div>
                  )}

                  {/* 恢复备份 */}
                  {backupInfo && (
                    <div
                      style={{
                        padding: "16px",
                        borderRadius: 12,
                        border: `1px solid ${THEME.primary}`,
                        backgroundColor: "#fff",
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", marginBottom: 8 }}>
                        ♻️ 恢复备份
                      </div>
                      <div style={{ fontSize: 12, color: "#666", lineHeight: 1.6, marginBottom: 14 }}>
                        从云端备份恢复聊天记录至本地。恢复操作将覆盖当前同 ID 记录，不会删除其他记录。
                      </div>
                      <button
                        onClick={handleRestore}
                        disabled={restoring}
                        style={{
                          width: "100%",
                          padding: "12px 0",
                          border: "none",
                          borderRadius: 8,
                          backgroundColor: restoring ? "#ccc" : THEME.primary,
                          color: "#fff",
                          fontSize: 15,
                          fontWeight: 700,
                          cursor: restoring ? "not-allowed" : "pointer",
                        }}
                      >
                        {restoring ? "恢复中..." : "恢复备份"}
                      </button>
                    </div>
                  )}

                  {/* VIP 容量提示 */}
                  <div
                    style={{
                      marginTop: 16,
                      padding: "10px 12px",
                      borderRadius: 8,
                      backgroundColor: "#fff8e1",
                      fontSize: 11,
                      color: "#e65100",
                      lineHeight: 1.6,
                    }}
                  >
                    💡 免费用户可保存 {CHAT_HISTORY_CONFIG.MAX_FREE_HISTORY} 条记录，升级 VIP 可保存至 {CHAT_HISTORY_CONFIG.MAX_VIP_HISTORY} 条，并享受更大的云端备份空间
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* 底部数据安全声明 */}
        <div
          style={{
            padding: "10px 16px",
            backgroundColor: "#e8f5e9",
            fontSize: 11,
            color: "#2e7d32",
            textAlign: "center",
            flexShrink: 0,
            borderTop: "1px solid #c8e6c9",
          }}
        >
          🔒 聊天记录云端加密备份，仅本人可查看
        </div>

        {/* v20.1: 清空全部确认弹窗 */}
        {showClearAllConfirm && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 10001,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(0,0,0,0.5)",
            }}
          >
            <div
              style={{
                width: "80%",
                maxWidth: "300px",
                backgroundColor: "#fff",
                borderRadius: 12,
                padding: "20px 16px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a", marginBottom: 6 }}>
                确认清空全部聊天记录？
              </div>
              <div style={{ fontSize: 12, color: "#999", lineHeight: 1.6, marginBottom: 16 }}>
                此操作将永久删除所有聊天记录，且无法恢复。建议在操作前先进行云端备份。
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setShowClearAllConfirm(false)}
                  disabled={clearingAll}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    border: "1px solid #ddd",
                    borderRadius: 8,
                    backgroundColor: "#fff",
                    color: "#666",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: clearingAll ? "not-allowed" : "pointer",
                  }}
                >
                  取消
                </button>
                <button
                  onClick={handleClearAll}
                  disabled={clearingAll}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    border: "none",
                    borderRadius: 8,
                    backgroundColor: clearingAll ? "#ccc" : "#e74c3c",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: clearingAll ? "not-allowed" : "pointer",
                  }}
                >
                  {clearingAll ? "清空中..." : "确认清空"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast 提示 */}
        {toast && (
          <div
            style={{
              position: "absolute",
              bottom: 50,
              left: "50%",
              transform: "translateX(-50%)",
              padding: "8px 16px",
              backgroundColor: "rgba(0,0,0,0.8)",
              color: "#fff",
              borderRadius: 8,
              fontSize: 13,
              whiteSpace: "nowrap",
              zIndex: 10000,
            }}
          >
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
