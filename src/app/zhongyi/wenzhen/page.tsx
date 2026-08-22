"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { WENZHEN_CATEGORIES, buildWenzhenSystemPrompt } from "@/data/wenzhen_data";
import { buildZhengguPrompt } from "@/data/zhenggu_knowledge";
import { callAI, getUserPermissionLevel, getPermissionStatus, truncateContentForFreeUser, generateContentKey, isSingleUnlocked, activateSingleUnlock, SINGLE_UNLOCK_PRICE } from "@/lib/aiService";
import { paySingleUnlockAndWait } from "@/lib/paymentService";
import { useAiPricing } from "@/lib/pricingStore";
import { useNativePayQR } from "@/components/PayQRCodeModal";
import { useRequireLogin } from "@/lib/useRequireLogin";
import { LoginPromptModal } from "@/components/LoginPromptModal";
import { useToolBack } from "@/lib/useToolBack";

const BRAND = "#7B2FBE";
const BRAND_LIGHT = "#9B5ECF";
const BRAND_BG = "#F3EDF7";
const COMPLIANCE_TEXT =
  "⚠️ 本APP内容仅供传统文化研究参考，不构成医疗建议。如有身体不适，请及时就医。";

const TOP_NOTICE =
  "⚠️ 提示：建议仅在同一医学体系内选择，不建议同时选中中原主流医学与少数民族医学，避免辨证逻辑冲突；选的医家/古籍越多，AI输出融合度越高。默认以北派倪海厦经方体系为基准。";

// 询问症状输入
interface SymptomInput {
  mainSymptom: string;
  duration: string;
  accompanying: string;
  pulseTongue: string; // 脉象舌象
}

export default function WenzhenPage() {
  const router = useRouter();
  useToolBack();

  // v25.0.47_10: 价格 SSOT——展示与下单价格优先读服务端，本地常量仅兜底
  const { singleUnlockPrice: serverSinglePrice } = useAiPricing();
  const singlePrice = serverSinglePrice ?? SINGLE_UNLOCK_PRICE;

  // 门类
  const [activeCategory, setActiveCategory] = useState("beipai");
  const category = WENZHEN_CATEGORIES.find((c) => c.id === activeCategory)!;

  // 选中的名家
  const [selectedMasters, setSelectedMasters] = useState<Set<string>>(
    new Set(["nihaisha", "zhangzhongjing"])
  );

  // 补充输入
  const [supplementText, setSupplementText] = useState("");

  // 症状输入
  const [symptomInput, setSymptomInput] = useState<SymptomInput>({
    mainSymptom: "",
    duration: "",
    accompanying: "",
    pulseTongue: "",
  });

  // AI结果
  const [aiResult, setAiResult] = useState("");
  const [aiFullContent, setAiFullContent] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [quotaMsg, setQuotaMsg] = useState("");

  // 登录守卫
  const { requireLogin, showLoginPrompt, setShowLoginPrompt } = useRequireLogin();

  const contentKeyRef = useRef("");

  // 切换门类
  const handleCategoryChange = useCallback((catId: string) => {
    setActiveCategory(catId);
    const cat = WENZHEN_CATEGORIES.find((c) => c.id === catId);
    if (cat?.defaultSelected) {
      setSelectedMasters(new Set(cat.defaultSelected));
    } else {
      // 默认选第一个
      setSelectedMasters(new Set(cat?.masters.slice(0, 2).map((m) => m.id) || []));
    }
  }, []);

  // 切换名家选择
  const toggleMaster = useCallback((masterId: string) => {
    setSelectedMasters((prev) => {
      const next = new Set(prev);
      if (next.has(masterId)) {
        next.delete(masterId);
      } else {
        next.add(masterId);
      }
      return next;
    });
  }, []);

  // 开始辨证
  const handleDiagnose = useCallback(async () => {
    // 权限检查
    const perm = getPermissionStatus();
    setQuotaMsg(perm.message);

    if (perm.needLogin) {
      setShowLoginPrompt(true);
      return;
    }

    setAiLoading(true);
    setAiError(false);
    setAiResult("");
    setAiFullContent("");
    setIsLocked(false);

    try {
      const selectedMasterIds = Array.from(selectedMasters);
      const systemPrompt = buildWenzhenSystemPrompt(
        activeCategory,
        selectedMasterIds,
        supplementText
      );
      // 中华非遗正骨内部资料：按摩正骨门类选择「正骨」名家时，注入疼痛类诊断与手法解决依据
      const useZhenggu = activeCategory === "anmo" && selectedMasterIds.includes("zhenggu");
      const finalSystemPrompt = useZhenggu
        ? `${systemPrompt}\n\n${buildZhengguPrompt()}`
        : systemPrompt;

      // 构建用户prompt
      const userParts: string[] = [];
      if (symptomInput.mainSymptom) userParts.push(`主要症状：${symptomInput.mainSymptom}`);
      if (symptomInput.duration) userParts.push(`持续时间：${symptomInput.duration}`);
      if (symptomInput.accompanying) userParts.push(`伴随症状：${symptomInput.accompanying}`);
      if (symptomInput.pulseTongue) userParts.push(`脉象舌象：${symptomInput.pulseTongue}`);
      if (supplementText) userParts.push(`补充说明：${supplementText}`);

      const userPrompt =
        userParts.length > 0
          ? userParts.join("\n")
          : "请根据当前门类和名医体系，讲解辨证思路和常见证型的辨识要点。";

      const cat = WENZHEN_CATEGORIES.find((c) => c.id === activeCategory);
      const cKey = generateContentKey(
        `wenzhen_${activeCategory}`,
        selectedMasterIds.join(",") + userPrompt.slice(0, 80)
      );
      contentKeyRef.current = cKey;

      const result = await callAI({
        systemPrompt: finalSystemPrompt,
        userPrompt,
        cacheKey: cKey,
      });

      if (result.success && result.content) {
        const fullText = result.content;
        setAiFullContent(fullText);

        // 根据权限处理内容
        const level = getUserPermissionLevel();
        if (level === "member" || isSingleUnlocked(cKey)) {
          setAiResult(fullText);
          setIsLocked(false);
        } else {
          // 免费用户：截取前45%
          const { preview, hiddenLength } = truncateContentForFreeUser(fullText);
          setAiResult(preview);
          setIsLocked(hiddenLength > 50);
        }
      } else {
        setAiError(true);
      }
    } catch (e) {
      setAiError(true);
    } finally {
      setAiLoading(false);
    }
  }, [activeCategory, selectedMasters, supplementText, symptomInput, setShowLoginPrompt]);

  // v25.0.47_9: Native扫码支付弹层（全场景兜底收款通道）
  const { qrModal, openQR } = useNativePayQR();

  // v25.0.47_8: 单次解锁（真实微信支付，成功后本地解锁）
  const [unlockPaying, setUnlockPaying] = useState(false);
  const [unlockMsg, setUnlockMsg] = useState("");
  const handleSingleUnlock = useCallback(async () => {
    if (unlockPaying) return;
    const cKey = contentKeyRef.current;
    if (!cKey) return;
    setUnlockPaying(true);
    setUnlockMsg("");
    try {
      const r = await paySingleUnlockAndWait(cKey, singlePrice);
      // v25.0.47_9: Native扫码支付——弹出付款二维码，扫码成功后执行本地解锁
      if (r.ticket && aiFullContent) {
        openQR(r.ticket, () => {
          activateSingleUnlock(cKey);
          setAiResult(aiFullContent);
          setIsLocked(false);
          setShowPayment(false);
        });
        return;
      }
      if (r.paid && aiFullContent) {
        activateSingleUnlock(cKey);
        setAiResult(aiFullContent);
        setIsLocked(false);
        setShowPayment(false);
      } else {
        setUnlockMsg(r.message);
      }
    } finally {
      setUnlockPaying(false);
    }
  }, [aiFullContent, unlockPaying, openQR]);

  return (
    <div
      style={{
        maxWidth: "420px",
        margin: "0 auto",
        minHeight: "100vh",
        backgroundColor: "#f8f5fc",
        paddingBottom: "80px",
      }}
    >
      {/* 顶部导航 */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_LIGHT} 100%)`,
          padding: "12px 16px",
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={() => router.back()}
            style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: "20px", padding: "4px" }}
          >
            ←
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: "18px", fontWeight: "bold", margin: 0 }}>智能问诊</h1>
            <p style={{ fontSize: "11px", opacity: 0.8, margin: 0 }}>（学习）历代名家医案 AI 模拟辨证</p>
          </div>
        </div>
      </div>

      {/* 顶部提示 */}
      <div
        style={{
          margin: "10px 12px 0",
          padding: "10px 14px",
          backgroundColor: "#fff3e0",
          borderRadius: "10px",
          border: "1px solid #ffe0b2",
        }}
      >
        <p style={{ margin: 0, fontSize: "11px", color: "#e65100", lineHeight: 1.6 }}>{TOP_NOTICE}</p>
      </div>

      {/* 门类Tab */}
      <div
        style={{
          display: "flex",
          overflowX: "auto",
          gap: "6px",
          padding: "10px 12px 6px",
          scrollbarWidth: "none",
        }}
      >
        {WENZHEN_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategoryChange(cat.id)}
            style={{
              padding: "8px 14px",
              borderRadius: "20px",
              border: "none",
              whiteSpace: "nowrap",
              fontSize: "13px",
              fontWeight: activeCategory === cat.id ? "bold" : "normal",
              cursor: "pointer",
              backgroundColor: activeCategory === cat.id ? BRAND : "white",
              color: activeCategory === cat.id ? "white" : "#666",
              boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
            }}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* 门类描述 */}
      <div style={{ padding: "6px 12px" }}>
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "12px 14px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ fontSize: "14px", fontWeight: "bold", color: BRAND, marginBottom: "4px" }}>
            {category.name} · {category.subtitle}
          </div>
          <p style={{ margin: 0, fontSize: "12px", color: "#666", lineHeight: 1.6 }}>
            {category.description}
          </p>
        </div>
      </div>

      {/* 祝由专项合规提示 */}
      {category.complianceNote && (
        <div style={{ padding: "6px 12px" }}>
          <div
            style={{
              background: "#ffebee",
              borderRadius: "12px",
              padding: "12px 14px",
              border: "1px solid #ffcdd2",
            }}
          >
            <p style={{ margin: 0, fontSize: "11px", color: "#c62828", lineHeight: 1.6, fontWeight: 500 }}>
              {category.complianceNote}
            </p>
          </div>
        </div>
      )}

      {/* 名家列表 */}
      <div style={{ padding: "6px 12px" }}>
        <div style={{ fontSize: "13px", fontWeight: "bold", color: "#333", marginBottom: "8px" }}>
          选择医家/流派（可多选）
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {category.masters.map((master) => {
            const selected = selectedMasters.has(master.id);
            return (
              <button
                key={master.id}
                onClick={() => toggleMaster(master.id)}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  padding: "10px 12px",
                  borderRadius: "12px",
                  border: selected ? `2px solid ${BRAND}` : "2px solid #e0e0e0",
                  backgroundColor: selected ? BRAND_BG : "white",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s",
                }}
              >
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "6px",
                    border: selected ? "none" : "2px solid #ccc",
                    backgroundColor: selected ? BRAND : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: "2px",
                  }}
                >
                  {selected && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "14px", fontWeight: "bold", color: "#333" }}>{master.name}</span>
                    {master.dynasty && (
                      <span
                        style={{
                          fontSize: "10px",
                          padding: "1px 6px",
                          borderRadius: "4px",
                          backgroundColor: "#f5f5f5",
                          color: "#999",
                        }}
                      >
                        {master.dynasty}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "11px", color: "#999", marginTop: "2px" }}>
                    著作：{master.books.join("、")}
                  </div>
                  <div style={{ fontSize: "11px", color: "#666", marginTop: "4px", lineHeight: 1.5 }}>
                    {master.focus}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 症状输入区 */}
      <div style={{ padding: "10px 12px" }}>
        <div style={{ fontSize: "13px", fontWeight: "bold", color: "#333", marginBottom: "8px" }}>
          症状信息（选填）
        </div>
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <input
            type="text"
            placeholder="主要症状（如：头痛、咳嗽、失眠...）"
            value={symptomInput.mainSymptom}
            onChange={(e) => setSymptomInput({ ...symptomInput, mainSymptom: e.target.value })}
            style={inputStyle}
          />
          <input
            type="text"
            placeholder="持续时间（如：3天、1周...）"
            value={symptomInput.duration}
            onChange={(e) => setSymptomInput({ ...symptomInput, duration: e.target.value })}
            style={inputStyle}
          />
          <input
            type="text"
            placeholder="伴随症状（如：发热、怕冷、口渴...）"
            value={symptomInput.accompanying}
            onChange={(e) => setSymptomInput({ ...symptomInput, accompanying: e.target.value })}
            style={inputStyle}
          />
          <input
            type="text"
            placeholder="脉象舌象（如：脉浮数、舌红苔黄...）"
            value={symptomInput.pulseTongue}
            onChange={(e) => setSymptomInput({ ...symptomInput, pulseTongue: e.target.value })}
            style={inputStyle}
          />
        </div>
      </div>

      {/* 补充说明 */}
      <div style={{ padding: "0px 12px" }}>
        <div style={{ fontSize: "13px", fontWeight: "bold", color: "#333", marginBottom: "8px" }}>
          补充说明（选填，最多500字）
        </div>
        <textarea
          placeholder="可补充既往病史、药物过敏史、过往治疗经历、具体调理需求、禁忌事项、其他认可的民间流派/医家名称"
          value={supplementText}
          onChange={(e) => setSupplementText(e.target.value.slice(0, 500))}
          rows={3}
          style={{
            width: "100%",
            border: "1px solid #e0e0e0",
            borderRadius: "12px",
            padding: "10px 12px",
            fontSize: "13px",
            outline: "none",
            resize: "none",
            boxSizing: "border-box",
            fontFamily: "inherit",
          }}
        />
        <div style={{ textAlign: "right", fontSize: "11px", color: "#ccc", marginTop: "2px" }}>
          {supplementText.length}/500
        </div>
      </div>

      {/* 开始辨证按钮 */}
      <div style={{ padding: "10px 12px" }}>
        <button
          onClick={handleDiagnose}
          disabled={aiLoading || selectedMasters.size === 0}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: "12px",
            border: "none",
            backgroundColor: aiLoading || selectedMasters.size === 0 ? "#ccc" : BRAND,
            color: "white",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: aiLoading || selectedMasters.size === 0 ? "not-allowed" : "pointer",
            boxShadow: `0 4px 12px ${BRAND}33`,
          }}
        >
          {aiLoading ? "AI辨证中..." : `开始辨证（${selectedMasters.size}位医家）`}
        </button>
        {quotaMsg && (
          <div style={{ textAlign: "center", fontSize: "11px", color: "#999", marginTop: "4px" }}>
            {quotaMsg}
          </div>
        )}
      </div>

      {/* AI结果区 */}
      {aiLoading && (
        <div style={{ padding: "0 12px" }}>
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "20px",
              textAlign: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>🤖</div>
            <div style={{ fontSize: "14px", color: "#666" }}>AI正在根据您选择的医家体系进行辨证...</div>
            <div style={{ marginTop: "10px", fontSize: "12px", color: "#999" }}>
              门类：{category.name} | 医家：{Array.from(selectedMasters).length}位
            </div>
          </div>
        </div>
      )}

      {aiError && (
        <div style={{ padding: "0 12px" }}>
          <div
            style={{
              background: "#ffebee",
              borderRadius: "12px",
              padding: "14px",
              textAlign: "center",
              border: "1px solid #ffcdd2",
            }}
          >
            <div style={{ fontSize: "14px", color: "#c62828", marginBottom: "6px" }}>AI辨证请求失败</div>
            <button
              onClick={handleDiagnose}
              style={{
                padding: "6px 16px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: BRAND,
                color: "white",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              重试
            </button>
          </div>
        </div>
      )}

      {aiResult && !aiLoading && (
        <div style={{ padding: "0 12px" }}>
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "16px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <span style={{ fontSize: "16px" }}>📋</span>
              <span style={{ fontSize: "15px", fontWeight: "bold", color: "#333" }}>AI辨证结果</span>
              <span
                style={{
                  fontSize: "10px",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  backgroundColor: BRAND_BG,
                  color: BRAND,
                }}
              >
                {category.name}
              </span>
            </div>
            <div
              style={{
                fontSize: "14px",
                color: "#333",
                lineHeight: 1.8,
                whiteSpace: "pre-wrap",
              }}
            >
              {aiResult}
            </div>

            {/* 锁定提示 */}
            {isLocked && (
              <div
                style={{
                  marginTop: "16px",
                  padding: "16px",
                  borderRadius: "12px",
                  backgroundColor: "#f5f0fa",
                  border: `1px dashed ${BRAND}66`,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "24px", marginBottom: "6px" }}>🔒</div>
                <div style={{ fontSize: "13px", color: "#666", marginBottom: "12px" }}>
                  完整方药、取穴经验参考、开方思路详解已锁定
                </div>
                <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                  <button
                    onClick={() => setShowPayment(true)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "8px",
                      border: `1px solid ${BRAND}`,
                      backgroundColor: "white",
                      color: BRAND,
                      fontSize: "13px",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    单次解锁 ¥{singlePrice}
                  </button>
                  <button
                    onClick={() => router.push("/membership")}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "8px",
                      border: "none",
                      backgroundColor: BRAND,
                      color: "white",
                      fontSize: "13px",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    开通会员无限看
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 底部合规声明 */}
      <div
        style={{
          margin: "12px 12px 0",
          padding: "10px 14px",
          backgroundColor: "#fff8e1",
          borderRadius: "12px",
          border: "1px solid #ffecb3",
        }}
      >
        <p style={{ margin: 0, fontSize: "11px", color: "#f57f17", textAlign: "center", lineHeight: 1.5 }}>
          ⚠️ {COMPLIANCE_TEXT}
        </p>
      </div>

      {/* v25.0.47_9: Native扫码支付二维码弹层 */}
      {qrModal}

      {/* 登录引导弹窗 */}
      {showLoginPrompt && (
        <LoginPromptModal
          show={showLoginPrompt}
          onClose={() => setShowLoginPrompt(false)}
        />
      )}

      {/* 付费弹窗 */}
      {showPayment && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowPayment(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "24px",
              maxWidth: "320px",
              width: "90%",
              textAlign: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>💊</div>
            <h3 style={{ fontSize: "16px", fontWeight: "bold", margin: "0 0 8px" }}>解锁完整辨证结果</h3>
            <p style={{ fontSize: "13px", color: "#666", margin: "0 0 16px" }}>
              支付 ¥{singlePrice} 解锁本次完整方药、取穴经验参考、开方思路详解
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {unlockMsg && (
                <div style={{ padding: "8px 10px", background: "#fff3e0", borderRadius: "8px", fontSize: "12px", color: "#e65100", textAlign: "center" }}>
                  {unlockMsg}
                </div>
              )}
              <button
                onClick={handleSingleUnlock}
                disabled={unlockPaying}
                style={{
                  padding: "12px",
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor: BRAND,
                  color: "white",
                  fontSize: "14px",
                  fontWeight: "bold",
                  cursor: unlockPaying ? "not-allowed" : "pointer",
                  opacity: unlockPaying ? 0.6 : 1,
                }}
              >
                {unlockPaying ? "支付确认中..." : <>确认支付 ¥{singlePrice}</>}
              </button>
              <button
                onClick={() => router.push("/membership")}
                style={{
                  padding: "12px",
                  borderRadius: "10px",
                  border: `1px solid ${BRAND}`,
                  backgroundColor: "white",
                  color: BRAND,
                  fontSize: "14px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                开通会员更划算
              </button>
              <button
                onClick={() => setShowPayment(false)}
                style={{
                  padding: "8px",
                  border: "none",
                  background: "none",
                  color: "#999",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #e0e0e0",
  borderRadius: "8px",
  padding: "8px 12px",
  fontSize: "13px",
  outline: "none",
  boxSizing: "border-box",
};
