// ============================================================================
// P7-MKT-POSTER-02 Channel 渠道政策（第七条/第四十二条 PosterChannelPolicy）
// 小红书默认禁用站外二维码与联系方式（第十一/四十三条）
// 政策变化改配置即可，无需发版
// ============================================================================

import type { ChannelPolicy, ChannelId } from "./types";

export const CHANNELS: Record<ChannelId, ChannelPolicy> = {
  C01: {
    id: "C01",
    name: "微信朋友圈",
    icon: "朋友圈",
    qrAllowed: true,
    externalLinkAllowed: true,
    referralCopyAllowed: true,
    priceAllowed: true,
    maxCopyLength: 150,
    requiredDisclaimer: true,
    copyFormat: "moments",
    desc: "图片决定停留：主标题≤14字，卖点最多3条",
  },
  C02: {
    id: "C02",
    name: "微信私聊",
    icon: "私聊",
    qrAllowed: true,
    externalLinkAllowed: true,
    referralCopyAllowed: true,
    priceAllowed: true,
    maxCopyLength: 120,
    requiredDisclaimer: false,
    copyFormat: "private",
    desc: "自然口吻推荐，不能像广告群发",
  },
  C03: {
    id: "C03",
    name: "微信群",
    icon: "群聊",
    qrAllowed: true,
    externalLinkAllowed: true,
    referralCopyAllowed: true,
    priceAllowed: true,
    maxCopyLength: 60,
    requiredDisclaimer: true,
    copyFormat: "group",
    desc: "一眼看懂：一句话价值+二维码，20-60字",
  },
  C04: {
    id: "C04",
    name: "QQ私聊",
    icon: "私聊",
    qrAllowed: true,
    externalLinkAllowed: true,
    referralCopyAllowed: true,
    priceAllowed: true,
    maxCopyLength: 120,
    requiredDisclaimer: false,
    copyFormat: "private",
    desc: "自然口吻，四种语气可选",
  },
  C05: {
    id: "C05",
    name: "QQ群",
    icon: "群聊",
    qrAllowed: true,
    externalLinkAllowed: true,
    referralCopyAllowed: true,
    priceAllowed: true,
    maxCopyLength: 60,
    requiredDisclaimer: true,
    copyFormat: "group",
    desc: "短文案20-60字，禁止刷屏",
  },
  C06: {
    id: "C06",
    name: "小红书",
    icon: "种草",
    qrAllowed: false,
    externalLinkAllowed: false,
    referralCopyAllowed: false,
    priceAllowed: false,
    maxCopyLength: 200,
    requiredDisclaimer: true,
    copyFormat: "moments",
    desc: "站外二维码/联系方式默认禁用，仅内容种草图",
  },
  C07: {
    id: "C07",
    name: "APP内分享",
    icon: "分享",
    qrAllowed: true,
    externalLinkAllowed: true,
    referralCopyAllowed: true,
    priceAllowed: true,
    maxCopyLength: 150,
    requiredDisclaimer: false,
    copyFormat: "generic",
    desc: "站内传播，标准素材",
  },
  C08: {
    id: "C08",
    name: "保存到相册",
    icon: "相册",
    qrAllowed: true,
    externalLinkAllowed: true,
    referralCopyAllowed: true,
    priceAllowed: true,
    maxCopyLength: 150,
    requiredDisclaimer: true,
    copyFormat: "none",
    desc: "完整版海报，含二维码与免责声明",
  },
  C09: {
    id: "C09",
    name: "线下二维码",
    icon: "线下",
    qrAllowed: true,
    externalLinkAllowed: true,
    referralCopyAllowed: false,
    priceAllowed: true,
    maxCopyLength: 40,
    requiredDisclaimer: true,
    copyFormat: "none",
    desc: "超大二维码，信息极简",
  },
  C10: {
    id: "C10",
    name: "通用图片分享",
    icon: "图片",
    qrAllowed: true,
    externalLinkAllowed: true,
    referralCopyAllowed: true,
    priceAllowed: true,
    maxCopyLength: 150,
    requiredDisclaimer: true,
    copyFormat: "generic",
    desc: "通用场景图片素材",
  },
};

export const CHANNEL_LIST = Object.values(CHANNELS);

export function getChannel(id: ChannelId): ChannelPolicy {
  return CHANNELS[id] ?? CHANNELS.C10;
}

/** 渠道是否允许在海报上渲染二维码 */
export function channelAllowsQr(id: ChannelId): boolean {
  return getChannel(id).qrAllowed;
}
