export interface SalesPromotionConfig {
  id: string;
  revision: number;
  name: string;
  enabled: boolean;
  discountPercent: number;
  startsAt: string | null;
  endsAt: string | null;
  productTypes: string[];
  active?: boolean;
}

export function isPromotionActiveFor(config: SalesPromotionConfig | null | undefined, type: string, now = Date.now()): boolean {
  return !!(config?.enabled && config.productTypes.includes(type) && (!config.startsAt || now >= Date.parse(config.startsAt)) && (!config.endsAt || now < Date.parse(config.endsAt)));
}
