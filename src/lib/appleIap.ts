"use client";
import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import { getUserToken, setLoginState, type UserProfile } from "./auth";
import { IS_IOS_FULL_BUILD } from "./releaseFeatures";
import { clientPlatformHeaders } from "./platformGate";

export const APPLE_LEARNING_PRODUCTS = [
  { key: "monthly", suffix: "membership.monthly.v1", kind: "membership" },
  { key: "quarterly", suffix: "membership.quarterly.v1", kind: "membership" },
  { key: "yearly", suffix: "membership.yearly.v1", kind: "membership" },
  { key: "lifetime", suffix: "membership.lifetime.v1", kind: "membership" },
  { key: "pack_10", suffix: "ai.credits10.v1", kind: "aiCredits" },
  { key: "pack_50", suffix: "ai.credits50.v1", kind: "aiCredits" },
  { key: "pack_100", suffix: "ai.credits100.v1", kind: "aiCredits" },
  { key: "pack_500", suffix: "ai.credits500.v1", kind: "aiCredits" },
].map(p => ({ ...p, productId: `com.yandaoguoxue.app.${p.suffix}` }));
export interface AppleProduct { productId: string; name: string; description: string; displayPrice: string }
interface SignedTransaction { transactionId: string; signedTransaction: string }
interface StorePlugin {
  products(): Promise<{ products: AppleProduct[] }>;
  purchase(options: { productId: string; appAccountToken: string }): Promise<Partial<SignedTransaction> & { status: "verified" | "pending" | "cancelled" }>;
  transactions(): Promise<{ transactions: SignedTransaction[] }>;
  restore(): Promise<{ transactions: SignedTransaction[] }>;
  finish(options: { transactionId: string }): Promise<void>;
  addListener(event: "transactionUpdate", listener: () => void): Promise<PluginListenerHandle>;
}
const Store = registerPlugin<StorePlugin>("AppleLearningStore");
export function isAppleLearningBuild() { return IS_IOS_FULL_BUILD; }
function requireStore() {
  if (!IS_IOS_FULL_BUILD || Capacitor.getPlatform() !== "ios" || !Capacitor.isPluginAvailable("AppleLearningStore")) throw Error("请在新版言道国学苹果版中使用App Store购买");
}
async function api<T>(path: string, body?: unknown): Promise<T> {
  const token = getUserToken();
  if (!token) throw Error("请先登录购买时使用的言道国学账号");
  const response = await fetch(`/api/apple-iap${path}`, { method: body === undefined ? "GET" : "POST", headers: { ...clientPlatformHeaders(), Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, cache: "no-store", ...(body !== undefined ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(45000) });
  const data = await response.json();
  if (!response.ok || !data.success) throw Error(data.error || "苹果订单尚未确认，请稍后恢复购买");
  return data.data as T;
}
function requireSameAccount(token: string | null) {
  if (!token || getUserToken() !== token) throw Error("账号已切换，请在原购买账号恢复购买");
}
async function refreshProfile(token: string | null) {
  if (!token) return;
  requireSameAccount(token);
  const response = await fetch("/api/auth/profile", { headers: { ...clientPlatformHeaders(), Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(20000) });
  const json = await response.json();
  if (!response.ok || !json.success || !json.data?.userId) throw Error("购买已确认，账号资料尚未刷新，请稍后刷新权益");
  // Only authoritative account data can change local membership display.
  if (getUserToken() !== token) throw Error("账号已切换，请在原购买账号恢复购买");
  setLoginState(token, json.data as UserProfile);
  window.dispatchEvent(new Event("yandao-apple-entitlements"));
}
async function deliver(tx: SignedTransaction, token: string | null) {
  requireSameAccount(token);
  const result = await api<{ transactionId: string; productId: string; delivered: boolean; revoked: boolean }>("/transactions", { signedTransaction: tx.signedTransaction });
  if (result.transactionId !== tx.transactionId || !APPLE_LEARNING_PRODUCTS.some(p => p.productId === result.productId) || (!result.delivered && !result.revoked)) throw Error("苹果订单尚未完成交付，请稍后恢复购买");
  requireSameAccount(token);
  // The server has committed the grant/revocation; finishing is safe even if
  // refreshing profile later fails. Failed delivery leaves it unfinished.
  await Store.finish({ transactionId: tx.transactionId });
  return result;
}
export async function loadAppleProducts(): Promise<AppleProduct[]> {
  requireStore();
  return (await Store.products()).products.filter(p => APPLE_LEARNING_PRODUCTS.some(item => item.productId === p.productId));
}
export async function purchaseAppleProduct(productId: string): Promise<string> {
  requireStore();
  if (!APPLE_LEARNING_PRODUCTS.some(p => p.productId === productId)) throw Error("不支持的学习商品");
  const token = getUserToken();
  const context = await api<{ appAccountToken: string }>("/context");
  requireSameAccount(token);
  const result = await Store.purchase({ productId, appAccountToken: context.appAccountToken });
  if (result.status === "cancelled") return "已取消购买，未新增权益。";
  if (result.status === "pending") return "购买正在等待苹果确认（如家长批准），确认后将自动交付，请勿重复购买。";
  if (!result.transactionId || !result.signedTransaction) throw Error("苹果订单待确认，可稍后恢复购买");
  const delivered = await deliver(result as SignedTransaction, token);
  await refreshProfile(token);
  return delivered.revoked ? "该笔购买已退款或撤销，权益已同步。" : "购买已确认，学习权益已到账。";
}
let restoring: Promise<{ restored: number; failed: number }> | null = null;
export function restoreApplePurchases(userInitiated = true): Promise<{ restored: number; failed: number }> {
  if (restoring) return restoring;
  const token = getUserToken();
  restoring = (async () => {
    requireStore();
    // Establish a server-owned binding before fetching any history. Restoring
    // under a different app login must not transfer App Store ownership.
    await api("/context");
    const rows = await (userInitiated ? Store.restore() : Store.transactions());
    let restored = 0, failed = 0;
    for (const tx of rows.transactions) { try { await deliver(tx, token); restored++; } catch { failed++; } }
    await refreshProfile(token);
    return { restored, failed };
  })().finally(() => {
    restoring = null;
    if (getUserToken() && getUserToken() !== token) void restoreApplePurchases(false).catch(() => {});
  });
  return restoring;
}
export async function listenForAppleTransactions(callback: () => void) {
  requireStore();
  return Store.addListener("transactionUpdate", callback);
}
