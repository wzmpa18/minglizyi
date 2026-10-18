/**
 * Store-review release switches.
 *
 * Domestic public social publishing stays disabled until the public-security
 * safety assessment is approved. Google Play keeps the established UGC
 * experience with automatic moderation, reporting and user blocking.
 */
export const STORE_CHANNEL = process.env.NEXT_PUBLIC_STORE_CHANNEL || "default";
export const IS_GOOGLE_PLAY_BUILD = STORE_CHANNEL === "google";
export const IS_IOS_FULL_BUILD = STORE_CHANNEL === "ios-full-learning";
export const CLIENT_VERSION = "25.0.115";
export const PUBLIC_SOCIAL_ENABLED = IS_GOOGLE_PLAY_BUILD || IS_IOS_FULL_BUILD;
export const PUBLIC_AI_ENABLED = STORE_CHANNEL !== "tencent";
// Existing commission/recruitment promotion is not a learning-poster feature.
// The new iOS client keeps it out while its business model/IAP response is audited.
export const PUBLIC_PROMOTION_ENABLED = STORE_CHANNEL !== "tencent" && !IS_IOS_FULL_BUILD;

