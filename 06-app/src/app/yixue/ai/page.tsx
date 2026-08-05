"use client";

import { useState } from "react";
import { callAI } from "@/lib/aiService";

export default function YixueAIPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([
    { role: "assistant", content: "你好！我是易学学习助手，可以解答命理基础问题、排盘疑问。请问有什么可以帮助你的？" },
  ]);

  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userInput = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userInput }]);
    setLoading(true);
    try {
      const result = await callAI({
        systemPrompt: "你是专业易学助手，精通八字、紫微斗数、奇门遁甲等传统术数。请用中文回答，内容准确、专业。",
        userPrompt: userInput,
        cacheKey: `yixue_ai_${userInput.slice(0, 50)}`,
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
      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
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
          className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
        />
        <button onClick={handleSend} disabled={loading} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
          发送
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        仅供娱乐学习参考，不构成决策建议
      </p>
    </div>
  );
}