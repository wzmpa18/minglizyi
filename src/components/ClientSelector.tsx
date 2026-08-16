"use client";

import React, { useState, useEffect } from "react";
import {
  Client,
  getRecentClients,
  searchClients,
  saveClient,
  getClient,
} from "@/lib/clientStore";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { usePopupBackHandler } from "@/hooks/usePopupBackHandler";

const BRAND = "#7B2FBE";
const BRAND_BG = "#F3EDF7";

interface ClientSelectorProps {
  onSelect: (client: Client | null) => void;
  selectedClient?: Client | null;
  compact?: boolean;
}

// 新建客户表单
function NewClientForm({
  onSave,
  onCancel,
}: {
  onSave: (c: Client) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [birthday, setBirthday] = useState("");
  const [phone, setPhone] = useState("");
  const [tags, setTags] = useState("");
  const [note, setNote] = useState("");

  const handleSubmit = () => {
    if (!name.trim()) {
      alert("请输入客户姓名");
      return;
    }
    const tagArr = tags
      .split(/[,，、\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    const c = saveClient({
      name: name.trim(),
      gender,
      birthday,
      phone,
      tags: tagArr,
      note,
    });
    onSave(c);
  };

  return (
    <div className="px-4 py-3">
      <div className="text-sm font-semibold text-gray-800 mb-3">新建客户</div>
      <div className="space-y-2.5">
        <div className="flex items-center">
          <label className="w-16 shrink-0 text-[13px] text-gray-600">
            姓名 *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="请输入姓名"
            className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-[13px] outline-none"
          />
        </div>
        <div className="flex items-center">
          <label className="w-16 shrink-0 text-[13px] text-gray-600">性别</label>
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
          <label className="w-16 shrink-0 text-[13px] text-gray-600">
            出生日期
          </label>
          <input
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-[13px] outline-none"
          />
        </div>
        <div className="flex items-center">
          <label className="w-16 shrink-0 text-[13px] text-gray-600">
            联系方式
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="手机号"
            className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-[13px] outline-none"
          />
        </div>
        <div className="flex items-start">
          <label className="w-16 shrink-0 text-[13px] text-gray-600 pt-1.5">
            标签
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="多个标签用逗号分隔，如：易学客户"
            className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-[13px] outline-none"
          />
        </div>
        <div className="flex items-start">
          <label className="w-16 shrink-0 text-[13px] text-gray-600 pt-1.5">
            备注
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="客户备注信息"
            rows={2}
            className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-[13px] outline-none resize-none"
          />
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button
          onClick={onCancel}
          className="flex-1 py-2 rounded-xl text-sm text-gray-600 border border-gray-300 bg-white"
        >
          取消
        </button>
        <button
          onClick={handleSubmit}
          className="flex-1 py-2 rounded-xl text-sm text-white font-semibold"
          style={{ backgroundColor: BRAND }}
        >
          保存
        </button>
      </div>
    </div>
  );
}

// 客户选择面板
function ClientPanel({
  onSelect,
  onClose,
}: {
  onSelect: (c: Client | null) => void;
  onClose: () => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [recentClients, setRecentClients] = useState<Client[]>([]);
  const [searchResults, setSearchResults] = useState<Client[]>([]);

  // P1-6/P1-7: 滚动锁 + 返回拦截（组件仅在面板打开时挂载）
  useBodyScrollLock(true);
  usePopupBackHandler(onClose, true);

  useEffect(() => {
    setRecentClients(getRecentClients(5));
  }, []);

  useEffect(() => {
    if (keyword.trim()) {
      setSearchResults(searchClients(keyword));
    } else {
      setSearchResults([]);
    }
  }, [keyword]);

  const handleSaveNew = (c: Client) => {
    onSelect(c);
    onClose();
  };

  const handleSelectClient = (c: Client) => {
    onSelect(c);
    onClose();
  };

  const handleAnonymous = () => {
    onSelect(null);
    onClose();
  };

  const displayList = keyword.trim() ? searchResults : recentClients;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] bg-white rounded-t-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
          <span className="text-base font-bold text-gray-800">选择客户</span>
          <button
            onClick={onClose}
            className="text-gray-400 text-xl leading-none px-2"
          >
            ✕
          </button>
        </div>

        {showNewForm ? (
          <div className="overflow-y-auto">
            <NewClientForm
              onSave={handleSaveNew}
              onCancel={() => setShowNewForm(false)}
            />
          </div>
        ) : (
          <>
            {/* 搜索框 */}
            <div className="px-4 py-2.5 shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center bg-gray-100 rounded-full px-3 py-1.5">
                  <svg
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
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="搜索客户姓名/手机号/标签"
                    className="flex-1 bg-transparent outline-none text-sm ml-2"
                  />
                </div>
                <button
                  onClick={() => setShowNewForm(true)}
                  className="shrink-0 px-3 py-1.5 rounded-full text-white text-sm font-medium flex items-center gap-1"
                  style={{ backgroundColor: BRAND }}
                >
                  <span className="text-base leading-none">+</span>
                  <span>新建</span>
                </button>
              </div>
            </div>

            {/* 列表 */}
            <div className="overflow-y-auto flex-1">
              {/* 匿名排盘选项 */}
              <button
                onClick={handleAnonymous}
                className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-gray-50 border-b border-gray-50"
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "#f5f5f5" }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#999"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-700 font-medium">匿名排盘</p>
                  <p className="text-xs text-gray-400">不保存客户记录</p>
                </div>
              </button>

              {/* 客户列表 */}
              {displayList.length === 0 && keyword.trim() && (
                <div className="py-8 text-center text-sm text-gray-400">
                  未找到匹配客户
                </div>
              )}
              {displayList.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSelectClient(c)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-gray-50 border-b border-gray-50"
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-bold"
                    style={{ backgroundColor: BRAND }}
                  >
                    {c.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-gray-800 font-medium truncate">
                        {c.name}
                      </span>
                      {c.gender === "male" && (
                        <span className="text-xs text-blue-500">♂</span>
                      )}
                      {c.gender === "female" && (
                        <span className="text-xs text-pink-500">♀</span>
                      )}
                    </div>
                    {(c.phone || c.tags.length > 0) && (
                      <p className="text-xs text-gray-400 truncate">
                        {c.phone && c.phone.substr(0, 3) + "****" + c.phone.substr(-4)}
                        {c.tags.length > 0 && (
                          <span className="ml-2">{c.tags.join("、")}</span>
                        )}
                      </p>
                    )}
                  </div>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ccc"
                    strokeWidth="2"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              ))}
              {!keyword.trim() && recentClients.length === 0 && (
                <div className="py-6 text-center text-xs text-gray-400 px-4">
                  暂无最近使用客户，点击右上角"新建"添加客户
                </div>
              )}
            </div>
          </>
        )}
        <div className="modal-safe-bottom" />
      </div>
    </div>
  );
}

// 主组件 - 紧凑内联形式
export default function ClientSelector({
  onSelect,
  selectedClient: externalSelected,
  compact = true,
}: ClientSelectorProps) {
  const [showPanel, setShowPanel] = useState(false);
  const [internalClient, setInternalClient] = useState<Client | null>(null);

  // 使用外部传入的selectedClient或内部状态
  const selectedClient =
    externalSelected !== undefined ? externalSelected : internalClient;

  const handleSelect = (c: Client | null) => {
    if (externalSelected === undefined) {
      setInternalClient(c);
    }
    onSelect(c);
  };

  return (
    <>
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg border mb-2"
        style={{
          backgroundColor: selectedClient ? BRAND_BG : "#fafafa",
          borderColor: selectedClient ? "#d8c3eb" : "#eee",
        }}
      >
        {selectedClient ? (
          <>
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold"
              style={{ backgroundColor: BRAND }}
            >
              {selectedClient.name.charAt(0)}
            </div>
            <span className="text-sm font-medium" style={{ color: BRAND }}>
              客户：{selectedClient.name}
            </span>
            <div className="flex-1" />
            <button
              onClick={() => handleSelect(null)}
              className="text-gray-400 text-xs px-1"
              title="清除选择"
            >
              ✕
            </button>
            <button
              onClick={() => setShowPanel(true)}
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ color: BRAND, backgroundColor: "rgba(123,47,190,0.1)" }}
            >
              切换
            </button>
          </>
        ) : (
          <>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#999"
              strokeWidth="2"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span className="text-sm text-gray-500">匿名排盘</span>
            <div className="flex-1" />
            <button
              onClick={() => setShowPanel(true)}
              className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
              style={{ backgroundColor: BRAND }}
            >
              选择客户
            </button>
          </>
        )}
      </div>
      {showPanel && (
        <ClientPanel
          onSelect={handleSelect}
          onClose={() => setShowPanel(false)}
        />
      )}
    </>
  );
}
