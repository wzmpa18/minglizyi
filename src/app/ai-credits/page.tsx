"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandHeader } from "@/components/shared";
import { useServerPricing } from "@/lib/pricingStore";
import { getUserToken } from "@/lib/auth";
import { callPayment, pollPaymentStatus } from "@/lib/paymentService";
import { isPaymentsBlocked } from "@/lib/platformGate";
import { useNativePayQR } from "@/components/PayQRCodeModal";
import { isPromotionActiveFor } from "@/lib/salesPromotion";
import { PUBLIC_AI_ENABLED, IS_IOS_FULL_BUILD } from "@/lib/releaseFeatures";
import AppleLearningStore from "@/components/AppleLearningStore";

interface CreditBalance { credits: number; activePlan: boolean; entries: { purchased: number; remaining: number; expiresAt: string | null; createdAt: string }[] }

export default function AICreditsPage() {
  return IS_IOS_FULL_BUILD ? <AppleLearningStore kind="aiCredits" /> : <StandardAICreditsPage />;
}

function StandardAICreditsPage() {
  const router = useRouter();
  const { ai, promotion, ready } = useServerPricing();
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [message, setMessage] = useState("");
  const [buying, setBuying] = useState("");
  const [blocked, setBlocked] = useState(true);
  const { qrModal, openQR } = useNativePayQR();
  const refresh = useCallback(async () => {
    const token = getUserToken();
    if (!token) { setBalance(null); return; }
    try {
      const response = await fetch("/api/payment/ai-credits", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const json = await response.json();
      if (!response.ok || !json.success) throw Error(json.message || "AI额度加载失败");
      setBalance(json.data);
    } catch (error) { setMessage(error instanceof Error ? error.message : "AI额度暂不可用"); }
  }, []);
  useEffect(() => { setBlocked(isPaymentsBlocked() || !PUBLIC_AI_ENABLED); void refresh(); }, [refresh]);
  async function purchase(packageId: string) {
    if (buying || blocked) return;
    if (!getUserToken()) { router.push("/login"); return; }
    const pack = ai?.packages.find(item => item.id === packageId && item.enabled !== false);
    if (!pack) return;
    setBuying(packageId); setMessage("");
    try {
      const result = await callPayment({ type: "AI_PACKAGE", amount: pack.price, extra: { packageId: pack.id } });
      if (!result?.success || !result.orderId) throw Error(result?.message || result?.error || "购买暂未完成");
      if (result.payMode === "NATIVE" && result.codeUrl) {
        openQR({ nativePay: true, codeUrl: result.codeUrl, orderId: result.orderId, amount: result.amount ?? pack.price, title: pack.name }, () => { setMessage("支付已确认，正在刷新AI点数。"); void refresh(); });
        return;
      }
      const status = await pollPaymentStatus(result.orderId);
      if (status?.status === "PAID" && status.benefitDelivered === true) { setMessage("AI点数已到账。"); await refresh(); }
      else setMessage("支付尚未确认；已付款订单到账后可刷新查看，请勿重复购买。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "购买失败，请稍后重试"); }
    finally { setBuying(""); }
  }
  return <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: "#f3f2e9", paddingBottom: 90, color: "#24483c" }}>
    <BrandHeader title="AI点数" showBack />
    <main style={{ padding: 16 }}>
      <section style={{ background: "#214b3e", color: "#fffaf0", padding: 22, borderRadius: 20 }}>
        <div style={{ fontSize: 12, opacity: 0.8 }}>学习辅助 · 次数额度</div><h1 style={{ margin: "12px 0", fontSize: 27 }}>AI点数与次数包</h1>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.8 }}>可用购买点数：<strong>{balance ? balance.credits : "登录后查看"}</strong>{balance?.activePlan && <span> · AI时卡有效</span>}</p>
      </section>
      <p style={{ fontSize: 13, lineHeight: 1.9 }}>1点对应1次通用AI调用。先使用会员包含的每日额度，再扣购买点数；AI时卡有效期间不扣购买点数。专项工具解锁按对应页面说明单独处理。</p>
      {isPromotionActiveFor(promotion, "AI_PACKAGE") && promotion && <p role="status" style={{ background: "#fff1d4", padding: 14, borderRadius: 12 }}>{promotion.name} · 下方显示优惠{promotion.discountPercent}%后的价格。</p>}
      {blocked && <p style={{ fontSize: 13, background: "white", padding: 14, borderRadius: 12 }}>此版本暂未开放购买；已有账号额度可正常查看。</p>}
      {!ready && <p>正在加载套餐价格…</p>}
      {ready && !ai && <p role="status">套餐价格暂不可用，请稍后重试。</p>}
      <div style={{ display: "grid", gap: 12 }}>{ai?.packages.filter(pack => pack.enabled !== false).map(pack => <article key={pack.id} style={{ background: "#fffefa", border: "1px solid #d8ded2", borderRadius: 16, padding: 18 }}>
        <h2 style={{ margin: "0 0 10px", fontSize: 18 }}>{pack.name}</h2><div><strong style={{ fontSize: 26 }}>¥{pack.price.toFixed(2)}</strong>{pack.basePrice != null && pack.basePrice > pack.price && <del style={{ marginLeft: 12, color: "#888", fontSize: 13 }}>¥{pack.basePrice.toFixed(2)}</del>}</div>
        <p style={{ color: "#68796f", fontSize: 12 }}>{pack.count}次 · {pack.validity > 0 ? `到账起${pack.validity}天有效` : "不设到期时间"} · 绑定当前账号</p>
        <button type="button" disabled={blocked || !!buying} onClick={() => void purchase(pack.id)} style={{ width: "100%", padding: 12, borderRadius: 10, border: 0, background: blocked ? "#d8ddd6" : "#285c4b", color: blocked ? "#666" : "white" }}>{buying === pack.id ? "处理中…" : "购买次数包"}</button>
      </article>)}</div>
      {message && <p role="status" style={{ padding: "10px 0", fontSize: 13, lineHeight: 1.8 }}>{message}</p>}
      <button type="button" onClick={() => void refresh()} style={{ marginTop: 16, padding: 10 }}>刷新额度</button>
      <Link href="/membership" style={{ marginLeft: 18 }}>查看会员权益</Link>
      {!!balance?.entries.length && <section style={{ marginTop: 24 }}><h2 style={{ fontSize: 17 }}>最近购买额度记录</h2>{balance.entries.map((entry, index) => <p key={index} style={{ borderBottom: "1px solid #ddd", fontSize: 12, lineHeight: 1.9, padding: "8px 0" }}>购入{entry.purchased}点 · 账面剩余{entry.remaining}点<br />{entry.expiresAt ? `有效至${new Date(entry.expiresAt).toLocaleString("zh-CN")}` : "不设到期时间"}{entry.expiresAt && Date.parse(entry.expiresAt) <= Date.now() ? " · 已到期，不计入可用点数" : ""}</p>)}</section>}
    </main>{qrModal}
  </div>;
}
