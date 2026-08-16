"use client";

import React, { useCallback, useEffect, useState } from "react";
import { BrandHeader } from "@/components/shared";
import {
  fetchMyCertificates,
  verifyCertificate,
  LEVEL_NAMES,
  type CertificateVo,
} from "@/lib/academyApi";
import { PageLoginGuard } from "@/components/PageLoginGuard";

const BRAND = "#7B2FBE";

export default function CertificatesPage() {
  const [certs, setCerts] = useState<CertificateVo[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  // 公开验真
  const [verifyNo, setVerifyNo] = useState("");
  const [verifyResult, setVerifyResult] = useState<null | { ok: boolean; message: string; cert?: CertificateVo }>(null);
  const [verifying, setVerifying] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetchMyCertificates();
      if (r && r.success && r.certificates) setCerts(r.certificates);
      else setCerts([]);
    } catch {
      setCerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleVerify = async () => {
    const no = verifyNo.trim().toUpperCase();
    if (!no) { showToast("请输入证书编号"); return; }
    setVerifying(true);
    setVerifyResult(null);
    try {
      const r = await verifyCertificate(no);
      if (r && r.success) {
        setVerifyResult({ ok: !!r.valid, message: r.message || (r.valid ? "证书有效" : "证书无效"), cert: r.certificate });
      } else {
        setVerifyResult({ ok: false, message: (r && r.error) || "证书编号不存在" });
      }
    } catch {
      setVerifyResult({ ok: false, message: "网络异常，请重试" });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      <PageLoginGuard />
      <BrandHeader title="我的证书" showBack backUrl="/academy" />

      <div className="px-3 py-3 pb-24">
        {/* 我的证书列表 */}
        <p className="mb-2 px-1 text-xs font-bold text-gray-500">我的证书（{certs.length}）</p>
        {loading ? (
          <div className="rounded-2xl bg-white p-6 text-center text-xs text-gray-400 shadow-sm">加载中...</div>
        ) : certs.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="text-2xl">🏅</p>
            <p className="mt-2 text-sm text-gray-500">暂无证书</p>
            <p className="mt-1 text-xs text-gray-400">通过等级考试后自动颁发电子证书</p>
          </div>
        ) : (
          <div className="space-y-3">
            {certs.map((c) => {
              const expired = c.expireAt && new Date(c.expireAt) < new Date();
              return (
                <div
                  key={c.id}
                  className="overflow-hidden rounded-2xl bg-white shadow-sm"
                  style={{ border: "1px solid " + BRAND + "22" }}
                >
                  {/* 证书头 */}
                  <div className="flex items-center justify-between px-4 py-3" style={{ background: `linear-gradient(135deg, ${BRAND}, #9B59B6)` }}>
                    <div>
                      <p className="text-[10px] tracking-widest text-white/70">YANDAO CERTIFICATE</p>
                      <p className="mt-0.5 text-sm font-bold text-white">言道国学认证证书</p>
                    </div>
                    <span className="text-2xl">🏅</span>
                  </div>
                  {/* 证书体 */}
                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-base font-bold text-gray-800">{c.title}</p>
                        <p className="mt-0.5 text-[11px] text-gray-400">
                          {c.trackName}赛道 · {LEVEL_NAMES[c.level] || `${c.level}级`}
                        </p>
                      </div>
                      <span
                        className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
                        style={
                          expired
                            ? { backgroundColor: "#e74c3c15", color: "#e74c3c" }
                            : c.status === "valid"
                              ? { backgroundColor: "#27ae6018", color: "#27ae60" }
                              : { backgroundColor: "#f0f0f0", color: "#999" }
                        }
                      >
                        {expired ? "已过复核期" : c.status === "valid" ? "有效" : c.status}
                      </span>
                    </div>
                    <div className="mt-3 space-y-1.5 rounded-xl bg-gray-50 p-3">
                      <p className="text-[11px] text-gray-500">
                        持证人：<span className="font-medium text-gray-700">{c.userName}</span>
                      </p>
                      <p className="text-[11px] text-gray-500">
                        证书编号：<span className="font-mono font-medium text-gray-700">{c.certNo}</span>
                      </p>
                      <p className="text-[11px] text-gray-500">
                        颁发日期：<span className="font-medium text-gray-700">{c.issuedAt}</span>
                      </p>
                      <p className="text-[11px] text-gray-500">
                        有效期：
                        <span className="font-medium" style={{ color: c.expireAt ? "#e67e22" : "#27ae60" }}>
                          {c.expireAt ? `${c.expireAt}（2 年复核制）` : "永久有效"}
                        </span>
                      </p>
                    </div>
                    {c.expireAt && !expired && (
                      <p className="mt-2 rounded-lg bg-orange-50 p-2 text-[10px] leading-relaxed text-orange-600">
                        高级证书实行 2 年复核制：到期前需完成对应学时与复核考试，未达标将自动降级
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 公开验真 */}
        <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-sm font-bold text-gray-800">证书验真</p>
          <p className="mt-1 text-[10px] text-gray-400">输入证书编号（如 YA-2026-TCM-000001）公开查询真伪，无需登录</p>
          <div className="mt-3 flex gap-2">
            <input
              value={verifyNo}
              onChange={(e) => setVerifyNo(e.target.value)}
              placeholder="YA-2026-XXX-000001"
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 font-mono text-xs text-gray-700 outline-none focus:border-purple-400"
            />
            <button
              onClick={handleVerify}
              disabled={verifying}
              className="shrink-0 rounded-xl px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"
              style={{ backgroundColor: BRAND }}
            >
              {verifying ? "查询中" : "验真"}
            </button>
          </div>

          {verifyResult && (
            <div
              className="mt-3 rounded-xl p-3"
              style={{ backgroundColor: verifyResult.ok ? "#27ae6008" : "#e74c3c06", border: "1px solid " + (verifyResult.ok ? "#27ae6033" : "#e74c3c33") }}
            >
              <p className="text-xs font-bold" style={{ color: verifyResult.ok ? "#27ae60" : "#e74c3c" }}>
                {verifyResult.ok ? "✅ " : "❌ "}
                {verifyResult.message}
              </p>
              {verifyResult.cert && (
                <div className="mt-2 space-y-1 text-[11px] text-gray-600">
                  <p>持证人：{verifyResult.cert.userName}</p>
                  <p>认证头衔：{verifyResult.cert.title}</p>
                  <p>赛道：{verifyResult.cert.trackName} · {LEVEL_NAMES[verifyResult.cert.level]}</p>
                  <p>颁发日期：{verifyResult.cert.issuedAt}</p>
                  {verifyResult.cert.expireAt && <p>有效期至：{verifyResult.cert.expireAt}</p>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className="fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-xs text-white shadow-lg" style={{ backgroundColor: "rgba(0,0,0,0.75)" }}>
          {toast}
        </div>
      )}
      <div className="page-bottom-nav-safe" aria-hidden="true" />
    </div>
  );
}
