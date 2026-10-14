/**
 * Store-review release switches.
 *
 * Domestic public social publishing stays disabled until the public-security
 * safety assessment is approved. Google Play keeps the established UGC
 * experience with automatic moderation, reporting and user blocking.
 */
export const STORE_CHANNEL = process.env.NEXT_PUBLIC_STORE_CHANNEL || "default";
export const IS_GOOGLE_PLAY_BUILD = STORE_CHANNEL === "google";
export const PUBLIC_SOCIAL_ENABLED = IS_GOOGLE_PLAY_BUILD;
export const PUBLIC_AI_ENABLED = STORE_CHANNEL !== "tencent";
export const PUBLIC_PROMOTION_ENABLED = STORE_CHANNEL !== "tencent";

