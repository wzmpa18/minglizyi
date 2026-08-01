"use client";

import { useState } from "react";
import { BrandHeader } from "@/components/shared";

export default function YixueAIPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([
    { role: "assistant", content: "你好！我是易学学习助手，可以解答命理基础问题、排盘疑问。请问有什么可以帮助你的？" },
  ]);

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { role: "user", content: input }]);
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "感谢你的提问。关于命理基础知识，建议参考《渊海子平》《三命通会》等典籍。\n\n仅供娱乐学习参考，不构成决策建议。",
      },
    ]);
    setInput("");
  };

  return (
    <div className="mx-auto flex max-w-lg flex-col px-4 py-4" style={{ height: "calc(100vh - 8rem)" }}>
      <BrandHeader title="AI助手" showBack={true} backUrl="/yixue" />
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
        <button onClick={handleSend} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">
          发送
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        仅供娱乐学习参考，不构成决策建议
      </p>
    </div>
  );
}