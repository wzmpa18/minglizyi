"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandHeader } from "@/components/shared";
import { APPLE_LEARNING_PRODUCTS, loadAppleProducts, purchaseAppleProduct, restoreApplePurchases, type AppleProduct } from "@/lib/appleIap";
import { getUserToken } from "@/lib/auth";
import { getMembershipStatus, getLevelName, MEMBERSHIP_PLANS } from "@/lib/membershipStore";
import { mergePlansWithServer, useServerPricing } from "@/lib/pricingStore";
import { clientPlatformHeaders } from "@/lib/platformGate";

export default function AppleLearningStore({ kind }: { kind: "membership" | "aiCredits" }) {
  const router = useRouter();
  const [products, setProducts] = useState<AppleProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [membership, setMembership] = useState(() => getMembershipStatus());
  const [credits, setCredits] = useState<number | null>(null);
  const { plans: serverPlans } = useServerPricing();
  const plans = mergePlansWithServer(MEMBERSHIP_PLANS, serverPlans) || MEMBERSHIP_PLANS;
  async function refresh() {
    setMembership(getMembershipStatus());
    const token = getUserToken();
    if (!token) { setCredits(null); return; }
    try {
      const r = await fetch("/api/payment/ai-credits", { headers: { ...clientPlatformHeaders(), Authorization: `Bearer ${token}` }, cache: "no-store" });
      const j = await r.json();
      if (r.ok && j.success) setCredits(j.data.credits);
    } catch { /* Purchase/restore messages remain visible if balance fetch fails. */ }
  }
  async function load() {
    setLoading(true); setMessage("");
    try { setProducts(await loadAppleProducts()); }
    catch (error) { setMessage(error instanceof Error ? error.message : "App Store商品暂不可用"); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    void load(); void refresh();
    const update = () => { void refresh(); };
    window.addEventListener("yandao-apple-entitlements", update);
    window.addEventListener("yandao-auth-change", update);
    return () => { window.removeEventListener("yandao-apple-entitlements", update); window.removeEventListener("yandao-auth-change", update); };
    // Store catalog is fixed in this submitted binary. Prices come only from StoreKit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function requireLogin() {
    if (getUserToken()) return true;
    try { sessionStorage.setItem("yandao_login_redirect", kind === "membership" ? "/membership" : "/ai-credits"); } catch {}
    router.push("/login"); return false;
  }
  async function purchase(product: AppleProduct) {
    if (busy || !accepted || !requireLogin()) return;
    setBusy(product.productId); setMessage("");
    try { setMessage(await purchaseAppleProduct(product.productId)); await refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "购买尚未确认，可稍后恢复购买"); }
    finally { setBusy(""); }
  }
  async function restore() {
    if (busy || !requireLogin()) return;
    setBusy("restore"); setMessage("");
    try {
      const result = await restoreApplePurchases();
      setMessage(result.failed ? `已核对${result.restored}笔购买，另有${result.failed}笔尚未确认（如属于其他账号）。请登录原购买账号重试或联系客服。` : result.restored ? `已核对${result.restored}笔购买，权益已同步。已使用的点数不会重复补发。` : "当前Apple账号没有可恢复的言道国学购买。已有安卓权益可登录原言道国学账号使用。");
      await refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "恢复购买尚未完成，请稍后重试"); }
    finally { setBusy(""); }
  }
  const isMember = kind === "membership";
  return <div style={{ maxWidth: 640, margin: "0 auto", minHeight: "100vh", paddingBottom: 100, background: "#f5f3eb", color: "#244b3d" }}>
    <BrandHeader title={isMember ? "学习会员" : "AI学习点数"} showBack />
    <main style={{ padding: 18 }}>
      <section style={{ background: "#234c3e", color: "#fff9e9", borderRadius: 22, padding: 24 }}>
        <div style={{ fontSize: 12, letterSpacing: 2 }}>言道国学 · 学习权益</div>
        <h1 style={{ fontSize: 28, margin: "15px 0" }}>{isMember ? "把经典读深，把学习继续" : "让提问伴随研读"}</h1>
        <p style={{ fontSize: 14, lineHeight: 1.9, margin: 0 }}>当前会员：{getLevelName(membership.level)}{membership.expireTime && ` · 至${new Date(membership.expireTime).toLocaleDateString("zh-CN")}`}<br />购买点数：{credits == null ? "登录后查看" : `${credits}点`}</p>
      </section>
      <p style={{ fontSize: 13, lineHeight: 1.9 }}>{isMember ? "月度、季度、年度均为固定期限会员，不自动续费；终身会员为一次购买。权益绑定购买时登录的言道国学账号，可在同一账号同步使用。已有较高等级会员购买较低等级套餐时，保留当前较高等级并累加时长。" : "1点对应1次通用AI调用；先使用会员包含的每日额度，再扣购买点数，AI时卡有效期间不扣购买点数。通过苹果购买的点数不过期，使用记录由服务器保存，重装后登录原账号可继续使用。专项工具按页面说明另计。"}</p>
      <p style={{ fontSize: 12, color: "#69796c" }}>下方价格由App Store实时提供，结算币种与最终价格以苹果确认页为准。</p>
      {loading && <p role="status">正在读取App Store商品与价格…</p>}
      <div style={{ display: "grid", gap: 14 }}>
        {APPLE_LEARNING_PRODUCTS.filter(item => item.kind === kind).map(item => {
          const product = products.find(p => p.productId === item.productId);
          const plan = plans.find(p => p.level === item.key);
          return <article key={item.key} style={{ padding: 20, border: "1px solid #d9dfd0", borderRadius: 18, background: "#fffdf6" }}>
            <h2 style={{ fontSize: 19, margin: "0 0 12px" }}>{product?.name || (isMember ? plan?.name : `${item.key.replace("pack_", "")}点AI学习点数`)}</h2>
            <strong style={{ fontSize: 30 }}>{product?.displayPrice || "暂不可购买"}</strong>
            <p style={{ fontSize: 13, lineHeight: 1.9 }}>{isMember ? item.key === "lifetime" ? "永久有效 · 不自动续费" : `${plan?.duration || "固定期限"} · 不自动续费` : "购买点数不过期 · 绑定当前账号"}</p>
            {isMember && plan && <ul style={{ paddingLeft: 18, fontSize: 13, lineHeight: 1.9 }}>{plan.features.map(feature => <li key={feature}>{feature}</li>)}</ul>}
            <button type="button" disabled={!product || !!busy || !accepted} onClick={() => product && void purchase(product)} style={{ width: "100%", padding: 13, background: !product || !accepted || busy ? "#d4dbcf" : "#2c604e", color: !product || !accepted || busy ? "#52604e" : "#fff", border: 0, borderRadius: 11 }}>{busy === item.productId ? "正在确认购买…" : product ? `通过App Store购买 · ${product.displayPrice}` : "商品暂不可用"}</button>
          </article>;
        })}
      </div>
      <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, lineHeight: 1.9, margin: "20px 0" }}><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} style={{ marginTop: 6, width: 18, height: 18, flexShrink: 0 }} /><span>我已阅读并同意<Link href="/membership-agreement">《会员服务协议》</Link>和<Link href="/privacy">《隐私政策》</Link>，了解商品期限与适用权益。</span></label>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}><button id="restore-purchases" type="button" onClick={() => void restore()} disabled={!!busy} style={{ padding: 12, border: "1px solid #9ba994", borderRadius: 10 }}>{busy === "restore" ? "正在恢复…" : "恢复购买"}</button><button type="button" disabled={!!busy || loading} onClick={() => void load()} style={{ padding: 12, border: "1px solid #9ba994", borderRadius: 10 }}>刷新苹果价格</button></div>
      {message && <p role="status" style={{ marginTop: 18, padding: 15, borderRadius: 12, background: "#fff2d6", fontSize: 14, lineHeight: 1.9, overflowWrap: "anywhere" }}>{message}</p>}
      <p style={{ fontSize: 12, lineHeight: 1.9, color: "#6a786a" }}>如付款后网络中断，请勿重复购买；重开应用或点击“恢复购买”核对。申请退款可通过苹果购买记录处理，退款后的对应权益将同步撤销。</p>
      <nav style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 14, marginTop: 22 }}><Link href={isMember ? "/ai-credits" : "/membership"}>{isMember ? "AI点数" : "会员权益"}</Link><Link href="/profile/feedback">购买与学习帮助</Link><Link href="/academy">返回学习中心</Link></nav>
    </main>
  </div>;
}
