"use client";
import { useToolMatrix } from "@/lib/sectionGate";
import { getMembershipStatus, isSuperAccount } from "@/lib/membershipStore";

function safeUrl(value: string | undefined, image = false): string {
  if (!value || value.length > 1500 || /[\x00-\x20\\]/.test(value)) return "";
  if (!image && /^\/(?:academy|zhongyi|books|yixue)(?:[/?#]|$)/.test(value)) return value;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port && url.port !== "443") return "";
    if (image && !["yandaoguoxue.yandao.vip", "www.yandao.vip", "yandao.vip"].includes(url.hostname)) return "";
    if (!image && (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(url.hostname) || /\.(?:local|internal|localhost)$/i.test(url.hostname))) return "";
    return value;
  } catch { return ""; }
}

/** Static, labelled sponsor placement. No remote scripts, tracking SDK or autoplay. */
export function ContentSponsor({ toolId }: { toolId: string }) {
  const { tools } = useToolMatrix();
  const entry = tools[toolId];
  const member = getMembershipStatus();
  if (!entry?.adEnabled || !entry.adTitle?.trim() || isSuperAccount() || (member.isActive && member.level !== "basic")) return null;
  const image = safeUrl(entry.adImageUrl, true), href = safeUrl(entry.adLinkUrl);
  const card = <><span style={{ fontSize: 10, color: "#757575" }}>广告</span><strong style={{ display: "block", margin: "5px 0", fontSize: 14 }}>{entry.adTitle}</strong>{image && <img src={image} alt={entry.adTitle} loading="lazy" referrerPolicy="no-referrer" style={{ display: "block", maxWidth: "100%", maxHeight: 220, borderRadius: 8, objectFit: "contain" }} />}</>;
  return <aside aria-label="学习页面广告" style={{ maxWidth: 420, margin: "12px auto 24px", padding: 14, border: "1px solid #deded3", borderRadius: 12, background: "#fafaf5", color: "#35453c" }}>
    {href ? <a href={href} target={href.startsWith("https:") ? "_blank" : undefined} rel="noopener noreferrer sponsored" style={{ color: "inherit", textDecoration: "none" }}>{card}</a> : card}
  </aside>;
}
