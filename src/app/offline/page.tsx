"use client";

// ============================================================================
// /offline — 离线内容包管理页（FINAL-MASTER-05 第五十四~七十四章用户端入口）
//   - Manifest 拉取 + 版本比较（第五十九章）
//   - 下载（断点续传+SHA256 校验+蜂窝大包确认，第六十~六十二章）
//   - 已装包管理（删除/存储用量六分区总览，第六十六~六十七章）
//   - 离线事件队列状态 + 手动冲刷（第六十四~六十五章幂等同步）
// ============================================================================

import { useState, useEffect, useCallback, useRef } from "react";
import { BrandHeader } from "@/components/shared";
import { detectNativeShell } from "@/lib/nativeDetect";
import {
  fetchManifest, checkUpdates, downloadPack, getInstalledPacks,
  needsUserConfirmation, type ManifestPack, type PackUpdatePlan,
} from "@/lib/offlinePackClient";
import { remove } from "@/lib/storageManager";
import { queueSize, flushQueue } from "@/lib/offlineSyncClient";
import { storageUsageOverview } from "@/lib/appAutoClean";

const BRAND = "#7B2FBE";

function fmtSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + " MB";
  if (bytes >= 1024) return (bytes / 1024).toFixed(0) + " KB";
  return bytes + " B";
}

const ACTION_LABEL: Record<PackUpdatePlan["action"], string> = {
  INSTALL: "未安装",
  UPDATE: "有新版本",
  UP_TO_DATE: "已是最新",
  INCOMPATIBLE: "需先升级APP",
};

export default function OfflinePage() {
  const [loading, setLoading] = useState(true);
  const [appVersion, setAppVersion] = useState("25.0.0");
  const [plans, setPlans] = useState<PackUpdatePlan[]>([]);
  const [manifestErr, setManifestErr] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ received: number; total: number } | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [usage, setUsage] = useState<Record<string, { entries: number; bytes: number; human: string }>>({});
  const [queueN, setQueueN] = useState(0);
  const [flushing, setFlushing] = useState(false);
  const plansRef = useRef<Map<string, ManifestPack>>(new Map());

  const reloadLocal = useCallback(async () => {
    const [u, q, installed] = await Promise.all([
      storageUsageOverview().catch(() => ({})),
      queueSize().catch(() => 0),
      getInstalledPacks().catch(() => [] as { packId: string; version: string }[]),
    ]);
    setUsage(u);
    setQueueN(q);
    // 删除后重新判定「已是最新」
    setPlans((prev) => prev.map((p) => {
      if (p.action === "UP_TO_DATE" && !installed.some((r) => r.packId === p.packId)) {
        return { ...p, action: "INSTALL" as const, installed: undefined };
      }
      return p;
    }));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setManifestErr(false);
    const shell = await detectNativeShell().catch(() => null);
    let v = shell?.versionName || "";
    if (!v) {
      try {
        const res = await fetch("/version.json", { cache: "no-store" });
        if (res.ok) v = (await res.json()).version || "";
      } catch { /* ignore */ }
    }
    if (v) setAppVersion(v.replace(/^v/, ""));

    const manifest = await fetchManifest();
    if (!manifest) {
      setManifestErr(true);
      setPlans([]);
    } else {
      const ps = await checkUpdates(v || "25.0.0", manifest);
      setPlans(ps);
      plansRef.current = new Map(ps.map((p) => [p.packId, p.manifestPack]));
    }
    await reloadLocal();
    setLoading(false);
  }, [reloadLocal]);

  useEffect(() => { void load(); }, [load]);

  const handleDownload = async (plan: PackUpdatePlan) => {
    if (downloading) return;
    if (plan.action === "INCOMPATIBLE") {
      setMessage({ text: "当前APP版本低于该包要求，请先升级APP", ok: false });
      return;
    }
    if (needsUserConfirmation(plan.manifestPack)) {
      const ok = window.confirm(
        `「${plan.manifestPack.name}」约 ${fmtSize(plan.manifestPack.size)}，当前使用移动网络，是否继续下载？`
      );
      if (!ok) return;
    }
    setDownloading(plan.packId);
    setProgress(null);
    setMessage(null);
    const r = await downloadPack(plan.manifestPack, (received, total) => setProgress({ received, total }));
    setDownloading(null);
    setProgress(null);
    if (r.ok) {
      setMessage({ text: `已下载并校验通过（v${r.version}），断网可用`, ok: true });
      await load();
    } else {
      setMessage({ text: r.error || "下载失败", ok: false });
      await reloadLocal();
    }
  };

  const handleDelete = async (plan: PackUpdatePlan) => {
    if (downloading) return;
    const rec = plan.installed;
    if (!rec) return;
    const ok = window.confirm(`确认删除离线包「${plan.manifestPack.name}」v${rec.version}？删除后需重新下载。`);
    if (!ok) return;
    await remove("OFFLINE_PACK", `${plan.packId}@${rec.version}`);
    setMessage({ text: "已删除", ok: true });
    await load();
  };

  const handleFlush = async () => {
    if (flushing) return;
    setFlushing(true);
    const r = await flushQueue().catch(() => null);
    setFlushing(false);
    if (r && r.flushed > 0) setMessage({ text: `已同步 ${r.flushed} 条离线记录`, ok: true });
    else if (r && r.remained > 0) setMessage({ text: `同步暂不可用（${r.error || "稍后自动重试"}），队列保留 ${r.remained} 条`, ok: false });
    else if (r && r.error) setMessage({ text: `暂未同步：${r.error}`, ok: false });
    else setMessage({ text: "队列为空，无需同步", ok: true });
    setQueueN(await queueSize().catch(() => 0));
  };

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#ededed", display: "flex", flexDirection: "column" }}>
      <BrandHeader title="离线内容" showBack />

      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {/* 离线同步队列 */}
        <div style={{ background: "#fff", borderRadius: "16px", padding: "16px", marginBottom: "12px" }}>
          <div style={{ fontSize: "15px", fontWeight: "bold", color: "#333", marginBottom: "8px" }}>离线学习记录</div>
          <div style={{ fontSize: "13px", color: "#666", marginBottom: "12px", lineHeight: 1.6 }}>
            断网做题、打卡、收藏的记录会在本地排队，联网后自动同步（服务器按事件ID幂等，绝不重复入账）。未同步记录永久保留，清缓存不会触碰。
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: "14px", color: BRAND, fontWeight: "bold" }}>
              待同步：{queueN} 条
            </div>
            <button
              onClick={handleFlush}
              disabled={flushing}
              style={{
                padding: "8px 18px", borderRadius: "10px", border: "none",
                backgroundColor: flushing ? "#e0e0e0" : BRAND,
                color: flushing ? "#999" : "#fff", fontSize: "14px", cursor: "pointer",
              }}
            >
              {flushing ? "同步中..." : "立即同步"}
            </button>
          </div>
        </div>

        {/* 内容包列表 */}
        <div style={{ background: "#fff", borderRadius: "16px", padding: "16px", marginBottom: "12px" }}>
          <div style={{ fontSize: "15px", fontWeight: "bold", color: "#333", marginBottom: "4px" }}>内容包（当前APP v{appVersion}）</div>
          <div style={{ fontSize: "12px", color: "#999", marginBottom: "12px" }}>
            下载后断网可学习；包完整性经 SHA256 校验，校验失败绝不启用
          </div>

          {loading && <div style={{ textAlign: "center", padding: "24px 0", color: "#999", fontSize: "14px" }}>加载中...</div>}

          {!loading && manifestErr && (
            <div style={{ padding: "16px 0", color: "#999", fontSize: "14px", textAlign: "center", lineHeight: 1.6 }}>
              暂时无法获取内容包清单（可能离线）。<br />
              <button onClick={() => void load()} style={{ marginTop: "8px", padding: "6px 16px", borderRadius: "8px", border: "1px solid " + BRAND, color: BRAND, backgroundColor: "#fff", cursor: "pointer" }}>重试</button>
            </div>
          )}

          {!loading && !manifestErr && plans.length === 0 && (
            <div style={{ padding: "16px 0", color: "#999", fontSize: "14px", textAlign: "center" }}>
              当前没有可下载的内容包
            </div>
          )}

          {plans.map((p) => {
            const isDownloading = downloading === p.packId;
            return (
              <div key={p.packId} style={{ borderTop: "1px solid #f0f0f0", padding: "14px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "15px", fontWeight: "bold", color: "#333" }}>
                      {p.manifestPack.name}
                      {p.manifestPack.required && (
                        <span style={{ marginLeft: "6px", fontSize: "11px", color: "#e74c3c" }}>必备</span>
                      )}
                    </div>
                    <div style={{ fontSize: "12px", color: "#999", marginTop: "4px" }}>
                      v{p.manifestPack.version} · {fmtSize(p.manifestPack.size)}
                    </div>
                    {p.manifestPack.description && (
                      <div style={{ fontSize: "12px", color: "#666", marginTop: "6px", lineHeight: 1.5 }}>{p.manifestPack.description}</div>
                    )}
                  </div>
                  <div style={{ flexShrink: 0, textAlign: "right" }}>
                    <div style={{ fontSize: "12px", color: p.action === "UP_TO_DATE" ? "#27ae60" : p.action === "INCOMPATIBLE" ? "#e67e22" : BRAND, marginBottom: "6px" }}>
                      {ACTION_LABEL[p.action]}
                    </div>
                    {p.action === "INCOMPATIBLE" ? (
                      <button disabled style={{ ...btnStyle("#e0e0e0", "#999") }}>不可用</button>
                    ) : p.action === "UP_TO_DATE" ? (
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button disabled style={{ ...btnStyle("#e8f5e9", "#999") }}>已安装</button>
                        <button onClick={() => void handleDelete(p)} style={{ ...btnStyle("#fff", "#e74c3c"), border: "1px solid #f5c6cb" }}>删除</button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                        {p.installed && (
                          <button onClick={() => void handleDelete(p)} style={{ ...btnStyle("#fff", "#e74c3c"), border: "1px solid #f5c6cb" }}>删除</button>
                        )}
                        <button
                          onClick={() => void handleDownload(p)}
                          disabled={!!downloading}
                          style={btnStyle(downloading ? "#e0e0e0" : BRAND, downloading ? "#999" : "#fff")}
                        >
                          {isDownloading ? "下载中" : p.action === "UPDATE" ? "更新" : "下载"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {isDownloading && progress && (
                  <div style={{ marginTop: "10px" }}>
                    <div style={{ height: "6px", borderRadius: "3px", backgroundColor: "#f0f0f0", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(100, Math.round((progress.received / progress.total) * 100))}%`, backgroundColor: BRAND, transition: "width .2s" }} />
                    </div>
                    <div style={{ fontSize: "11px", color: "#999", marginTop: "4px", textAlign: "right" }}>
                      {fmtSize(progress.received)} / {fmtSize(progress.total)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 存储用量 */}
        <div style={{ background: "#fff", borderRadius: "16px", padding: "16px", marginBottom: "12px" }}>
          <div style={{ fontSize: "15px", fontWeight: "bold", color: "#333", marginBottom: "10px" }}>本地存储用量</div>
          {Object.keys(usage).length === 0 && (
            <div style={{ fontSize: "13px", color: "#999" }}>暂无数据</div>
          )}
          {Object.entries(usage).map(([zone, s]) => (
            <div key={zone} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#555", padding: "5px 0", borderBottom: "1px dashed #f0f0f0" }}>
              <span>{ZONE_LABELS[zone] || zone}（{s.entries} 项）</span>
              <span style={{ color: "#333" }}>{s.human}</span>
            </div>
          ))}
          <div style={{ fontSize: "11px", color: "#999", marginTop: "10px", lineHeight: 1.6 }}>
            自动清理只作用于临时缓存与媒体缓存；离线包、私有数据（错题/收藏/进度/未同步队列）永不自动清除。
          </div>
        </div>

        {message && (
          <div style={{
            padding: "12px 16px", borderRadius: "12px", fontSize: "13px", lineHeight: 1.6,
            backgroundColor: message.ok ? "#e8f5e9" : "#fdecea",
            color: message.ok ? "#1b5e20" : "#b71c1c",
          }}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}

function btnStyle(bg: string, color: string): React.CSSProperties {
  return { padding: "7px 16px", borderRadius: "10px", border: "none", backgroundColor: bg, color, fontSize: "13px", cursor: "pointer", whiteSpace: "nowrap" };
}

const ZONE_LABELS: Record<string, string> = {
  TEMP_CACHE: "临时缓存",
  MEDIA_CACHE: "媒体缓存",
  AI_CACHE: "AI会话缓存",
  OFFLINE_PACK: "离线内容包",
  USER_PRIVATE_DATA: "私有数据（红线）",
  SYSTEM_DATA: "系统数据",
};
