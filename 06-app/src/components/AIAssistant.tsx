"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";

const BRAND = "#7B2FBE";

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  time: string;
  screenshot?: string; // base64 data URL
}

// localStorage keys
const LS_KEY_CHAT = "ai_assistant_chat";
const LS_KEY_POS = "ai_assistant_pos";

function loadChat(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY_CHAT);
    if (raw) return JSON.parse(raw) as ChatMessage[];
  } catch {
    // ignore
  }
  return [];
}

function saveChat(msgs: ChatMessage[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY_CHAT, JSON.stringify(msgs));
  } catch {
    // ignore
  }
}

function loadPos(): { x: number; y: number } {
  if (typeof window === "undefined") return { x: 0, y: 0 };
  try {
    const raw = localStorage.getItem(LS_KEY_POS);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { x: 0, y: 0 };
}

function savePos(pos: { x: number; y: number }) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY_POS, JSON.stringify(pos));
  } catch {
    // ignore
  }
}

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function now() {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

export default function AIAssistant() {
  const pathname = usePathname();
  const isZhongyi = pathname.startsWith("/zhongyi");
  const title = isZhongyi ? "中医助手" : "易学助手";
  const DISCLAIMER = "⚠️ AI 生成内容仅供学习参考，不构成任何建议";
  const welcomeText = isZhongyi
    ? `${DISCLAIMER}\n\n你好！我是中医助手，可以帮你解答中医学习中的方剂、药材、经络等问题。AI解读功能开发中，敬请期待。当前版本仅提供排盘工具与基础资料查询，智能解读功能将在后续版本上线。`
    : `${DISCLAIMER}\n\n你好！我是易学助手，可以帮你解答八字、紫微、奇门、六爻等命理学习问题。AI解读功能开发中，敬请期待。当前版本仅提供排盘工具与基础资料查询，智能解读功能将在后续版本上线。`;

  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null); // null=未初始化，使用默认位置
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [mounted, setMounted] = useState(false);

  const btnRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const BTN_SIZE = 56;
  const MARGIN = 16;

  // 初始化位置和聊天记录
  useEffect(() => {
    setMounted(true);
    const saved = loadPos();
    const savedChat = loadChat();
    if (savedChat.length > 0) {
      setMessages(savedChat);
    } else {
      const welcome: ChatMessage = {
        id: genId(),
        role: "ai",
        content: welcomeText,
        time: now(),
      };
      setMessages([welcome]);
      saveChat([welcome]);
    }
    // 初始位置：右下角
    if (saved.x && saved.y) {
      setPos({ x: saved.x, y: saved.y });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 当pathname变化（切换中医/易学），更新欢迎消息标题（不重置历史）
  useEffect(() => {
    if (messages.length === 0) return;
    // 如果标题变了，可以考虑更新第一条消息，但保留历史即可
  }, [isZhongyi]); // eslint-disable-line react-hooks/exhaustive-deps

  // 滚动到底部
  useEffect(() => {
    if (listRef.current && isOpen) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  // 拖动处理
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isOpen) return; // 面板打开时不拖动
      const target = btnRef.current;
      if (!target) return;
      e.preventDefault();
      const rect = target.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [isOpen]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let newX = e.clientX - dragOffset.x;
      let newY = e.clientY - dragOffset.y;
      // 限制在视口内
      newX = Math.max(MARGIN, Math.min(vw - BTN_SIZE - MARGIN, newX));
      newY = Math.max(MARGIN, Math.min(vh - BTN_SIZE - MARGIN - 80, newY)); // 留出底部导航空间
      setPos({ x: newX, y: newY });
    },
    [isDragging, dragOffset]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !pos) return;
      setIsDragging(false);
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      const vw = window.innerWidth;
      // 停靠到左右边缘
      const centerX = pos.x + BTN_SIZE / 2;
      const snappedX = centerX < vw / 2 ? MARGIN : vw - BTN_SIZE - MARGIN;
      const newPos = { x: snappedX, y: pos.y };
      setPos(newPos);
      savePos(newPos);
    },
    [isDragging, pos]
  );

  // 判断是否点击而非拖动
  const didDrag = useRef(false);
  const onPointerDownForClick = useCallback(() => {
    didDrag.current = false;
  }, []);
  const onPointerMoveForClick = useCallback(() => {
    didDrag.current = true;
  }, []);

  const handleBtnClick = () => {
    if (didDrag.current) return;
    if (isDragging) return;
    setIsOpen(true);
    setIsFullscreen(false);
  };

  // 截图功能
  const handleScreenshot = async () => {
    if (isCapturing) return;
    setIsCapturing(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const target = document.body;
      const canvas = await html2canvas(target, {
        useCORS: true,
        allowTaint: true,
        scale: 0.5,
        backgroundColor: "#ffffff",
        logging: false,
      });
      const dataUrl = canvas.toDataURL("image/png");
      setScreenshotPreview(dataUrl);
    } catch (err) {
      console.error("截图失败:", err);
      setScreenshotPreview("screenshot-failed");
    } finally {
      setIsCapturing(false);
    }
  };

  // 发送消息
  const handleSend = () => {
    const text = input.trim();
    if (!text && !screenshotPreview) return;

    const userMsg: ChatMessage = {
      id: genId(),
      role: "user",
      content: text || "（截图）",
      time: now(),
      screenshot: screenshotPreview && screenshotPreview !== "screenshot-failed" ? screenshotPreview : undefined,
    };

    const nextMsgs = [...messages, userMsg];
    setMessages(nextMsgs);
    saveChat(nextMsgs);
    setInput("");
    setScreenshotPreview(null);
    setIsReplying(true);

    // Mock AI回复 - 预留混元大模型接口位置（P2阶段接入）
    // P1.5阶段仅UI框架，不接入实际AI模型
    setTimeout(() => {
      const aiMsg: ChatMessage = {
        id: genId(),
        role: "ai",
        content: `${DISCLAIMER}\n\nAI 解读功能开发中，敬请期待。\n\n当前版本仅提供排盘工具与基础资料查询，智能解读功能将在后续版本上线。您可以先使用排盘工具进行排盘，客户档案保存功能已上线。`,
        time: now(),
      };
      const updated = [...nextMsgs, aiMsg];
      setMessages(updated);
      saveChat(updated);
      setIsReplying(false);
    }, 800);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsFullscreen(false);
    setScreenshotPreview(null);
  };

  const handleClearChat = () => {
    const welcome: ChatMessage = {
      id: genId(),
      role: "ai",
      content: welcomeText,
      time: now(),
    };
    setMessages([welcome]);
    saveChat([welcome]);
  };

  // 计算按钮位置 - SSR安全：未mounted时使用默认右下角位置
  const btnStyle: React.CSSProperties = {
    position: "fixed",
    right: MARGIN,
    bottom: MARGIN + 70, // 底部导航上方
    zIndex: 1000,
    width: BTN_SIZE,
    height: BTN_SIZE,
    borderRadius: "50%",
    backgroundColor: BRAND,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: isDragging ? "grabbing" : "grab",
    boxShadow: "0 4px 16px rgba(123,47,190,0.4)",
    touchAction: "none",
    userSelect: "none",
    transition: isDragging ? "none" : "box-shadow 0.2s",
  };

  // 如果mounted且有保存的位置，使用绝对定位
  if (mounted && pos) {
    btnStyle.right = "auto";
    btnStyle.bottom = "auto";
    btnStyle.left = pos.x;
    btnStyle.top = pos.y;
  }

  const panelHeight = isFullscreen ? "90vh" : "60vh";

  return (
    <>
      {/* 悬浮按钮 */}
      {!isOpen && (
        <div
          ref={btnRef}
          style={btnStyle}
          onPointerDown={(e) => {
            onPointerDownForClick();
            onPointerDown(e);
          }}
          onPointerMove={(e) => {
            onPointerMoveForClick();
            onPointerMove(e);
          }}
          onPointerUp={(e) => {
            onPointerUp(e);
            // 小位移视为点击
            if (!didDrag.current) {
              handleBtnClick();
            }
          }}
          onPointerCancel={onPointerUp}
          onClick={handleBtnClick}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
      )}

      {/* 对话面板 */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2000,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <div
            ref={panelRef}
            style={{
              width: "100%",
              maxWidth: "420px",
              margin: "0 auto",
              height: panelHeight,
              backgroundColor: "#f5f5f5",
              borderTopLeftRadius: "16px",
              borderTopRightRadius: "16px",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
              transition: "height 0.3s ease",
            }}
          >
            {/* 顶部标题栏 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                backgroundColor: BRAND,
                borderTopLeftRadius: "16px",
                borderTopRightRadius: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
                <span style={{ color: "white", fontWeight: 600, fontSize: "16px" }}>{title}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  onClick={handleClearChat}
                  style={{
                    background: "none",
                    border: "none",
                    color: "rgba(255,255,255,0.8)",
                    cursor: "pointer",
                    padding: "4px",
                    fontSize: "12px",
                  }}
                  title="清空对话"
                >
                  清空
                </button>
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "white",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                  }}
                  title={isFullscreen ? "收起" : "全屏"}
                >
                  {isFullscreen ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="4 14 10 14 10 20" />
                      <polyline points="20 10 14 10 14 4" />
                      <line x1="14" y1="10" x2="21" y2="3" />
                      <line x1="3" y1="21" x2="10" y2="14" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 3 21 3 21 9" />
                      <polyline points="9 21 3 21 3 15" />
                      <line x1="21" y1="3" x2="14" y2="10" />
                      <line x1="3" y1="21" x2="10" y2="14" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={handleClose}
                  style={{
                    background: "none",
                    border: "none",
                    color: "white",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                  }}
                  title="关闭"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 红色免责声明条 */}
            <div
              style={{
                backgroundColor: "#fff3f3",
                borderLeft: "3px solid #e53935",
                padding: "8px 12px",
                fontSize: "12px",
                color: "#d32f2f",
                textAlign: "center",
              }}
            >
              AI 生成内容仅供学习参考，不构成任何建议
            </div>

            {/* 消息列表 */}
            <div
              ref={listRef}
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    flexDirection: msg.role === "user" ? "row-reverse" : "row",
                    alignItems: "flex-start",
                    gap: "8px",
                  }}
                >
                  {/* 头像 */}
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      backgroundColor: msg.role === "ai" ? BRAND : "#666",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      color: "white",
                      fontSize: "14px",
                    }}
                  >
                    {msg.role === "ai" ? "AI" : "我"}
                  </div>
                  {/* 消息气泡 */}
                  <div
                    style={{
                      maxWidth: "75%",
                      padding: "10px 14px",
                      borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      backgroundColor: msg.role === "user" ? BRAND : "white",
                      color: msg.role === "user" ? "white" : "#333",
                      fontSize: "14px",
                      lineHeight: 1.6,
                      wordBreak: "break-word",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                    }}
                  >
                    {msg.screenshot && (
                      <img
                        src={msg.screenshot}
                        alt="截图"
                        style={{
                          maxWidth: "100%",
                          borderRadius: "8px",
                          marginBottom: msg.content ? "8px" : 0,
                          border: "1px solid #eee",
                        }}
                      />
                    )}
                    {msg.role === "ai" ? (
                      (() => {
                        const lines = msg.content.split('\n');
                        const firstLine = lines[0] || "";
                        const restLines = lines.slice(1).join('\n');
                        const isDisclaimer = firstLine.includes("AI 生成内容仅供学习参考");
                        return (
                          <>
                            {isDisclaimer && (
                              <p style={{ 
                                margin: 0, 
                                color: "#d32f2f", 
                                fontWeight: "bold",
                                fontSize: "12px",
                                paddingBottom: "6px",
                                borderBottom: "1px solid #ffebee",
                                marginBottom: "6px"
                              }}>
                                {firstLine}
                              </p>
                            )}
                            {!isDisclaimer && firstLine && <p style={{ margin: 0 }}>{firstLine}</p>}
                            {restLines && <p style={{ margin: isDisclaimer ? 0 : "4px 0 0" }}>{restLines}</p>}
                          </>
                        );
                      })()
                    ) : (
                      <p style={{ margin: 0 }}>{msg.content}</p>
                    )}
                    <p
                      style={{
                        margin: "4px 0 0",
                        fontSize: "10px",
                        opacity: 0.6,
                        textAlign: msg.role === "user" ? "right" : "left",
                      }}
                    >
                      {msg.time}
                    </p>
                  </div>
                </div>
              ))}
              {isReplying && (
                <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      backgroundColor: BRAND,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: "12px",
                      flexShrink: 0,
                    }}
                  >
                    AI
                  </div>
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: "16px 16px 16px 4px",
                      backgroundColor: "white",
                      fontSize: "14px",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                    }}
                  >
                    <span style={{ opacity: 0.5 }}>正在思考...</span>
                  </div>
                </div>
              )}
            </div>

            {/* 截图预览 */}
            {screenshotPreview && (
              <div
                style={{
                  padding: "8px 12px",
                  backgroundColor: "#fff",
                  borderTop: "1px solid #eee",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {screenshotPreview === "screenshot-failed" ? (
                  <div style={{ fontSize: "12px", color: "#999" }}>截图失败，请重试</div>
                ) : (
                  <>
                    <img
                      src={screenshotPreview}
                      alt="截图预览"
                      style={{
                        width: "48px",
                        height: "48px",
                        objectFit: "cover",
                        borderRadius: "6px",
                        border: "1px solid #ddd",
                      }}
                    />
                    <span style={{ fontSize: "12px", color: "#666", flex: 1 }}>已截取当前页面，可以补充问题</span>
                  </>
                )}
                <button
                  onClick={() => setScreenshotPreview(null)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#999",
                    cursor: "pointer",
                    padding: "4px",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            )}

            {/* 底部工具栏 */}
            <div
              style={{
                padding: "8px 12px",
                paddingBottom: "calc(8px + env(safe-area-inset-bottom))",
                backgroundColor: "white",
                borderTop: "1px solid #eee",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <button
                onClick={handleScreenshot}
                disabled={isCapturing}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "8px 10px",
                  borderRadius: "20px",
                  border: "1px solid #e0d0f0",
                  backgroundColor: isCapturing ? "#f0e6fa" : "white",
                  color: BRAND,
                  fontSize: "12px",
                  cursor: isCapturing ? "wait" : "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                {isCapturing ? "截取中..." : "截图解读"}
              </button>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入问题..."
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: "20px",
                  border: "1px solid #e0e0e0",
                  backgroundColor: "#f8f8f8",
                  fontSize: "14px",
                  outline: "none",
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() && !screenshotPreview}
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  border: "none",
                  backgroundColor: input.trim() || screenshotPreview ? BRAND : "#ddd",
                  color: "white",
                  cursor: input.trim() || screenshotPreview ? "pointer" : "default",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "background-color 0.2s",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
