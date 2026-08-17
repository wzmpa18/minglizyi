"use client";

// ============================================================================
// 八字合号 · 批量选号 — 高端功能组件
// 功能流程：选择功能 → 上传/输入号码 → 录入八字 → 支付¥198 → 生成分析报告 → 保存/分享
// ============================================================================

import React, { useState, useRef, useEffect, useCallback } from "react";
import { solarToBazi } from "@/algorithm-core";
import type { BaziResult, Gender } from "@/algorithm-core";
import {
  batchMatchNumbers,
  extractPhoneNumbersFromText,
  extractCarplatesFromText,
  DIGIT_WUXING,
} from "@/lib/batchNumberMatch";
import type { BatchMatchResult, NumberMatchResult } from "@/lib/batchNumberMatch";
import { callAI, getPermissionStatus } from "@/lib/aiService";
import { getClientUserId } from "@/lib/auth";
import { useRequireLogin } from "@/lib/useRequireLogin";
import { LoginPromptModal } from "@/components/LoginPromptModal";
import { processConsumptionRebate } from "@/lib/inviteStore";
import { ShareButton } from "@/components/ShareButton";

// ==================== 常量 ====================

const BRAND = "#7B2FBE";
const PRICE = 198;
const STORAGE_KEY = "yandao_batch_match_paid";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/** 五行颜色映射（用于展示） */
const WUXING_COLORS: Record<string, string> = {
  "金": "#DAA520",
  "木": "#228B22",
  "水": "#1E90FF",
  "火": "#FF4500",
  "土": "#8B6914",
};

/** 时辰选项（值为对应起始小时 0-23） */
const SHICHEN_OPTIONS: Array<{ hour: number; label: string }> = [
  { hour: 23, label: "子时 (23-1)" },
  { hour: 1, label: "丑时 (1-3)" },
  { hour: 3, label: "寅时 (3-5)" },
  { hour: 5, label: "卯时 (5-7)" },
  { hour: 7, label: "辰时 (7-9)" },
  { hour: 9, label: "巳时 (9-11)" },
  { hour: 11, label: "午时 (11-13)" },
  { hour: 13, label: "未时 (13-15)" },
  { hour: 15, label: "申时 (15-17)" },
  { hour: 17, label: "酉时 (17-19)" },
  { hour: 19, label: "戌时 (19-21)" },
  { hour: 21, label: "亥时 (21-23)" },
];

/** 匹配等级颜色 */
const LEVEL_COLORS: Record<string, string> = {
  "极佳": "#16a34a",
  "优良": "#2563eb",
  "一般": "#d97706",
  "不佳": "#dc2626",
};

/** TOP 排名徽章颜色 */
const RANK_BADGE_COLORS: string[] = ["#f59e0b", "#9ca3af", "#b45309"];

// ==================== 类型 ====================

interface BatchNumberMatchingProps {
  toolType: "phone" | "carplate";
}

type Step = "import" | "bazi" | "pay" | "result";

interface PaidStatus {
  paid: boolean;
  paidAt: number;
  expiresAt: number;
}

// ==================== 工具函数 ====================

/** 读取 localStorage 中的付费状态，校验有效期 */
function getPaidStatus(): PaidStatus | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PaidStatus;
    if (data.paid && data.expiresAt > Date.now()) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

/** 写入付费状态（7 天有效期） */
function setPaidStatus(): PaidStatus {
  const now = Date.now();
  const status: PaidStatus = {
    paid: true,
    paidAt: now,
    expiresAt: now + SEVEN_DAYS_MS,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(status));
  } catch {
    /* ignore */
  }
  return status;
}

/** 格式化时间戳为 YYYY-MM-DD */
function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 根据综合评分返回进度条颜色 */
function scoreColor(score: number): string {
  if (score >= 80) return "#16a34a";
  if (score >= 65) return "#2563eb";
  if (score >= 45) return "#d97706";
  return "#dc2626";
}

// ==================== 主组件 ====================

export default function BatchNumberMatching({ toolType }: BatchNumberMatchingProps) {
  // ---- 步骤 ----
  const [step, setStep] = useState<Step>("import");

  // ---- 号码导入 ----
  const [numbers, setNumbers] = useState<string[]>([]);
  const [manualText, setManualText] = useState("");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- 八字录入 ----
  const [birthDate, setBirthDate] = useState("");
  const [birthHour, setBirthHour] = useState<number>(12);
  const [gender, setGender] = useState<Gender>("male");
  const [baziResult, setBaziResult] = useState<BaziResult | null>(null);
  const [baziError, setBaziError] = useState("");

  // ---- 匹配分析 ----
  const [matchResult, setMatchResult] = useState<BatchMatchResult | null>(null);

  // ---- 付费 ----
  const [paid, setPaid] = useState(false);
  const [paidStatus, setPaidStatusState] = useState<PaidStatus | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"wechat" | "alipay">("wechat");
  const [paying, setPaying] = useState(false);

  // ---- AI 报告 ----
  const [aiReport, setAiReport] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStreamDone, setAiStreamDone] = useState(false);
  const streamTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const aiTriggeredRef = useRef(false);

  // ---- 通用 ----
  const [toast, setToast] = useState("");
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // v20.1: 登录守卫
  const { requireLogin, showLoginPrompt, setShowLoginPrompt } = useRequireLogin();

  const isPhone = toolType === "phone";
  const numberLabel = isPhone ? "手机号" : "车牌号";

  // ==================== 副作用 ====================

  // 挂载时检查付费状态
  useEffect(() => {
    const status = getPaidStatus();
    if (status) {
      setPaid(true);
      setPaidStatusState(status);
    }
  }, []);

  // 卸载时清理定时器
  useEffect(() => {
    return () => {
      if (streamTimerRef.current) clearInterval(streamTimerRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // 进入结果步骤时执行匹配
  useEffect(() => {
    if (
      step === "result" &&
      paid &&
      baziResult &&
      numbers.length > 0 &&
      !matchResult
    ) {
      try {
        const result = batchMatchNumbers(numbers, baziResult, toolType);
        setMatchResult(result);
      } catch (e) {
        console.error("批量匹配失败:", e);
        showToast("分析失败，请重试");
      }
    }
  }, [step, paid, baziResult, numbers, matchResult]);

  // ==================== 工具方法 ====================

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(""), 2500);
  }, []);

  /** 提取号码（根据 toolType 选择提取函数） */
  const extractNumbers = useCallback(
    (text: string): string[] => {
      return isPhone
        ? extractPhoneNumbersFromText(text)
        : extractCarplatesFromText(text);
    },
    [isPhone]
  );

  /** 向号码列表添加新号码（自动去重） */
  const addNumbers = useCallback(
    (newNums: string[]) => {
      setNumbers((prev) => {
        const set = new Set(prev);
        let added = 0;
        for (const n of newNums) {
          const trimmed = n.trim();
          if (trimmed && !set.has(trimmed)) {
            set.add(trimmed);
            added++;
          }
        }
        if (added > 0) {
          showToast(`已添加 ${added} 个号码`);
        }
        return Array.from(set);
      });
    },
    [showToast]
  );

  // ==================== 号码导入处理 ====================

  /** OCR 拍照识别 */
  const handleOcrClick = () => {
    fileInputRef.current?.click();
  };

  /** 文件选择后处理 */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 重置 input 以允许重复选择同一文件
    e.target.value = "";

    setOcrLoading(true);
    setOcrError("");

    try {
      // 读取文件为 DataURL
      const dataUrl = await readFileAsDataURL(file);
      // 提取 base64 部分
      const base64Data = dataUrl.split(",")[1] || "";

      if (!base64Data) {
        throw new Error("图片读取失败");
      }

      // 调用后端 OCR 接口
      const res = await fetch("/api/ocr/recognize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Data, type: toolType }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      if (!data.success) {
        setOcrError(data.error || "OCR识别失败，请手动输入号码");
        return;
      }

      // 优先使用后端已提取并去重的号码，否则从前端提取
      let extracted: string[] = [];
      if (data.numbers && Array.isArray(data.numbers) && data.numbers.length > 0) {
        extracted = data.numbers;
      } else {
        const recognizedText: string = data.text || data.content || "";
        if (!recognizedText) {
          setOcrError("OCR识别失败，请手动输入号码");
          return;
        }
        extracted = extractNumbers(recognizedText);
      }

      if (extracted.length === 0) {
        setOcrError("未识别到有效号码，请手动输入");
        return;
      }

      addNumbers(extracted);
    } catch (err) {
      console.error("OCR error:", err);
      setOcrError("OCR识别失败，请手动输入号码");
    } finally {
      setOcrLoading(false);
    }
  };

  /** 手动输入号码确认 */
  const handleAddManual = () => {
    if (!manualText.trim()) {
      showToast("请输入号码");
      return;
    }
    const extracted = extractNumbers(manualText);
    if (extracted.length === 0) {
      showToast(
        isPhone
          ? "未识别到有效手机号（需1开头的11位号码）"
          : "未识别到有效车牌号"
      );
      return;
    }
    addNumbers(extracted);
    setManualText("");
  };

  /** 删除单个号码 */
  const handleDeleteNumber = (num: string) => {
    setNumbers((prev) => prev.filter((n) => n !== num));
  };

  /** 清空号码列表 */
  const handleClearNumbers = () => {
    setNumbers([]);
    showToast("已清空号码列表");
  };

  // ==================== 八字排盘处理 ====================

  /** 计算八字排盘 */
  const handleCalculateBazi = () => {
    setBaziError("");
    if (!birthDate) {
      setBaziError("请选择出生日期");
      return;
    }

    const parts = birthDate.split("-");
    if (parts.length !== 3) {
      setBaziError("日期格式不正确");
      return;
    }

    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);

    if (!y || !m || !d || y < 1900 || y > 2100) {
      setBaziError("请输入有效的出生日期（1900-2100）");
      return;
    }

    try {
      const result = solarToBazi({
        year: y,
        month: m,
        day: d,
        hour: birthHour,
        minute: 0,
        gender,
      }) as BaziResult;

      setBaziResult(result);
      showToast("排盘成功");
    } catch (err) {
      console.error("solarToBazi error:", err);
      setBaziError("排盘失败，请检查输入信息");
    }
  };

  // ==================== 付费处理 ====================

  /** 模拟支付流程 */
  const handlePay = async () => {
    setPaying(true);

    try {
      // 模拟支付请求延迟
      await new Promise<void>((resolve) => setTimeout(resolve, 1500));

      // 写入付费状态
      const status = setPaidStatus();
      setPaid(true);
      setPaidStatusState(status);

      // 处理消费返佣
      try {
        const userId = getClientUserId();
        processConsumptionRebate(userId, PRICE);
      } catch (rebateErr) {
        console.error("返佣处理失败:", rebateErr);
      }

      showToast("支付成功，正在生成报告...");
      setStep("result");
    } catch (err) {
      console.error("支付失败:", err);
      showToast("支付失败，请重试");
    } finally {
      setPaying(false);
    }
  };

  // ==================== AI 深度报告 ====================

  const handleGenerateAIReport = useCallback(async () => {
    if (!matchResult || !baziResult) return;

    // v20.1: 权限检查
    if (!requireLogin()) return;
    const perm = getPermissionStatus();
    if (!perm.canUseAI && perm.needPayment) {
      setToast("今日AI解读次数已用完，请开通会员继续使用");
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setToast(""), 3000);
      return;
    }

    setAiLoading(true);
    setAiStreamDone(false);
    setAiReport("");

    const bazi = matchResult.baziAnalysis;

    const top3Text = matchResult.top3
      .map(
        (r, i) =>
          `第${i + 1}名: ${r.number} (匹配度${r.matchScore}, 吉凶${r.auspiciousScore}, 综合${r.totalScore}, 等级${r.matchLevel})\n  推荐理由: ${r.recommendation}`
      )
      .join("\n");

    const systemPrompt = `你是资深易学数字能量分析专家，精通八字五行理论与数字能量学。请基于用户的八字五行分析和号码匹配结果，生成一份深度的号码选择分析报告。

报告要求：
1. 开头简要总结用户八字五行特征（日主、喜用神、忌神、身强身弱）
2. 详细分析TOP3推荐号码的五行优势与推荐理由
3. 对全部号码的整体格局做综合评价
4. 给出号码选择的整体建议和注意事项
5. 语言专业但不晦涩，适合普通用户阅读理解
6. 结尾必须标注：「以上内容仅供传统文化学习参考，不构成人生决策建议」`;

    const userPrompt = `【八字五行分析】
日主：${bazi.dayMaster}（${bazi.dayMasterWuxing}）
日主${bazi.isDayMasterStrong ? "偏强" : "偏弱"}
喜用神：${bazi.favorableElements.join("、")}
忌神：${bazi.unfavorableElements.join("、")}
五行统计：金${bazi.wuxingCount["金"] || 0}、木${bazi.wuxingCount["木"] || 0}、水${bazi.wuxingCount["水"] || 0}、火${bazi.wuxingCount["火"] || 0}、土${bazi.wuxingCount["土"] || 0}

【TOP3推荐号码】
${top3Text}

【分析概览】
共分析${matchResult.totalNumbers}个号码（去重${matchResult.duplicates}个）
${numberLabel}类型：${isPhone ? "手机号" : "车牌号"}

请生成深度分析报告。`;

    try {
      const response = await callAI({
        systemPrompt,
        userPrompt,
        cacheKey: `batch_match_${toolType}_${bazi.dayMaster}_${matchResult.top3[0]?.number || ""}`,
      });

      if (response.success && response.content) {
        const fullText = response.content;
        const totalLen = fullText.length;

        // 模拟流式输出：逐步显示内容
        const chunkSize = Math.max(3, Math.ceil(totalLen / 100));
        let index = 0;

        streamTimerRef.current = setInterval(() => {
          index += chunkSize;
          if (index >= totalLen) {
            setAiReport(fullText);
            if (streamTimerRef.current) {
              clearInterval(streamTimerRef.current);
              streamTimerRef.current = null;
            }
            setAiLoading(false);
            setAiStreamDone(true);
          } else {
            setAiReport(fullText.slice(0, index));
          }
        }, 35);
      } else {
        setAiReport(
          response.content || "AI报告生成失败，请稍后重试。"
        );
        setAiLoading(false);
        setAiStreamDone(true);
      }
    } catch (err) {
      console.error("AI report error:", err);
      setAiReport("AI报告生成失败，请稍后重试。");
      setAiLoading(false);
      setAiStreamDone(true);
    }
  }, [matchResult, baziResult, toolType, isPhone, numberLabel, requireLogin]);

  // 匹配结果就绪后自动生成 AI 报告
  useEffect(() => {
    if (matchResult && !aiTriggeredRef.current && step === "result") {
      aiTriggeredRef.current = true;
      handleGenerateAIReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchResult, step]);

  // ==================== 重置分析 ====================

  const handleReset = () => {
    setStep("import");
    setNumbers([]);
    setManualText("");
    setBaziResult(null);
    setBaziError("");
    setMatchResult(null);
    setAiReport("");
    setAiLoading(false);
    setAiStreamDone(false);
    aiTriggeredRef.current = false;
    if (streamTimerRef.current) {
      clearInterval(streamTimerRef.current);
      streamTimerRef.current = null;
    }
    showToast("已重置，请重新输入");
  };

  // ==================== 渲染辅助 ====================

  const steps: Array<{ key: Step; label: string }> = [
    { key: "import", label: "导入号码" },
    { key: "bazi", label: "录入八字" },
    { key: "pay", label: "支付解锁" },
    { key: "result", label: "分析报告" },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === step);

  // ==================== 渲染 ====================

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* ---------- 顶部引导 ---------- */}
      <div
        className="px-4 pt-5 pb-4"
        style={{
          background: `linear-gradient(135deg, ${BRAND} 0%, #9B4FE6 100%)`,
        }}
      >
        <h1 className="text-lg font-bold text-white">
          八字合号 · 批量选号
        </h1>
        <p className="mt-1 text-sm text-white/85">
          结合八字选最适合你的{numberLabel}
        </p>
        <div
          className="mt-3 rounded-xl px-3 py-2"
          style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
        >
          <p className="text-xs text-white/90">
            {isPhone
              ? "通过八字五行喜忌，批量分析手机号匹配度，智能推荐最适合你的号码。"
              : "通过八字五行喜忌，批量分析车牌号匹配度，智能推荐最适合你的车牌。"}
          </p>
        </div>
      </div>

      {/* ---------- 步骤指示器 ---------- */}
      <div className="px-4 py-3 bg-white">
        <div className="flex items-center justify-between">
          {steps.map((s, idx) => {
            const isActive = idx === currentStepIndex;
            const isDone = idx < currentStepIndex;
            return (
              <React.Fragment key={s.key}>
                <div className="flex flex-col items-center gap-1">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white transition-colors"
                    style={{
                      backgroundColor: isActive
                        ? BRAND
                        : isDone
                        ? "#9CA3AF"
                        : "#E5E7EB",
                      color: isActive || isDone ? "#fff" : "#9CA3AF",
                    }}
                  >
                    {isDone ? "✓" : idx + 1}
                  </div>
                  <span
                    className="text-[10px]"
                    style={{
                      color: isActive ? BRAND : "#9CA3AF",
                      fontWeight: isActive ? 600 : 400,
                    }}
                  >
                    {s.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className="flex-1 h-0.5 mx-1 rounded"
                    style={{
                      backgroundColor:
                        idx < currentStepIndex ? "#9CA3AF" : "#E5E7EB",
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="px-4 py-3 space-y-4">
        {/* ============================ 步骤1：号码导入 ============================ */}
        {step === "import" && (
          <>
            {/* OCR 识别 - 已隐藏，保留代码待后续启用 */}
            {false && (
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-800 mb-3">
                拍照 OCR 识别
              </h2>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                onClick={handleOcrClick}
                disabled={ocrLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium text-white transition-opacity disabled:opacity-60"
                style={{ backgroundColor: BRAND }}
              >
                {ocrLoading ? (
                  <>
                    <SpinnerSVG />
                    <span>识别中...</span>
                  </>
                ) : (
                  <>
                    <CameraSVG />
                    <span>拍照 / 上传图片识别{numberLabel}</span>
                  </>
                )}
              </button>
              {ocrError && (
                <p className="mt-2 text-xs text-red-500">{ocrError}</p>
              )}
              <p className="mt-2 text-[11px] text-gray-400">
                支持上传通讯录截图、名片照片等，自动提取{numberLabel}
              </p>
            </div>
            )}

            {/* 手动输入 */}
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-800 mb-3">
                手动批量输入
              </h2>
              <textarea
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder={
                  isPhone
                    ? "每行输入一个手机号，例如：\n13800138000\n13900139000\n..."
                    : "每行输入一个车牌号，例如：\n京A12345\n沪B6789X\n..."
                }
                rows={5}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-purple-400 resize-none"
                style={{ fontSize: "13px" }}
              />
              <button
                onClick={handleAddManual}
                className="mt-2 w-full rounded-lg border py-2 text-sm font-medium transition-colors"
                style={{
                  borderColor: BRAND,
                  color: BRAND,
                  backgroundColor: "#fff",
                }}
              >
                + 添加到号码列表
              </button>
            </div>

            {/* 号码列表 */}
            {numbers.length > 0 && (
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-800">
                    号码列表
                    <span
                      className="ml-2 rounded-full px-2 py-0.5 text-xs text-white"
                      style={{ backgroundColor: BRAND }}
                    >
                      {numbers.length}
                    </span>
                  </h2>
                  <button
                    onClick={handleClearNumbers}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                  >
                    清空
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                  {numbers.map((num) => (
                    <span
                      key={num}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-sm"
                      style={{
                        backgroundColor: BRAND + "12",
                        color: BRAND,
                      }}
                    >
                      <span>{num}</span>
                      <button
                        onClick={() => handleDeleteNumber(num)}
                        className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] hover:bg-red-100 hover:text-red-500 transition-colors"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 下一步 */}
            <button
              onClick={() => setStep("bazi")}
              disabled={numbers.length === 0}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
              style={{ backgroundColor: BRAND }}
            >
              下一步：录入八字
            </button>
          </>
        )}

        {/* ============================ 步骤2：八字录入 ============================ */}
        {step === "bazi" && (
          <>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-800 mb-4">
                八字信息录入
              </h2>

              {/* 出生日期 */}
              <div className="mb-4">
                <label className="block text-xs text-gray-500 mb-1.5">
                  出生日期
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  min="1900-01-01"
                  max="2100-12-31"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-purple-400"
                />
              </div>

              {/* 出生时辰 */}
              <div className="mb-4">
                <label className="block text-xs text-gray-500 mb-1.5">
                  出生时辰
                </label>
                <select
                  value={birthHour}
                  onChange={(e) => setBirthHour(parseInt(e.target.value, 10))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-purple-400 bg-white"
                >
                  {SHICHEN_OPTIONS.map((opt) => (
                    <option key={opt.hour} value={opt.hour}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 性别 */}
              <div className="mb-4">
                <label className="block text-xs text-gray-500 mb-1.5">
                  性别
                </label>
                <div className="flex gap-3">
                  {(["male", "female"] as Gender[]).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGender(g)}
                      className="flex-1 rounded-lg border py-2.5 text-sm font-medium transition-all"
                      style={{
                        borderColor: gender === g ? BRAND : "#E5E7EB",
                        color: gender === g ? "#fff" : "#6B7280",
                        backgroundColor: gender === g ? BRAND : "#fff",
                      }}
                    >
                      {g === "male" ? "男" : "女"}
                    </button>
                  ))}
                </div>
              </div>

              {/* 排盘按钮 */}
              <button
                onClick={handleCalculateBazi}
                className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-opacity"
                style={{ backgroundColor: BRAND }}
              >
                排盘
              </button>

              {baziError && (
                <p className="mt-2 text-xs text-red-500">{baziError}</p>
              )}

              {/* 排盘结果预览 */}
              {baziResult && (
                <div
                  className="mt-4 rounded-lg p-3"
                  style={{ backgroundColor: BRAND + "08" }}
                >
                  <p className="text-xs font-semibold text-gray-700 mb-2">
                    排盘结果
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {baziResult.pillars.map((pillar, idx) => {
                      const labels = ["年柱", "月柱", "日柱", "时柱"];
                      return (
                        <div
                          key={idx}
                          className="rounded-lg bg-white p-2 text-center"
                        >
                          <p className="text-[10px] text-gray-400">
                            {labels[idx]}
                          </p>
                          <p className="mt-0.5 text-base font-bold text-gray-800">
                            {pillar.ganzhi}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {pillar.nayin}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  {baziResult.shenQiangRuo && (
                    <p className="mt-2 text-xs text-gray-500">
                      身强身弱：{baziResult.shenQiangRuo.result}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* 导航按钮 */}
            <div className="flex gap-3">
              <button
                onClick={() => setStep("import")}
                className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600"
              >
                上一步
              </button>
              <button
                onClick={() => setStep("pay")}
                disabled={!baziResult}
                className="flex-[2] rounded-xl py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
                style={{ backgroundColor: BRAND }}
              >
                下一步：支付解锁
              </button>
            </div>
          </>
        )}

        {/* ============================ 步骤3：支付 ============================ */}
        {step === "pay" && (
          <>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-800 mb-4">
                支付解锁完整报告
              </h2>

              {/* 价格展示 */}
              <div
                className="rounded-xl p-4 text-center mb-4"
                style={{
                  background: `linear-gradient(135deg, ${BRAND}10 0%, ${BRAND}05 100%)`,
                }}
              >
                <p className="text-xs text-gray-500">八字合号·批量选号</p>
                <p className="mt-1">
                  <span className="text-3xl font-bold" style={{ color: BRAND }}>
                    ¥{PRICE}
                  </span>
                  <span className="ml-1 text-xs text-gray-400">/ 次</span>
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  解锁完整分析报告 · 7天有效
                </p>
              </div>

              {/* 已支付状态 */}
              {paid && paidStatus ? (
                <div className="rounded-lg bg-green-50 p-4 text-center">
                  <p className="text-sm font-semibold text-green-600">
                    已支付，报告已解锁
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    有效期至：{formatDate(paidStatus.expiresAt)}
                  </p>
                </div>
              ) : (
                <>
                  {/* 支付方式选择 */}
                  <div className="mb-4">
                    <label className="block text-xs text-gray-500 mb-2">
                      选择支付方式
                    </label>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setPaymentMethod("wechat")}
                        className="flex-1 rounded-lg border py-3 text-sm font-medium transition-all flex items-center justify-center gap-2"
                        style={{
                          borderColor:
                            paymentMethod === "wechat" ? "#07C160" : "#E5E7EB",
                          backgroundColor:
                            paymentMethod === "wechat"
                              ? "#07C16010"
                              : "#fff",
                          color:
                            paymentMethod === "wechat" ? "#07C160" : "#6B7280",
                        }}
                      >
                        <WeChatSVG />
                        微信支付
                      </button>
                      <button
                        onClick={() => setPaymentMethod("alipay")}
                        className="flex-1 rounded-lg border py-3 text-sm font-medium transition-all flex items-center justify-center gap-2"
                        style={{
                          borderColor:
                            paymentMethod === "alipay" ? "#1677FF" : "#E5E7EB",
                          backgroundColor:
                            paymentMethod === "alipay"
                              ? "#1677FF10"
                              : "#fff",
                          color:
                            paymentMethod === "alipay" ? "#1677FF" : "#6B7280",
                        }}
                      >
                        <AlipaySVG />
                        支付宝
                      </button>
                    </div>
                  </div>

                  {/* 支付按钮 */}
                  <button
                    onClick={handlePay}
                    disabled={paying}
                    className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                    style={{
                      backgroundColor:
                        paymentMethod === "wechat" ? "#07C160" : "#1677FF",
                    }}
                  >
                    {paying ? (
                      <span className="flex items-center justify-center gap-2">
                        <SpinnerSVG />
                        支付处理中...
                      </span>
                    ) : (
                      `支付 ¥${PRICE} 解锁报告`
                    )}
                  </button>

                  <p className="mt-3 text-center text-[11px] text-gray-400">
                    支付成功后将自动生成完整分析报告，有效期 7 天
                  </p>
                </>
              )}
            </div>

            {/* 导航 */}
            <div className="flex gap-3">
              <button
                onClick={() => setStep("bazi")}
                className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600"
              >
                上一步
              </button>
              {paid && (
                <button
                  onClick={() => setStep("result")}
                  className="flex-[2] rounded-xl py-3 text-sm font-semibold text-white"
                  style={{ backgroundColor: BRAND }}
                >
                  查看完整报告
                </button>
              )}
            </div>
          </>
        )}

        {/* ============================ 步骤4：分析报告 ============================ */}
        {step === "result" && (
          <>
            {/* 八字五行分析摘要 */}
            {matchResult && (
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-800 mb-3">
                  八字五行分析摘要
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <InfoCard
                    label="日主"
                    value={`${matchResult.baziAnalysis.dayMaster}（${matchResult.baziAnalysis.dayMasterWuxing}）`}
                    color={BRAND}
                  />
                  <InfoCard
                    label="身强身弱"
                    value={
                      matchResult.baziAnalysis.isDayMasterStrong
                        ? "偏强"
                        : "偏弱"
                    }
                    color={
                      matchResult.baziAnalysis.isDayMasterStrong
                        ? "#dc2626"
                        : "#2563eb"
                    }
                  />
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-gray-400 w-14 shrink-0">
                      喜用神
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {matchResult.baziAnalysis.favorableElements.map((wx) => (
                        <span
                          key={wx}
                          className="rounded px-2 py-0.5 text-xs text-white"
                          style={{
                            backgroundColor: WUXING_COLORS[wx] || "#9CA3AF",
                          }}
                        >
                          {wx}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-gray-400 w-14 shrink-0">
                      忌神
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {matchResult.baziAnalysis.unfavorableElements.map((wx) => (
                        <span
                          key={wx}
                          className="rounded px-2 py-0.5 text-xs text-white opacity-75"
                          style={{
                            backgroundColor: WUXING_COLORS[wx] || "#9CA3AF",
                          }}
                        >
                          {wx}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                {/* 五行统计柱状图 */}
                <div className="mt-3">
                  <p className="text-xs text-gray-400 mb-1.5">五行分布</p>
                  <div className="space-y-1.5">
                    {Object.entries(matchResult.baziAnalysis.wuxingCount).map(
                      ([wx, count]) => {
                        const maxCount = Math.max(
                          ...Object.values(
                            matchResult.baziAnalysis.wuxingCount
                          )
                        );
                        const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                        return (
                          <div key={wx} className="flex items-center gap-2">
                            <span
                              className="w-5 text-center text-xs font-medium"
                              style={{ color: WUXING_COLORS[wx] }}
                            >
                              {wx}
                            </span>
                            <div className="flex-1 h-4 rounded bg-gray-100 overflow-hidden">
                              <div
                                className="h-full rounded transition-all"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor:
                                    WUXING_COLORS[wx] || "#9CA3AF",
                                }}
                              />
                            </div>
                            <span className="w-6 text-right text-xs text-gray-400">
                              {count}
                            </span>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
                <p className="mt-3 text-xs text-gray-500 leading-relaxed">
                  {matchResult.baziAnalysis.summary}
                </p>
              </div>
            )}

            {/* TOP3 推荐号码 */}
            {matchResult && matchResult.top3.length > 0 && (
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-800 mb-3">
                  TOP3 推荐{numberLabel}
                </h2>
                <div className="space-y-3">
                  {matchResult.top3.map((item, idx) => (
                    <TopCard
                      key={item.number}
                      item={item}
                      rank={idx}
                      numberLabel={numberLabel}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 全部排名表格 */}
            {matchResult && matchResult.results.length > 0 && (
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-800 mb-3">
                  全部{numberLabel}排名
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    共 {matchResult.results.length} 个
                    {matchResult.duplicates > 0 &&
                      `（去重 ${matchResult.duplicates} 个）`}
                  </span>
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr
                        className="text-white"
                        style={{ backgroundColor: BRAND }}
                      >
                        <th className="px-2 py-2 text-left rounded-l-lg">
                          排名
                        </th>
                        <th className="px-2 py-2 text-left">{numberLabel}</th>
                        <th className="px-2 py-2 text-center">匹配度</th>
                        <th className="px-2 py-2 text-center">吉凶</th>
                        <th className="px-2 py-2 text-center">综合</th>
                        <th className="px-2 py-2 text-center rounded-r-lg">
                          等级
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {matchResult.results.map((r, idx) => (
                        <tr
                          key={r.number}
                          className="border-b border-gray-50"
                          style={{
                            backgroundColor:
                              idx % 2 === 0 ? "#fff" : "#FAFAFA",
                          }}
                        >
                          <td className="px-2 py-2 text-gray-400">
                            {idx + 1}
                          </td>
                          <td className="px-2 py-2 font-medium text-gray-700">
                            {r.number}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <span style={{ color: scoreColor(r.matchScore) }}>
                              {r.matchScore}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <span
                              style={{ color: scoreColor(r.auspiciousScore) }}
                            >
                              {r.auspiciousScore}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-center font-semibold">
                            <span style={{ color: scoreColor(r.totalScore) }}>
                              {r.totalScore}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <span
                              className="rounded px-1.5 py-0.5 text-[10px] text-white"
                              style={{
                                backgroundColor:
                                  LEVEL_COLORS[r.matchLevel] || "#9CA3AF",
                              }}
                            >
                              {r.matchLevel}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 空结果提示 */}
            {matchResult && matchResult.results.length === 0 && (
              <div className="rounded-xl bg-white p-6 text-center shadow-sm">
                <p className="text-sm text-gray-500">
                  未找到符合分析条件的{numberLabel}。
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {isPhone
                    ? "请确保输入了有效的11位手机号码。"
                    : "车牌号需包含足够位数的数字方可进行分析。"}
                </p>
              </div>
            )}

            {/* AI 深度报告 */}
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-800">
                  AI 深度分析报告
                </h2>
                {aiStreamDone && !aiLoading && (
                  <button
                    onClick={() => {
                      aiTriggeredRef.current = false;
                      handleGenerateAIReport();
                    }}
                    className="text-xs text-gray-400 hover:text-purple-500 transition-colors"
                  >
                    重新生成
                  </button>
                )}
              </div>

              {aiLoading && !aiReport && (
                <div className="flex items-center gap-2 py-8 justify-center">
                  <SpinnerSVG />
                  <span className="text-sm text-gray-400">
                    AI 正在生成深度报告...
                  </span>
                </div>
              )}

              {aiReport && (
                <div className="prose-sm max-w-none">
                  <div
                    className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700"
                    style={{ minHeight: "60px" }}
                  >
                    {aiReport}
                    {aiLoading && (
                      <span
                        className="inline-block w-0.5 h-4 ml-0.5 align-middle"
                        style={{
                          backgroundColor: BRAND,
                          animation: "blink 1s step-end infinite",
                        }}
                      />
                    )}
                  </div>
                </div>
              )}

              {!aiLoading && !aiReport && !aiStreamDone && (
                <p className="text-sm text-gray-400 py-4 text-center">
                  报告生成中，请稍候...
                </p>
              )}
            </div>

            {/* 分享按钮 */}
            {matchResult && (
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <ShareButton
                  type="tool"
                  title={`八字合号·批量选号分析报告`}
                  description={`我的${numberLabel}匹配分析：日主${matchResult.baziAnalysis.dayMaster}，TOP1推荐${matchResult.top3[0]?.number || ""}`}
                  label="分享报告海报"
                  variant="block"
                />
              </div>
            )}

            {/* 重新分析 */}
            <button
              onClick={handleReset}
              className="w-full rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-500"
            >
              重新分析
            </button>
          </>
        )}
      </div>

      {/* ---------- 底部免责声明 ---------- */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur border-t border-gray-100 px-4 py-2">
        <p className="text-center text-[10px] text-gray-400">
          仅供传统文化参考，不构成任何决策建议
        </p>
      </div>

      {/* ---------- Toast ---------- */}
      {toast && (
        <div
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] rounded-xl px-4 py-2 text-sm text-white shadow-lg"
          style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
        >
          {toast}
        </div>
      )}

      {/* ---------- 闪烁动画样式 ---------- */}
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* v20.1: 登录提示弹窗 */}
      <LoginPromptModal show={showLoginPrompt} onClose={() => setShowLoginPrompt(false)} />
    </div>
  );
}

// ==================== 子组件 ====================

/** 信息卡片 */
function InfoCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      className="rounded-lg p-2.5"
      style={{ backgroundColor: color + "0A" }}
    >
      <p className="text-[11px] text-gray-400">{label}</p>
      <p className="mt-0.5 text-sm font-semibold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

/** TOP 推荐卡片 */
function TopCard({
  item,
  rank,
  numberLabel,
}: {
  item: NumberMatchResult;
  rank: number;
  numberLabel: string;
}) {
  const badgeColor = RANK_BADGE_COLORS[rank] || "#9CA3AF";

  return (
    <div
      className="rounded-xl p-3 border"
      style={{
        borderColor: rank === 0 ? BRAND + "40" : "#E5E7EB",
        backgroundColor: rank === 0 ? BRAND + "06" : "#fff",
      }}
    >
      {/* 头部：排名 + 号码 + 等级 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: badgeColor }}
          >
            {rank + 1}
          </span>
          <span className="text-base font-bold text-gray-800 tracking-wide">
            {item.number}
          </span>
        </div>
        <span
          className="rounded px-2 py-0.5 text-[11px] text-white"
          style={{ backgroundColor: LEVEL_COLORS[item.matchLevel] || "#9CA3AF" }}
        >
          {item.matchLevel}
        </span>
      </div>

      {/* 评分 */}
      <div className="mt-2.5 grid grid-cols-3 gap-2">
        <ScoreBar label="匹配度" value={item.matchScore} />
        <ScoreBar label="吉凶" value={item.auspiciousScore} />
        <ScoreBar label="综合" value={item.totalScore} highlight />
      </div>

      {/* 号码数字五行拆解 */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1">
        <span className="text-[11px] text-gray-400 mr-0.5">数字五行：</span>
        {item.number
          .replace(/\D/g, "")
          .split("")
          .map((d, i) => {
            const wx = DIGIT_WUXING[d];
            if (!wx) return null;
            return (
              <span
                key={i}
                className="flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px]"
                style={{ backgroundColor: WUXING_COLORS[wx] + "18" }}
              >
                <span className="text-gray-500">{d}</span>
                <span style={{ color: WUXING_COLORS[wx] }}>{wx}</span>
              </span>
            );
          })}
      </div>

      {/* 五行命中 */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-gray-400">命中喜用神：</span>
        {item.favorableHits.length > 0 ? (
          item.favorableHits.map((wx) => (
            <span
              key={wx}
              className="rounded px-1.5 py-0.5 text-[10px] text-white"
              style={{ backgroundColor: WUXING_COLORS[wx] || "#9CA3AF" }}
            >
              {wx}
            </span>
          ))
        ) : (
          <span className="text-[11px] text-gray-300">无</span>
        )}
        {item.unfavorableHits.length > 0 && (
          <>
            <span className="text-[11px] text-gray-400 ml-1">忌神：</span>
            {item.unfavorableHits.map((wx) => (
              <span
                key={wx}
                className="rounded px-1.5 py-0.5 text-[10px] text-white opacity-60"
                style={{ backgroundColor: WUXING_COLORS[wx] || "#9CA3AF" }}
              >
                {wx}
              </span>
            ))}
          </>
        )}
      </div>

      {/* 推荐理由 */}
      <p className="mt-2 text-xs text-gray-500 leading-relaxed">
        {item.recommendation}
      </p>
    </div>
  );
}

/** 评分条 */
function ScoreBar({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  const color = scoreColor(value);
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] text-gray-400">{label}</span>
        <span
          className={`text-xs font-semibold ${highlight ? "text-sm" : ""}`}
          style={{ color }}
        >
          {value}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ==================== 图标组件 ====================

function CameraSVG() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function SpinnerSVG() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ animation: "spin 1s linear infinite" }}
    >
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
    </svg>
  );
}

function WeChatSVG() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9.5 4C5.36 4 2 6.69 2 10c0 1.89 1.08 3.56 2.78 4.66L4 17l2.5-1.32c.96.27 1.96.42 3 .42l.34-.01a5.5 5.5 0 0 1-.34-1.93c0-3.04 2.91-5.5 6.5-5.5.2 0 .39.01.58.02C16.18 6.2 13.07 4 9.5 4zM7 8.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm5 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2zM16 10c-3.31 0-6 2.24-6 5s2.69 5 6 5c.83 0 1.62-.15 2.35-.41L20.5 21l-.6-2.1C21.18 17.97 22 16.56 22 15c0-2.76-2.69-5-6-5zm-2 3.5a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5zm4 0a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5z" />
    </svg>
  );
}

function AlipaySVG() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.98 4.5c-4.14 0-7.5 3.36-7.5 7.5s3.36 7.5 7.5 7.5c1.97 0 3.76-.76 5.1-2L14.3 15.8c-1.07.73-2.4 1.16-3.82 1.16-2.97 0-5.48-1.97-6.3-4.68.42-1.36 2.2-4.48 6.7-4.48 1.93 0 3.5.62 4.72 1.4l-1.6 1.6c-.86-.46-1.94-.78-3.12-.78-2.2 0-3.97 1.5-4.3 3.5.5-1.4 1.9-2.4 3.6-2.4 1.27 0 2.4.48 3.27 1.27l4.04 4.04c.7-.94 1.11-2.1 1.11-3.36 0-3.17-2.55-5.72-5.72-5.72h-.04l.35-.36c.3-.3.3-.78 0-1.08L13.06 4.5h-1.08z" />
    </svg>
  );
}

// ==================== 文件读取工具 ====================

/** 读取文件为 DataURL (base64) */
function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsDataURL(file);
  });
}
