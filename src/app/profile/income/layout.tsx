import StoreFeatureUnavailable from "@/components/StoreFeatureUnavailable";
import { PUBLIC_PROMOTION_ENABLED } from "@/lib/releaseFeatures";
export default function Layout({ children }: { children: React.ReactNode }) { return PUBLIC_PROMOTION_ENABLED ? children : <StoreFeatureUnavailable />; }
