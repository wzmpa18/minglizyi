'use client';
import {getUserToken,getUserProfile} from './auth';
import {STORE_CHANNEL} from './releaseFeatures';
export interface NonAiLearningAccess {key:'non_ai_full_v1';granted:boolean;active:boolean;channel:string;allowedChannels:string[];permanent:boolean;policyVersion:string;campaignStatus:string;features:string[];aiCreditsGranted:0;membershipLevelChanged:false}
export async function getNonAiLearningAccess():Promise<NonAiLearningAccess|null>{
  const token=getUserToken(),account=getUserProfile()?.userId;if(!token||!account)return null;
  try{const response=await fetch('/api/auth/non-ai-learning-access',{cache:'no-store',headers:{Authorization:'Bearer '+token,'X-Store-Channel':STORE_CHANNEL}});if(!response.ok)return null;const body=await response.json();
    if(getUserToken()!==token||getUserProfile()?.userId!==account||!body.success||body.data?.key!=='non_ai_full_v1'||body.data.aiCreditsGranted!==0||body.data.membershipLevelChanged!==false||!Array.isArray(body.data.features))return null;
    return body.data as NonAiLearningAccess;
  }catch{return null;}
}
export async function canUseNonAiLearning(feature:string):Promise<boolean>{
  if(!['anatomy3d','classic-reading','herb-point-search','course-notes','review-notes','offline-learning','local-diagnosis-study'].includes(feature))return false;
  const value=await getNonAiLearningAccess();return value?.active===true&&value.features.includes(feature);
}
