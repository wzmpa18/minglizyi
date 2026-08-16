"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { BrandHeader } from "@/components/shared";
import { getUserProfile } from "@/lib/auth";
import { useRequireLogin } from "@/lib/useRequireLogin";
import { LoginPromptModal } from "@/components/LoginPromptModal";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { usePopupBackHandler } from "@/hooks/usePopupBackHandler";

const BRAND = "#7B2FBE";

// ==================== 类型定义 ====================
type TxType = "income" | "withdraw" | "rebate";

interface Transaction {
  id: string;
  type: TxType;
  amount: number;          // 正数=收入，负数=支出
  desc: string;            // 描述
  createdAt: string;       // ISO 时间
  status?: "pending" | "success" | "failed"; // 提现状态
}

interface WalletData {
  balance: number;         // 可提现余额
  totalIncome: number;     // 累计收入
  frozenAmount: number;    // 冻结/提现中金额
  transactions: Transaction[];
  payAccount: PayAccount | null; // 收款账户配置
}

interface PayAccount {
  type: "wechat" | "alipay" | "bank";
  name: string;            // 持有人姓名（脱敏展示）
  account: string;         // 账号（脱敏展示）
}

// 提现渠道
type WithdrawalChannel = "wechat" | "alipay" | "bank";
// 提现状态
type WithdrawalStatus = "pending" | "processing" | "completed" | "rejected";

// 提现记录
interface WithdrawalRecord {
  id: string;          // WD + 时间戳
  amount: number;
  channel: WithdrawalChannel;
  accountInfo: string;  // 脱敏账户信息
  status: WithdrawalStatus;
  requestedAt: string;  // ISO 时间
  processedAt: string | null;
  adminNote: string;
}

// ==================== 本地存储逻辑（架构预留对接位） ====================
const WALLET_KEY = "yandao_wallet_data";
const PAY_ACCOUNT_KEY = "yandao_wallet_pay_account";
const WITHDRAWALS_KEY = "yandao_withdrawals";

function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeSet<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function getWalletData(): WalletData {
  // 从本地存储读取真实数据，无数据则返回空状态（后续对接后端接口）
  const data = safeGet<WalletData | null>(WALLET_KEY, null);
  if (data) {
    // 同步收款账户
    data.payAccount = safeGet<PayAccount | null>(PAY_ACCOUNT_KEY, null);
    return data;
  }
  return {
    balance: 0,
    totalIncome: 0,
    frozenAmount: 0,
    transactions: [],
    payAccount: safeGet<PayAccount | null>(PAY_ACCOUNT_KEY, null),
  };
}

function saveWalletData(data: WalletData): void {
  safeSet(WALLET_KEY, data);
}

// ==================== 提现记录存储 ====================
function getWithdrawals(): WithdrawalRecord[] {
  // 从本地存储读取真实数据，无数据则返回空列表（后续对接后端接口）
  return safeGet<WithdrawalRecord[]>(WITHDRAWALS_KEY, []);
}

function saveWithdrawals(records: WithdrawalRecord[]): void {
  safeSet(WITHDRAWALS_KEY, records);
}

// ==================== 工具函数 ====================
function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return iso;
  }
}

// 姓名脱敏：张三 → 张*
function maskName(name: string): string {
  if (!name) return "";
  return name[0] + "*".repeat(Math.max(1, name.length - 1));
}

// 账号脱敏：保留首尾，中间用 * 代替
function maskAccountNumber(s: string): string {
  if (!s) return "";
  if (s.length <= 2) return s[0] + "*";
  if (s.length <= 6) return s.slice(0, 1) + "***" + s.slice(-1);
  if (s.length <= 11) return s.slice(0, 3) + "****" + s.slice(-2);
  return s.slice(0, 4) + "****" + s.slice(-4);
}

// 判断微信是否已绑定（通过微信授权登录的用户 userId 以 WX 开头）
function isWechatBound(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const profile = getUserProfile();
    return !!profile?.userId && profile.userId.startsWith("WX");
  } catch {
    return false;
  }
}

const TX_TYPE_MAP: Record<TxType, { label: string; color: string; icon: React.ReactNode }> = {
  income: {
    label: "奖励收入",
    color: "#27ae60",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  rebate: {
    label: "消费返佣",
    color: "#27ae60",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
        <path d="M4 6v12a2 2 0 0 0 2 2h14v-4" />
        <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
      </svg>
    ),
  },
  withdraw: {
    label: "提现",
    color: "#e67e22",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19V5M5 12l7 7 7-7" />
      </svg>
    ),
  },
};

const PAY_TYPE_MAP: Record<PayAccount["type"], { label: string; icon: string }> = {
  wechat: { label: "微信", icon: "#09BB07" },
  alipay: { label: "支付宝", icon: "#1677FF" },
  bank: { label: "银行卡", icon: "#E74C3C" },
};

// 提现渠道配置
const CHANNEL_MAP: Record<WithdrawalChannel, { label: string; color: string }> = {
  wechat: { label: "微信", color: "#09BB07" },
  alipay: { label: "支付宝", color: "#1677FF" },
  bank: { label: "银行卡", color: "#E74C3C" },
};

// 提现状态配置
const WITHDRAWAL_STATUS_MAP: Record<WithdrawalStatus, { label: string; color: string; bg: string }> = {
  pending: { label: "待审核", color: "#f39c12", bg: "#fef3e7" },
  processing: { label: "处理中", color: "#3498db", bg: "#e7f3fe" },
  completed: { label: "已到账", color: "#27ae60", bg: "#e7f7ed" },
  rejected: { label: "已驳回", color: "#e74c3c", bg: "#fdecea" },
};

// ==================== 主页面 ====================
export default function WalletPage() {
  const router = useRouter();
  const { requireLogin, showLoginPrompt, setShowLoginPrompt } = useRequireLogin();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showPayConfig, setShowPayConfig] = useState(false);
  const [wechatBound, setWechatBound] = useState(false);

  // 提现表单
  const [withdrawChannel, setWithdrawChannel] = useState<WithdrawalChannel>("alipay");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  // 收款账户信息（按渠道动态填写）
  const [acctName, setAcctName] = useState("");          // 支付宝姓名 / 开户人姓名
  const [acctAccount, setAcctAccount] = useState("");    // 支付宝账号
  const [bankName, setBankName] = useState("");          // 开户行
  const [bankCard, setBankCard] = useState("");          // 银行卡号

  // 收款账户配置表单（既有）
  const [payType, setPayType] = useState<PayAccount["type"]>("wechat");
  const [payName, setPayName] = useState("");
  const [payAccount, setPayAccountInput] = useState("");

  // P1-6/P1-7: 提现弹窗滚动锁 + 返回拦截
  useBodyScrollLock(showWithdraw);
  usePopupBackHandler(() => setShowWithdraw(false), showWithdraw);

  useEffect(() => {
    setWallet(getWalletData());
    setWithdrawals(getWithdrawals());
    setWechatBound(isWechatBound());
  }, []);

  // 切换提现渠道时清空账户信息，避免残留
  const handleChannelChange = (ch: WithdrawalChannel) => {
    setWithdrawChannel(ch);
    setAcctName("");
    setAcctAccount("");
    setBankName("");
    setBankCard("");
  };

  // 提交提现申请
  const handleWithdraw = () => {
    if (!wallet) return;
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      alert("请输入有效的提现金额");
      return;
    }
    if (amount < 100) {
      alert("最低提现金额为 100 元");
      return;
    }
    if (amount > wallet.balance) {
      alert("提现金额不能超过可提现余额");
      return;
    }

    // 按渠道校验并组装脱敏账户信息
    let accountInfo = "";
    if (withdrawChannel === "wechat") {
      if (!wechatBound) {
        alert("微信未绑定，无法提现到微信");
        return;
      }
      accountInfo = "微信零钱";
    } else if (withdrawChannel === "alipay") {
      if (!acctName.trim() || !acctAccount.trim()) {
        alert("请填写完整的支付宝收款信息");
        return;
      }
      accountInfo = `${maskName(acctName.trim())} ${maskAccountNumber(acctAccount.trim())}`;
    } else {
      // bank 银行卡
      if (!acctName.trim() || !bankName.trim() || !bankCard.trim()) {
        alert("请填写完整的银行卡信息（开户人姓名、开户行、银行卡号）");
        return;
      }
      accountInfo = `${maskName(acctName.trim())} ${bankName.trim()} ${maskAccountNumber(bankCard.trim())}`;
    }

    // 生成提现订单号
    const id = `WD${Date.now()}`;
    const record: WithdrawalRecord = {
      id,
      amount,
      channel: withdrawChannel,
      accountInfo,
      status: "pending",
      requestedAt: new Date().toISOString(),
      processedAt: null,
      adminNote: "",
    };

    // 保存提现记录
    const updatedWithdrawals = [record, ...withdrawals];
    saveWithdrawals(updatedWithdrawals);
    setWithdrawals(updatedWithdrawals);

    // 同步收支明细与余额
    const newTx: Transaction = {
      id: `tx_${Date.now()}`,
      type: "withdraw",
      amount: -amount,
      desc: `提现到${CHANNEL_MAP[withdrawChannel].label}`,
      createdAt: new Date().toISOString(),
      status: "pending",
    };
    const updated: WalletData = {
      ...wallet,
      balance: Math.round((wallet.balance - amount) * 100) / 100,
      frozenAmount: Math.round((wallet.frozenAmount + amount) * 100) / 100,
      transactions: [newTx, ...wallet.transactions],
    };
    saveWalletData(updated);
    setWallet(updated);

    // 重置表单
    setWithdrawAmount("");
    setAcctName("");
    setAcctAccount("");
    setBankName("");
    setBankCard("");
    setShowWithdraw(false);
    alert(`提现申请已提交\n订单号：${id}\n状态：待审核\n预计 T+1 工作日到账`);
  };

  // 保存收款账户（既有逻辑，保持不变）
  const handleSavePayAccount = () => {
    if (!payName.trim() || !payAccount.trim()) {
      alert("请填写完整收款信息");
      return;
    }
    const account: PayAccount = { type: payType, name: payName.trim(), account: payAccount.trim() };
    safeSet(PAY_ACCOUNT_KEY, account);
    if (wallet) {
      setWallet({ ...wallet, payAccount: account });
    }
    setShowPayConfig(false);
    setPayName("");
    setPayAccountInput("");
    alert("收款账户已保存");
  };

  if (!wallet) {
    return (
      <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5", display: "flex", flexDirection: "column" }}>
        <BrandHeader title="我的钱包" showBack backUrl="/profile" />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ color: "#999", fontSize: 15 }}>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5", display: "flex", flexDirection: "column" }}>
      <BrandHeader title="我的钱包" showBack backUrl="/profile" />

      <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
        {/* ===== 余额卡片 ===== */}
        <div
          style={{
            background: `linear-gradient(135deg, ${BRAND} 0%, #9B59B6 100%)`,
            borderRadius: 12,
            padding: "20px 16px",
            marginBottom: 12,
            color: "#fff",
            boxShadow: "0 2px 8px rgba(123,47,190,0.25)",
          }}
        >
          <div style={{ fontSize: 13, opacity: 0.85 }}>可提现余额（元）</div>
          <div style={{ fontSize: 34, fontWeight: 700, marginTop: 4 }}>{wallet.balance.toFixed(2)}</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.2)" }}>
            <div>
              <div style={{ fontSize: 11, opacity: 0.85 }}>累计收入</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>¥{wallet.totalIncome.toFixed(2)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, opacity: 0.85 }}>提现中</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>¥{wallet.frozenAmount.toFixed(2)}</div>
            </div>
            <button
              onClick={() => {
                if (!requireLogin()) return;
                setShowWithdraw(true);
              }}
              style={{
                padding: "8px 22px",
                borderRadius: 20,
                border: "none",
                backgroundColor: "#fff",
                color: BRAND,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              提现
            </button>
          </div>
        </div>

        {/* ===== 收款账户配置 ===== */}
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            marginBottom: 12,
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            overflow: "hidden",
          }}
        >
          <button
            onClick={() => setShowPayConfig(true)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "14px 16px",
              border: "none",
              backgroundColor: "transparent",
              cursor: "pointer",
            }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: "#f5f0fa", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#333" }}>收款账户</div>
              <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>
                {wallet.payAccount
                  ? `${PAY_TYPE_MAP[wallet.payAccount.type].label} · ${wallet.payAccount.name} · ${wallet.payAccount.account}`
                  : "未配置，点击去设置"}
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* ===== 收支明细 ===== */}
        <div style={{ backgroundColor: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#333" }}>收支明细</span>
          </div>
          {wallet.transactions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#bbb", fontSize: 14 }}>暂无收支记录</div>
          ) : (
            wallet.transactions.map((tx, idx) => {
              const t = TX_TYPE_MAP[tx.type];
              const isIncome = tx.amount > 0;
              return (
                <div
                  key={tx.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 16px",
                    borderBottom: idx === wallet.transactions.length - 1 ? "none" : "1px solid #f5f5f5",
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: "#f7f7f7", display: "flex", alignItems: "center", justifyContent: "center", color: t.color, flexShrink: 0 }}>
                    {t.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, color: "#333", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {tx.desc}
                    </div>
                    <div style={{ fontSize: 11, color: "#bbb", marginTop: 3, display: "flex", gap: 8, alignItems: "center" }}>
                      <span>{formatTime(tx.createdAt)}</span>
                      {tx.status === "pending" && (
                        <span style={{ color: "#e67e22", backgroundColor: "#fef3e7", padding: "0 6px", borderRadius: 8, fontSize: 10 }}>处理中</span>
                      )}
                      {tx.status === "failed" && (
                        <span style={{ color: "#e74c3c", backgroundColor: "#fdecea", padding: "0 6px", borderRadius: 8, fontSize: 10 }}>失败</span>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: isIncome ? "#27ae60" : "#333", flexShrink: 0, whiteSpace: "nowrap" }}>
                    {isIncome ? "+" : ""}{tx.amount.toFixed(2)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ===== 提现记录 ===== */}
        <div style={{ backgroundColor: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginTop: 12 }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#333" }}>提现记录</span>
          </div>
          {withdrawals.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#bbb", fontSize: 14 }}>暂无提现记录</div>
          ) : (
            withdrawals.map((w, idx) => {
              const ch = CHANNEL_MAP[w.channel];
              const st = WITHDRAWAL_STATUS_MAP[w.status];
              return (
                <div
                  key={w.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 16px",
                    borderBottom: idx === withdrawals.length - 1 ? "none" : "1px solid #f5f5f5",
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: "#f7f7f7", display: "flex", alignItems: "center", justifyContent: "center", color: ch.color, flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 19V5M5 12l7 7 7-7" />
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "#333", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {w.id}
                    </div>
                    <div style={{ fontSize: 11, color: "#bbb", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ch.label} · {w.accountInfo}
                    </div>
                    <div style={{ fontSize: 11, color: "#bbb", marginTop: 2 }}>{formatTime(w.requestedAt)}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0, whiteSpace: "nowrap" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#333" }}>¥{w.amount.toFixed(2)}</div>
                    <span style={{ display: "inline-block", marginTop: 4, color: st.color, backgroundColor: st.bg, padding: "2px 8px", borderRadius: 8, fontSize: 10, fontWeight: 500 }}>
                      {st.label}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <p style={{ fontSize: 11, color: "#bbb", textAlign: "center", marginTop: 16, lineHeight: 1.7 }}>
          收益来源于邀请好友消费返佣，详见团队页<br />提现最低金额 100 元，T+1 工作日到账
        </p>

        {/* 合规提示 */}
        <div style={{ fontSize: 11, color: "#999", textAlign: "center", marginTop: 8, marginBottom: 12, lineHeight: 1.7, padding: "10px 12px", backgroundColor: "#fff", borderRadius: 8, border: "1px solid #f0f0f0" }}>
          提现申请提交后，T+1工作日到账。资金转账由后台人工处理，确保安全合规。
        </div>
      </div>

      <div className="page-bottom-nav-safe" aria-hidden="true" />

      {/* ===== 提现弹窗（多渠道） ===== */}
      {showWithdraw && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)", padding: 16 }} onClick={() => setShowWithdraw(false)}>
          <div
            style={{ width: "100%", maxWidth: 320, backgroundColor: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.15)", maxHeight: "85vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#333", margin: 0 }}>申请提现</h3>
              <button onClick={() => setShowWithdraw(false)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#999", padding: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* 步骤1：选择提现方式 */}
            <div style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>选择提现方式</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {/* 微信 */}
              <button
                onClick={() => wechatBound && handleChannelChange("wechat")}
                disabled={!wechatBound}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 10,
                  border: withdrawChannel === "wechat" ? `1.5px solid ${BRAND}` : "1.5px solid #e0e0e0",
                  backgroundColor: withdrawChannel === "wechat" ? "#f5f0fa" : wechatBound ? "transparent" : "#f9f9f9",
                  color: withdrawChannel === "wechat" ? BRAND : wechatBound ? "#666" : "#ccc",
                  fontSize: 12,
                  fontWeight: withdrawChannel === "wechat" ? 600 : 400,
                  cursor: wechatBound ? "pointer" : "not-allowed",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <span>微信</span>
                {!wechatBound && <span style={{ fontSize: 10 }}>未绑定</span>}
              </button>
              {/* 支付宝 */}
              <button
                onClick={() => handleChannelChange("alipay")}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 10,
                  border: withdrawChannel === "alipay" ? `1.5px solid ${BRAND}` : "1.5px solid #e0e0e0",
                  backgroundColor: withdrawChannel === "alipay" ? "#f5f0fa" : "transparent",
                  color: withdrawChannel === "alipay" ? BRAND : "#666",
                  fontSize: 12,
                  fontWeight: withdrawChannel === "alipay" ? 600 : 400,
                  cursor: "pointer",
                }}
              >
                支付宝
              </button>
              {/* 银行卡 */}
              <button
                onClick={() => handleChannelChange("bank")}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 10,
                  border: withdrawChannel === "bank" ? `1.5px solid ${BRAND}` : "1.5px solid #e0e0e0",
                  backgroundColor: withdrawChannel === "bank" ? "#f5f0fa" : "transparent",
                  color: withdrawChannel === "bank" ? BRAND : "#666",
                  fontSize: 12,
                  fontWeight: withdrawChannel === "bank" ? 600 : 400,
                  cursor: "pointer",
                }}
              >
                银行卡
              </button>
            </div>

            {/* 步骤2：输入金额 */}
            <div style={{ fontSize: 12, color: "#999", marginBottom: 6 }}>可提现余额 ¥{wallet.balance.toFixed(2)}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, borderBottom: `1.5px solid ${BRAND}`, paddingBottom: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 20, color: "#333" }}>¥</span>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0.00"
                style={{ flex: 1, border: "none", outline: "none", fontSize: 28, fontWeight: 700, color: "#333", backgroundColor: "transparent" }}
              />
            </div>
            <div style={{ fontSize: 11, color: "#bbb", marginBottom: 16 }}>最低提现金额 ¥100</div>

            {/* 步骤3：填写账户信息（按渠道动态展示） */}
            {withdrawChannel === "wechat" && (
              <div style={{ fontSize: 12, color: BRAND, marginBottom: 16, padding: "10px 12px", backgroundColor: "#f5f0fa", borderRadius: 8, lineHeight: 1.6 }}>
                提现至已绑定的微信零钱
              </div>
            )}
            {withdrawChannel === "alipay" && (
              <>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: 13, color: "#666", marginBottom: 6 }}>姓名</label>
                  <input
                    type="text"
                    value={acctName}
                    onChange={(e) => setAcctName(e.target.value)}
                    placeholder="请输入支付宝实名姓名"
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #e0e0e0", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 13, color: "#666", marginBottom: 6 }}>支付宝账号</label>
                  <input
                    type="text"
                    value={acctAccount}
                    onChange={(e) => setAcctAccount(e.target.value)}
                    placeholder="请输入支付宝账号（手机号或邮箱）"
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #e0e0e0", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              </>
            )}
            {withdrawChannel === "bank" && (
              <>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: 13, color: "#666", marginBottom: 6 }}>开户人姓名</label>
                  <input
                    type="text"
                    value={acctName}
                    onChange={(e) => setAcctName(e.target.value)}
                    placeholder="请输入开户人姓名"
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #e0e0e0", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: 13, color: "#666", marginBottom: 6 }}>开户行</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="如：中国工商银行"
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #e0e0e0", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 13, color: "#666", marginBottom: 6 }}>银行卡号</label>
                  <input
                    type="text"
                    value={bankCard}
                    onChange={(e) => setBankCard(e.target.value)}
                    placeholder="请输入银行卡号"
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #e0e0e0", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              </>
            )}

            {/* T+1 到账提示 */}
            <div style={{ fontSize: 11, color: "#e67e22", backgroundColor: "#fef3e7", padding: "8px 12px", borderRadius: 8, marginBottom: 16, lineHeight: 1.6 }}>
              T+1 到账提示：提现申请提交后，资金将在 1 个工作日内到账。
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setShowWithdraw(false)}
                style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", backgroundColor: "#f0f0f0", color: "#666", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
              >
                取消
              </button>
              <button
                onClick={handleWithdraw}
                style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", backgroundColor: BRAND, color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
              >
                确认提现
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 收款账户配置弹窗 ===== */}
      {showPayConfig && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)", padding: 24 }} onClick={() => setShowPayConfig(false)}>
          <div style={{ width: "100%", maxWidth: 320, backgroundColor: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#333", margin: 0 }}>收款账户配置</h3>
              <button onClick={() => setShowPayConfig(false)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#999", padding: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* 账户类型选择 */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {(Object.keys(PAY_TYPE_MAP) as PayAccount["type"][]).map((t) => (
                <button
                  key={t}
                  onClick={() => setPayType(t)}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    borderRadius: 10,
                    border: payType === t ? `1.5px solid ${BRAND}` : "1.5px solid #e0e0e0",
                    backgroundColor: payType === t ? "#f5f0fa" : "transparent",
                    color: payType === t ? BRAND : "#666",
                    fontSize: 13,
                    fontWeight: payType === t ? 600 : 400,
                    cursor: "pointer",
                  }}
                >
                  {PAY_TYPE_MAP[t].label}
                </button>
              ))}
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 13, color: "#666", marginBottom: 6 }}>持有人姓名</label>
              <input
                type="text"
                value={payName}
                onChange={(e) => setPayName(e.target.value)}
                placeholder="请输入姓名"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #e0e0e0", fontSize: 14, outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, color: "#666", marginBottom: 6 }}>
                {payType === "wechat" ? "微信号/手机号" : payType === "alipay" ? "支付宝账号" : "银行卡号"}
              </label>
              <input
                type="text"
                value={payAccount}
                onChange={(e) => setPayAccountInput(e.target.value)}
                placeholder={`请输入${PAY_TYPE_MAP[payType].label}账号`}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #e0e0e0", fontSize: 14, outline: "none", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setShowPayConfig(false)}
                style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", backgroundColor: "#f0f0f0", color: "#666", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
              >
                取消
              </button>
              <button
                onClick={handleSavePayAccount}
                style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", backgroundColor: BRAND, color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      <LoginPromptModal show={showLoginPrompt} onClose={() => setShowLoginPrompt(false)} />
    </div>
  );
}
