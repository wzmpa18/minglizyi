"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { BrandHeader } from "@/components/shared";
import { createGroup, type GroupInfo } from "@/lib/socialStore";

const BRAND = "#7B2FBE";

const GROUP_LEVELS = [
  { value: "small", label: "小群", maxMembers: 50 },
  { value: "medium", label: "中群", maxMembers: 100 },
  { value: "large", label: "大群", maxMembers: 200 },
  { value: "vip", label: "VIP群", maxMembers: 500 },
] as const;

const AVAILABLE_TAGS = [
  "八字", "紫微", "奇门", "六爻", "中医", "养生",
  "风水", "择日", "梅花易数", "小六壬", "大六壬", "起名",
  "学习", "交流", "实战", "案例",
];

// 一键建群的预设群名模板
const QUICK_GROUP_NAMES = [
  "八字交流群", "紫微斗数学习群", "奇门遁甲实战群",
  "六爻占卜群", "中医养生群", "风水堪舆群",
  "梅花易数交流群", "小六壬学习群", "大六壬研究群",
  "择日讨论群", "玄空飞星群", "国学经典群",
  "命理探讨群", "易学入门群", "道医养生群",
];

// 随机取N个元素
function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// ==================== 普通建群视图 ====================
function NormalCreate({
  onBack,
}: {
  onBack: () => void;
}) {
  const router = useRouter();
  const [groupName, setGroupName] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<(typeof GROUP_LEVELS)[number]>(GROUP_LEVELS[0]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [error, setError] = useState("");

  const currentUserId = "current_user";
  const currentUserName = "我";

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleCreate = () => {
    const name = groupName.trim();
    if (!name) {
      setError("请输入群名称");
      return;
    }
    if (name.length > 20) {
      setError("群名称不能超过20个字符");
      return;
    }

    const newGroup: GroupInfo = {
      id: "group_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
      name: name,
      avatar: name.slice(0, 1),
      ownerId: currentUserId,
      ownerName: currentUserName,
      members: [
        {
          userId: currentUserId,
          name: currentUserName,
          avatar: "我",
          role: "owner",
          joinedAt: new Date().toISOString(),
        },
      ],
      announcement: "",
      maxMembers: selectedLevel.maxMembers,
      level: selectedLevel.value,
      createdAt: new Date().toISOString(),
      tags: selectedTags,
    };

    createGroup(newGroup);
    router.push("/groups");
  };

  return (
    <div
      className="flex min-h-screen flex-col bg-[#ededed]"
      style={{ maxWidth: "420px", margin: "0 auto" }}
    >
      <BrandHeader title="普通建群" showBack />

      <div className="flex-1 overflow-y-auto px-3 pt-3 space-y-4">
        {/* 群名称 */}
        <div className="bg-white rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">群名称</p>
          <input
            type="text"
            value={groupName}
            onChange={(e) => {
              setGroupName(e.target.value);
              setError("");
            }}
            placeholder="请输入群名称（最多20字）"
            maxLength={20}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none"
            style={{ outline: "none" }}
          />
          {error && (
            <p className="text-xs text-red-500 mt-1">{error}</p>
          )}
        </div>

        {/* 群等级选择 */}
        <div className="bg-white rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">群等级</p>
          <div className="grid grid-cols-2 gap-2">
            {GROUP_LEVELS.map((level) => (
              <button
                key={level.value}
                onClick={() => setSelectedLevel(level)}
                className="rounded-xl py-3 px-3 text-sm transition-all"
                style={{
                  backgroundColor:
                    selectedLevel.value === level.value ? BRAND : "#f5f5f5",
                  color:
                    selectedLevel.value === level.value ? "white" : "#666",
                  border:
                    selectedLevel.value === level.value
                      ? "none"
                      : "1px solid #e5e5e5",
                  fontWeight:
                    selectedLevel.value === level.value ? 600 : 400,
                }}
              >
                <p>{level.label}</p>
                <p
                  className="text-xs mt-0.5"
                  style={{
                    opacity: selectedLevel.value === level.value ? 0.8 : 0.6,
                  }}
                >
                  {level.maxMembers}人
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* 群标签 */}
        <div className="bg-white rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">
            群标签
            {selectedTags.length > 0 && (
              <span className="text-xs text-gray-400 ml-1">
                (已选{selectedTags.length}个)
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className="rounded-full px-3 py-1.5 text-xs transition-colors"
                style={{
                  backgroundColor: selectedTags.includes(tag)
                    ? BRAND
                    : "#f0f0f0",
                  color: selectedTags.includes(tag) ? "white" : "#666",
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* 创建按钮 */}
        <button
          onClick={handleCreate}
          disabled={!groupName.trim()}
          className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-colors"
          style={{
            backgroundColor: groupName.trim() ? BRAND : "#ccc",
          }}
        >
          创建群聊
        </button>
      </div>

      <div className="py-3 text-center">
        <p className="text-[11px] text-gray-400">yandao.vip 分享下载有礼</p>
      </div>

      <div className="page-bottom-nav-safe" aria-hidden="true" />
    </div>
  );
}

// ==================== 一键建群视图 ====================
function QuickCreate({
  onBack,
}: {
  onBack: () => void;
}) {
  const router = useRouter();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<(typeof GROUP_LEVELS)[number]>(GROUP_LEVELS[1]); // 默认中群

  const currentUserId = "current_user";
  const currentUserName = "我";

  // 根据选中的标签智能推荐群名
  const suggestedName = useMemo(() => {
    if (selectedTags.length === 0) {
      return pickRandom(QUICK_GROUP_NAMES, 1)[0];
    }
    // 优先匹配包含选中标签的群名
    const matched = QUICK_GROUP_NAMES.filter((name) =>
      selectedTags.some((tag) => name.includes(tag))
    );
    if (matched.length > 0) {
      return pickRandom(matched, 1)[0];
    }
    return pickRandom(QUICK_GROUP_NAMES, 1)[0];
  }, [selectedTags]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleQuickCreate = () => {
    const tags = selectedTags.length > 0 ? selectedTags : pickRandom(AVAILABLE_TAGS, 3);

    const newGroup: GroupInfo = {
      id: "group_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
      name: suggestedName,
      avatar: suggestedName.slice(0, 1),
      ownerId: currentUserId,
      ownerName: currentUserName,
      members: [
        {
          userId: currentUserId,
          name: currentUserName,
          avatar: "我",
          role: "owner",
          joinedAt: new Date().toISOString(),
        },
      ],
      announcement: `欢迎加入${suggestedName}！`,
      maxMembers: selectedLevel.maxMembers,
      level: selectedLevel.value,
      createdAt: new Date().toISOString(),
      tags: tags,
    };

    createGroup(newGroup);
    router.push("/groups");
  };

  return (
    <div
      className="flex min-h-screen flex-col bg-[#ededed]"
      style={{ maxWidth: "420px", margin: "0 auto" }}
    >
      <BrandHeader title="一键建群" showBack />

      <div className="flex-1 overflow-y-auto px-3 pt-3 space-y-4">
        {/* 智能推荐群名 */}
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-700">智能推荐群名</p>
            <button
              onClick={() => setSelectedTags([...selectedTags])}
              className="text-xs px-2 py-1 rounded-full"
              style={{ color: BRAND, backgroundColor: BRAND + "15" }}
            >
              换一个
            </button>
          </div>
          <div
            className="rounded-xl p-4 text-center"
            style={{
              backgroundColor: BRAND + "10",
              border: "2px dashed " + BRAND + "40",
            }}
          >
            <p className="text-lg font-bold" style={{ color: BRAND }}>
              {suggestedName}
            </p>
            <p className="text-xs text-gray-500 mt-1">系统根据你的兴趣智能推荐</p>
          </div>
        </div>

        {/* 选择兴趣标签 */}
        <div className="bg-white rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">
            选择兴趣标签（可选）
            <span className="text-xs text-gray-400 ml-1">
              选标签后群名更精准
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className="rounded-full px-3 py-1.5 text-xs transition-colors"
                style={{
                  backgroundColor: selectedTags.includes(tag)
                    ? BRAND
                    : "#f0f0f0",
                  color: selectedTags.includes(tag) ? "white" : "#666",
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* 群规模 */}
        <div className="bg-white rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">群规模</p>
          <div className="grid grid-cols-2 gap-2">
            {GROUP_LEVELS.map((level) => (
              <button
                key={level.value}
                onClick={() => setSelectedLevel(level)}
                className="rounded-xl py-3 px-3 text-sm transition-all"
                style={{
                  backgroundColor:
                    selectedLevel.value === level.value ? BRAND : "#f5f5f5",
                  color:
                    selectedLevel.value === level.value ? "white" : "#666",
                  border:
                    selectedLevel.value === level.value
                      ? "none"
                      : "1px solid #e5e5e5",
                  fontWeight:
                    selectedLevel.value === level.value ? 600 : 400,
                }}
              >
                <p>{level.label}</p>
                <p
                  className="text-xs mt-0.5"
                  style={{
                    opacity: selectedLevel.value === level.value ? 0.8 : 0.6,
                  }}
                >
                  {level.maxMembers}人
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* 一键创建按钮 */}
        <button
          onClick={handleQuickCreate}
          className="w-full rounded-xl py-4 text-base font-bold text-white transition-all active:scale-[0.98]"
          style={{
            backgroundColor: BRAND,
            boxShadow: "0 4px 16px rgba(123, 47, 190, 0.4)",
          }}
        >
          <div className="flex items-center justify-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            一键创建 "{suggestedName}"
          </div>
        </button>

        <p className="text-xs text-gray-400 text-center">
          系统将自动设置群公告、头像等信息
        </p>
      </div>

      <div className="py-3 text-center">
        <p className="text-[11px] text-gray-400">yandao.vip 分享下载有礼</p>
      </div>

      <div className="page-bottom-nav-safe" aria-hidden="true" />
    </div>
  );
}

// ==================== 主页面：选择建群方式 ====================
export default function CreateGroupPage() {
  const [mode, setMode] = useState<"menu" | "normal" | "quick">("menu");

  if (mode === "normal") {
    return <NormalCreate onBack={() => setMode("menu")} />;
  }

  if (mode === "quick") {
    return <QuickCreate onBack={() => setMode("menu")} />;
  }

  // 选择建群方式
  return (
    <div
      className="flex min-h-screen flex-col bg-[#ededed]"
      style={{ maxWidth: "420px", margin: "0 auto" }}
    >
      <BrandHeader title="创建群聊" showBack />

      <div className="flex-1 overflow-y-auto px-3 pt-6 space-y-4">
        {/* 普通建群 */}
        <button
          onClick={() => setMode("normal")}
          className="flex w-full items-center gap-4 rounded-xl bg-white p-5 text-left active:bg-gray-50 transition-colors shadow-sm"
          style={{ border: "1px solid #eee" }}
        >
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: BRAND + "15" }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke={BRAND}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              <line x1="12" y1="11" x2="12" y2="17" />
              <line x1="9" y1="14" x2="15" y2="14" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-gray-800">普通建群</p>
            <p className="mt-1 text-sm text-gray-500">
              自定义群名称、等级、标签等信息
            </p>
          </div>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ccc"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>

        {/* 一键建群 */}
        <button
          onClick={() => setMode("quick")}
          className="flex w-full items-center gap-4 rounded-xl p-5 text-left active:opacity-90 transition-all shadow-lg"
          style={{
            background: "linear-gradient(135deg, #7B2FBE 0%, #9B5ECF 100%)",
          }}
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/20">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-white">一键建群</p>
            <p className="mt-1 text-sm text-white/80">
              智能推荐群名，选标签即建群，快速开始
            </p>
          </div>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      <div className="py-3 text-center">
        <p className="text-[11px] text-gray-400">yandao.vip 分享下载有礼</p>
      </div>

      <div className="page-bottom-nav-safe" aria-hidden="true" />
    </div>
  );
}