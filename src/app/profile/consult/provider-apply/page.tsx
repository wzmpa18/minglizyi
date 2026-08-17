"use client";

// ============================================================================
// 真人咨询服务者工作台（言道精选 consult 类目）- P6-TOOL-04 §3.3
// 入驻申请（身份/收款/类目三要素）→ 平台审核 → 上架服务 → 接单交付 → 结算提现。
// 全链路复用 consultServiceStore + 统一配置 toolConfigStore.consult + 钱包体系。
// ============================================================================

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandHeader } from "@/components/shared";
import {
  applyConsultProvider,
  getMyProvider,
  listConsultServices,
  listConsultOrders,
  publishConsultService,
  setConsultServiceStatus,
  acceptConsultOrder,
  deliverConsultOrder,
  runConsultMaintenance,
  type ConsultProvider,
  type ConsultService,
  type ConsultOrder,
} from "@/lib/consultServiceStore";
import { getToolConfig } from "@/lib/toolConfigStore";
import { getUserProfile } from "@/lib/auth";
import { useRequireLogin } from "@/lib/useRequireLogin";
import { LoginPromptModal } from "@/components/LoginPromptModal";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { usePopupBackHandler } from "@/hooks/usePopupBackHandler";

const BRAND = "#B9770E";

const DELIVERY_FORM_LABEL: Record<ConsultService["deliveryForm"], string> = {
  text: "图文报告",
  voice: "语音沟通",
  video: "视频沟通",
  offline: "线下当面",
};

const ORDER_STATUS_META: Record<ConsultOrder["status"], { label: string; color: string }> = {
  paid: { label: "待接单", color: "#B9770E" },
  accepted: { label: "服务中", color: "#2471A3" },
  delivered: { label: "待买家确认", color: "#1E8E5A" },
  confirmed: { label: "结算中", color: "#7B2FBE" },
  settled: { label: "已结算", color: "#27ae60" },
  after_selling: { label: "售后处理中", color: "#e67e22" },
  refunded: { label: "已退款", color: "#e74c3c" },
  cancelled: { label: "已取消", color: "#95a5a6" },
};

function getCurrentUserId(): string {
  const profile = getUserProfile();
  if (profile?.userId) return profile.userId;
  if (typeof window !== "undefined") {
    return localStorage.getItem("yandao_user_id") || localStorage.getItem("profile_userid") || "YD000000";
  }
  return "YD000000";
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #e5e5e5",
  borderRadius: 10,
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
  backgroundColor: "#fff",
};
const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "#555",
  marginBottom: 5,
};

export default function ProviderApplyPage() {
  const router = useRouter();
  const { requireLogin, showLoginPrompt, setShowLoginPrompt } = useRequireLogin();

  const [mounted, setMounted] = useState(false);
  const [cfgEnabled, setCfgEnabled] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState(10);
  const [maxPrice, setMaxPrice] = useState(2999);
  const [feeRate, setFeeRate] = useState(0.15);
  const [settleDays, setSettleDays] = useState(7);
  const [maxDeliveryDays, setMaxDeliveryDays] = useState(7);
  const [entryAuditRequired, setEntryAuditRequired] = useState(true);
  const [provider, setProvider] = useState<ConsultProvider | null>(null);
  const [myServices, setMyServices] = useState<ConsultService[]>([]);
  const [myOrders, setMyOrders] = useState<ConsultOrder[]>([]);
  const [tab, setTab] = useState<"services" | "orders">("services");

  // 入驻表单
  const [fNickname, setFNickname] = useState("");
  const [fCategory, setFCategory] = useState("");
  const [fExpertise, setFExpertise] = useState("");
  const [fBio, setFBio] = useState("");
  const [fRealName, setFRealName] = useState("");
  const [fIdLast4, setFIdLast4] = useState("");
  const [fAlipay, setFAlipay] = useState("");
  const [fWechat, setFWechat] = useState("");
  const [fBank, setFBank] = useState("");
  const [applying, setApplying] = useState(false);

  // 上架表单
  const [showPublish, setShowPublish] = useState(false);
  const [pTitle, setPTitle] = useState("");
  const [pScope, setPScope] = useState("");
  const [pForm, setPForm] = useState<ConsultService["deliveryForm"]>("text");
  const [pPrice, setPPrice] = useState("");
  const [pDays, setPDays] = useState("3");
  const [pRefund, setPRefund] = useState("未交付全额退款；交付后7天内与描述严重不符可申请售后仲裁。");
  const [publishing, setPublishing] = useState(false);

  // 交付弹窗
  const [deliverOrder, setDeliverOrder] = useState<ConsultOrder | null>(null);
  const [deliverContent, setDeliverContent] = useState("");
  const [delivering, setDelivering] = useState(false);

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2600);
  }, []);

  useBodyScrollLock(!!deliverOrder);
  usePopupBackHandler(() => setDeliverOrder(null), !!deliverOrder);

  const refresh = useCallback(() => {
    const cfg = getToolConfig().consult;
    setCfgEnabled(cfg.enabled);
    setCategories(cfg.categories && cfg.categories.length > 0 ? cfg.categories : ["综合文化咨询"]);
    setMinPrice(cfg.minPrice);
    setMaxPrice(cfg.maxPrice);
    setFeeRate(cfg.platformFeeRate);
    setSettleDays(cfg.settleDays);
    setMaxDeliveryDays(cfg.maxDeliveryDays);
    setEntryAuditRequired(cfg.entryAuditRequired);
    const userId = getCurrentUserId();
    const p = getMyProvider(userId);
    setProvider(p);
    setMyServices(p ? listConsultServices({ providerId: p.id }) : []);
    setMyOrders(p ? listConsultOrders({ providerId: p.id }) : []);
  }, []);

  useEffect(() => {
    setMounted(true);
    runConsultMaintenance();
    refresh();
  }, [refresh]);

  if (!mounted) {
    return (
      <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
        <BrandHeader title="服务者工作台" showBack />
      </div>
    );
  }

  const handleApply = () => {
    if (!requireLogin()) return;
    setApplying(true);
    try {
      const res = applyConsultProvider({
        userId: getCurrentUserId(),
        nickname: fNickname,
        category: fCategory,
        expertise: fExpertise.split(/[,，、\s]+/).filter(Boolean),
        bio: fBio,
        realName: fRealName,
        idCardLast4: fIdLast4,
        payoutAlipay: fAlipay || undefined,
        payoutWechat: fWechat || undefined,
        payoutBank: fBank || undefined,
      });
      showToast(res.message, res.success);
      if (res.success) refresh();
    } finally {
      setApplying(false);
    }
  };

  const handlePublish = () => {
    if (!requireLogin()) return;
    setPublishing(true);
    try {
      const res = publishConsultService({
        providerUserId: getCurrentUserId(),
        title: pTitle,
        scope: pScope,
        deliveryForm: pForm,
        price: Number(pPrice),
        deliveryDays: Number(pDays),
        refundPolicy: pRefund,
      });
      showToast(res.message, res.success);
      if (res.success) {
        setShowPublish(false);
        setPTitle("");
        setPScope("");
        setPPrice("");
        refresh();
      }
    } finally {
      setPublishing(false);
    }
  };

  const handleToggleService = (svc: ConsultService) => {
    const next = svc.status === "online" ? "offline" : "online";
    const res = setConsultServiceStatus(svc.id, next, "provider");
    showToast(res.message, res.success);
    if (res.success) refresh();
  };

  const handleAccept = (orderId: string) => {
    const res = acceptConsultOrder(orderId, getCurrentUserId());
    showToast(res.message, res.success);
    if (res.success) refresh();
  };

  const handleDeliver = () => {
    if (!deliverOrder) return;
    if (deliverContent.trim().length < 10) {
      showToast("交付说明至少10字", false);
      return;
    }
    setDelivering(true);
    try {
      const res = deliverConsultOrder(deliverOrder.orderId, getCurrentUserId(), deliverContent.trim());
      showToast(res.message, res.success);
      if (res.success) {
        setDeliverOrder(null);
        setDeliverContent("");
        refresh();
      }
    } finally {
      setDelivering(false);
    }
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  };

  // ==================== 未开放 ====================
  if (!cfgEnabled) {
    return (
      <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
        <BrandHeader title="服务者工作台" showBack />
        <div className="px-3 pt-4">
          <div style={cardStyle} className="text-center">
            <p className="text-sm text-gray-400">真人咨询服务当前未开放入驻</p>
          </div>
        </div>
      </div>
    );
  }

  // ==================== 入驻申请表单（未申请 / 被驳回） ====================
  if (!provider || provider.auditStatus === "rejected") {
    return (
      <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
        <BrandHeader title="服务者入驻申请" showBack />
        <div className="flex flex-col gap-3 px-3 pb-24 pt-3">
          {provider?.auditStatus === "rejected" && (
            <div style={{ ...cardStyle, border: "1px solid #f5c6cb" }}>
              <p className="text-[13px] font-semibold" style={{ color: "#e74c3c" }}>上次申请未通过</p>
              <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
                驳回原因：{provider.auditNote || "资料不完整"}。请完善资料后重新提交。
              </p>
            </div>
          )}

          <div style={cardStyle}>
            <p className="text-[14px] font-bold text-gray-800">入驻说明</p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-gray-500">
              真人咨询服务为言道精选个人店铺下的受审核服务类目。服务者须完成身份、收款、类目准入校验，
              审核通过后方可上架服务；平台服务费 {(feeRate * 100).toFixed(0)}%，确认收货后 {settleDays} 天结算，
              收入进入钱包可提现余额。禁止承诺保证效果，禁止提供医疗、法律、金融等专业服务。
            </p>
          </div>

          <div style={cardStyle} className="flex flex-col gap-3">
            <div>
              <label style={labelStyle}>展示昵称 *</label>
              <input style={inputStyle} value={fNickname} onChange={(e) => setFNickname(e.target.value)} placeholder="买家可见的昵称" maxLength={20} />
            </div>
            <div>
              <label style={labelStyle}>服务类目 *</label>
              <select style={inputStyle} value={fCategory} onChange={(e) => setFCategory(e.target.value)}>
                <option value="">请选择类目</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>擅长方向（选填，逗号分隔）</label>
              <input style={inputStyle} value={fExpertise} onChange={(e) => setFExpertise(e.target.value)} placeholder="如：事业财运、婚恋感情、学业文昌" maxLength={60} />
            </div>
            <div>
              <label style={labelStyle}>服务简介 *（至少30字）</label>
              <textarea
                style={{ ...inputStyle, resize: "none" }}
                rows={4}
                value={fBio}
                onChange={(e) => setFBio(e.target.value)}
                placeholder="介绍您的研习经历、擅长领域、服务方式与交付形式，帮助买家了解您"
                maxLength={300}
              />
              <p className="mt-1 text-right text-[10px] text-gray-300">{fBio.length}/300</p>
            </div>
          </div>

          {entryAuditRequired && (
            <div style={cardStyle} className="flex flex-col gap-3">
              <p className="text-[13px] font-bold text-gray-800">准入校验（平台审核要素）</p>
              <div>
                <label style={labelStyle}>实名姓名 *</label>
                <input style={inputStyle} value={fRealName} onChange={(e) => setFRealName(e.target.value)} placeholder="与证件一致的姓名" maxLength={20} />
                <p className="mt-1 text-[10px] text-gray-400">仅用于准入审核，不会向买家展示</p>
              </div>
              <div>
                <label style={labelStyle}>证件号码后4位 *</label>
                <input style={inputStyle} value={fIdLast4} onChange={(e) => setFIdLast4(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="如 0821" inputMode="numeric" />
              </div>
              <div>
                <label style={labelStyle}>收款账户（三选一）*</label>
                <input style={{ ...inputStyle, marginBottom: 8 }} value={fAlipay} onChange={(e) => setFAlipay(e.target.value)} placeholder="支付宝账号（选填）" maxLength={40} />
                <input style={{ ...inputStyle, marginBottom: 8 }} value={fWechat} onChange={(e) => setFWechat(e.target.value)} placeholder="微信号（选填）" maxLength={40} />
                <input style={inputStyle} value={fBank} onChange={(e) => setFBank(e.target.value)} placeholder="银行卡号（选填）" maxLength={30} />
              </div>
            </div>
          )}

          <button
            onClick={handleApply}
            disabled={applying}
            className="w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-60"
            style={{ backgroundColor: BRAND }}
          >
            {applying ? "提交中..." : "提交入驻申请"}
          </button>
        </div>

        <LoginPromptModal show={showLoginPrompt} onClose={() => setShowLoginPrompt(false)} />
        {toast && (
          <div
            className="fixed left-1/2 top-20 z-[1001] -translate-x-1/2 rounded-full px-4 py-2 text-xs font-semibold text-white shadow-lg"
            style={{ backgroundColor: toast.ok ? "#1E8E5A" : "#e74c3c", maxWidth: "88%" }}
          >
            {toast.msg}
          </div>
        )}
      </div>
    );
  }

  // ==================== 审核中 ====================
  if (provider.auditStatus === "pending") {
    return (
      <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
        <BrandHeader title="服务者工作台" showBack />
        <div className="px-3 pt-4">
          <div style={cardStyle} className="text-center">
            <p className="text-2xl">⏳</p>
            <p className="mt-2 text-[15px] font-bold text-gray-800">入驻申请审核中</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-gray-500">
              提交时间 {provider.appliedAt.slice(0, 16).replace("T", " ")}
              <br />平台将在1-3个工作日内完成审核，结果将通过站内消息通知您。
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==================== 已通过：工作台 ====================
  const settledTotal = myOrders.filter((o) => o.status === "settled").reduce((s, o) => s + o.settleAmount, 0);
  const pendingSettle = myOrders
    .filter((o) => o.status === "confirmed")
    .reduce((s, o) => s + o.settleAmount, 0);

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      <BrandHeader title="服务者工作台" showBack />

      <div className="px-3 pb-24 pt-3">
        {/* 服务者信息 */}
        <div style={cardStyle}>
          <div className="flex items-center gap-3">
            <span
              className="flex h-11 w-11 items-center justify-center rounded-full text-lg font-bold text-white"
              style={{ backgroundColor: BRAND }}
            >
              {provider.nickname.slice(0, 1)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold text-gray-800">
                {provider.nickname}
                {provider.frozen && <span className="ml-2 text-[11px] font-semibold text-red-500">已冻结</span>}
              </p>
              <p className="text-[11px] text-gray-400">
                {provider.category} · 已认证服务者
                {provider.expertise.length > 0 && ` · 擅长：${provider.expertise.join("、")}`}
              </p>
            </div>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-gray-500">{provider.bio}</p>
        </div>

        {/* 结算数据 */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div style={cardStyle} className="text-center">
            <p className="text-[17px] font-bold" style={{ color: "#27ae60" }}>¥{settledTotal.toFixed(2)}</p>
            <p className="mt-0.5 text-[10px] text-gray-400">已结算收入</p>
          </div>
          <div style={cardStyle} className="text-center">
            <p className="text-[17px] font-bold" style={{ color: BRAND }}>¥{pendingSettle.toFixed(2)}</p>
            <p className="mt-0.5 text-[10px] text-gray-400">待结算（T+{settleDays}天）</p>
          </div>
          <button style={cardStyle} className="text-center" onClick={() => router.push("/profile/wallet")}>
            <p className="text-[17px] font-bold" style={{ color: "#7B2FBE" }}>钱包</p>
            <p className="mt-0.5 text-[10px] text-gray-400">去提现</p>
          </button>
        </div>

        {/* Tab */}
        <div className="mt-3 flex gap-2">
          {([
            { key: "services", label: `我的服务 (${myServices.length})` },
            { key: "orders", label: `服务订单 (${myOrders.length})` },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex-1 rounded-xl py-2 text-xs font-semibold"
              style={{ backgroundColor: tab === t.key ? BRAND : "#fff", color: tab === t.key ? "#fff" : "#666" }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 我的服务 */}
        {tab === "services" && (
          <div className="mt-3 flex flex-col gap-3">
            {!provider.frozen && (
              <button
                onClick={() => {
                  if (!requireLogin()) return;
                  setShowPublish(!showPublish);
                }}
                className="w-full rounded-xl border-2 border-dashed py-3 text-[13px] font-semibold"
                style={{ borderColor: BRAND, color: BRAND, backgroundColor: "#fff" }}
              >
                {showPublish ? "收起上架表单" : "+ 上架新服务"}
              </button>
            )}

            {showPublish && !provider.frozen && (
              <div style={cardStyle} className="flex flex-col gap-3">
                <p className="text-[13px] font-bold text-gray-800">上架新服务</p>
                <div>
                  <label style={labelStyle}>服务标题 *（至少4字）</label>
                  <input style={inputStyle} value={pTitle} onChange={(e) => setPTitle(e.target.value)} placeholder="如：八字命理深度分析与建议" maxLength={30} />
                </div>
                <div>
                  <label style={labelStyle}>服务范围 *（至少20字，说明做什么、不做什么）</label>
                  <textarea
                    style={{ ...inputStyle, resize: "none" }}
                    rows={3}
                    value={pScope}
                    onChange={(e) => setPScope(e.target.value)}
                    placeholder="如：基于出生时间排盘，从事业、财运、婚恋角度给出传统文化视角的分析说明；不含医疗、法律、金融等 专业建议"
                    maxLength={300}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label style={labelStyle}>交付形式 *</label>
                    <select style={inputStyle} value={pForm} onChange={(e) => setPForm(e.target.value as ConsultService["deliveryForm"])}>
                      {(Object.keys(DELIVERY_FORM_LABEL) as ConsultService["deliveryForm"][]).map((k) => (
                        <option key={k} value={k}>{DELIVERY_FORM_LABEL[k]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>交付时限（1~{maxDeliveryDays}天）*</label>
                    <input style={inputStyle} value={pDays} onChange={(e) => setPDays(e.target.value.replace(/\D/g, "").slice(0, 2))} inputMode="numeric" />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>定价（¥{minPrice} ~ ¥{maxPrice}）*</label>
                  <input style={inputStyle} value={pPrice} onChange={(e) => setPPrice(e.target.value.replace(/[^\d.]/g, "").slice(0, 7))} placeholder={`如 ${Math.max(minPrice, 99)}`} inputMode="decimal" />
                  <p className="mt-1 text-[10px] text-gray-400">
                    平台服务费 {(feeRate * 100).toFixed(0)}%，买家确认后 T+{settleDays} 天结算到钱包
                  </p>
                </div>
                <div>
                  <label style={labelStyle}>退款规则 *</label>
                  <textarea
                    style={{ ...inputStyle, resize: "none" }}
                    rows={2}
                    value={pRefund}
                    onChange={(e) => setPRefund(e.target.value)}
                    maxLength={200}
                  />
                </div>
                <button
                  onClick={handlePublish}
                  disabled={publishing}
                  className="rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-60"
                  style={{ backgroundColor: BRAND }}
                >
                  {publishing ? "提交中..." : "提交上架"}
                </button>
              </div>
            )}

            {myServices.length === 0 ? (
              <div style={cardStyle} className="py-10 text-center">
                <p className="text-sm text-gray-400">暂未上架服务</p>
              </div>
            ) : (
              myServices.map((svc) => (
                <div key={svc.id} style={cardStyle}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-bold text-gray-800">{svc.title}</p>
                      <p className="mt-1 text-[11px] text-gray-400">
                        {DELIVERY_FORM_LABEL[svc.deliveryForm]} · ¥{svc.price} · {svc.deliveryDays}天交付 · 已售 {svc.salesCount}
                      </p>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{
                        backgroundColor: svc.status === "online" ? "#e8f8f0" : "#f0f0f0",
                        color: svc.status === "online" ? "#1E8E5A" : "#999",
                      }}
                    >
                      {svc.status === "online" ? "上架中" : svc.status === "offline" ? "已下架" : svc.status === "frozen" ? "被冻结" : svc.status}
                    </span>
                  </div>
                  {!provider.frozen && svc.status !== "frozen" && (
                    <button
                      onClick={() => handleToggleService(svc)}
                      className="mt-2.5 w-full rounded-lg border py-2 text-xs font-medium"
                      style={{ borderColor: "#ddd", color: "#666" }}
                    >
                      {svc.status === "online" ? "下架服务" : "重新上架"}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* 服务订单 */}
        {tab === "orders" && (
          <div className="mt-3 flex flex-col gap-3">
            {myOrders.length === 0 ? (
              <div style={cardStyle} className="py-10 text-center">
                <p className="text-sm text-gray-400">暂无服务订单</p>
              </div>
            ) : (
              myOrders.map((o) => {
                const meta = ORDER_STATUS_META[o.status];
                return (
                  <div key={o.orderId} style={cardStyle}>
                    <div className="flex items-center justify-between">
                      <p className="text-[14px] font-bold text-gray-800">{o.serviceTitle}</p>
                      <span className="text-[11px] font-semibold" style={{ color: meta.color }}>{meta.label}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-gray-400">
                      {o.orderId} · ¥{o.amount} · 结算 ¥{o.settleAmount}（服务费 ¥{o.platformFee}）
                    </p>
                    <p className="mt-1 text-[11px] text-gray-500">买家：{o.buyerNickname}</p>
                    {o.requirement && (
                      <p className="mt-1.5 rounded-lg bg-gray-50 p-2 text-[11px] leading-relaxed text-gray-600">
                        买家需求：{o.requirement}
                      </p>
                    )}
                    {o.settleDueAt && o.status === "confirmed" && (
                      <p className="mt-1.5 text-[11px]" style={{ color: BRAND }}>
                        预计结算：{o.settleDueAt.slice(0, 16).replace("T", " ")}
                      </p>
                    )}
                    <div className="mt-2.5 flex gap-2">
                      {o.status === "paid" && (
                        <button
                          onClick={() => handleAccept(o.orderId)}
                          className="flex-1 rounded-xl py-2 text-xs font-semibold text-white"
                          style={{ backgroundColor: BRAND }}
                        >
                          立即接单
                        </button>
                      )}
                      {["paid", "accepted"].includes(o.status) && (
                        <button
                          onClick={() => {
                            if (!requireLogin()) return;
                            setDeliverOrder(o);
                            setDeliverContent("");
                          }}
                          className="flex-1 rounded-xl py-2 text-xs font-semibold text-white"
                          style={{ backgroundColor: "#1E8E5A" }}
                        >
                          交付成果
                        </button>
                      )}
                      {o.status === "after_selling" && (
                        <span className="text-[11px] text-gray-400">售后仲裁中，请留意站内消息</span>
                      )}
                      {o.status === "delivered" && (
                        <span className="text-[11px] text-gray-400">等待买家确认收货</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        <p className="mt-4 text-center text-[10px] leading-relaxed text-gray-300">
          收入结算进入钱包可提现余额 · 平台服务费 {(feeRate * 100).toFixed(0)}% · T+{settleDays} 天
        </p>
      </div>

      {/* 交付弹窗 */}
      {deliverOrder && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            backgroundColor: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
          onClick={() => setDeliverOrder(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "420px",
              maxHeight: "85vh",
              overflowY: "auto",
              backgroundColor: "#fff",
              borderRadius: "16px 16px 0 0",
              padding: "20px 16px calc(20px + env(safe-area-inset-bottom))",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[15px] font-bold text-gray-800">交付服务成果</p>
              <button onClick={() => setDeliverOrder(null)} className="text-xs text-gray-400">关闭</button>
            </div>
            <p className="rounded-xl bg-gray-50 p-3 text-[11px] text-gray-500">
              {deliverOrder.serviceTitle} · 买家：{deliverOrder.buyerNickname}
            </p>
            <p className="mb-1.5 mt-3 text-xs font-semibold text-gray-700">交付说明（至少10字）</p>
            <textarea
              value={deliverContent}
              onChange={(e) => setDeliverContent(e.target.value)}
              rows={5}
              maxLength={2000}
              placeholder="填写交付内容说明：分析结论、建议要点、后续沟通方式等；如为线下/语音形式请写明约定时间与联系说明"
              className="w-full resize-none rounded-xl border border-gray-200 p-3 text-[13px] text-gray-700 outline-none"
            />
            <p className="mt-1 text-right text-[10px] text-gray-300">{deliverContent.length}/2000</p>
            <button
              onClick={handleDeliver}
              disabled={delivering}
              className="mt-3 w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-60"
              style={{ backgroundColor: "#1E8E5A" }}
            >
              {delivering ? "提交中..." : "确认交付"}
            </button>
          </div>
        </div>
      )}

      <LoginPromptModal show={showLoginPrompt} onClose={() => setShowLoginPrompt(false)} />
      <div className="page-bottom-nav-safe" aria-hidden="true" />

      {toast && (
        <div
          className="fixed left-1/2 top-20 z-[1001] -translate-x-1/2 rounded-full px-4 py-2 text-xs font-semibold text-white shadow-lg"
          style={{ backgroundColor: toast.ok ? "#1E8E5A" : "#e74c3c", maxWidth: "88%" }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
