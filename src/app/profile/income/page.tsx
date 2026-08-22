"use client";

// ============================================================================
// 我的收益页面（P8-DISTRIBUTION-COMMISSION-AUTO 用户端，第一阶段）
//
// 位置：「我的」→「我的收益」
// 功能：
// - 顶部三余额卡：可提现余额 / 待解冻金额 / 累计总收益
// - 提现申请：校验最低提现额/两位小数/余额充足，提交后待审核
// - 收益明细：每笔佣金来源（订单号尾号）、比例、金额、状态、到账时间
// - 提现记录：状态流转（待审核→处理中→已到账/已驳回）与失败原因
// - 合规：仅一级分销表述；税务提示固定展示；金额两位小数单位元
// ============================================================================

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BrandHeader } from "@/components/shared";
import { PageLoginGuard } from "@/components/PageLoginGuard";
import { getUserProfile } from "@/lib/auth";
import { getCachedWechatOpenid, isInWechatBrowser } from "@/lib/paymentService";
import {
  getCommissionSummary,
  getCommissionRecords,
  getCommissionWithdrawals,
  applyCommissionWithdraw,
  getCommissionConfig,
  COMMISSION_STATUS_LABELS,
  WITHDRAW_STATUS_LABELS,
  formatCommissionTime,
  type CommissionSummary,
  type CommissionRecord,
  type CommissionWithdrawal,
  type CommissionPublicConfig,
} from "@/lib/commissionService";

const BRAND = "#7B2FBE";

type TabKey = "records" | "withdrawals";

export default function ProfileIncomePage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const [summary, setSummary] = useState<CommissionSummary | null>(null);
  const [config, setConfig] = useState<CommissionPublicConfig | null>(null);
  const [records, setRecords] = useState<CommissionRecord[]>([]);
  const [withdrawals, setWithdrawals] = useState<CommissionWithdrawal[]>([]);
  const [tab, setTab] = useState<TabKey>("records");
  const [loading, setLoading] = useState(true);

  // 提现弹窗
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const profile = getUserProfile();
    if (profile?.userId) setUserId(profile.userId);
    setReady(true);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [s, c, r, w] = await Promise.all([
      getCommissionSummary(),
      getCommissionConfig(),
      getCommissionRecords(50),
      getCommissionWithdrawals(50),
    ]);
    setSummary(s);
    setConfig(c);
    setRecords(r);
    setWithdrawals(w);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (ready && userId) loadAll();
    else if (ready) setLoading(false);
  }, [ready, userId, loadAll]);

  const showToast = (msg: string, ms = 2200) => {
    setToast(msg);
    setTimeout(() => setToast(""), ms);
  };

  // ==================== 提现提交 ====================
  const handleSubmitWithdraw = async () => {
    const amountNum = Number(withdrawAmount);
    if (!isFinite(amountNum) || amountNum <= 0) {
      showToast("请输入有效的提现金额");
      return;
    }
    if ((amountNum * 100) % 1 !== 0) {
      showToast("提现金额最多两位小数");
      return;
    }
    const min = config?.minWithdrawYuan ?? 10;
    if (amountNum < min) {
      showToast(`最低提现金额为 ${min.toFixed(2)} 元`);
      return;
    }
    const withdrawable = parseFloat(summary?.withdrawableYuan || "0");
    if (amountNum > withdrawable) {
      showToast("提现金额不能超过可提现余额");
      return;
    }

    setSubmitting(true);
    const openid = getCachedWechatOpenid();
    const r = await applyCommissionWithdraw(amountNum, openid);
    setSubmitting(false);

    if (r.success) {
      setShowWithdrawModal(false);
      setWithdrawAmount("");
      showToast("提现申请已提交，等待审核");
      loadAll();
    } else {
      showToast(r.error || "申请失败，请稍后重试");
    }
  };

  // ==================== 渲染 ====================
  if (!ready) {
    return (
      <div style={pageStyle}>
        <PageLoginGuard />
        <BrandHeader title="我的收益" showBack backUrl="/profile" color={BRAND} />
        <div style={{ textAlign: "center", padding: "60px 0", color: "#999" }}>加载中...</div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div style={{ ...pageStyle, display: "flex", flexDirection: "column" }}>
        <BrandHeader title="我的收益" showBack backUrl="/profile" color={BRAND} />
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
            请先登录后查看我的收益
          </p>
          <button onClick={() => router.push("/login")} style={primaryBtnStyle}>
            去登录
          </button>
        </div>
        <ComplianceFooter />
      </div>
    );
  }

  const withdrawable = summary?.withdrawableYuan ?? "0.00";
  const frozen = summary?.frozenYuan ?? "0.00";
  const total = summary?.totalEarningsYuan ?? "0.00";

  return (
    <div style={{ ...pageStyle, display: "flex", flexDirection: "column" }}>
      <BrandHeader title="我的收益" showBack backUrl="/profile" color={BRAND} />

      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        {/* ===== 三余额卡 ===== */}
        <div style={cardStyle}>
          <div style={{ fontSize: "13px", opacity: 0.85 }}>可提现余额（元）</div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: "6px" }}>
            <span style={{ fontSize: "38px", fontWeight: 700, lineHeight: 1 }}>
              {loading ? "--" : withdrawable}
            </span>
            <button
              onClick={() => setShowWithdrawModal(true)}
              disabled={parseFloat(withdrawable) <= 0}
              style={{
                padding: "9px 24px",
                borderRadius: "999px",
                border: "none",
                backgroundColor: parseFloat(withdrawable) > 0 ? "#fff" : "rgba(255,255,255,0.5)",
                color: BRAND,
                fontSize: 14,
                fontWeight: 700,
                cursor: parseFloat(withdrawable) > 0 ? "pointer" : "not-allowed",
              }}
            >
              提现
            </button>
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              marginTop: "18px",
            }}
          >
            <div style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 11, opacity: 0.8 }}>待解冻金额（元）</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 3 }}>
                {loading ? "--" : frozen}
              </div>
            </div>
            <div style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 11, opacity: 0.8 }}>累计总收益（元）</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 3 }}>
                {loading ? "--" : total}
              </div>
            </div>
          </div>

          {config?.unfreezeEnabled && config.unfreezeDays > 0 && (
            <div style={{ fontSize: 11, opacity: 0.75, marginTop: 10, lineHeight: 1.5 }}>
              佣金在订单支付成功后冻结，{config.unfreezeDays} 天解冻期（无退款）后转为可提现余额。
            </div>
          )}
        </div>

        {/* ===== 税务合规提示（第七章红线，固定展示） ===== */}
        <div style={noticeStyle}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#8a6d1a", marginBottom: 4 }}>
            合规提示
          </div>
          <p style={{ margin: 0, fontSize: 11, lineHeight: 1.7, color: "#a08537" }}>
            收益来源于您直接推荐的好友产生的订单佣金。收益需依法缴纳个人所得税，平台将按规定代扣代缴或由用户自行申报。
            严禁通过虚假订单、互刷等方式套取佣金，违规账号将被封禁并冻结余额。
          </p>
        </div>

        {/* ===== Tab：收益明细 / 提现记录 ===== */}
        <div style={{ display: "flex", gap: "8px", padding: "0 12px", marginBottom: "10px" }}>
          {(
            [
              { key: "records", label: "收益明细" },
              { key: "withdrawals", label: "提现记录" },
            ] as { key: TabKey; label: string }[]
          ).map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: "8px",
                backgroundColor: tab === item.key ? BRAND : "#fff",
                color: tab === item.key ? "#fff" : "#666",
                border: tab === item.key ? "none" : "1px solid #e0e0e0",
                fontSize: 14,
                fontWeight: tab === item.key ? 600 : 400,
                cursor: "pointer",
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* ===== 列表 ===== */}
        <div style={listStyle}>
          {loading ? (
            <div style={emptyStyle}>加载中...</div>
          ) : tab === "records" ? (
            records.length === 0 ? (
              <div style={{ ...emptyStyle, padding: "48px 0" }}>
                <div style={{ fontSize: "36px", marginBottom: "8px" }}>📭</div>
                <div style={{ fontSize: "14px" }}>暂无收益明细</div>
                <div style={{ fontSize: 12, color: "#bbb", marginTop: 6 }}>
                  推荐好友付费成功后，佣金将自动计入
                </div>
              </div>
            ) : (
              records.map((r) => {
                const isReversal = r.commissionYuan.startsWith("-") || r.status === "REVERSED";
                return (
                  <div key={`${r.orderNo}-${r.createdAt}`} style={itemStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: "#333" }}>
                          {isReversal ? "退款退佣" : "推荐订单佣金"}
                        </div>
                        <div style={{ fontSize: 11, color: "#999", marginTop: 3, wordBreak: "break-all" }}>
                          订单 {r.orderNo.length > 10 ? `...${r.orderNo.slice(-8)}` : r.orderNo}
                          {r.ratioPercent > 0 && ` · 订单金额 ¥${r.baseAmountYuan} · ${r.ratioPercent}%`}
                        </div>
                        <div style={{ fontSize: 11, color: "#bbb", marginTop: 3 }}>
                          {formatCommissionTime(r.createdAt)}
                          {r.status === "FROZEN" && r.unfreezeAt && (
                            <span> · 预计 {formatCommissionTime(r.unfreezeAt)} 解冻</span>
                          )}
                          {r.status === "AVAILABLE" && r.unfrozenAt && (
                            <span> · {formatCommissionTime(r.unfrozenAt)} 已到账</span>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 700,
                            color: isReversal ? "#e74c3c" : "#27ae60",
                          }}
                        >
                          {isReversal ? "" : "+"}¥{r.commissionYuan}
                        </div>
                        <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>
                          {COMMISSION_STATUS_LABELS[r.status] || r.status}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )
          ) : withdrawals.length === 0 ? (
            <div style={{ ...emptyStyle, padding: "48px 0" }}>
              <div style={{ fontSize: "36px", marginBottom: "8px" }}>💳</div>
              <div style={{ fontSize: "14px" }}>暂无提现记录</div>
            </div>
          ) : (
            withdrawals.map((w) => (
              <div key={w.withdrawNo} style={itemStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "#333" }}>
                      提现到微信零钱
                    </div>
                    <div style={{ fontSize: 11, color: "#999", marginTop: 3, wordBreak: "break-all" }}>
                      单号 {w.withdrawNo}
                    </div>
                    <div style={{ fontSize: 11, color: "#bbb", marginTop: 3 }}>
                      申请于 {formatCommissionTime(w.createdAt)}
                      {w.paidAt ? ` · ${formatCommissionTime(w.paidAt)} 到账` : ""}
                    </div>
                    {w.failReason && (
                      <div style={{ fontSize: 11, color: "#e74c3c", marginTop: 4 }}>
                        {w.status === "REJECTED" ? "驳回原因：" : "失败原因："}
                        {w.failReason}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#333" }}>
                      ¥{w.amountYuan}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        marginTop: 4,
                        color:
                          w.status === "PAID"
                            ? "#27ae60"
                            : w.status === "FAILED" || w.status === "REJECTED"
                              ? "#e74c3c"
                              : "#e67e22",
                      }}
                    >
                      {WITHDRAW_STATUS_LABELS[w.status] || w.status}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <ComplianceFooter />
      <div className="page-bottom-nav-safe" aria-hidden="true" />

      {/* ===== 提现弹窗 ===== */}
      {showWithdrawModal && (
        <WithdrawModal
          withdrawable={withdrawable}
          minWithdrawYuan={config?.minWithdrawYuan ?? 10}
          withdrawTip={config?.withdrawTip || "提现将转入绑定的微信零钱，到账时间1-3个工作日"}
          amount={withdrawAmount}
          setAmount={setWithdrawAmount}
          submitting={submitting}
          wechatEnv={isInWechatBrowser()}
          onClose={() => setShowWithdrawModal(false)}
          onSubmit={handleSubmitWithdraw}
        />
      )}

      {toast && <div style={toastStyle}>{toast}</div>}
    </div>
  );
}

// ============================ 提现弹窗 ============================
function WithdrawModal({
  withdrawable,
  minWithdrawYuan,
  withdrawTip,
  amount,
  setAmount,
  submitting,
  wechatEnv,
  onClose,
  onSubmit,
}: {
  withdrawable: string;
  minWithdrawYuan: number;
  withdrawTip: string;
  amount: string;
  setAmount: (v: string) => void;
  submitting: boolean;
  wechatEnv: boolean;
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
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1a1a1a" }}>提现申请</h3>
          <button onClick={onClose} style={closeBtnStyle}>
            ✕
          </button>
        </div>

        <div style={{ padding: 16 }}>
          {/* 可提现余额 */}
          <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>可提现余额</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: BRAND, marginBottom: 14 }}>
            ¥{withdrawable}
          </div>

          {/* 金额输入 */}
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 6 }}>
            提现金额（元）
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              borderRadius: 10,
              border: "1px solid #e0e0e0",
              padding: "10px 12px",
              marginBottom: 4,
            }}
          >
            <span style={{ fontSize: 18, fontWeight: 700, color: "#333", marginRight: 8 }}>¥</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`最低 ${minWithdrawYuan.toFixed(2)} 元`}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                fontSize: 16,
                fontFamily: "inherit",
              }}
            />
            <button
              onClick={() => setAmount(withdrawable)}
              style={{ ...linkBtnStyle, marginLeft: 8 }}
            >
              全部提现
            </button>
          </div>
          <div style={{ fontSize: 11, color: "#bbb", marginBottom: 12 }}>
            提现金额最多两位小数，最低 {minWithdrawYuan.toFixed(2)} 元
          </div>

          {/* 收款方式与提示 */}
          <div
            style={{
              backgroundColor: "#faf6ff",
              borderRadius: 10,
              padding: "10px 12px",
              marginBottom: 14,
              border: `1px solid ${BRAND}22`,
              fontSize: 11,
              color: "#666",
              lineHeight: 1.7,
            }}
          >
            <div style={{ fontWeight: 600, color: "#333", marginBottom: 4 }}>收款方式：微信零钱</div>
            {wechatEnv
              ? "将自动使用当前微信账号收款。"
              : "请在微信内打开本页面完成提现，以便自动收款到您的微信零钱。"}
            <br />
            {withdrawTip}。
          </div>

          {/* 按钮 */}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={secondaryBtnStyle}>
              取消
            </button>
            <button onClick={onSubmit} disabled={submitting} style={primaryBlockBtnStyle}>
              {submitting ? "提交中..." : "提交申请"}
            </button>
          </div>

          <p style={{ fontSize: 10, color: "#bbb", lineHeight: 1.6, margin: "12px 0 0", textAlign: "center" }}>
            提交后进入待审核状态，审核通过后将转账至微信零钱。
            收益需依法缴纳个人所得税，由平台代扣代缴或自行申报。
          </p>
        </div>
      </div>
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

// ============================ 样式常量 ============================
const pageStyle: React.CSSProperties = {
  maxWidth: "420px",
  margin: "0 auto",
  minHeight: "100vh",
  backgroundColor: "#ededed",
};

const cardStyle: React.CSSProperties = {
  margin: "12px",
  borderRadius: 16,
  background: `linear-gradient(135deg, ${BRAND}, ${BRAND}cc)`,
  color: "#fff",
  padding: "20px",
  boxSizing: "border-box",
};

const noticeStyle: React.CSSProperties = {
  margin: "0 12px 12px",
  padding: "10px 14px",
  borderRadius: 10,
  backgroundColor: "#fdf8ec",
  border: "1px solid #f0e0b8",
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

const primaryBlockBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: "11px 0",
  borderRadius: 10,
  border: "none",
  backgroundColor: BRAND,
  color: "#fff",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  opacity: 1,
};

const secondaryBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: "11px 0",
  borderRadius: 10,
  border: "1px solid #e0e0e0",
  backgroundColor: "#fff",
  color: "#666",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

const linkBtnStyle: React.CSSProperties = {
  border: "none",
  backgroundColor: "transparent",
  color: BRAND,
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  padding: "4px 8px",
};

const closeBtnStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: "50%",
  border: "none",
  background: "#f5f5f5",
  cursor: "pointer",
  fontSize: 14,
  color: "#666",
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
