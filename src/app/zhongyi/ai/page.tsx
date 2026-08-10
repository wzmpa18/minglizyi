"use client";

import { useState } from "react";
import { callAI, getPermissionStatus } from "@/lib/aiService";
import { BrandHeader } from "@/components/shared";
import { useRequireLogin } from "@/lib/useRequireLogin";
import { LoginPromptModal } from "@/components/LoginPromptModal";

export default function ZhongyiAIPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([
    { role: "assistant", content: "你好！我是中医学习助手，可以解答中药、方剂、典籍相关学习问题。本APP内容仅供传统文化研究参考，不构成医疗建议。如有身体不适，请及时就医。" },
  ]);

  const [loading, setLoading] = useState(false);
  const { requireLogin, showLoginPrompt, setShowLoginPrompt } = useRequireLogin();

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    // v20.1: 三级权限检查 - 未登录弹出登录引导
    if (!requireLogin()) return;
    const perm = getPermissionStatus();
    if (!perm.canUseAI) {
      setMessages((prev) => [...prev, { role: "user", content: input }, { role: "assistant", content: perm.message || "今日AI解读次数已用完，开通会员继续使用" }]);
      setInput("");
      return;
    }

    const userInput = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userInput }]);
    setLoading(true);
    try {
      const result = await callAI({
        systemPrompt: "你是专业的中医助手，请用中文回答中医相关问题，内容准确、专业。",
        userPrompt: userInput,
        cacheKey: `zhongyi_ai_${userInput.slice(0, 50)}`,
      });
      setMessages((prev) => [...prev, { role: "assistant", content: result.content }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "AI服务暂时不可用，请稍后重试。" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-lg flex-col px-4 py-4" style={{ height: "calc(100vh - 8rem)" }}>
      <BrandHeader title="中医AI" showBack={true} backUrl="/zhongyi" />
      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${msg.role === "user" ? "bg-emerald-600 text-white" : "bg-muted"}`}>
              {msg.content}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="输入你的问题..."
          className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-emerald-500/50"
        />
        <button onClick={handleSend} disabled={loading} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-50">
          发送
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        本APP内容仅供传统文化研究参考，不构成医疗建议。如有身体不适，请及时就医
      </p>
    </div>
  );
}