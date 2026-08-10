"use client";

// ============================================================================
// 积分流水页面（个人中心 /profile/points）
//
// 功能：
// - 顶部展示当前积分与等级（含图标、等级名称）+ 问号小图标弹出积分规则说明
// - 等级进度条：当前等级到下一等级的进度
// - 积分流水列表：按时间倒序，展示原因、对应行为描述、时间
// - 筛选：全部 / 收入 / 支出
// - 被扣分项右侧「申诉」按钮：发起申诉并跳转 /profile/appeal?type=points&targetId=xxx
// - 底部合规提示
// 紫色品牌主题 #7B2FBE，移动端适配
// ============================================================================

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { BrandHeader } from "@/components/shared";
import PointsExplanation from "@/components/PointsExplanation";
import { getUserProfile } from "@/lib/auth";
import {
  getPointsHistory,
  getUserPoints,
  POINTS_EXPLANATION,
  POINTS_LEVELS,
  createAppeal,
  POINTS_EARN_RULES,
  POINTS_DEDUCT_RULES,
  type PointsTransaction,
  type PointsActionType,
} from "@/lib/dualTrackService";

const BRAND = "#7B2FBE";

/** 行为类型 -> 对应行为描述（取自积分规则配置，保持与后端一致） */
const ACTION_LABELS: Partial<Record<PointsActionType, string>> = (() => {
  const map: Partial<Record<PointsActionType, string>> = {};
  [...POINTS_EARN_RULES, ...POINTS_DEDUCT_RULES].forEach((r) => {
    map[r.action] = r.desc;
  });
  return map;
})();

type FilterType = "all" | "income" | "expense";

/** 时间格式化：今天/昨天/完整日期 */
function formatTime(timeStr: string): string {
  try {
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return timeStr;
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return `今天 ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `昨天 ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }
    return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(
      date.getHours()
    )}:${pad(date.getMinutes())}`;
  } catch {
    return timeStr;
  }
}

// ============================ 主页面 ============================
export default function ProfilePointsPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // 积分概览
  const [points, setPoints] = useState(0);
  const [levelInfo, setLevelInfo] = useState<typeof POINTS_LEVELS[0] | null>(null);

  // 流水
  const [history, setHistory] = useState<PointsTransaction[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [loadingPoints, setLoadingPoints] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // 申诉弹窗
  const [appealTarget, setAppealTarget] = useState<PointsTransaction | null>(null);
  const [appealReason, setAppealReason] = useState("");
  const [submittingAppeal, setSubmittingAppeal] = useState(false);
  const [toast, setToast] = useState("");

  // 初始化：获取登录用户
  useEffect(() => {
    const profile = getUserProfile();
    if (profile?.userId) {
      setUserId(profile.userId);
    }
    setReady(true);
  }, []);

  // 加载积分概览
  const loadPoints = useCallback(async (uid: string) => {
    setLoadingPoints(true);
    try {
      const data = await getUserPoints(uid);
      if (data) {
        setPoints(data.points);
        setLevelInfo(data.levelInfo);
      }
    } catch (e) {
      console.error("加载积分信息失败:", e);
    } finally {
      setLoadingPoints(false);
    }
  }, []);

  // 加载流水
  const loadHistory = useCallback(async (uid: string, f: FilterType) => {
    setLoadingHistory(true);
    try {
      const data = await getPointsHistory(uid, 1, 50, f);
      // 按时间倒序（接口通常已倒序，这里再保证一次）
      const sorted = [...data.history].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setHistory(sorted);
    } catch (e) {
      console.error("加载积分流水失败:", e);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (!ready || !userId) return;
    loadPoints(userId);
  }, [ready, userId, loadPoints]);

  useEffect(() => {
    if (!ready || !userId) return;
    loadHistory(userId, filter);
  }, [ready, userId, filter, loadHistory]);

  // 等级进度（当前等级 -> 下一等级）
  const progressInfo = useMemo(() => {
    if (!levelInfo)
      return { percent: 0, nextLevel: null, remain: 0 };
    const currentBase = levelInfo.minPoints;
    const nextLevel = POINTS_LEVELS.find((l) => l.level === levelInfo.level + 1) || null;
    if (!nextLevel) {
      return { percent: 100, nextLevel: null, remain: 0 };
    }
    const nextBase = nextLevel.minPoints;
    const span = nextBase - currentBase;
    const done = Math.max(0, points - currentBase);
    const percent = span > 0 ? Math.min(100, (done / span) * 100) : 0;
    const remain = Math.max(0, nextBase - points);
    return { percent, nextLevel, remain };
  }, [levelInfo, points]);

  // 本地筛选兜底
  const filteredHistory = useMemo(() => {
    if (filter === "all") return history;
    if (filter === "income") return history.filter((h) => h.amount > 0);
    return history.filter((h) => h.amount < 0);
  }, [history, filter]);

  // 点击「申诉」按钮：打开内联申诉弹窗，提交后跳转申诉页
  const handleAppealClick = (record: PointsTransaction) => {
    setAppealTarget(record);
    setAppealReason("");
  };

  // 提交申诉：调用 createAppeal，成功后跳转 /profile/appeal?type=points&targetId=xxx
  const handleSubmitAppeal = async () => {
    if (!appealTarget) return;
    const reason = appealReason.trim();
    if (!reason) {
      setToast("请填写申诉理由");
      setTimeout(() => setToast(""), 2000);
      return;
    }
    setSubmittingAppeal(true);
    try {
      const res = await createAppeal("points_deduction", appealTarget.id, reason, []);
      if (res.success) {
        const targetId = appealTarget.id;
        setAppealTarget(null);
        setAppealReason("");
        setToast("申诉已提交");
        // 跳转到申诉页
        setTimeout(() => {
          router.push(`/profile/appeal?type=points&targetId=${encodeURIComponent(targetId)}`);
        }, 700);
      } else {
        setToast(res.error || "申诉提交失败，请稍后再试");
        setTimeout(() => setToast(""), 2500);
      }
    } catch (e) {
      console.error("申诉提交异常:", e);
      setToast("网络异常，请稍后重试");
      setTimeout(() => setToast(""), 2500);
    } finally {
      setSubmittingAppeal(false);
    }
  };

  // ============================ 渲染 ============================
  // 初始化中
  if (!ready) {
    return (
      <div style={pageStyle}>
        <BrandHeader title="积分流水" showBack backUrl="/profile" color={BRAND} />
        <div style={{ textAlign: "center", padding: "60px 0", color: "#999" }}>加载中...</div>
      </div>
    );
  }

  // 未登录
  if (!userId) {
    return (
      <div style={{ ...pageStyle, display: "flex", flexDirection: "column" }}>
        <BrandHeader title="积分流水" showBack backUrl="/profile" color={BRAND} />
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>🔒</div>
          <p style={{ fontSize: "14px", color: "#666", marginBottom: "16px" }}>
            请先登录后查看积分流水
          </p>
          <button
            onClick={() => router.push("/login")}
            style={primaryBtnStyle}
          >
            去登录
          </button>
        </div>
        <ComplianceFooter />
      </div>
    );
  }

  return (
    <div style={{ ...pageStyle, display: "flex", flexDirection: "column" }}>
      <BrandHeader title="积分流水" showBack backUrl="/profile" color={BRAND} />

      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        {/* ===== 积分概览卡 ===== */}
        <div style={pointsCardStyle}>
          {/* 当前积分 + 等级 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: "13px", opacity: 0.85 }}>当前积分</div>
              {/* 积分数字 + 问号小图标 */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginTop: "4px",
                }}
              >
                <span style={{ fontSize: "40px", fontWeight: 700, lineHeight: 1 }}>
                  {loadingPoints ? "--" : points.toLocaleString()}
                </span>
                <PointsExplanation />
              </div>
            </div>

            {/* 等级（图标 + 等级名称） */}
            {levelInfo && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "4px",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "26px",
                    backgroundColor: "rgba(255,255,255,0.22)",
                    border: "1px solid rgba(255,255,255,0.4)",
                  }}
                >
                  {levelInfo.icon}
                </div>
                <span style={{ fontSize: "12px", fontWeight: 600 }}>
                  Lv.{levelInfo.level} {levelInfo.title}
                </span>
              </div>
            )}
          </div>

          {/* 等级进度条 */}
          {levelInfo && (
            <div style={{ marginTop: "16px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "11px",
                  opacity: 0.9,
                  marginBottom: "6px",
                }}
              >
                <span>Lv.{levelInfo.level} {levelInfo.title}</span>
                {progressInfo.nextLevel ? (
                  <span>
                    距 Lv.{progressInfo.nextLevel.level} {progressInfo.nextLevel.title}
                    <br style={{ display: "none" }} /> 还差 {progressInfo.remain} 分
                  </span>
                ) : (
                  <span>已达最高等级</span>
                )}
              </div>
              <div
                style={{
                  height: "8px",
                  borderRadius: "999px",
                  backgroundColor: "rgba(255,255,255,0.25)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${progressInfo.percent}%`,
                    borderRadius: "999px",
                    backgroundColor: "#fff",
                    transition: "width 0.4s ease",
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ===== 积分规则说明（内联展示 POINTS_EXPLANATION） ===== */}
        <div style={ruleCardStyle}>
          <div
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#333",
              marginBottom: "6px",
            }}
          >
            {POINTS_EXPLANATION.title}
          </div>
          <p
            style={{
              margin: 0,
              fontSize: "12px",
              lineHeight: 1.7,
              color: "#888",
              whiteSpace: "pre-line",
            }}
          >
            {POINTS_EXPLANATION.body}
          </p>
        </div>

        {/* ===== 筛选标签：全部 / 收入 / 支出 ===== */}
        <div style={{ display: "flex", gap: "8px", padding: "0 12px", marginBottom: "10px" }}>
          {(
            [
              { key: "all", label: "全部" },
              { key: "income", label: "收入" },
              { key: "expense", label: "支出" },
            ] as { key: FilterType; label: string }[]
          ).map((item) => (
            <button
              key={item.key}
              onClick={() => setFilter(item.key)}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: "8px",
                backgroundColor: filter === item.key ? BRAND : "#fff",
                color: filter === item.key ? "#fff" : "#666",
                border: filter === item.key ? "none" : "1px solid #e0e0e0",
                fontSize: "14px",
                fontWeight: filter === item.key ? 600 : 400,
                cursor: "pointer",
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* ===== 积分流水列表 ===== */}
        <div style={listStyle}>
          {loadingHistory ? (
            <div style={emptyStyle}>加载中...</div>
          ) : filteredHistory.length === 0 ? (
            <div style={{ ...emptyStyle, padding: "48px 0" }}>
              <div style={{ fontSize: "36px", marginBottom: "8px" }}>📋</div>
              <div style={{ fontSize: "14px" }}>
                {filter === "income"
                  ? "暂无收入记录"
                  : filter === "expense"
                  ? "暂无支出记录"
                  : "暂无积分流水"}
              </div>
            </div>
          ) : (
            filteredHistory.map((record) => {
              const isIncome = record.amount > 0;
              const actionLabel = ACTION_LABELS[record.action] || record.action;
              return (
                <div key={record.id} style={itemStyle}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: "12px",
                    }}
                  >
                    {/* 左：原因 + 对应行为 + 时间 */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: 500,
                          color: "#333",
                          marginBottom: "4px",
                          wordBreak: "break-word",
                        }}
                      >
                        {record.reason || actionLabel}
                      </div>
                      <div style={{ fontSize: "12px", color: "#999", marginBottom: "4px" }}>
                        对应行为：{actionLabel}
                      </div>
                      <div style={{ fontSize: "11px", color: "#bbb" }}>
                        {formatTime(record.createdAt)}
                      </div>
                    </div>

                    {/* 右：金额 + 申诉按钮 */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        gap: "6px",
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          fontSize: "16px",
                          fontWeight: 700,
                          color: isIncome ? "#27ae60" : "#e74c3c",
                        }}
                      >
                        {isIncome ? "+" : "-"}
                        {Math.abs(record.amount)}
                      </div>
                      {/* 仅扣分项显示申诉按钮 */}
                      {!isIncome && (
                        <button
                          onClick={() => handleAppealClick(record)}
                          style={appealBtnStyle}
                        >
                          申诉
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ===== 底部合规提示 ===== */}
      <ComplianceFooter />

      {/* ===== 申诉弹窗 ===== */}
      {appealTarget && (
        <AppealModal
          record={appealTarget}
          reason={appealReason}
          setReason={setAppealReason}
          submitting={submittingAppeal}
          onClose={() => {
            setAppealTarget(null);
            setAppealReason("");
          }}
          onSubmit={handleSubmitAppeal}
        />
      )}

      {/* ===== Toast ===== */}
      {toast && (
        <div style={toastStyle}>{toast}</div>
      )}
    </div>
  );
}

// ============================ 合规提示组件 ============================
function ComplianceFooter() {
  return (
    <div
      style={{
        padding: "12px 16px 20px",
        textAlign: "center",
        fontSize: "11px",
        color: "#bbb",
        lineHeight: 1.6,
        backgroundColor: "#ededed",
      }}
    >
      本平台为传统文化学术交流与学习分享平台，所有交流内容仅供学习参考，不构成任何专业建议。
    </div>
  );
}

// ============================ 申诉弹窗组件 ============================
function AppealModal({
  record,
  reason,
  setReason,
  submitting,
  onClose,
  onSubmit,
}: {
  record: PointsTransaction;
  reason: string;
  setReason: (v: string) => void;
  submitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.5)",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "#fff",
          borderRadius: 14,
          maxWidth: 340,
          width: "100%",
          maxHeight: "85vh",
          overflow: "auto",
          boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
        }}
      >
        {/* 标题 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            borderBottom: "1px solid #f0f0f0",
            position: "sticky",
            top: 0,
            backgroundColor: "#fff",
            zIndex: 1,
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1a1a1a" }}>
            发起积分申诉
          </h3>
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: "none",
              background: "#f5f5f5",
              cursor: "pointer",
              fontSize: 14,
              color: "#666",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: 16 }}>
          {/* 扣分记录概要 */}
          <div
            style={{
              backgroundColor: "#faf6ff",
              borderRadius: 10,
              padding: "10px 12px",
              marginBottom: 14,
              border: `1px solid ${BRAND}22`,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 12, color: "#888" }}>扣分记录</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#e74c3c" }}>
                -{Math.abs(record.amount)}
              </span>
            </div>
            <div style={{ fontSize: 13, color: "#333", marginTop: 6 }}>
              {record.reason || ACTION_LABELS[record.action] || record.action}
            </div>
            <div style={{ fontSize: 11, color: "#bbb", marginTop: 4 }}>
              {formatTime(record.createdAt)}
            </div>
          </div>

          {/* 申诉理由 */}
          <label
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 600,
              color: "#333",
              marginBottom: 6,
            }}
          >
            申诉理由
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={300}
            rows={4}
            placeholder="请详细描述您认为该扣分有误的原因..."
            style={{
              width: "100%",
              boxSizing: "border-box",
              borderRadius: 10,
              border: "1px solid #e0e0e0",
              padding: "10px 12px",
              fontSize: 13,
              resize: "none",
              outline: "none",
              lineHeight: 1.6,
              fontFamily: "inherit",
            }}
          />
          <div
            style={{
              textAlign: "right",
              fontSize: 11,
              color: "#bbb",
              marginTop: 4,
            }}
          >
            {reason.length}/300
          </div>

          <p
            style={{
              fontSize: 11,
              color: "#bbb",
              lineHeight: 1.6,
              margin: "8px 0 14px",
            }}
          >
            申诉将由大众评委团投票裁决，同一扣分记录仅可申诉 1 次，请在 7 天内发起。
          </p>

          {/* 按钮 */}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: "11px 0",
                borderRadius: 10,
                border: "1px solid #e0e0e0",
                backgroundColor: "#fff",
                color: "#666",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              取消
            </button>
            <button
              onClick={onSubmit}
              disabled={submitting}
              style={{
                flex: 1,
                padding: "11px 0",
                borderRadius: 10,
                border: "none",
                backgroundColor: BRAND,
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? "提交中..." : "提交申诉"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================ 样式常量 ============================
const pageStyle: React.CSSProperties = {
  maxWidth: "420px",
  margin: "0 auto",
  minHeight: "100vh",
  backgroundColor: "#ededed",
};

const pointsCardStyle: React.CSSProperties = {
  margin: "12px",
  borderRadius: 16,
  overflow: "hidden",
  background: `linear-gradient(135deg, ${BRAND}, ${BRAND}cc)`,
  color: "#fff",
  padding: "20px",
  boxSizing: "border-box",
};

const ruleCardStyle: React.CSSProperties = {
  margin: "0 12px 12px",
  padding: "12px 14px",
  borderRadius: 12,
  backgroundColor: "#fff",
  border: `1px solid ${BRAND}22`,
  boxSizing: "border-box",
};

const listStyle: React.CSSProperties = {
  margin: "0 12px",
  backgroundColor: "#fff",
  borderRadius: 12,
  overflow: "hidden",
};

const itemStyle: React.CSSProperties = {
  padding: "14px 16px",
  borderBottom: "1px solid #f5f5f5",
  boxSizing: "border-box",
};

const emptyStyle: React.CSSProperties = {
  textAlign: "center",
  padding: "40px 0",
  color: "#999",
  fontSize: "14px",
};

const appealBtnStyle: React.CSSProperties = {
  padding: "3px 10px",
  borderRadius: "999px",
  border: `1px solid ${BRAND}`,
  backgroundColor: "#fff",
  color: BRAND,
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
  lineHeight: 1.6,
};

const primaryBtnStyle: React.CSSProperties = {
  padding: "10px 28px",
  borderRadius: "999px",
  backgroundColor: BRAND,
  color: "#fff",
  border: "none",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

const toastStyle: React.CSSProperties = {
  position: "fixed",
  left: "50%",
  top: "50%",
  transform: "translate(-50%, -50%)",
  zIndex: 10001,
  backgroundColor: "rgba(0,0,0,0.78)",
  color: "#fff",
  fontSize: 13,
  padding: "10px 18px",
  borderRadius: 10,
  maxWidth: "80%",
  textAlign: "center",
  lineHeight: 1.5,
};
