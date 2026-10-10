import type { Metadata } from "next";
import { SocialDisabledGuard } from "@/components/SocialDisabledGuard";
import { PUBLIC_SOCIAL_ENABLED } from "@/lib/releaseFeatures";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return PUBLIC_SOCIAL_ENABLED ? children : <SocialDisabledGuard />;
}
