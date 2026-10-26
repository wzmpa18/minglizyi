'use client';
import {useEffect,useState} from 'react';
import {useAccountScope} from './useAccountScope';
import {canUseNonAiLearning} from './nonAiLearningAccess';
export function useNonAiLearningAccess(feature:string){
  const [allowed,setAllowed]=useState(false),scope=useAccountScope();
  useEffect(()=>{let live=true;setAllowed(false);void canUseNonAiLearning(feature).then(value=>{if(live)setAllowed(value);});return()=>{live=false;};},[scope,feature]);
  return allowed;
}
