/**
 * Store-review release switches.
 *
 * The owner supplied public-security assessment approval on 2026-10-23.
 * Clients include the declared social UI; server feature controls, moderation,
 * reporting and account checks remain authoritative for availability.
 */
export const STORE_CHANNEL = process.env.NEXT_PUBLIC_STORE_CHANNEL || "default";
export const IS_GOOGLE_PLAY_BUILD = STORE_CHANNEL === "google";
export const IS_IOS_FULL_BUILD = STORE_CHANNEL === "ios-full-learning";
export const CLIENT_VERSION = "25.0.115";
export const PUBLIC_SOCIAL_ENABLED = true;
export const PUBLIC_AI_ENABLED = STORE_CHANNEL !== "tencent";
// Existing commission/recruitment promotion is not a learning-poster feature.
// The new iOS client keeps it out while its business model/IAP response is audited.
export const PUBLIC_PROMOTION_ENABLED = STORE_CHANNEL !== "tencent" && !IS_IOS_FULL_BUILD;

