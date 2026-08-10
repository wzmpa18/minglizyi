"use client";

import { useState, useCallback, useEffect } from "react";
import {
  getWalletInfo,
  getTransactions,
  getWithdrawals,
  requestWithdrawal,
  setPaymentInfo,
  formatAmount,
  formatWalletTime,
  TX_TYPE_LABELS,
  WITHDRAWAL_STATUS_LABELS,
  WALLET_CONFIG,
  type WalletData,
  type WalletTransaction,
  type WithdrawalRecord,
} from "@/lib/walletService";

/**
 * v19.9 钱包分账体系 - 前端界面组件
 *
 * 功能区域：
 * 1. 钱包概览卡片：累计收入、待结算、可提现、冻结中、已提现总额
 * 2. 交易流水列表：显示最近交易记录（类型、金额、描述、时间）
 * 3. 提现申请表单：金额输入、提现方式选择(支付宝/微信/银行卡)、账号信息输入
 * 4. 提现记录列表：显示提现历史（金额、方式、状态、时间）
 * 5. 收款信息设置：支付宝账号、微信账号、银行卡信息、收款码
 *
 * 合规声明：以上资金流水仅供参考，实际以平台结算为准
 */

// --- 主题色 ---
const BRAND = "#7B2FBE";
const BRAND_LIGHT = "#9B5ECF";
const BRAND_BG = "#f3edf7";

// --- 提现方式配置 ---
const WITHDRAW_METHODS: { key: "alipay" | "wechat" | "bank"; label: string; icon: string }[] = [
  { key: "alipay", label: "支付宝", icon: "💰" },
  { key: "wechat", label: "微信", icon: "💬" },
  { key: "bank", label: "银行卡", icon: "🏦" },
];

const METHOD_LABELS: Record<string, string> = {
  alipay: "支付宝",
  wechat: "微信",
  bank: "银行卡",
};

const METHOD_PLACEHOLDERS: Record<string, string> = {
  alipay: "请输入支付宝账号（手机号或邮箱）",
  wechat: "请输入微信号",
  bank: "请输入持卡人姓名、卡号、开户行",
};

// --- 工具函数 ---
function isIncomeType(type: string): boolean {
  return (
    type === "income" ||
    type === "distributor_l1" ||
    type === "distributor_l2" ||
    type === "withdraw_reject"
  );
}

// --- 组件 Props ---
interface WalletPanelProps {
  show: boolean;
  onClose: () => void;
}

type TabType = "overview" | "withdraw" | "payment";

export default function WalletPanel({ show, onClose }: WalletPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  // 钱包数据
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);

  // 提现表单状态
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState<"alipay" | "wechat" | "bank">("alipay");
  const [withdrawAccount, setWithdrawAccount] = useState("");

  // 收款信息状态
  const [payAlipay, setPayAlipay] = useState("");
  const [payWechat, setPayWechat] = useState("");
  const [payBank, setPayBank] = useState("");
  const [payQrcode, setPayQrcode] = useState("");

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

  // 加载钱包数据
  const loadData = useCallback(async () => {
    setLoading(true);
    const data = await getWalletInfo();
    setWalletData(data);
    if (data) {
      setTransactions(data.recentTransactions || []);
      setWithdrawals(data.recentWithdrawals || []);
      const w = data.wallet;
      setPayAlipay(w.alipayAccount || "");
      setPayWechat(w.wechatAccount || "");
      setPayBank(w.bankInfo || "");
      setPayQrcode(w.paymentQRCode || "");
    }
    setLoading(false);
  }, []);

  // 显示时首次加载数据
  useEffect(() => {
    if (show && !walletData) {
      loadData();
    }
  }, [show]); // eslint-disable-line react-hooks/exhaustive-deps

  // 提现申请
  const handleWithdraw = useCallback(async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount < WALLET_CONFIG.MIN_WITHDRAWAL) {
      showToast(`提现金额不能低于 ${WALLET_CONFIG.MIN_WITHDRAWAL} 元`);
      return;
    }
    if (!withdrawAccount.trim()) {
      showToast("请输入收款账号信息");
      return;
    }
    const available = walletData?.wallet.availableBalance || 0;
    if (amount > available) {
      showToast("提现金额不能超过可提现余额");
      return;
    }
    setLoading(true);
    const result = await requestWithdrawal(amount, withdrawMethod, withdrawAccount.trim());
    setLoading(false);
    if (result.success) {
      showToast("提现申请已提交，请等待审核");
      setWithdrawAmount("");
      setWithdrawAccount("");
      loadData();
    } else {
      showToast(result.error || "提现失败，请重试");
    }
  }, [withdrawAmount, withdrawMethod, withdrawAccount, walletData, showToast, loadData]);

  // 保存收款信息
  const handleSavePayment = useCallback(async () => {
    setLoading(true);
    const result = await setPaymentInfo({
      alipay: payAlipay.trim(),
      wechat: payWechat.trim(),
      bank: payBank.trim(),
      qrcode: payQrcode.trim(),
    });
    setLoading(false);
    if (result.success) {
      showToast("收款信息保存成功");
      loadData();
    } else {
      showToast(result.error || "保存失败，请重试");
    }
  }, [payAlipay, payWechat, payBank, payQrcode, showToast, loadData]);

  // 刷新交易流水
  const handleRefreshTransactions = useCallback(async () => {
    setLoading(true);
    const result = await getTransactions();
    setTransactions(result.transactions);
    setLoading(false);
    showToast("已刷新交易流水");
  }, [showToast]);

  // 刷新提现记录
  const handleRefreshWithdrawals = useCallback(async () => {
    setLoading(true);
    const result = await getWithdrawals();
    setWithdrawals(result.withdrawals);
    setLoading(false);
    showToast("已刷新提现记录");
  }, [showToast]);

  // 当 show 为 false 时不渲染
  if (!show) return null;

  // 钱包概览卡片数据
  const wallet = walletData?.wallet;
  const overviewCards = wallet
    ? [
        { label: "累计收入", value: wallet.totalIncome, color: "#27ae60", icon: "📈", span: 2 },
        { label: "待结算", value: wallet.pendingSettlement, color: "#f39c12", icon: "⏳", span: 1 },
        { label: "可提现", value: wallet.availableBalance, color: BRAND, icon: "💰", span: 1 },
        { label: "冻结中", value: wallet.frozenBalance, color: "#e74c3c", icon: "🔒", span: 1 },
        { label: "已提现", value: wallet.withdrawnTotal, color: "#7f8c8d", icon: "✅", span: 1 },
      ]
    : [];

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
          maxWidth: "420px",
          maxHeight: "88vh",
          backgroundColor: "#fff",
          borderTopLeftRadius: "16px",
          borderTopRightRadius: "16px",
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
            💼 我的钱包
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
            padding: "8px 12px",
            gap: 8,
            flexShrink: 0,
            borderBottom: "1px solid #f0f0f0",
            backgroundColor: BRAND_BG,
          }}
        >
          {(
            [
              { key: "overview", label: "概览" },
              { key: "withdraw", label: "提现" },
              { key: "payment", label: "收款" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                padding: "8px 0",
                border: "none",
                borderRadius: 8,
                backgroundColor: activeTab === tab.key ? BRAND : "#fff",
                color: activeTab === tab.key ? "#fff" : BRAND,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {tab.label}
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
          {loading && !walletData && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#999", fontSize: 13 }}>
              加载中...
            </div>
          )}

          {/* ==================== 概览 Tab ==================== */}
          {activeTab === "overview" && (
            <>
              {/* 钱包概览卡片 */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", marginBottom: 10 }}>
                  钱包概览
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                  }}
                >
                  {overviewCards.map((card, i) => (
                    <div
                      key={i}
                      style={{
                        backgroundColor: BRAND_BG,
                        borderRadius: 10,
                        padding: "12px",
                        gridColumn: card.span === 2 ? "1 / -1" : "auto",
                      }}
                    >
                      <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>
                        {card.icon} {card.label}
                      </div>
                      <div
                        style={{
                          fontSize: card.span === 2 ? 24 : 17,
                          fontWeight: 700,
                          color: card.color,
                        }}
                      >
                        {formatAmount(card.value)}
                      </div>
                    </div>
                  ))}
                </div>
                {/* 分账说明 */}
                <div
                  style={{
                    marginTop: 8,
                    padding: "8px 10px",
                    backgroundColor: "#fff8e1",
                    borderRadius: 8,
                    fontSize: 11,
                    color: "#e65100",
                    lineHeight: 1.6,
                  }}
                >
                  💡 平台抽成 {WALLET_CONFIG.PLATFORM_COMMISSION * 100}%，师父收入{" "}
                  {(1 - WALLET_CONFIG.PLATFORM_COMMISSION) * 100}%；结算周期{" "}
                  {WALLET_CONFIG.SETTLEMENT_DAYS} 天
                </div>
              </div>

              {/* 交易流水列表 */}
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 10,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>
                    交易流水
                  </div>
                  <button
                    onClick={handleRefreshTransactions}
                    style={{
                      border: "none",
                      backgroundColor: "transparent",
                      color: BRAND,
                      fontSize: 12,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    🔄 刷新
                  </button>
                </div>
                {transactions.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "30px 0",
                      color: "#ccc",
                      fontSize: 13,
                    }}
                  >
                    暂无交易记录
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {transactions.map((tx) => {
                      const typeInfo = TX_TYPE_LABELS[tx.type] || {
                        label: tx.type,
                        color: "#999",
                      };
                      const isIncome = isIncomeType(tx.type);
                      return (
                        <div
                          key={tx.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "10px 12px",
                            backgroundColor: "#fafafa",
                            borderRadius: 8,
                            border: "1px solid #f0f0f0",
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                marginBottom: 4,
                              }}
                            >
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "2px 8px",
                                  borderRadius: 4,
                                  fontSize: 10,
                                  fontWeight: 600,
                                  color: "#fff",
                                  backgroundColor: typeInfo.color,
                                }}
                              >
                                {typeInfo.label}
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                color: "#666",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {tx.description}
                            </div>
                            <div style={{ fontSize: 11, color: "#bbb", marginTop: 2 }}>
                              {formatWalletTime(tx.timestamp)}
                            </div>
                          </div>
                          <div
                            style={{
                              fontSize: 15,
                              fontWeight: 700,
                              color: isIncome ? "#27ae60" : "#e74c3c",
                              flexShrink: 0,
                              marginLeft: 8,
                            }}
                          >
                            {isIncome ? "+" : "-"}
                            {formatAmount(tx.amount)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ==================== 提现 Tab ==================== */}
          {activeTab === "withdraw" && (
            <>
              {/* 可提现余额展示 */}
              <div
                style={{
                  marginBottom: 16,
                  padding: "16px",
                  borderRadius: 12,
                  background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_LIGHT} 100%)`,
                  color: "#fff",
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>
                  可提现余额
                </div>
                <div style={{ fontSize: 28, fontWeight: 700 }}>
                  {formatAmount(wallet?.availableBalance || 0)}
                </div>
                <div style={{ fontSize: 11, opacity: 0.75, marginTop: 6 }}>
                  最低提现 {WALLET_CONFIG.MIN_WITHDRAWAL} 元 · 结算周期{" "}
                  {WALLET_CONFIG.SETTLEMENT_DAYS} 天
                </div>
              </div>

              {/* 提现申请表单 */}
              <div
                style={{
                  padding: "16px",
                  backgroundColor: BRAND_BG,
                  borderRadius: 12,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#1a1a1a",
                    marginBottom: 12,
                  }}
                >
                  提现申请
                </div>

                {/* 金额输入 */}
                <div style={{ marginBottom: 14 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      color: "#666",
                      marginBottom: 6,
                    }}
                  >
                    提现金额（元）
                  </label>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder={`最低 ${WALLET_CONFIG.MIN_WITHDRAWAL} 元`}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid #ddd",
                      borderRadius: 8,
                      fontSize: 16,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                  {/* 快捷金额按钮 */}
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    {[100, 500, 1000, "全部"].map((v) => (
                      <button
                        key={String(v)}
                        onClick={() => {
                          if (v === "全部") {
                            setWithdrawAmount(String(wallet?.availableBalance || 0));
                          } else {
                            setWithdrawAmount(String(v));
                          }
                        }}
                        style={{
                          flex: 1,
                          padding: "6px 0",
                          border: "1px solid #ddd",
                          borderRadius: 6,
                          backgroundColor: "#fff",
                          color: BRAND,
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        {v === "全部" ? "全部" : `¥${v}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 提现方式选择（按钮组） */}
                <div style={{ marginBottom: 14 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      color: "#666",
                      marginBottom: 6,
                    }}
                  >
                    提现方式
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {WITHDRAW_METHODS.map((m) => (
                      <button
                        key={m.key}
                        onClick={() => setWithdrawMethod(m.key)}
                        style={{
                          flex: 1,
                          padding: "10px 0",
                          border:
                            withdrawMethod === m.key
                              ? `2px solid ${BRAND}`
                              : "2px solid #ddd",
                          borderRadius: 8,
                          backgroundColor:
                            withdrawMethod === m.key ? BRAND_BG : "#fff",
                          color: withdrawMethod === m.key ? BRAND : "#666",
                          fontSize: 13,
                          fontWeight: withdrawMethod === m.key ? 600 : 400,
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 2,
                        }}
                      >
                        <span style={{ fontSize: 18 }}>{m.icon}</span>
                        <span>{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 收款账号输入 */}
                <div style={{ marginBottom: 14 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      color: "#666",
                      marginBottom: 6,
                    }}
                  >
                    收款账号信息
                  </label>
                  <input
                    type="text"
                    value={withdrawAccount}
                    onChange={(e) => setWithdrawAccount(e.target.value)}
                    placeholder={METHOD_PLACEHOLDERS[withdrawMethod]}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid #ddd",
                      borderRadius: 8,
                      fontSize: 14,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                {/* 提交按钮 */}
                <button
                  onClick={handleWithdraw}
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "12px 0",
                    border: "none",
                    borderRadius: 8,
                    backgroundColor: loading ? "#ccc" : BRAND,
                    color: "#fff",
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                >
                  {loading ? "提交中..." : "提交提现申请"}
                </button>
              </div>

              {/* 提现记录列表 */}
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 10,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>
                    提现记录
                  </div>
                  <button
                    onClick={handleRefreshWithdrawals}
                    style={{
                      border: "none",
                      backgroundColor: "transparent",
                      color: BRAND,
                      fontSize: 12,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    🔄 刷新
                  </button>
                </div>
                {withdrawals.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "30px 0",
                      color: "#ccc",
                      fontSize: 13,
                    }}
                  >
                    暂无提现记录
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {withdrawals.map((wd) => {
                      const statusInfo = WITHDRAWAL_STATUS_LABELS[wd.status] || {
                        label: wd.status,
                        color: "#999",
                      };
                      return (
                        <div
                          key={wd.id}
                          style={{
                            padding: "10px 12px",
                            backgroundColor: "#fafafa",
                            borderRadius: 8,
                            border: "1px solid #f0f0f0",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              marginBottom: 6,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 16,
                                fontWeight: 700,
                                color: "#1a1a1a",
                              }}
                            >
                              {formatAmount(wd.amount)}
                            </span>
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: 4,
                                fontSize: 10,
                                fontWeight: 600,
                                color: "#fff",
                                backgroundColor: statusInfo.color,
                              }}
                            >
                              {statusInfo.label}
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: 12,
                              fontSize: 11,
                              color: "#999",
                            }}
                          >
                            <span>方式：{METHOD_LABELS[wd.method] || wd.method}</span>
                            <span>申请：{formatWalletTime(wd.requestedAt)}</span>
                          </div>
                          {wd.processedAt && (
                            <div
                              style={{
                                fontSize: 11,
                                color: "#999",
                                marginTop: 2,
                              }}
                            >
                              处理：{formatWalletTime(wd.processedAt)}
                            </div>
                          )}
                          {wd.adminNote && (
                            <div
                              style={{
                                fontSize: 11,
                                color: "#e74c3c",
                                marginTop: 4,
                              }}
                            >
                              备注：{wd.adminNote}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ==================== 收款 Tab ==================== */}
          {activeTab === "payment" && (
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#1a1a1a",
                  marginBottom: 12,
                }}
              >
                收款信息设置
              </div>
              <div
                style={{
                  padding: "16px",
                  backgroundColor: BRAND_BG,
                  borderRadius: 12,
                }}
              >
                {/* 支付宝账号 */}
                <div style={{ marginBottom: 16 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      color: "#666",
                      marginBottom: 6,
                    }}
                  >
                    💰 支付宝账号
                  </label>
                  <input
                    type="text"
                    value={payAlipay}
                    onChange={(e) => setPayAlipay(e.target.value)}
                    placeholder="请输入支付宝账号（手机号或邮箱）"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid #ddd",
                      borderRadius: 8,
                      fontSize: 14,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                {/* 微信账号 */}
                <div style={{ marginBottom: 16 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      color: "#666",
                      marginBottom: 6,
                    }}
                  >
                    💬 微信号
                  </label>
                  <input
                    type="text"
                    value={payWechat}
                    onChange={(e) => setPayWechat(e.target.value)}
                    placeholder="请输入微信号"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid #ddd",
                      borderRadius: 8,
                      fontSize: 14,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                {/* 银行卡信息 */}
                <div style={{ marginBottom: 16 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      color: "#666",
                      marginBottom: 6,
                    }}
                  >
                    🏦 银行卡信息
                  </label>
                  <textarea
                    value={payBank}
                    onChange={(e) => setPayBank(e.target.value)}
                    placeholder="请输入持卡人姓名、卡号、开户行信息"
                    rows={3}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid #ddd",
                      borderRadius: 8,
                      fontSize: 14,
                      outline: "none",
                      boxSizing: "border-box",
                      resize: "none",
                      fontFamily: "inherit",
                    }}
                  />
                </div>

                {/* 收款码 */}
                <div style={{ marginBottom: 16 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      color: "#666",
                      marginBottom: 6,
                    }}
                  >
                    📱 收款码（图片链接或 Base64）
                  </label>
                  <input
                    type="text"
                    value={payQrcode}
                    onChange={(e) => setPayQrcode(e.target.value)}
                    placeholder="请输入收款码图片链接或 Base64 编码"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid #ddd",
                      borderRadius: 8,
                      fontSize: 14,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                  {payQrcode && (
                    <div
                      style={{
                        marginTop: 8,
                        textAlign: "center",
                        padding: "8px",
                        backgroundColor: "#fff",
                        borderRadius: 8,
                        border: "1px solid #eee",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={payQrcode}
                        alt="收款码预览"
                        style={{
                          maxWidth: "160px",
                          maxHeight: "160px",
                          borderRadius: 4,
                        }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* 保存按钮 */}
                <button
                  onClick={handleSavePayment}
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "12px 0",
                    border: "none",
                    borderRadius: 8,
                    backgroundColor: loading ? "#ccc" : BRAND,
                    color: "#fff",
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                >
                  {loading ? "保存中..." : "保存收款信息"}
                </button>
              </div>
            </div>
          )}
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
          }}
        >
          ⚠️ 以上资金流水仅供参考，实际以平台结算为准
        </div>

        {/* Toast 提示 */}
        {toast && (
          <div
            style={{
              position: "absolute",
              bottom: 50,
              left: "50%",
              transform: "translateX(-50%)",
              padding: "8px 16px",
              backgroundColor: "rgba(0,0,0,0.8)",
              color: "#fff",
              borderRadius: 8,
              fontSize: 13,
              whiteSpace: "nowrap",
              zIndex: 10000,
            }}
          >
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
