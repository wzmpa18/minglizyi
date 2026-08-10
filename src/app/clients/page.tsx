"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Client,
  getClients,
  searchClients,
  saveClient,
  deleteClient,
  getRecords,
  maskPhone,
} from "@/lib/clientStore";

const BRAND = "#7B2FBE";
const BRAND_BG = "#F3EDF7";

const TAG_FILTERS = [
  { label: "全部", value: "" },
  { label: "易学客户", value: "易学" },
  { label: "中医客户", value: "中医" },
  { label: "综合客户", value: "综合" },
];

function formatDate(isoStr: string): string {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "今天";
    if (days === 1) return "昨天";
    if (days < 7) return `${days}天前`;
    return `${d.getMonth() + 1}/${d.getDate()}`;
  } catch {
    return "";
  }
}

// 新建/编辑客户弹窗
function ClientFormModal({
  client,
  onSave,
  onClose,
}: {
  client?: Client | null;
  onSave: (c: Client) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(client?.name || "");
  const [gender, setGender] = useState<"male" | "female" | "">(client?.gender || "");
  const [birthday, setBirthday] = useState(client?.birthday || "");
  const [phone, setPhone] = useState(client?.phone || "");
  const [tags, setTags] = useState((client?.tags || []).join(", "));
  const [note, setNote] = useState(client?.note || "");

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
      id: client?.id,
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-800">
            {client ? "编辑客户" : "新建客户"}
          </h3>
          <button onClick={onClose} className="text-gray-400 text-xl leading-none">
            ✕
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center">
            <label className="w-20 shrink-0 text-[13px] text-gray-600">
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
            <label className="w-20 shrink-0 text-[13px] text-gray-600">
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
            <label className="w-20 shrink-0 text-[13px] text-gray-600">
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
            <label className="w-20 shrink-0 text-[13px] text-gray-600 pt-1.5">
              标签
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="多个标签用逗号分隔"
              className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-[13px] outline-none"
            />
          </div>
          <div className="flex items-start">
            <label className="w-20 shrink-0 text-[13px] text-gray-600 pt-1.5">
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

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [keyword, setKeyword] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [recordCounts, setRecordCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = () => {
    const list = getClients();
    setClients(list);
    // 计算每个客户的记录数
    const counts: Record<string, number> = {};
    list.forEach((c) => {
      counts[c.id] = getRecords(c.id).length;
    });
    setRecordCounts(counts);
  };

  const handleSaveClient = () => {
    setShowForm(false);
    setEditingClient(null);
    loadClients();
  };

  const handleDeleteClient = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`确定删除客户"${name}"及其所有服务记录吗？`)) {
      deleteClient(id);
      loadClients();
    }
  };

  const filteredClients = (() => {
    let list = keyword.trim() ? searchClients(keyword) : clients;
    if (tagFilter) {
      list = list.filter((c) =>
        c.tags.some((t) => t.includes(tagFilter))
      );
    }
    // 按更新时间倒序
    return [...list].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  })();

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "#f5f5f5", maxWidth: "420px", margin: "0 auto", paddingBottom: "20px" }}
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
        <h1 className="text-lg font-bold">我的客户</h1>
        <button
          onClick={() => { setEditingClient(null); setShowForm(true); }}
          className="p-1 -mr-1 text-white text-2xl leading-none"
        >
          +
        </button>
      </div>

      {/* 搜索栏 */}
      <div className="px-3 pt-3">
        <div className="flex items-center bg-white rounded-full px-3 py-2 shadow-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2">
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
          {keyword && (
            <button onClick={() => setKeyword("")} className="text-gray-400 text-sm">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 标签筛选 */}
      <div className="flex gap-2 px-3 py-3 overflow-x-auto">
        {TAG_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setTagFilter(f.value)}
            className="shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors"
            style={{
              backgroundColor: tagFilter === f.value ? BRAND : "white",
              color: tagFilter === f.value ? "white" : "#666",
              border: tagFilter === f.value ? "none" : "1px solid #e5e5e5",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 客户列表 */}
      <div className="px-3">
        {filteredClients.length === 0 ? (
          <div className="py-16 text-center">
            <div
              className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-3"
              style={{ backgroundColor: BRAND_BG }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">
              {keyword || tagFilter ? "未找到匹配客户" : "暂无客户，点击右上角+添加"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredClients.map((c) => (
              <div
                key={c.id}
                onClick={() => router.push(`/clients/detail?id=${c.id}`)}
                className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm active:bg-gray-50 cursor-pointer relative"
              >
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-white text-base font-bold"
                  style={{ backgroundColor: BRAND }}
                >
                  {c.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-800 truncate">
                      {c.name}
                    </span>
                    {c.gender === "male" && (
                      <span className="text-xs text-blue-500">男</span>
                    )}
                    {c.gender === "female" && (
                      <span className="text-xs text-pink-500">女</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {c.tags.slice(0, 2).map((t, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: BRAND_BG, color: BRAND }}
                      >
                        {t}
                      </span>
                    ))}
                    {c.tags.length > 2 && (
                      <span className="text-[10px] text-gray-400">
                        +{c.tags.length - 2}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span>最近服务：{formatDate(c.updatedAt)}</span>
                    <span>记录 {recordCounts[c.id] || 0} 条</span>
                  </div>
                </div>
                {/* 删除按钮 */}
                <button
                  onClick={(e) => handleDeleteClient(c.id, c.name, e)}
                  className="p-1.5 text-gray-300 hover:text-red-400"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 客户数量统计 */}
      {filteredClients.length > 0 && (
        <div className="text-center text-xs text-gray-400 mt-4">
          共 {filteredClients.length} 位客户
        </div>
      )}

      {showForm && (
        <ClientFormModal
          client={editingClient}
          onSave={handleSaveClient}
          onClose={() => { setShowForm(false); setEditingClient(null); }}
        />
      )}
    </div>
  );
}
