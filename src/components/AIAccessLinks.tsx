"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { IS_GOOGLE_PLAY_BUILD, IS_IOS_FULL_BUILD } from "@/lib/releaseFeatures";
import { isPaymentsBlocked, PAYMENT_DISABLED_TIP } from "@/lib/platformGate";

/** Every tool uses the existing channel-specific store, never an external iOS checkout. */
export function AIAccessLinks() {
  const [blocked, setBlocked] = useState(IS_GOOGLE_PLAY_BUILD);
  useEffect(() => setBlocked(isPaymentsBlocked()), []);
  if (IS_GOOGLE_PLAY_BUILD || (blocked && !IS_IOS_FULL_BUILD)) return <p role="status">{PAYMENT_DISABLED_TIP}</p>;
  return <div data-testid="ai-access-links" style={{padding:12,lineHeight:1.8,fontSize:13}}>
    <p>{IS_IOS_FULL_BUILD ? "通过App Store购买会员或AI点数；已付款可在购买页恢复购买，无需重复付款。" : "会员与AI点数按账号使用，购买后返回本工具重新核对额度。"}</p>
    <nav aria-label="AI购买与权益" style={{display:"flex",gap:14,flexWrap:"wrap"}}>
      <Link href="/membership">会员与恢复购买</Link><Link href="/ai-credits">购买AI点数</Link>
      <Link href="/profile/feedback">购买问题反馈</Link>
    </nav>
  </div>;
}
