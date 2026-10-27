'use client';
import type {ReactNode} from 'react';
import {PUBLIC_PROMOTION_ENABLED} from '@/lib/releaseFeatures';
import ShareCodePage from '@/app/share-code/page';

/** A fixed release-channel boundary, identical for every store user. */
export function PromotionPageGate({children}:{children:ReactNode}) {
  return PUBLIC_PROMOTION_ENABLED ? children : <ShareCodePage/>;
}
