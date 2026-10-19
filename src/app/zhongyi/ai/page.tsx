"use client";
import {InterfaceButton} from "@/components/InterfaceControls";

import { useState } from "react";
import Link from "next/link";
import {MEDICAL_STUDY_QUESTIONS,MEDICAL_LITERATURE_SYSTEM,fixedMedicalStudyRequest,localMedicalWorksheet} from "@/lib/medicalLearning";
import { callAI, getPermissionStatusFromServer } from "@/lib/aiService";
import { BrandHeader } from "@/components/shared";
import { useRequireLogin } from "@/lib/useRequireLogin";
import { LoginPromptModal } from "@/components/LoginPromptModal";
import { SafeRichText } from "@/components/SafeRichText";

export default function ZhongyiAIPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([
    { role: "assistant", content: "你好！可先选择公开文献学习题，再点击发送使用AI阅读辅助。自由输入在本机作原文对照，不生成个人证型、处方或操作。身体不适请及时就医。" },
  ]);

  const [loading, setLoading] = useState(false);
  const { requireLogin, showLoginPrompt, setShowLoginPrompt } = useRequireLogin();

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const fixed=fixedMedicalStudyRequest(input);
    if(!fixed){const ownText=input;setInput('');setLoading(true);setMessages(old=>[...old,{role:'user',content:ownText}]);try{const local=await localMedicalWorksheet(ownText);setMessages(old=>[...old,{role:'local',content:'本机原文对照（没有上传自述）\n\n'+local}]);}catch{setMessages(old=>[...old,{role:'local',content:'本机索引暂不可用，请从完整古籍入口核查。未把自述转交云端。'}]);}finally{setLoading(false);}return;}
    // v20.1: 三级权限检查 - 未登录弹出登录引导
    if (!requireLogin()) return;
    const perm = await getPermissionStatusFromServer();
    if (!perm.canUseAI) {
      setMessages((prev) => [...prev, { role: "user", content: input }, { role: "assistant", content: perm.message || "今日AI解读次数已用完，开通会员继续使用" }]);
      setInput("");
      return;
    }

    const userInput = fixed;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userInput }]);
    setLoading(true);
    try {
      const result = await callAI({
        systemPrompt: MEDICAL_LITERATURE_SYSTEM,
        userPrompt: userInput,
        cacheKey: `medical_literature_v2_${userInput}`,
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
      <p className="my-2 text-xs leading-6">自由输入只用于本机古籍词条对照，不发送个人健康资料。以下固定公开学习题可主动请求AI阅读辅助，沿用现有次数；不是诊疗服务。</p>
      <div className="mb-3 flex max-h-32 flex-wrap gap-2 overflow-auto">{MEDICAL_STUDY_QUESTIONS.map(q=><InterfaceButton className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-left text-xs text-stone-950" translate="no" disabled={loading} key={q} onClick={()=>setInput(q)}>{q}</InterfaceButton>)}</div><Link href="/zhongyi/bianzheng/" className="mb-2 text-sm underline">相关经典医案与原文出处</Link>
      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${msg.role === "user" ? "bg-emerald-600 text-white" : "bg-muted"}`}>
              {msg.role === "assistant" && <div className="mb-1 text-xs font-semibold text-red-600">AI生成（深度合成）内容</div>}
              {msg.role === "user" ? <span className="break-words">{msg.content}</span> : <SafeRichText content={msg.content} />}
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
        <InterfaceButton onClick={handleSend} disabled={loading} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-50">
          发送
        </InterfaceButton>
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        本APP内容仅供传统文化研究参考，不构成医疗建议。如有身体不适，请及时就医
      </p>
    </div>
  );
}
