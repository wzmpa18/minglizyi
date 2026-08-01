"use client";

import React, { useState, useEffect, useRef } from "react";

const BRAND = "#7B2FBE";

// ==================== 类型定义 ====================
interface Friend {
  id: string;
  name: string;
  avatar: string; // emoji或文字占位
  lastMessage: string;
  time: string;
  unread: number;
}

interface GroupChat {
  id: string;
  name: string;
  memberCount: number;
  lastMessage: string;
  time: string;
  unread: number;
}

interface ChatMsg {
  id: string;
  role: "me" | "other";
  content: string;
  time: string;
  sender?: string; // 群聊中显示发送者
}

// ==================== 模拟数据 ====================
const MOCK_FRIENDS: Friend[] = [
  { id: "f1", name: "易经行者", avatar: "☯", lastMessage: "今天排的八字你看了吗？", time: "10:30", unread: 2 },
  { id: "f2", name: "紫微居士", avatar: "紫", lastMessage: "流年命宫化禄确实有财运", time: "昨天", unread: 0 },
  { id: "f3", name: "中医传承人", avatar: "🌿", lastMessage: "四君子汤健脾效果不错", time: "昨天", unread: 1 },
  { id: "f4", name: "奇门研习者", avatar: "奇", lastMessage: "关于奇门排盘想请教你", time: "2天前", unread: 0 },
  { id: "f5", name: "风水探秘者", avatar: "🏡", lastMessage: "你说的风水布局很有道理", time: "3天前", unread: 0 },
  { id: "f6", name: "六爻问卦人", avatar: "爻", lastMessage: "世应相生，事情有转机", time: "1周前", unread: 0 },
  { id: "f7", name: "命理爱好者", avatar: "📜", lastMessage: "食神制杀力度如何？", time: "1周前", unread: 0 },
  { id: "f8", name: "养生达人", avatar: "🍵", lastMessage: "养生茶改善了睡眠", time: "2周前", unread: 0 },
];

const MOCK_GROUPS: GroupChat[] = [
  { id: "g1", name: "易学交流群", memberCount: 128, lastMessage: "张三：今天学习八字的心得分享", time: "09:15", unread: 5 },
  { id: "g2", name: "中医学习小组", memberCount: 56, lastMessage: "李四：伤寒论太阳病篇要点整理", time: "昨天", unread: 0 },
  { id: "g3", name: "紫微斗数研讨", memberCount: 89, lastMessage: "王五：命宫天机坐守解析", time: "2天前", unread: 3 },
];

const NEARBY_TAGS = ["八字", "紫微", "奇门", "六爻", "中医", "养生", "风水", "择日", "梅花易数", "小六壬", "大六壬", "起名"];

// ==================== localStorage辅助 ====================
function loadChat(key: string): ChatMsg[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`friends_chat_${key}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveChat(key: string, msgs: ChatMsg[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(`friends_chat_${key}`, JSON.stringify(msgs)); } catch {}
}

// ==================== 子组件：头像 ====================
function Avatar({ text, size = 44 }: { text: string; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full text-white font-bold"
      style={{
        width: size,
        height: size,
        backgroundColor: BRAND,
        fontSize: size * 0.4,
      }}
    >
      {text.slice(0, 1)}
    </div>
  );
}

// ==================== 主页面组件 ====================
export default function FriendsPage() {
  // 视图状态: list | privateChat | groupChat | addFriend
  const [view, setView] = useState<"list" | "privateChat" | "groupChat" | "addFriend">("list");
  const [activeTab, setActiveTab] = useState<"friends" | "groups">("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddMenu, setShowAddMenu] = useState(false);

  // 聊天相关
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [currentChatName, setCurrentChatName] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatListRef = useRef<HTMLDivElement>(null);

  // 添加好友
  const [addMode, setAddMode] = useState<"menu" | "scan" | "search" | "nearby">("menu");
  const [searchNickname, setSearchNickname] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // 初始化默认聊天记录
  useEffect(() => {
    if (view === "privateChat" && currentChatId) {
      const saved = loadChat(`private_${currentChatId}`);
      if (saved.length > 0) {
        setChatMessages(saved);
      } else {
        const friend = MOCK_FRIENDS.find(f => f.id === currentChatId);
        if (friend) {
          const initMsgs: ChatMsg[] = [
            { id: "init1", role: "other", content: friend.lastMessage, time: friend.time },
          ];
          setChatMessages(initMsgs);
          saveChat(`private_${currentChatId}`, initMsgs);
        }
      }
    } else if (view === "groupChat" && currentChatId) {
      const saved = loadChat(`group_${currentChatId}`);
      if (saved.length > 0) {
        setChatMessages(saved);
      } else {
        const group = MOCK_GROUPS.find(g => g.id === currentChatId);
        if (group) {
          const initMsgs: ChatMsg[] = [
            { id: "ginit1", role: "other", content: group.lastMessage, time: group.time, sender: "群成员" },
          ];
          setChatMessages(initMsgs);
          saveChat(`group_${currentChatId}`, initMsgs);
        }
      }
    }
  }, [view, currentChatId]);

  // 滚动到底部
  useEffect(() => {
    if (chatListRef.current) {
      chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // 过滤好友/群
  const filteredFriends = MOCK_FRIENDS.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredGroups = MOCK_GROUPS.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openPrivateChat = (friend: Friend) => {
    setCurrentChatId(friend.id);
    setCurrentChatName(friend.name);
    setView("privateChat");
    setShowAddMenu(false);
  };

  const openGroupChat = (group: GroupChat) => {
    setCurrentChatId(group.id);
    setCurrentChatName(group.name);
    setView("groupChat");
    setShowAddMenu(false);
  };

  const handleBack = () => {
    if (view === "addFriend" && addMode !== "menu") {
      setAddMode("menu");
      return;
    }
    setView("list");
    setCurrentChatId(null);
    setChatMessages([]);
    setAddMode("menu");
  };

  const handleSendMessage = () => {
    const text = chatInput.trim();
    if (!text || !currentChatId) return;
    const prefix = view === "privateChat" ? "private_" : "group_";
    const newMsg: ChatMsg = {
      id: `me-${Date.now()}`,
      role: "me",
      content: text,
      time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
    };
    const updated = [...chatMessages, newMsg];
    setChatMessages(updated);
    saveChat(prefix + currentChatId, updated);
    setChatInput("");

    // 模拟回复
    setTimeout(() => {
      const reply: ChatMsg = {
        id: `auto-${Date.now()}`,
        role: "other",
        content: "收到你的消息了（此为模拟回复，功能开发中）",
        time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
        sender: view === "groupChat" ? "群成员" : undefined,
      };
      const nextMsgs = [...updated, reply];
      setChatMessages(nextMsgs);
      saveChat(prefix + currentChatId, nextMsgs);
    }, 800 + Math.random() * 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // ==================== 渲染：添加好友面板 ====================
  if (view === "addFriend") {
    return (
      <div className="min-h-screen bg-white" style={{ maxWidth: "420px", margin: "0 auto", paddingBottom: "72px" }}>
        <header className="sticky top-0 z-40 flex items-center gap-2 px-2" style={{ backgroundColor: BRAND, height: "48px" }}>
          <button onClick={handleBack} className="flex h-10 w-10 items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-white">添加好友</h1>
        </header>

        {addMode === "menu" && (
          <div className="p-4 space-y-3">
            <button onClick={() => setAddMode("scan")} className="flex w-full items-center gap-3 rounded-xl bg-gray-50 p-4 active:bg-gray-100">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: BRAND }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-gray-800">扫码添加</p>
                <p className="text-xs text-gray-500">扫描对方二维码添加好友</p>
              </div>
            </button>
            <button onClick={() => setAddMode("search")} className="flex w-full items-center gap-3 rounded-xl bg-gray-50 p-4 active:bg-gray-100">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: BRAND }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-gray-800">昵称搜索</p>
                <p className="text-xs text-gray-500">通过昵称/ID查找好友</p>
              </div>
            </button>
            <button onClick={() => setAddMode("nearby")} className="flex w-full items-center gap-3 rounded-xl bg-gray-50 p-4 active:bg-gray-100">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: BRAND }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-gray-800">附近搭子</p>
                <p className="text-xs text-gray-500">发现附近兴趣相同的朋友</p>
              </div>
            </button>
          </div>
        )}

        {addMode === "scan" && (
          <div className="flex flex-col items-center p-6">
            <div className="flex h-64 w-64 items-center justify-center rounded-xl border-2" style={{ borderColor: BRAND, backgroundColor: "#f5f0fa" }}>
              <div className="text-center">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto" }}>
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" />
                </svg>
                <p className="mt-4 text-sm text-gray-500">相机占位区域</p>
                <p className="mt-1 text-xs text-gray-400">将二维码放入框内扫描</p>
              </div>
            </div>
            <p className="mt-6 text-sm text-gray-600">扫描好友二维码即可添加</p>
          </div>
        )}

        {addMode === "search" && (
          <div className="p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchNickname}
                onChange={(e) => setSearchNickname(e.target.value)}
                placeholder="输入昵称或用户ID"
                className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2"
                style={{ outline: "none" }}
              />
              <button className="rounded-xl px-5 text-sm font-semibold text-white" style={{ backgroundColor: BRAND }}>搜索</button>
            </div>
            {searchNickname && (
              <div className="mt-6 text-center text-sm text-gray-400">
                未找到相关用户（示例数据）
              </div>
            )}
          </div>
        )}

        {addMode === "nearby" && (
          <div className="p-4">
            <p className="mb-3 text-sm font-medium text-gray-700">选择兴趣标签：</p>
            <div className="flex flex-wrap gap-2">
              {NEARBY_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className="rounded-full px-3 py-1.5 text-sm transition-colors"
                  style={{
                    backgroundColor: selectedTags.includes(tag) ? BRAND : "#f0f0f0",
                    color: selectedTags.includes(tag) ? "white" : "#666",
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
            <button className="mt-6 w-full rounded-xl py-3 text-sm font-semibold text-white" style={{ backgroundColor: BRAND }}>
              查找附近搭子
            </button>
            <p className="mt-3 text-center text-xs text-gray-400">附近搭子功能开发中</p>
          </div>
        )}
      </div>
    );
  }

  // ==================== 渲染：私聊/群聊视图 ====================
  if ((view === "privateChat" || view === "groupChat") && currentChatId) {
    const isGroup = view === "groupChat";
    return (
      <div className="flex min-h-screen flex-col bg-[#ededed]" style={{ maxWidth: "420px", margin: "0 auto" }}>
        <header className="sticky top-0 z-40 flex items-center gap-2 px-2" style={{ backgroundColor: BRAND, height: "48px" }}>
          <button onClick={handleBack} className="flex h-10 w-10 items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="flex flex-col">
            <span className="text-base font-bold text-white">{currentChatName}</span>
            {isGroup && (
              <span className="text-[11px] text-white/70">
                {MOCK_GROUPS.find(g => g.id === currentChatId)?.memberCount}位成员
              </span>
            )}
          </div>
        </header>

        {/* 消息列表 */}
        <div ref={chatListRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3" style={{ paddingBottom: "80px" }}>
          {chatMessages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === "me" ? "justify-end" : "justify-start"}`}>
              {msg.role === "other" && (
                <Avatar text={isGroup && msg.sender ? msg.sender : currentChatName} size={36} />
              )}
              <div
                className={`mx-2 max-w-[70%] rounded-2xl px-3 py-2 text-sm leading-relaxed`}
                style={{
                  backgroundColor: msg.role === "me" ? BRAND : "white",
                  color: msg.role === "me" ? "white" : "#333",
                  borderBottomRightRadius: msg.role === "me" ? "4px" : "16px",
                  borderBottomLeftRadius: msg.role === "other" ? "4px" : "16px",
                }}
              >
                {isGroup && msg.role === "other" && msg.sender && (
                  <p className="mb-0.5 text-[11px]" style={{ color: BRAND }}>{msg.sender}</p>
                )}
                <p>{msg.content}</p>
                <p className="mt-1 text-right text-[10px] opacity-60">{msg.time}</p>
              </div>
              {msg.role === "me" && <Avatar text="我" size={36} />}
            </div>
          ))}
        </div>

        {/* 输入框 */}
        <div className="fixed left-1/2 flex w-full items-center gap-2 border-t border-gray-200 bg-white px-3 py-2" style={{ maxWidth: "420px", bottom: "56px", transform: "translateX(-50%)" }}>
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none"
          />
          <button
            onClick={handleSendMessage}
            disabled={!chatInput.trim()}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: chatInput.trim() ? BRAND : "#ccc" }}
          >发送</button>
        </div>
      </div>
    );
  }

  // ==================== 渲染：列表视图 ====================
  return (
    <div className="min-h-screen bg-white" style={{ maxWidth: "420px", margin: "0 auto", paddingBottom: "72px" }}>
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4" style={{ backgroundColor: BRAND, height: "48px" }}>
        <h1 className="text-lg font-bold text-white">好友</h1>
        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          {showAddMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowAddMenu(false)} />
              <div className="absolute right-0 top-12 z-50 w-40 overflow-hidden rounded-xl bg-white shadow-xl" style={{ border: "1px solid #eee" }}>
                <button onClick={() => { setShowAddMenu(false); setView("addFriend"); setAddMode("scan"); }} className="flex w-full items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
                  扫码添加
                </button>
                <button onClick={() => { setShowAddMenu(false); setView("addFriend"); setAddMode("search"); }} className="flex w-full items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                  昵称搜索
                </button>
                <button onClick={() => { setShowAddMenu(false); setView("addFriend"); setAddMode("nearby"); }} className="flex w-full items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                  附近搭子
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* 搜索栏 */}
      <div className="sticky top-12 z-30 bg-white px-4 py-3">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索好友/群聊"
            className="w-full rounded-xl bg-gray-100 py-2.5 pl-10 pr-4 text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
          />
        </div>
      </div>

      {/* 分段切换 */}
      <div className="flex border-b border-gray-100">
        {(["friends", "groups"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 py-3 text-sm font-medium transition-colors relative"
            style={{
              color: activeTab === tab ? BRAND : "#999",
              fontWeight: activeTab === tab ? 600 : 400,
            }}
          >
            {tab === "friends" ? "好友" : "群聊"}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full" style={{ backgroundColor: BRAND }} />
            )}
          </button>
        ))}
      </div>

      {/* 列表 */}
      <div className="flex-1">
        {activeTab === "friends" ? (
          filteredFriends.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">暂无匹配的好友</div>
          ) : (
            filteredFriends.map(friend => (
              <button
                key={friend.id}
                onClick={() => openPrivateChat(friend)}
                className="flex w-full items-center gap-3 border-b border-gray-50 px-4 py-3 text-left active:bg-gray-50"
              >
                <div className="relative">
                  <Avatar text={friend.avatar} size={44} />
                  {friend.unread > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                      {friend.unread}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-800 truncate">{friend.name}</span>
                    <span className="ml-2 shrink-0 text-xs text-gray-400">{friend.time}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-gray-500">{friend.lastMessage}</p>
                </div>
              </button>
            ))
          )
        ) : (
          filteredGroups.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">暂无匹配的群聊</div>
          ) : (
            filteredGroups.map(group => (
              <button
                key={group.id}
                onClick={() => openGroupChat(group)}
                className="flex w-full items-center gap-3 border-b border-gray-50 px-4 py-3 text-left active:bg-gray-50"
              >
                <div className="relative">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white font-bold" style={{ backgroundColor: BRAND, fontSize: "16px" }}>
                    {group.name.slice(0, 1)}
                  </div>
                  {group.unread > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                      {group.unread}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-800 truncate">{group.name} <span className="text-xs font-normal text-gray-400">({group.memberCount})</span></span>
                    <span className="ml-2 shrink-0 text-xs text-gray-400">{group.time}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-gray-500">{group.lastMessage}</p>
                </div>
              </button>
            ))
          )
        )}
      </div>
    </div>
  );
}
