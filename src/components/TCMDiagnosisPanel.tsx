"use client";

import { useState, useCallback, useEffect } from "react";
import {
  saveTCMRecord,
  getTCMHistory,
  getTCMDetail,
  getTCMConfig,
  TCM_DISCLAIMER,
  formatTCMTime,
  type TCMRecord,
  type TCMConfig,
} from "@/lib/tcmService";

/**
 * v20.0 中医诊断系统增强 - 前端展示组件
 *
 * 功能区域：
 * 1. 诊断记录Tab：四诊信息表单录入（性别、年龄、主诉、伴随症状、舌诊、脉诊、问诊补充）
 * 2. 历史记录Tab：展示用户历史诊断记录列表，点击查看完整详情
 * 3. 详情视图：完整四诊信息 + AI辅助辨证结果 + 中医师审核状态
 *
 * 合规定位：AI辅助辨证，仅供传统文化学习参考，不构成医疗建议
 */

// --- 主题色 ---
const BRAND = "#7B2FBE";
const BRAND_LIGHT = "#9B5ECF";
const BRAND_BG = "#f3edf7";
const BRAND_BORDER = "#e8d8f0";

// --- 性别选项 ---
const GENDER_OPTIONS: { value: string; label: string; icon: string }[] = [
  { value: "male", label: "男", icon: "♂" },
  { value: "female", label: "女", icon: "♀" },
  { value: "other", label: "其他", icon: "·" },
];

// --- 舌诊维度 ---
const TONGUE_DIMENSIONS: { key: "body" | "coating" | "shape"; label: string; icon: string }[] = [
  { key: "body", label: "舌体", icon: "👅" },
  { key: "coating", label: "舌苔", icon: "🌫️" },
  { key: "shape", label: "舌形", icon: "📋" },
];

// --- 默认配置（API不可用时回退使用） ---
const DEFAULT_TCM_CONFIG: TCMConfig = {
  syndromeTypes: {
    eight_principles: {
      name: "八纲辨证",
      items: ["表证", "里证", "寒证", "热证", "虚证", "实证", "阴证", "阳证"],
    },
    organ: {
      name: "脏腑辨证",
      items: [
        "肝郁气滞证", "肝火上炎证", "肝阳上亢证", "肝血亏虚证",
        "心火亢盛证", "心血亏虚证", "心气虚证",
        "脾胃虚弱证", "脾虚湿盛证", "胃火炽盛证",
        "肺气虚证", "肺阴虚证",
        "肾阳虚证", "肾阴虚证", "肾精不足证",
      ],
    },
    qi_blood: {
      name: "气血津液辨证",
      items: ["气虚证", "气滞证", "气逆证", "血虚证", "血瘀证", "血热证", "津液不足证", "痰湿证", "水饮停聚证"],
    },
    pathogen: {
      name: "病因辨证",
      items: ["风证", "寒证", "暑证", "湿证", "燥证", "火证", "食积证", "虫积证"],
    },
  },
  pulseTypes: [
    "浮脉", "沉脉", "迟脉", "数脉", "虚脉", "实脉",
    "滑脉", "涩脉", "弦脉", "紧脉", "洪脉", "细脉",
    "濡脉", "弱脉", "促脉", "结脉", "代脉",
  ],
  tongueTypes: {
    body: ["淡红舌", "淡白舌", "红舌", "绛舌", "青紫舌", "暗红舌"],
    coating: ["薄白苔", "薄黄苔", "白厚苔", "黄厚苔", "黄腻苔", "白腻苔", "灰黑苔", "无苔", "花剥苔"],
    shape: ["正常", "胖大舌", "瘦薄舌", "齿痕舌", "裂纹舌", "芒刺舌", "光滑舌"],
  },
  disclaimer: TCM_DISCLAIMER,
};

// --- 组件 Props ---
interface TCMDiagnosisPanelProps {
  show: boolean;
  onClose: () => void;
}

type TabType = "diagnosis" | "history";

export default function TCMDiagnosisPanel({ show, onClose }: TCMDiagnosisPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("diagnosis");
  const [config, setConfig] = useState<TCMConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");

  // 表单状态
  const [gender, setGender] = useState("male");
  const [age, setAge] = useState("");
  const [mainSymptom, setMainSymptom] = useState("");
  const [accompanyingSymptom, setAccompanyingSymptom] = useState("");
  const [tongue, setTongue] = useState<{ body?: string; coating?: string; shape?: string }>({});
  const [pulse, setPulse] = useState<string[]>([]);
  const [inquiry, setInquiry] = useState("");

  // 历史记录状态
  const [history, setHistory] = useState<TCMRecord[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);

  // 详情状态
  const [detail, setDetail] = useState<TCMRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // 显示提示
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }, []);

  // 锁定 body 滚动
  useEffect(() => {
    document.body.style.overflow = show ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [show]);

  // 加载配置
  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    const cfg = await getTCMConfig();
    setConfig(cfg || DEFAULT_TCM_CONFIG);
    setConfigLoading(false);
  }, []);

  // 显示时加载配置
  useEffect(() => {
    if (show) {
      loadConfig();
    }
  }, [show]); // eslint-disable-line react-hooks/exhaustive-deps

  // 关闭面板时重置详情视图
  useEffect(() => {
    if (!show) {
      setDetail(null);
    }
  }, [show]);

  // 加载历史记录
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    const result = await getTCMHistory(1, 20);
    if (result) {
      setHistory(result.records);
      setHistoryTotal(result.total);
    } else {
      setHistory([]);
      setHistoryTotal(0);
    }
    setHistoryLoading(false);
  }, []);

  // 切换Tab
  const handleTabChange = useCallback(
    (tab: TabType) => {
      setActiveTab(tab);
      if (tab === "history" && detail === null) {
        loadHistory();
      }
    },
    [loadHistory, detail]
  );

  // 脉象多选切换
  const togglePulse = useCallback((p: string) => {
    setPulse((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }, []);

  // 舌诊选择
  const setTongueItem = useCallback((dim: "body" | "coating" | "shape", val: string) => {
    setTongue((prev) => ({ ...prev, [dim]: prev[dim] === val ? undefined : val }));
  }, []);

  // 拆分症状文本为数组
  const splitSymptoms = (text: string): string[] =>
    text
      .split(/[,，\n、]/)
      .map((s) => s.trim())
      .filter(Boolean);

  // 提交诊断
  const handleSubmit = useCallback(async () => {
    if (!mainSymptom.trim()) {
      showToast("请输入主诉症状");
      return;
    }
    const ageNum = Number(age);
    if (!age.trim() || isNaN(ageNum) || ageNum <= 0 || ageNum > 150) {
      showToast("请输入有效年龄（1-150）");
      return;
    }
    setSubmitting(true);
    const diagnosisData: Partial<TCMRecord> = {
      gender,
      age: ageNum,
      mainSymptoms: splitSymptoms(mainSymptom),
      accompanyingSymptoms: splitSymptoms(accompanyingSymptom),
      tongue,
      pulse,
      inquiry: { supplement: inquiry },
      inspection: { tongue },
      auscultation: {},
      palpation: { pulse },
      disclaimer: TCM_DISCLAIMER,
    };
    const result = await saveTCMRecord(diagnosisData);
    setSubmitting(false);
    if (result.success) {
      showToast("诊断记录已保存");
      // 重置表单
      setMainSymptom("");
      setAccompanyingSymptom("");
      setTongue({});
      setPulse([]);
      setInquiry("");
      setAge("");
      // 切换到历史记录查看结果
      handleTabChange("history");
    } else {
      showToast(result.error || "保存失败，请重试");
    }
  }, [gender, age, mainSymptom, accompanyingSymptom, tongue, pulse, inquiry, showToast, handleTabChange]);

  // 查看详情
  const handleViewDetail = useCallback(async (recordId: string) => {
    setDetailLoading(true);
    const d = await getTCMDetail(recordId);
    setDetail(d);
    setDetailLoading(false);
  }, []);

  // 关闭详情
  const handleCloseDetail = useCallback(() => {
    setDetail(null);
    // 重新加载历史，获取可能更新的审核状态
    loadHistory();
  }, [loadHistory]);

  // 当 show 为 false 时不渲染
  if (!show) return null;

  // 有效配置（API返回或回退默认值）
  const effectiveConfig = config || DEFAULT_TCM_CONFIG;

  // ==================== 渲染：表单字段标题 ====================
  const SectionTitle = ({ icon, children }: { icon: string; children: React.ReactNode }) => (
    <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
      <span>{icon}</span>
      <span>{children}</span>
    </div>
  );

  // ==================== 渲染：可选项标签 ====================
  const Chip = ({
    label,
    selected,
    onClick,
  }: {
    label: string;
    selected: boolean;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "6px 12px",
        borderRadius: 16,
        border: `1px solid ${selected ? BRAND : BRAND_BORDER}`,
        backgroundColor: selected ? BRAND : "#fff",
        color: selected ? "#fff" : "#555",
        fontSize: 12,
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );

  // ==================== 渲染：审核状态 ====================
  const renderReviewStatus = (record: TCMRecord) => {
    if (record.practitionerReviewed) {
      return (
        <div
          style={{
            marginTop: 10,
            padding: "10px 12px",
            backgroundColor: "#e8f5e9",
            borderRadius: 10,
            border: "1px solid #c8e6c9",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: "#2e7d32", display: "flex", alignItems: "center", gap: 4 }}>
            <span>✓</span>
            <span>已由专业学习同好审核</span>
          </div>
          {record.reviewedBy && (
            <div style={{ fontSize: 11, color: "#558b2f", marginTop: 4 }}>
              审核人：{record.reviewedBy}
              {record.reviewedAt && ` · ${formatTCMTime(record.reviewedAt)}`}
            </div>
          )}
          {record.reviewNotes && (
            <div style={{ fontSize: 12, color: "#33691e", marginTop: 6, lineHeight: 1.6 }}>
              审核意见：{record.reviewNotes}
            </div>
          )}
          {record.adjustedSyndrome && (
            <div style={{ fontSize: 12, color: "#1b5e20", marginTop: 4, fontWeight: 600 }}>
              调整辨证：{record.adjustedSyndrome}
            </div>
          )}
          {record.adjustedPrinciples && (
            <div style={{ fontSize: 12, color: "#1b5e20", marginTop: 2 }}>
              调整治则：{record.adjustedPrinciples}
            </div>
          )}
        </div>
      );
    }
    return (
      <div
        style={{
          marginTop: 10,
          padding: "10px 12px",
          backgroundColor: "#fff3e0",
          borderRadius: 10,
          border: "1px solid #ffe0b2",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 16, flexShrink: 0 }}>⏳</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#e65100" }}>待专业学习同好审核</div>
          <div style={{ fontSize: 11, color: "#bf6c00", marginTop: 2 }}>
            当前辨证结果由AI辅助生成，等待专业学习同好复核确认
          </div>
        </div>
      </div>
    );
  };

  // ==================== 渲染：诊断记录详情 ====================
  const renderDetail = () => {
    if (detailLoading) {
      return (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#999", fontSize: 13 }}>
          加载详情中...
        </div>
      );
    }
    if (!detail) {
      return (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#999", fontSize: 13 }}>
          未能获取诊断详情
        </div>
      );
    }

    const InfoRow = ({ label, value }: { label: string; value?: React.ReactNode }) => (
      <div style={{ display: "flex", padding: "8px 0", borderBottom: "1px solid #f5f5f5", gap: 12 }}>
        <div style={{ width: 80, flexShrink: 0, fontSize: 12, color: "#999" }}>{label}</div>
        <div style={{ flex: 1, fontSize: 13, color: "#333", lineHeight: 1.6, wordBreak: "break-word" }}>
          {value || <span style={{ color: "#ccc" }}>未填写</span>}
        </div>
      </div>
    );

    return (
      <div>
        {/* 返回按钮 */}
        <button
          onClick={handleCloseDetail}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            background: "none",
            border: "none",
            fontSize: 13,
            color: BRAND,
            cursor: "pointer",
            padding: "6px 0",
            marginBottom: 10,
          }}
        >
          <span>←</span>
          <span>返回列表</span>
        </button>

        {/* 基本信息 */}
        <div
          style={{
            marginBottom: 12,
            padding: "12px 14px",
            backgroundColor: BRAND_BG,
            borderRadius: 10,
          }}
        >
          <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>
            诊断时间：{formatTCMTime(detail.createdAt)}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: BRAND }}>
            {detail.syndromeType || "辨证分析中"}
          </div>
        </div>

        {/* 四诊信息 */}
        <div
          style={{
            marginBottom: 12,
            padding: "4px 14px",
            backgroundColor: "#fff",
            borderRadius: 10,
            border: `1px solid ${BRAND_BORDER}`,
          }}
        >
          <SectionTitle icon="📋">基本信息</SectionTitle>
          <InfoRow label="性别" value={detail.gender === "male" ? "男" : detail.gender === "female" ? "女" : "其他"} />
          <InfoRow label="年龄" value={`${detail.age}岁`} />
        </div>

        <div
          style={{
            marginBottom: 12,
            padding: "4px 14px",
            backgroundColor: "#fff",
            borderRadius: 10,
            border: `1px solid ${BRAND_BORDER}`,
          }}
        >
          <SectionTitle icon="🗣️">问诊</SectionTitle>
          <InfoRow label="主诉症状" value={detail.mainSymptoms?.join("、")} />
          <InfoRow label="伴随症状" value={detail.accompanyingSymptoms?.join("、")} />
          <InfoRow
            label="问诊补充"
            value={detail.inquiry?.supplement || detail.inquiry?.note}
          />
        </div>

        <div
          style={{
            marginBottom: 12,
            padding: "4px 14px",
            backgroundColor: "#fff",
            borderRadius: 10,
            border: `1px solid ${BRAND_BORDER}`,
          }}
        >
          <SectionTitle icon="👅">舌诊</SectionTitle>
          <InfoRow label="舌体" value={detail.tongue?.body} />
          <InfoRow label="舌苔" value={detail.tongue?.coating} />
          <InfoRow label="舌形" value={detail.tongue?.shape} />
        </div>

        <div
          style={{
            marginBottom: 12,
            padding: "4px 14px",
            backgroundColor: "#fff",
            borderRadius: 10,
            border: `1px solid ${BRAND_BORDER}`,
          }}
        >
          <SectionTitle icon="✋">脉诊</SectionTitle>
          <InfoRow label="脉象" value={detail.pulse?.length ? detail.pulse.join("、") : undefined} />
        </div>

        {/* AI辅助辨证结果 */}
        <div
          style={{
            marginBottom: 12,
            padding: "14px",
            borderRadius: 10,
            background: `linear-gradient(135deg, ${BRAND_BG} 0%, #fff 100%)`,
            border: `1px solid ${BRAND_BORDER}`,
          }}
        >
          <SectionTitle icon="🤖">AI辅助辨证结果</SectionTitle>
          <InfoRow label="辨证类型" value={<span style={{ fontWeight: 600, color: BRAND }}>{detail.syndromeType}</span>} />
          <div style={{ fontSize: 12, color: "#666", marginTop: 8, lineHeight: 1.7 }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: "#1a1a1a" }}>辨证分析</div>
            <div>{detail.syndromeAnalysis || "暂无分析内容"}</div>
          </div>
          {detail.suggestedPrinciples && (
            <div style={{ fontSize: 12, color: "#666", marginTop: 8, lineHeight: 1.7 }}>
              <div style={{ fontWeight: 600, marginBottom: 4, color: "#1a1a1a" }}>建议治则</div>
              <div>{detail.suggestedPrinciples}</div>
            </div>
          )}
          {detail.aiGenerated && (
            <div style={{ fontSize: 11, color: "#999", marginTop: 8 }}>（本结果由AI辅助生成）</div>
          )}
        </div>

        {/* 中医师审核状态 */}
        {renderReviewStatus(detail)}
      </div>
    );
  };

  // ==================== 渲染：诊断记录表单 ====================
  const renderDiagnosisForm = () => {
    if (configLoading && !config) {
      return (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#999", fontSize: 13 }}>
          加载配置中...
        </div>
      );
    }
    return (
      <div>
        {/* 基本信息 */}
        <div style={{ marginBottom: 16 }}>
          <SectionTitle icon="👤">基本信息</SectionTitle>
          {/* 性别 */}
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            {GENDER_OPTIONS.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => setGender(g.value)}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 10,
                  border: `1px solid ${gender === g.value ? BRAND : BRAND_BORDER}`,
                  backgroundColor: gender === g.value ? BRAND : "#fff",
                  color: gender === g.value ? "#fff" : "#555",
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                }}
              >
                <span>{g.icon}</span>
                <span>{g.label}</span>
              </button>
            ))}
          </div>
          {/* 年龄 */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="请输入年龄"
              min={1}
              max={150}
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: 10,
                border: `1px solid ${BRAND_BORDER}`,
                fontSize: 13,
                outline: "none",
              }}
            />
            <span style={{ fontSize: 13, color: "#888" }}>岁</span>
          </div>
        </div>

        {/* 主诉症状 */}
        <div style={{ marginBottom: 16 }}>
          <SectionTitle icon="🗣️">主诉症状</SectionTitle>
          <textarea
            value={mainSymptom}
            onChange={(e) => setMainSymptom(e.target.value)}
            placeholder="请描述主要不适症状，多个症状用逗号分隔"
            rows={3}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${BRAND_BORDER}`,
              fontSize: 13,
              outline: "none",
              resize: "vertical",
              boxSizing: "border-box",
              fontFamily: "inherit",
            }}
          />
        </div>

        {/* 伴随症状 */}
        <div style={{ marginBottom: 16 }}>
          <SectionTitle icon="📝">伴随症状</SectionTitle>
          <textarea
            value={accompanyingSymptom}
            onChange={(e) => setAccompanyingSymptom(e.target.value)}
            placeholder="请描述其他伴随症状，可留空，多个症状用逗号分隔"
            rows={2}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${BRAND_BORDER}`,
              fontSize: 13,
              outline: "none",
              resize: "vertical",
              boxSizing: "border-box",
              fontFamily: "inherit",
            }}
          />
        </div>

        {/* 舌诊 */}
        <div style={{ marginBottom: 16 }}>
          <SectionTitle icon="👅">舌诊（望诊）</SectionTitle>
          {TONGUE_DIMENSIONS.map((dim) => (
            <div key={dim.key} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                <span>{dim.icon}</span>
                <span>{dim.label}</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {effectiveConfig.tongueTypes[dim.key].map((opt) => (
                  <Chip
                    key={opt}
                    label={opt}
                    selected={tongue[dim.key] === opt}
                    onClick={() => setTongueItem(dim.key, opt)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 脉诊 */}
        <div style={{ marginBottom: 16 }}>
          <SectionTitle icon="✋">脉诊（切诊，可多选）</SectionTitle>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {effectiveConfig.pulseTypes.map((p) => (
              <Chip
                key={p}
                label={p}
                selected={pulse.includes(p)}
                onClick={() => togglePulse(p)}
              />
            ))}
          </div>
        </div>

        {/* 问诊补充 */}
        <div style={{ marginBottom: 16 }}>
          <SectionTitle icon="💬">问诊补充</SectionTitle>
          <textarea
            value={inquiry}
            onChange={(e) => setInquiry(e.target.value)}
            placeholder="请补充问诊信息，如起病时间、加重缓解因素、饮食睡眠、二便情况等"
            rows={3}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${BRAND_BORDER}`,
              fontSize: 13,
              outline: "none",
              resize: "vertical",
              boxSizing: "border-box",
              fontFamily: "inherit",
            }}
          />
        </div>

        {/* 提交按钮 */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            width: "100%",
            padding: "13px 0",
            border: "none",
            borderRadius: 10,
            backgroundColor: submitting ? "#ccc" : BRAND,
            color: "#fff",
            fontSize: 15,
            fontWeight: 700,
            cursor: submitting ? "not-allowed" : "pointer",
          }}
        >
          {submitting ? "保存中..." : "提交并生成AI辅助辨证"}
        </button>

        {/* 合规提示 */}
        <div
          style={{
            marginTop: 10,
            padding: "8px 10px",
            backgroundColor: "#fff8e1",
            borderRadius: 8,
            fontSize: 11,
            color: "#e65100",
            lineHeight: 1.6,
          }}
        >
          ⚠️ {TCM_DISCLAIMER}
        </div>
      </div>
    );
  };

  // ==================== 渲染：历史记录列表 ====================
  const renderHistoryList = () => {
    if (detail) {
      return renderDetail();
    }
    if (historyLoading) {
      return (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#999", fontSize: 13 }}>
          加载中...
        </div>
      );
    }
    if (history.length === 0) {
      return (
        <div
          style={{
            textAlign: "center",
            padding: "50px 20px",
            color: "#999",
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 10 }}>📭</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#666" }}>暂无诊断记录</div>
          <div style={{ fontSize: 12, color: "#999", marginTop: 6 }}>
            完成"诊断记录"表单提交后，记录将显示在此处
          </div>
        </div>
      );
    }
    return (
      <div>
        <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>
          共 {historyTotal} 条记录
        </div>
        {history.map((record) => (
          <button
            key={record.id}
            onClick={() => handleViewDetail(record.id)}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "12px 14px",
              marginBottom: 8,
              borderRadius: 10,
              border: `1px solid ${BRAND_BORDER}`,
              backgroundColor: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {record.mainSymptoms?.join("、") || "无主诉"}
              </div>
              <div style={{ fontSize: 12, color: BRAND, marginTop: 4, fontWeight: 600 }}>
                {record.syndromeType || "辨证分析中"}
              </div>
              <div style={{ fontSize: 11, color: "#999", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                <span>{formatTCMTime(record.createdAt)}</span>
                {record.practitionerReviewed ? (
                  <span style={{ color: "#2e7d32" }}>✓ 已审核</span>
                ) : (
                  <span style={{ color: "#e65100" }}>⏳ 待审核</span>
                )}
              </div>
            </div>
            <span style={{ fontSize: 16, color: "#ccc", flexShrink: 0 }}>›</span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      {/* 遮罩层 */}
      <div
        onClick={onClose}
        style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.45)" }}
      />

      {/* 主面板 */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "380px",
          maxHeight: "80vh",
          backgroundColor: "#fff",
          borderRadius: "16px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* 头部 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            flexShrink: 0,
            background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_LIGHT} 100%)`,
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#fff" }}>
            🩺 中医诊断系统
          </h3>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "none",
              backgroundColor: "rgba(255,255,255,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: 16,
              color: "#fff",
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab 切换 */}
        <div
          style={{
            display: "flex",
            flexShrink: 0,
            borderBottom: `1px solid ${BRAND_BORDER}`,
          }}
        >
          {(
            [
              { key: "diagnosis", label: "诊断记录", icon: "📝" },
              { key: "history", label: "历史记录", icon: "📋" },
            ] as { key: TabType; label: string; icon: string }[]
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              style={{
                flex: 1,
                padding: "12px 0",
                background: "none",
                border: "none",
                borderBottom: activeTab === tab.key ? `2px solid ${BRAND}` : "2px solid transparent",
                color: activeTab === tab.key ? BRAND : "#999",
                fontSize: 14,
                fontWeight: activeTab === tab.key ? 700 : 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* 内容区域 */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px 16px",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {activeTab === "diagnosis" ? renderDiagnosisForm() : renderHistoryList()}
        </div>

        {/* 底部合规免责声明 */}
        <div
          style={{
            padding: "10px 16px",
            backgroundColor: "#fff8e1",
            fontSize: 11,
            color: "#e65100",
            textAlign: "center",
            flexShrink: 0,
            borderTop: "1px solid #ffe0b2",
            lineHeight: 1.5,
          }}
        >
          ⚠️ {TCM_DISCLAIMER}
        </div>

        {/* Toast 提示 */}
        {toast && (
          <div
            style={{
              position: "absolute",
              bottom: 60,
              left: "50%",
              transform: "translateX(-50%)",
              padding: "8px 16px",
              backgroundColor: "rgba(0,0,0,0.8)",
              color: "#fff",
              borderRadius: 8,
              fontSize: 13,
              whiteSpace: "nowrap",
              zIndex: 10000,
              maxWidth: "90%",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
