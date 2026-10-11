/**
 * Store-review release switches.
 *
 * Public social publishing stays disabled until the public-security safety
 * assessment is approved. Private learning, AI, records and sharing remain on.
 */
export const PUBLIC_SOCIAL_ENABLED = false;

/** Channel-specific review switches. */
export const STORE_CHANNEL = process.env.NEXT_PUBLIC_STORE_CHANNEL || "default";
export const PUBLIC_AI_ENABLED = STORE_CHANNEL !== "tencent";
export const PUBLIC_PROMOTION_ENABLED = STORE_CHANNEL !== "tencent";

