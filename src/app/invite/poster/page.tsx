"use client";

// ============================================================================
// P7-MKT-POSTER-02 AI推广助手（第五十七条完整流程）
// 选择我要推广什么 → 分享给谁 → 发到哪里 → 推荐3套 → 预览 → 生成
// → 二维码自测 → 合规自测 → 保存 / 复制文案 / 系统分享
// ============================================================================

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { BrandHeader } from "@/components/shared";
import { PageLoginGuard } from "@/components/PageLoginGuard";
import { useToolBack } from "@/lib/useToolBack";
import { getInviteLink, type InviteLinkData } from "@/lib/inviteApi";
import type {
  AudienceId,
  ChannelId,
  ProductId,
  PosterRequest,
} from "@/lib/marketing/types";
import { AUDIENCE_LIST } from "@/lib/marketing/audiences";
import { PRODUCT_LIST, PRODUCTS } from "@/lib/marketing/products";
import { CHANNEL_LIST, getChannel } from "@/lib/marketing/channels";
import { getRatio, type RecommendationItem } from "@/lib/marketing/recommend";
import { renderPoster, type RenderCheck } from "@/lib/marketing/posterEngine";
import { qrSelfTest, type QrSelfTestResult } from "@/lib/marketing/qrSelfTest";
import { logMarketingEvent } from "@/lib/marketing/logEvents";
import { getDisclaimer } from "@/lib/marketing/copyLibrary";
import {
  buildViralRecs,
  cycleViralTemplate,
  getViralTemplate,
  SHARE_COPY_LIBRARY,
  DEFAULT_SHARE_TEXT,
} from "@/lib/marketing/viralTemplates";

const BRAND = "#7B2FBE";
const GENERIC = "__generic__";
type AudienceChoice = AudienceId | typeof GENERIC;

interface ToastMsg {
  id: number;
  text: string;
  type: "success" | "error" | "info";
}

const STEP_LABELS = ["推广内容", "分享对象", "分享渠道", "生成海报"];

export default function PosterAssistantPage() {
  const { goBack } = useToolBack();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [product, setProduct] = useState<ProductId>("P14");
  const [audience, setAudience] = useState<AudienceChoice>("A03");
  const [channel, setChannel] = useState<ChannelId>("C01");
  const [personalized, setPersonalized] = useState(true);

  const [recs, setRecs] = useState<RecommendationItem[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);

  const [nickname, setNickname] = useState("");
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [showNickname, setShowNickname] = useState(true);
  const [showAvatar, setShowAvatar] = useState(false);

  const [invite, setInvite] = useState<InviteLinkData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");

  const [posterUrl, setPosterUrl] = useState("");
  const [checks, setChecks] = useState<RenderCheck | null>(null);
  const [qrTest, setQrTest] = useState<QrSelfTestResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const posterCache = useRef<Map<string, string>>(new Map());
  // v25.0.47_14: 校验类文字（合规通过/对比度/溢出/二维码自测）仅开发端可见（?dev=1），用户页面保持干净
  const [showDevChecks, setShowDevChecks] = useState(false);

  const showToast = useCallback((text: string, type: ToastMsg["type"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2800);
  }, []);

  // 初始化：昵称 + 模块默认（?product=P02 紫微页分享默认紫微海报，第四十条）+ 签名邀请链接
  useEffect(() => {
    try {
      const profileRaw = localStorage.getItem("yandao_user_profile");
      if (profileRaw) {
        const p = JSON.parse(profileRaw);
        if (p.nickname) setNickname(p.nickname);
      }
    } catch { /* ignore */ }
    try {
      const q = new URLSearchParams(window.location.search);
      if (q.get("dev") === "1") setShowDevChecks(true);
      const p = q.get("product");
      if (p && p in PRODUCTS && PRODUCTS[p as ProductId].enabled) setProduct(p as ProductId);
      const a = q.get("audience");
      if (a && AUDIENCE_LIST.some((x) => x.id === a)) setAudience(a as AudienceId);
      const c = q.get("channel");
      if (c && CHANNEL_LIST.some((x) => x.id === c)) setChannel(c as ChannelId);
    } catch { /* ignore */ }

    (async () => {
      try {
        const linkData = await getInviteLink();
        setInvite(linkData);
        if (linkData?.inviteLink) {
          const QRCode = (await import("qrcode")).default;
          const url = await QRCode.toDataURL(linkData.inviteLink, {
            width: 600,
            margin: 1,
            errorCorrectionLevel: "M",
            color: { dark: "#1F1030", light: "#FFFFFF" },
          });
          setQrDataUrl(url);
        }
      } catch (e) {
        console.error("邀请链接加载失败:", e);
      }
    })();
  }, []);

  const effectiveAudience: AudienceId = audience === GENERIC ? "A03" : audience;

  const buildRecs = useCallback(
    (pers: boolean) => {
      // v25.0.47_14: 裂变模板推荐集——固定3套病毒式传播模板（种草版/引流版/学习版）
      // pers=false（使用通用版）时同样返回3套，activeIdx 固定为 0（模板一种草版）
      const list = buildViralRecs();
      setRecs(list);
      setActiveIdx(pers ? 0 : 0);
    },
    []
  );

  const goStep = useCallback(
    (next: 1 | 2 | 3 | 4) => {
      setStep(next);
      setPosterUrl("");
      setChecks(null);
      setQrTest(null);
      setError("");
      if (next === 4) buildRecs(personalized);
    },
    [buildRecs, personalized]
  );

  // 第四步进入后自动生成当前选中推荐
  useEffect(() => {
    if (step === 4 && recs.length > 0 && !posterUrl && !generating) {
      void doGenerate(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, recs]);

  const renderRec = useCallback(
    async (rec: RecommendationItem, useCache = true) => {
      setGenerating(true);
      setError("");
      try {
        const policy = getChannel(channel);
        const cacheKey = `${rec.variant.id}|${rec.copy.copyId}|${rec.ratio}|${channel}|${showNickname}|${showAvatar}`;
        let dataUrl = useCache ? posterCache.current.get(cacheKey) : undefined;
        if (!dataUrl) {
          const req: PosterRequest = {
            audience: effectiveAudience,
            product,
            channel,
            ratio: rec.ratio,
            variant: rec.variant,
            copy: rec.copy,
            qrDataUrl: policy.qrAllowed ? qrDataUrl : "",
            inviteCode: invite?.inviteCode,
            userNickname: nickname,
            userAvatarUrl: avatarDataUrl,
            showNickname,
            showAvatar,
            price: null, // 第十七条：价格来自商品后台SSOT，未接入前不展示
          };
          const result = await renderPoster(req, policy);
          if (result.complianceBlocked) {
            setError("文案合规校验未通过，请更换风格或文案");
            showToast("文案合规校验未通过，已阻止生成", "error");
            return;
          }
          posterCache.current.set(cacheKey, result.dataUrl);
          setChecks(result.checks);
          dataUrl = result.dataUrl;
        }
        setPosterUrl(dataUrl);

        if (policy.qrAllowed && invite?.inviteLink) {
          const t = await qrSelfTest(dataUrl, invite.inviteLink);
          setQrTest(t);
          if (!t.passed) {
            logMarketingEvent({
              event: "qr_selftest_failed",
              audience: effectiveAudience,
              product,
              channel,
              template: rec.variant.id,
              ratio: rec.ratio,
              copyId: rec.copy.copyId,
            });
          }
        } else {
          setQrTest(null);
        }

        logMarketingEvent({
          event: "poster_generated",
          audience: effectiveAudience,
          product,
          channel,
          template: rec.variant.id,
          ratio: rec.ratio,
          copyId: rec.copy.copyId,
        });
      } catch (e) {
        console.error("海报生成失败:", e);
        setError("生成失败，请重试");
      } finally {
        setGenerating(false);
      }
    },
    [channel, qrDataUrl, invite, nickname, avatarDataUrl, showNickname, showAvatar, effectiveAudience, product, showToast]
  );

  const doGenerate = useCallback(
    async (idx: number) => {
      const rec = recs[idx];
      if (rec) await renderRec(rec);
    },
    [recs, renderRec]
  );

  // 「换一个风格」：v25.0.47_14 循环切换3套裂变海报模板（种草→引流→学习→种草）
  const handleSwitchStyle = useCallback(() => {
    const current = recs[activeIdx];
    if (!current) return;
    const nextT = cycleViralTemplate(current.variant.id);
    const list = [...recs];
    list[activeIdx] = {
      variant: nextT.variant,
      copy: nextT.copy,
      ratio: current.ratio,
      reason: nextT.desc,
    };
    setRecs(list);
    logMarketingEvent({
      event: "style_switched",
      audience: effectiveAudience,
      product,
      channel,
      template: nextT.variant.id,
      copyId: nextT.copy.copyId,
    });
    void renderRec(list[activeIdx], false);
  }, [recs, activeIdx, effectiveAudience, product, channel, renderRec]);

  // 使用通用版（第三十五条：不得把个性化营销设为唯一选择）：回到默认模板一（朋友圈种草版）
  const handleUseGeneric = useCallback(() => {
    setPersonalized(false);
    const list = buildViralRecs();
    setRecs(list);
    setActiveIdx(0);
    setPosterUrl("");
    showToast("已切换为通用版素材（朋友圈种草版）");
  }, [showToast]);

  const saveBlocked = !!qrTest && !qrTest.passed;

  const handleSave = useCallback(async () => {
    if (!posterUrl) return;
    if (saveBlocked) {
      showToast("二维码自测未通过，已禁止保存", "error");
      return;
    }
    try {
      const a = document.createElement("a");
      a.href = posterUrl;
      a.download = `yandao-poster-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      logMarketingEvent({
        event: "poster_saved",
        audience: effectiveAudience,
        product,
        channel,
        template: recs[activeIdx]?.variant.id,
        ratio: recs[activeIdx]?.ratio,
        copyId: recs[activeIdx]?.copy.copyId,
      });
      showToast("海报已保存；若未弹出可长按图片保存");
    } catch {
      showToast("保存失败，可长按海报图片保存", "error");
    }
  }, [posterUrl, saveBlocked, effectiveAudience, product, channel, recs, activeIdx, showToast]);

  const copyText = useCallback(async (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch { /* fall through */ }
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }, []);

  const handleCopy = useCallback(
    async (text: string, label: string) => {
      const ok = await copyText(text);
      showToast(ok ? `${label}已复制` : "复制失败，请手动选择复制", ok ? "success" : "error");
      if (ok) {
        logMarketingEvent({
          event: "copy_copied",
          audience: effectiveAudience,
          product,
          channel,
          copyId: recs[activeIdx]?.copy.copyId,
        });
      }
    },
    [copyText, showToast, effectiveAudience, product, channel, recs, activeIdx]
  );

  // 第三十四条：只记 share_started，不伪造 share_success
  // v25.0.47_14: 系统分享自动带海报图片 + 默认种草文案（模板一配套）
  const handleSystemShare = useCallback(async () => {
    const rec = recs[activeIdx];
    if (!rec) return;
    logMarketingEvent({
      event: "system_share_started",
      audience: effectiveAudience,
      product,
      channel,
      template: rec.variant.id,
      copyId: rec.copy.copyId,
    });
    const shareText = DEFAULT_SHARE_TEXT;
    if (typeof navigator.share === "function") {
      try {
        if (posterUrl && typeof navigator.canShare === "function") {
          try {
            const blob = await (await fetch(posterUrl)).blob();
            const file = new File([blob], "yandao-poster.png", { type: "image/png" });
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({ title: "言道国学", text: shareText, files: [file] });
              return;
            }
          } catch { /* 降级 */ }
        }
        await navigator.share({ title: "言道国学", text: shareText, url: invite?.inviteLink });
      } catch { /* 用户取消 */ }
    } else {
      const ok = await copyText(shareText + (invite?.inviteLink ? "\n" + invite.inviteLink : ""));
      showToast(ok ? "已复制分享文案，可粘贴发送" : "当前浏览器不支持系统分享");
    }
  }, [recs, activeIdx, posterUrl, invite, effectiveAudience, product, channel, copyText, showToast]);

  const policy = getChannel(channel);
  const activeRec = recs[activeIdx];

  const stepChips = useMemo(
    () => [
      { label: PRODUCTS[product].name, done: step > 1 },
      { label: audience === GENERIC ? "通用朋友" : AUDIENCE_LIST.find((a) => a.id === audience)?.name || "", done: step > 2 },
      { label: policy.name, done: step > 3 },
    ],
    [product, audience, channel, step, policy]
  );

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5", display: "flex", flexDirection: "column" }}>
      <PageLoginGuard />
      <BrandHeader title="AI推广助手" showBack color={BRAND} onBack={goBack} />

      <div style={{ flex: 1, overflowY: "auto", padding: `14px 16px calc(90px + var(--bottom-nav-height, 56px) + env(safe-area-inset-bottom, 0px))` }}>
        {/* 步骤指示 */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "14px" }}>
          {STEP_LABELS.map((label, i) => {
            const n = (i + 1) as 1 | 2 | 3 | 4;
            const active = step === n;
            const done = step > n;
            return (
              <div key={label} style={{ flex: 1, textAlign: "center" }}>
                <div
                  onClick={() => (done || (n === 4 && step > 3) ? goStep(Math.min(n, step) as 1 | 2 | 3 | 4) : undefined)}
                  style={{
                    width: "26px",
                    height: "26px",
                    margin: "0 auto 4px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "13px",
                    fontWeight: 700,
                    backgroundColor: active ? BRAND : done ? "#E8DAF6" : "#e5e5e5",
                    color: active ? "#fff" : done ? BRAND : "#aaa",
                    cursor: done ? "pointer" : "default",
                  }}
                >
                  {done ? "✓" : n}
                </div>
                <div style={{ fontSize: "10px", color: active ? BRAND : "#999" }}>{label}</div>
              </div>
            );
          })}
        </div>

        {/* 已选摘要（可点击回改） */}
        {step > 1 && (
          <div style={{ display: "flex", gap: "6px", marginBottom: "12px", flexWrap: "wrap" }}>
            {stepChips.map((c, i) => (
              <span
                key={i}
                onClick={() => step > i + 1 && goStep((i + 1) as 1 | 2 | 3)}
                style={{
                  fontSize: "11px",
                  padding: "3px 10px",
                  borderRadius: "12px",
                  backgroundColor: "#fff",
                  color: "#555",
                  border: "1px solid #e5e5e5",
                  cursor: step > i + 1 ? "pointer" : "default",
                }}
              >
                {c.label}
              </span>
            ))}
          </div>
        )}

        {/* ===== 第1步：我要推广什么 ===== */}
        {step === 1 && (
          <SectionCard title="我要推广什么" desc="选择要分享给朋友的产品模块">
            {PRODUCT_LIST.map((p) => (
              <OptionRow
                key={p.id}
                selected={product === p.id}
                onClick={() => setProduct(p.id)}
                title={p.name}
                desc={p.desc}
              />
            ))}
          </SectionCard>
        )}

        {/* ===== 第2步：我准备分享给谁 ===== */}
        {step === 2 && (
          <SectionCard title="我准备分享给谁" desc="你主动选择分享对象，AI只做建议不猜测（第二条）">
            {AUDIENCE_LIST.map((a) => (
              <OptionRow
                key={a.id}
                selected={audience === a.id}
                onClick={() => {
                  setAudience(a.id);
                  setPersonalized(true);
                }}
                title={a.name}
                desc={a.desc}
              />
            ))}
            <OptionRow
              selected={audience === GENERIC}
              onClick={() => setAudience(GENERIC)}
              title="通用朋友（不区分圈层）"
              desc="使用通用版素材，不做个性化推荐"
            />
          </SectionCard>
        )}

        {/* ===== 第3步：准备发到哪里 ===== */}
        {step === 3 && (
          <SectionCard title="准备发到哪里" desc="不同渠道自动适配二维码/文案规则（第七条）">
            {CHANNEL_LIST.map((c) => (
              <OptionRow
                key={c.id}
                selected={channel === c.id}
                onClick={() => setChannel(c.id)}
                title={`${c.icon} ${c.name}`}
                desc={c.qrAllowed ? c.desc : `${c.desc} · 内容种草图（无站外二维码）`}
                badge={c.qrAllowed ? undefined : "无二维码"}
              />
            ))}
          </SectionCard>
        )}

        {/* ===== 第4步：推荐与生成 ===== */}
        {step === 4 && (
          <>
            {/* 推荐3套 */}
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#333", margin: "2px 2px 10px" }}>
              为你推荐 {recs.length} 套海报
              <span style={{ fontSize: "11px", fontWeight: 400, color: "#999", marginLeft: "8px" }}>
                {personalized ? "个性化推荐" : "通用版"}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "14px" }}>
              {recs.map((r, i) => (
                <div
                  key={r.variant.id}
                  onClick={() => {
                    setActiveIdx(i);
                    if (i !== activeIdx) {
                      setPosterUrl("");
                      setTimeout(() => void doGenerate(i), 0);
                    }
                  }}
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: "12px",
                    padding: "12px 14px",
                    border: activeIdx === i ? `2px solid ${BRAND}` : "1px solid #e8e8e8",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "10px",
                      flexShrink: 0,
                      background: `linear-gradient(135deg, ${r.variant.palette.bg[0]}, ${r.variant.palette.bg[1]})`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "16px",
                      color: r.variant.palette.text,
                      fontWeight: 700,
                    }}
                  >
                    {r.variant.family}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#333" }}>
                      {r.variant.name}
                      <span style={{ fontSize: "10px", color: "#999", marginLeft: "6px", fontWeight: 400 }}>
                        {getRatio(r.ratio).label}
                      </span>
                    </div>
                    <div style={{ fontSize: "11px", color: "#999", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.reason}
                    </div>
                  </div>
                  {activeIdx === i && <span style={{ color: BRAND, fontSize: "18px" }}>✓</span>}
                </div>
              ))}
            </div>

            {/* 隐私开关（第十四/三十七条） */}
            <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "14px 16px", marginBottom: "12px" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#333", marginBottom: "8px" }}>个人信息展示（默认仅昵称）</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <ToggleRow
                  label="在海报展示我的昵称"
                  checked={showNickname}
                  onChange={(v) => {
                    setShowNickname(v);
                    setPosterUrl("");
                  }}
                />
                <ToggleRow
                  label="在海报展示我的头像"
                  checked={showAvatar}
                  onChange={(v) => {
                    setShowAvatar(v);
                    setPosterUrl("");
                  }}
                  hint={avatarDataUrl ? undefined : "当前账号暂无头像图片，开启后仅显示昵称"}
                />
              </div>
              <div style={{ fontSize: "10px", color: "#bbb", marginTop: "6px" }}>
                头像属于个人信息，未经你主动开启不会在海报中展示
              </div>
            </div>

            {/* 海报预览 */}
            <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "16px", marginBottom: "12px", textAlign: "center" }}>
              {generating ? (
                <div style={{ padding: "40px 0", color: "#999", fontSize: "14px" }}>海报生成中...</div>
              ) : error ? (
                <div style={{ padding: "30px 0", color: "#e74c3c", fontSize: "13px" }}>
                  {error}
                  <button onClick={() => void doGenerate(activeIdx)} style={{ marginTop: "10px", padding: "6px 18px", borderRadius: "16px", border: "1px solid #ddd", backgroundColor: "#fff", color: "#555", fontSize: "12px" }}>
                    重试
                  </button>
                </div>
              ) : posterUrl ? (
                <>
                  <img
                    src={posterUrl}
                    alt="推广海报"
                    style={{ width: "100%", maxWidth: "300px", borderRadius: "10px", boxShadow: "0 4px 14px rgba(0,0,0,0.12)" }}
                  />
                  {/* 自检结果：v25.0.47_14 起仅开发端（?dev=1）可见，用户页面不展示校验类文字 */}
                  {showDevChecks && (
                    <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "4px", textAlign: "left", fontSize: "11px", color: "#666" }}>
                      <CheckLine ok label="文案合规校验通过" />
                      <CheckLine ok={!!checks?.textContrastOk} label="文字对比度检查" />
                      <CheckLine ok={!!checks?.overflowOk} label="内容溢出检查" />
                      <CheckLine ok={!!checks?.safeAreaOk} label="安全区检查" />
                      {policy.qrAllowed ? (
                        qrTest ? (
                          <CheckLine ok={qrTest.passed} label={qrTest.passed ? "二维码解码自测通过（链接一致）" : `二维码自测未通过：${qrTest.reason}`} />
                        ) : (
                          <CheckLine ok={false} label="二维码自测中..." />
                        )
                      ) : (
                        <CheckLine ok label="内容种草图（本渠道不展示站外二维码）" />
                      )}
                      {checks?.warnings && checks.warnings.length > 0 && (
                        <div style={{ color: "#c0392b", fontSize: "10px" }}>警告：{checks.warnings.join("；")}</div>
                      )}
                    </div>
                  )}
                  <div style={{ fontSize: "10px", color: "#bbb", marginTop: "8px" }}>
                    保存后可直接发朋友圈 / 群聊；微信内长按海报图片也能保存
                  </div>
                </>
              ) : null}
            </div>

            {/* 操作按钮 */}
            {posterUrl && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
                  <button onClick={handleSwitchStyle} disabled={generating} style={secondaryBtn}>换一个风格</button>
                  <button onClick={handleUseGeneric} disabled={generating || !personalized} style={secondaryBtn}>
                    {personalized ? "使用通用版" : "已通用版"}
                  </button>
                </div>
                <button
                  onClick={handleSave}
                  disabled={generating || saveBlocked}
                  style={{
                    width: "100%",
                    padding: "13px 0",
                    borderRadius: "12px",
                    border: "none",
                    backgroundColor: saveBlocked ? "#ccc" : BRAND,
                    color: "#fff",
                    fontSize: "15px",
                    fontWeight: 600,
                    cursor: saveBlocked ? "not-allowed" : "pointer",
                    marginBottom: "10px",
                  }}
                >
                  {saveBlocked ? "二维码校验未通过，请重新生成" : "保存海报图片"}
                </button>

                {/* v25.0.47_14 全场景分享文案库（4套一键复制，替换原渠道文案） */}
                <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "14px 16px", marginBottom: "10px" }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#333", marginBottom: "4px" }}>
                    全场景分享文案
                  </div>
                  <div style={{ fontSize: "11px", color: "#999", marginBottom: "10px" }}>
                    按场景一键复制，配合海报发朋友圈/群聊/好友
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {SHARE_COPY_LIBRARY.map((sc) => (
                      <CopyBlock
                        key={sc.id}
                        title={sc.title}
                        text={sc.text}
                        onCopy={() => handleCopy(sc.text, sc.title)}
                      />
                    ))}
                  </div>
                  <div style={{ fontSize: "10px", color: "#bbb", marginTop: "10px" }}>
                    邀请奖励以平台活动规则为准：邀请朋友一起使用，符合活动规则可获得平台活动权益。
                  </div>
                </div>

                <button onClick={handleSystemShare} disabled={generating} style={{ ...secondaryBtn, width: "100%", padding: "12px 0" }}>
                  系统分享（海报 + 文案）
                </button>
              </>
            )}
          </>
        )}
      </div>

      {/* 底部导航按钮 */}
      <div
        style={{
          position: "fixed",
          bottom: "calc(var(--bottom-nav-height, 56px) + env(safe-area-inset-bottom, 0px))",
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: "420px",
          padding: "10px 16px",
          backgroundColor: "#fff",
          borderTop: "1px solid #eee",
          display: "flex",
          gap: "10px",
          zIndex: 50,
        }}
      >
        {step > 1 && (
          <button
            onClick={() => goStep((step - 1) as 1 | 2 | 3)}
            style={{ flex: 1, padding: "12px 0", borderRadius: "12px", border: "1px solid #ddd", backgroundColor: "#fff", color: "#555", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}
          >
            上一步
          </button>
        )}
        {step < 4 ? (
          <button
            onClick={() => goStep((step + 1) as 2 | 3 | 4)}
            style={{ flex: 2, padding: "12px 0", borderRadius: "12px", border: "none", backgroundColor: BRAND, color: "#fff", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}
          >
            {step === 3 ? "生成推荐海报" : "下一步"}
          </button>
        ) : (
          <button
            onClick={() => void doGenerate(activeIdx)}
            disabled={generating}
            style={{ flex: 2, padding: "12px 0", borderRadius: "12px", border: "none", backgroundColor: generating ? "#ccc" : BRAND, color: "#fff", fontSize: "14px", fontWeight: 600, cursor: generating ? "not-allowed" : "pointer" }}
          >
            {generating ? "生成中..." : "重新生成"}
          </button>
        )}
      </div>

      {/* Toast */}
      {toasts.length > 0 && (
        <div style={{ position: "fixed", top: "45%", left: "50%", transform: "translate(-50%, -50%)", display: "flex", flexDirection: "column", gap: "8px", alignItems: "center", zIndex: 1000, pointerEvents: "none" }}>
          {toasts.map((t) => (
            <div
              key={t.id}
              style={{
                padding: "12px 20px",
                borderRadius: "10px",
                backgroundColor: t.type === "success" ? "rgba(0,128,0,0.92)" : t.type === "error" ? "rgba(231,76,60,0.92)" : "rgba(51,51,51,0.92)",
                color: "#fff",
                fontSize: "13px",
                maxWidth: "300px",
                textAlign: "center",
              }}
            >
              {t.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 子组件
// ---------------------------------------------------------------------------

function SectionCard({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "16px" }}>
      <div style={{ fontSize: "15px", fontWeight: 700, color: "#333" }}>{title}</div>
      <div style={{ fontSize: "11px", color: "#999", margin: "4px 0 12px" }}>{desc}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>{children}</div>
    </div>
  );
}

function OptionRow({
  selected, onClick, title, desc, badge,
}: { selected: boolean; onClick: () => void; title: string; desc: string; badge?: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "11px 12px",
        borderRadius: "10px",
        border: selected ? `2px solid ${BRAND}` : "1px solid #e5e5e5",
        backgroundColor: selected ? `${BRAND}08` : "#fff",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "14px", fontWeight: 600, color: "#333" }}>{title}</div>
        <div style={{ fontSize: "11px", color: "#999", marginTop: "2px" }}>{desc}</div>
      </div>
      {badge && (
        <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "10px", backgroundColor: "#FFF3E0", color: "#E65100", flexShrink: 0 }}>
          {badge}
        </span>
      )}
      {selected && <span style={{ color: BRAND, fontSize: "17px", flexShrink: 0 }}>✓</span>}
    </button>
  );
}

function ToggleRow({
  label, checked, onChange, hint,
}: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div>
        <div style={{ fontSize: "13px", color: "#333" }}>{label}</div>
        {hint && <div style={{ fontSize: "10px", color: "#bbb", marginTop: "2px" }}>{hint}</div>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: "44px",
          height: "24px",
          borderRadius: "12px",
          border: "none",
          backgroundColor: checked ? BRAND : "#ddd",
          position: "relative",
          cursor: "pointer",
          transition: "background-color 0.2s",
        }}
        aria-pressed={checked}
      >
        <span
          style={{
            position: "absolute",
            top: "2px",
            left: checked ? "22px" : "2px",
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            backgroundColor: "#fff",
            transition: "left 0.2s",
            display: "block",
          }}
        />
      </button>
    </div>
  );
}

function CheckLine({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <span style={{ color: ok ? "#1e8e5a" : "#e74c3c", fontSize: "12px" }}>{ok ? "✓" : "✗"}</span>
      <span style={{ color: ok ? "#555" : "#c0392b" }}>{label}</span>
    </div>
  );
}

function CopyBlock({ title, text, onCopy }: { title: string; text: string; onCopy: () => void }) {
  return (
    <div style={{ backgroundColor: "#fafafa", borderRadius: "10px", padding: "10px 12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
        <span style={{ fontSize: "12px", fontWeight: 600, color: "#555" }}>{title}</span>
        <button
          onClick={onCopy}
          style={{ fontSize: "11px", padding: "4px 12px", borderRadius: "12px", border: `1px solid ${BRAND}55`, backgroundColor: `${BRAND}08`, color: BRAND, cursor: "pointer" }}
        >
          复制
        </button>
      </div>
      <div style={{ fontSize: "12px", color: "#444", lineHeight: 1.7 }}>{text}</div>
    </div>
  );
}

const secondaryBtn: React.CSSProperties = {
  padding: "11px 0",
  borderRadius: "12px",
  border: "1px solid #d5c7ea",
  backgroundColor: "#fff",
  color: BRAND,
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
};

/** 渠道适配分享正文（第八/九/十条） */
function getShareTextForChannel(rec: RecommendationItem, channelId: ChannelId): string {
  const policy = getChannel(channelId);
  if (policy.copyFormat === "group") return rec.copy.groupCopy;
  if (policy.copyFormat === "private") return rec.copy.privateCopies[0]?.text ?? rec.copy.momentsCopy;
  return rec.copy.momentsCopy;
}
