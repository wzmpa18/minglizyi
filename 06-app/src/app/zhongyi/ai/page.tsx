"use client";

import { useState } from "react";
import { BrandHeader } from "@/components/shared";

export default function ZhongyiAIPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([
    { role: "assistant", content: "你好！我是中医学习助手，可以解答中药、方剂、典籍相关学习问题。以下为中医典籍记载内容，仅供学习参考，不构成医疗建议。" },
  ]);

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { role: "user", content: input }]);
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "根据《神农本草经》记载……\n\n以下为中医典籍记载内容，仅供学习参考，不构成医疗建议。",
      },
    ]);
    setInput("");
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
        <button onClick={handleSend} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white">
          发送
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        以下为中医典籍记载内容，仅供学习参考，不构成医疗建议
      </p>
    </div>
  );
}