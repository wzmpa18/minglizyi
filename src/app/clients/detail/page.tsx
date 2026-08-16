"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Client,
  ServiceRecord,
  getClient,
  saveClient,
  getRecords,
  updateRecordNote,
  updateRecordStatus,
  deleteRecord,
  getToolMeta,
  maskPhone,
  setPrefillData,
  TOOL_TYPE_MAP,
} from "@/lib/clientStore";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { usePopupBackHandler } from "@/hooks/usePopupBackHandler";

const BRAND = "#7B2FBE";
const BRAND_BG = "#F3EDF7";

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "待处理", color: "#FF9800", bg: "#FFF3E0" },
  communicated: { label: "已沟通", color: "#2196F3", bg: "#E3F2FD" },
  closed: { label: "已闭环", color: "#4CAF50", bg: "#E8F5E9" },
};

function formatDateTime(isoStr: string): string {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return "";
  }
}

// 编辑客户弹窗
function EditClientModal({
  client,
  onSave,
  onClose,
}: {
  client: Client;
  onSave: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(client.name);
  const [gender, setGender] = useState<"male" | "female" | "">(client.gender);
  const [birthday, setBirthday] = useState(client.birthday);
  const [phone, setPhone] = useState(client.phone);
  const [tags, setTags] = useState(client.tags.join(", "));
  const [note, setNote] = useState(client.note);

  // P1-6/P1-7: 滚动锁 + 返回拦截（组件仅在弹窗打开时挂载）
  useBodyScrollLock(true);
  usePopupBackHandler(onClose, true);

  const handleSubmit = () => {
    if (!name.trim()) {
      alert("请输入客户姓名");
      return;
    }
    const tagArr = tags
      .split(/[,，、\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    saveClient({
      id: client.id,
      name: name.trim(),
      gender,
      birthday,
      phone,
      tags: tagArr,
      note,
    });
    onSave();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-800">编辑客户</h3>
          <button onClick={onClose} className="text-gray-400 text-xl leading-none">
            ✕
          </button>
        </div>
        <div className="px-5 py-4 space-y-3 flex-1 overflow-y-auto">
          <div className="flex items-center">
            <label className="w-20 shrink-0 text-[13px] text-gray-600">姓名 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-[13px] outline-none"
            />
          </div>
          <div className="flex items-center">
            <label className="w-20 shrink-0 text-[13px] text-gray-600">性别</label>
            <div className="flex gap-2">
              {[
                { label: "男", value: "male" },
                { label: "女", value: "female" },
              ].map((g) => (
                <button
                  key={g.value}
                  onClick={() => setGender(g.value as "male" | "female")}
                  className="px-4 py-1 rounded-full text-[13px] border transition-colors"
                  style={{
                    backgroundColor: gender === g.value ? BRAND : "white",
                    color: gender === g.value ? "white" : "#666",
                    borderColor: gender === g.value ? BRAND : "#ddd",
                  }}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center">
            <label className="w-20 shrink-0 text-[13px] text-gray-600">出生日期</label>
            <input
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-[13px] outline-none"
            />
          </div>
          <div className="flex items-center">
            <label className="w-20 shrink-0 text-[13px] text-gray-600">联系方式</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="手机号"
              className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-[13px] outline-none"
            />
          </div>
          <div className="flex items-start">
            <label className="w-20 shrink-0 text-[13px] text-gray-600 pt-1.5">标签</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="多个标签用逗号分隔"
              className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-[13px] outline-none"
            />
          </div>
          <div className="flex items-start">
            <label className="w-20 shrink-0 text-[13px] text-gray-600 pt-1.5">备注</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-[13px] outline-none resize-none"
            />
          </div>
        </div>
        <div className="flex border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-sm text-gray-600 active:bg-gray-50"
            style={{ borderRight: "1px solid #f5f5f5" }}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-3 text-sm font-semibold text-white"
            style={{ backgroundColor: BRAND }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

// 编辑断语弹窗
function EditNoteModal({
  record,
  onSave,
  onClose,
}: {
  record: ServiceRecord;
  onSave: (note: string) => void;
  onClose: () => void;
}) {
  const [note, setNote] = useState(record.note);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-800">编辑断语</h3>
          <button onClick={onClose} className="text-gray-400 text-xl leading-none">
            ✕
          </button>
        </div>
        <div className="px-5 py-4">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="输入自定义断语/分析笔记..."
            rows={6}
            className="w-full border border-gray-300 rounded px-3 py-2 text-[13px] outline-none resize-none"
            autoFocus
          />
        </div>
        <div className="flex border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-sm text-gray-600 active:bg-gray-50"
            style={{ borderRight: "1px solid #f5f5f5" }}
          >
            取消
          </button>
          <button
            onClick={() => onSave(note)}
            className="flex-1 py-3 text-sm font-semibold text-white"
            style={{ backgroundColor: BRAND }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

// 记录卡片组件
function RecordCard({
  record,
  onViewResult,
  onEditNote,
  onStatusChange,
  onDelete,
}: {
  record: ServiceRecord;
  onViewResult: () => void;
  onEditNote: () => void;
  onStatusChange: (status: "pending" | "communicated" | "closed") => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const meta = getToolMeta(record.type);
  const statusInfo = STATUS_MAP[record.status] || STATUS_MAP.pending;

  // 生成排盘摘要
  const getSummary = (): string => {
    if (!record.data) return "";
    const d = record.data;
    if (record.type === "bazi" && d.pillars) {
      const gz = d.pillars.map((p: any) => (p.gan || "") + (p.zhi || "")).join(" ");
      return `四柱：${gz}`;
    }
    if (record.type === "ziwei") {
      return "紫微斗数命盘";
    }
    if (record.type === "qimen") {
      return "奇门遁甲盘";
    }
    if (record.type === "liuyao") {
      return "六爻卦象";
    }
    if (record.type === "meihua") {
      return "梅花易数卦象";
    }
    if (record.type === "hehun") {
      return "合婚分析";
    }
    if (record.type === "daliuren") {
      return "大六壬课";
    }
    if (record.type === "xiaoliuren") {
      return "小六壬课";
    }
    if (record.type === "phone" || record.type === "carplate") {
      return d.number || d.phoneNumber || d.plateNumber || "";
    }
    if (record.type === "zeri") {
      return "择日分析";
    }
    if (record.type === "jiemeng") {
      return d.keyword || d.content || "梦境解析";
    }
    if (record.type === "huangli") {
      return d.dateStr || d.date || "黄历";
    }
    if (record.type === "wannianli") {
      return d.dateStr || d.date || "万年历";
    }
    if (record.type === "taiyi-sanshi") {
      return "太乙三式盘";
    }
    if (record.type === "xuankong-feixing") {
      return "玄空飞星盘";
    }
    return "排盘结果";
  };

  return (
    <div className="flex gap-3">
      {/* 左侧时间线 */}
      <div className="flex flex-col items-center shrink-0">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
          style={{ backgroundColor: meta.color }}
        >
          {meta.name.charAt(0)}
        </div>
        <div className="w-0.5 flex-1" style={{ backgroundColor: "#eee" }} />
      </div>

      {/* 右侧卡片 */}
      <div className="flex-1 pb-4">
        <div
          className="bg-white rounded-xl p-3 shadow-sm cursor-pointer active:bg-gray-50"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-800">
                  {meta.name}
                </span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{ color: statusInfo.color, backgroundColor: statusInfo.bg }}
                >
                  {statusInfo.label}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {formatDateTime(record.createdAt)}
              </p>
            </div>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ccc"
              strokeWidth="2"
              style={{
                transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>

          {record.note && (
            <p className="text-xs text-gray-600 mt-2 line-clamp-2 bg-gray-50 rounded p-2">
              {record.note}
            </p>
          )}

          {expanded && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              {/* 排盘摘要 */}
              <p className="text-xs text-gray-500 mb-2">
                <span className="text-gray-400">排盘摘要：</span>
                {getSummary()}
              </p>

              {/* 操作按钮 */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewResult();
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs text-white font-medium"
                  style={{ backgroundColor: meta.color }}
                >
                  查看完整结果
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditNote();
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs border border-gray-300 text-gray-600 bg-white"
                >
                  编辑断语
                </button>
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowStatusMenu(!showStatusMenu);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs border border-gray-300 text-gray-600 bg-white flex items-center gap-1"
                  >
                    状态
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  {showStatusMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={(e) => { e.stopPropagation(); setShowStatusMenu(false); }}
                      />
                      <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-100 z-20 overflow-hidden min-w-[100px]">
                        {Object.entries(STATUS_MAP).map(([key, info]) => (
                          <button
                            key={key}
                            onClick={(e) => {
                              e.stopPropagation();
                              onStatusChange(key as "pending" | "communicated" | "closed");
                              setShowStatusMenu(false);
                            }}
                            className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2"
                          >
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: info.color }}
                            />
                            {info.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("确定删除这条记录吗？")) {
                      onDelete();
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs text-red-500 border border-red-200 bg-white ml-auto"
                >
                  删除
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 新增记录工具选择弹窗
function AddRecordModal({
  onSelect,
  onClose,
}: {
  onSelect: (toolType: string) => void;
  onClose: () => void;
}) {
  const tools = Object.entries(TOOL_TYPE_MAP);

  // P1-6/P1-7: 滚动锁 + 返回拦截（组件仅在弹窗打开时挂载）
  useBodyScrollLock(true);
  usePopupBackHandler(onClose, true);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white">
          <span className="text-base font-bold text-gray-800">新增服务记录</span>
          <button onClick={onClose} className="text-gray-400 text-xl leading-none px-2">
            ✕
          </button>
        </div>
        <div className="p-4 grid grid-cols-4 gap-3">
          {tools.map(([key, meta]) => (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className="flex flex-col items-center gap-1 py-2 active:bg-gray-50 rounded-lg"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                style={{ backgroundColor: meta.color }}
              >
                {meta.name.charAt(0)}
              </div>
              <span className="text-[11px] text-gray-600">{meta.name}</span>
            </button>
          ))}
        </div>
        <div className="modal-safe-bottom" />
      </div>
    </div>
  );
}

function ClientDetailInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const clientId = searchParams.get("id") || "";

  const [client, setClient] = useState<Client | null>(null);
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [typeFilter, setTypeFilter] = useState("");
  const [showEdit, setShowEdit] = useState(false);
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ServiceRecord | null>(null);

  useEffect(() => {
    loadData();
  }, [clientId]);

  const loadData = () => {
    const c = getClient(clientId);
    if (c) {
      setClient(c);
      setRecords(getRecords(clientId));
    }
  };

  const filteredRecords = typeFilter
    ? records.filter((r) => r.type === typeFilter)
    : records;

  const toolTypes = Array.from(new Set(records.map((r) => r.type)));

  const handleViewResult = (record: ServiceRecord) => {
    const meta = getToolMeta(record.type);
    // 将排盘数据存入localStorage供工具页回填
    setPrefillData(record.type, record.data);
    // 跳转到对应工具页
    router.push(meta.path);
  };

  const handleSaveNote = (note: string) => {
    if (editingRecord) {
      updateRecordNote(editingRecord.id, note);
      setEditingRecord(null);
      loadData();
    }
  };

  const handleStatusChange = (
    recordId: string,
    status: "pending" | "communicated" | "closed"
  ) => {
    updateRecordStatus(recordId, status);
    loadData();
  };

  const handleDeleteRecord = (recordId: string) => {
    deleteRecord(recordId);
    loadData();
  };

  const handleAddRecord = (toolType: string) => {
    setShowAddRecord(false);
    const meta = getToolMeta(toolType);
    // 带上客户ID，跳转到工具页
    router.push(meta.path + "?clientId=" + clientId);
  };

  if (!client) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#f5f5f5", maxWidth: "420px", margin: "0 auto" }}
      >
        <div className="text-center">
          <p className="text-gray-400 text-sm">客户不存在或已删除</p>
          <button
            onClick={() => router.push("/clients")}
            className="mt-3 px-4 py-2 rounded-lg text-white text-sm"
            style={{ backgroundColor: BRAND }}
          >
            返回客户列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "#f5f5f5", maxWidth: "420px", margin: "0 auto", paddingBottom: "80px" }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 text-white"
        style={{ backgroundColor: BRAND }}
      >
        <button onClick={() => router.back()} className="p-1 -ml-1">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="text-lg font-bold truncate mx-2">{client.name}</h1>
        <button
          onClick={() => setShowEdit(true)}
          className="text-white text-sm px-2"
        >
          编辑
        </button>
      </div>

      {/* 客户基础信息卡 */}
      <div className="mx-3 -mt-2 bg-white rounded-xl p-4 shadow-sm relative z-0">
        <div className="flex items-start gap-3">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold shrink-0"
            style={{ backgroundColor: BRAND }}
          >
            {client.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-800">{client.name}</h2>
              {client.gender === "male" && (
                <span className="text-sm text-blue-500">♂ 男</span>
              )}
              {client.gender === "female" && (
                <span className="text-sm text-pink-500">♀ 女</span>
              )}
            </div>
            {client.birthday && (
              <p className="text-xs text-gray-500 mt-0.5">
                出生日期：{client.birthday}
              </p>
            )}
            {client.phone && (
              <p className="text-xs text-gray-500 mt-0.5">
                联系方式：{maskPhone(client.phone)}
              </p>
            )}
            {client.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {client.tags.map((t, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: BRAND_BG, color: BRAND }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        {client.note && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              <span className="text-gray-400">备注：</span>
              {client.note}
            </p>
          </div>
        )}
      </div>

      {/* 记录统计 */}
      <div className="mx-3 mt-3 bg-white rounded-xl p-3 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-800">
            服务记录（{filteredRecords.length}）
          </span>
          <button
            onClick={() => setShowAddRecord(true)}
            className="px-3 py-1 rounded-full text-white text-xs font-medium flex items-center gap-1"
            style={{ backgroundColor: BRAND }}
          >
            <span className="text-sm leading-none">+</span>
            新增记录
          </button>
        </div>
      </div>

      {/* 类型筛选 */}
      {toolTypes.length > 0 && (
        <div className="flex gap-2 px-3 py-3 overflow-x-auto">
          <button
            onClick={() => setTypeFilter("")}
            className="shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors"
            style={{
              backgroundColor: typeFilter === "" ? BRAND : "white",
              color: typeFilter === "" ? "white" : "#666",
              border: typeFilter === "" ? "none" : "1px solid #e5e5e5",
            }}
          >
            全部
          </button>
          {toolTypes.map((t) => {
            const meta = getToolMeta(t);
            return (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className="shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors"
                style={{
                  backgroundColor: typeFilter === t ? meta.color : "white",
                  color: typeFilter === t ? "white" : "#666",
                  border: typeFilter === t ? "none" : "1px solid #e5e5e5",
                }}
              >
                {meta.name}
              </button>
            );
          })}
        </div>
      )}

      {/* 记录时间线 */}
      <div className="px-3">
        {filteredRecords.length === 0 ? (
          <div className="py-12 text-center">
            <div
              className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-3"
              style={{ backgroundColor: BRAND_BG }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="1.5">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">
              {records.length === 0 ? "暂无服务记录" : "该类型暂无记录"}
            </p>
            {records.length === 0 && (
              <button
                onClick={() => setShowAddRecord(true)}
                className="mt-3 px-4 py-2 rounded-lg text-white text-sm"
                style={{ backgroundColor: BRAND }}
              >
                开始排盘记录
              </button>
            )}
          </div>
        ) : (
          <div className="pt-2">
            {filteredRecords.map((r) => (
              <RecordCard
                key={r.id}
                record={r}
                onViewResult={() => handleViewResult(r)}
                onEditNote={() => setEditingRecord(r)}
                onStatusChange={(status) => handleStatusChange(r.id, status)}
                onDelete={() => handleDeleteRecord(r.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 弹窗 */}
      {showEdit && (
        <EditClientModal
          client={client}
          onSave={() => { setShowEdit(false); loadData(); }}
          onClose={() => setShowEdit(false)}
        />
      )}
      {editingRecord && (
        <EditNoteModal
          record={editingRecord}
          onSave={handleSaveNote}
          onClose={() => setEditingRecord(null)}
        />
      )}
      {showAddRecord && (
        <AddRecordModal
          onSelect={handleAddRecord}
          onClose={() => setShowAddRecord(false)}
        />
      )}
    </div>
  );
}

export default function ClientDetailPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-gray-400">加载中...</div>}>
      <ClientDetailInner />
    </Suspense>
  );
}
