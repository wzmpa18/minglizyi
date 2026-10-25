"use client";

import { checkUpdates, downloadPack, fetchManifest, needsUserConfirmation, type DownloadProgress, type PackUpdatePlan } from "./offlinePackClient";
import { CLIENT_VERSION } from "./releaseFeatures";

export const ANATOMY_BUNDLE_ID = "anatomy-learning-complete";
export const ANATOMY_BUNDLE_NAME = "完整三维学习资料";
export const ANATOMY_BUNDLE_MEMBERS = ["tcm-anatomy-3d-v2", "tcm-anatomy-atlas-v3"] as const;
export const ANATOMY_LEGACY_ID = "tcm-anatomy-3d-v1";

/** One user-facing item; existing installations and older clients keep their data. */
export function anatomyBundlePlan(plans: PackUpdatePlan[]): PackUpdatePlan | null {
  const members = ANATOMY_BUNDLE_MEMBERS.map(id => plans.find(p => p.packId === id));
  if (members.some(p => !p)) return null;
  const rows = members as PackUpdatePlan[];
  const action = rows.some(p => p.action === "INCOMPATIBLE") ? "INCOMPATIBLE"
    : rows.every(p => p.action === "UP_TO_DATE") ? "UP_TO_DATE"
    : rows.some(p => p.installed) ? "UPDATE" : "INSTALL";
  return { packId: ANATOMY_BUNDLE_ID, action, installed: rows.find(p => p.installed)?.installed,
    manifestPack: { ...rows[0].manifestPack, packId: ANATOMY_BUNDLE_ID, name: ANATOMY_BUNDLE_NAME,
      size: rows.reduce((n, p) => n + p.manifestPack.size, 0), downloadUrl: "",
      description: "一次准备四层人体、十五系统与经络学习图谱，两个三维入口共用已下载资料。", largePack: true } };
}

export class AnatomyBundleError extends Error {
  constructor(message: string, public action?: "login" | "membership") { super(message); this.name = "AnatomyBundleError"; }
}

let active: Promise<void> | null = null;
const listeners = new Set<DownloadProgress>();
let latest: [number, number] = [0, 0];
function report(received: number, total: number) {
  latest = [received, total];
  for (const listener of listeners) { try { listener(received, total); } catch { /* progress cannot interrupt durable installation */ } }
}

async function prepare() {
  const catalogue = await fetchManifest();
  if (!catalogue) throw new AnatomyBundleError("暂时无法检查三维资料，已下载的模型和图谱仍可离线打开；联网后重试。");
  const plans = await checkUpdates(CLIENT_VERSION, catalogue);
  const bundle = anatomyBundlePlan(plans);
  if (!bundle) throw new AnatomyBundleError("完整三维学习资料暂未就绪，已下载资料仍保留，请稍后重试。");
  if (bundle.action === "INCOMPATIBLE") throw new AnatomyBundleError("请先更新应用，再准备完整三维学习资料；原有资料仍可使用。");
  const pending = ANATOMY_BUNDLE_MEMBERS.map(id => plans.find(p => p.packId === id)!)
    .filter(p => p.action !== "UP_TO_DATE");
  const total = pending.reduce((n, p) => n + p.manifestPack.size, 0);
  if (!pending.length) { report(1, 1); return; }
  if (pending.some(p => needsUserConfirmation(p.manifestPack)) && typeof window !== "undefined" &&
    !window.confirm(`「${ANATOMY_BUNDLE_NAME}」本次约需下载 ${(total / 1024 / 1024).toFixed(1)} MB，当前使用移动网络，是否继续？`)) {
    throw new AnatomyBundleError("已取消下载，原有学习资料保持不变。");
  }
  let completed = 0;
  report(0, total);
  for (const plan of pending) {
    const validate = plan.packId === ANATOMY_BUNDLE_MEMBERS[0]
      ? async (bytes: ArrayBuffer) => { await (await import("./anatomy3dPack")).decodeAnatomyPack(bytes); }
      : async (bytes: ArrayBuffer) => { await (await import("../components/anatomy-atlas/atlasPack")).decodeAtlas(bytes); };
    const result = await downloadPack(plan.manifestPack,
      received => report(completed + Math.min(received, plan.manifestPack.size), total), validate);
    if (!result.ok) throw new AnatomyBundleError(`${result.error || "资料准备暂未完成"}；已完成的资料保留，重试时只补齐未完成部分。`, result.accessAction);
    completed += plan.manifestPack.size;
    report(completed, total);
  }
}

/** Shared by the offline centre and both viewers; coalesces overlapping taps. */
export async function downloadCompleteAnatomy(progress?: DownloadProgress): Promise<void> {
  if (progress) listeners.add(progress);
  if (!active) { latest = [0, 0]; active = prepare().finally(() => { active = null; }); }
  if (progress && latest[1]) { try { progress(...latest); } catch { /* observer only */ } }
  try { await active; } finally { if (progress) listeners.delete(progress); }
}
