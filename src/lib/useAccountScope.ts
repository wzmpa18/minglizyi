"use client";
import {useEffect,useState} from "react";
import {getUserProfile,getUserToken} from "./auth";
/** Remount private drafts and async views at every auth change, including
 * cross-tab login. No token is exposed in a React key or DOM attribute. */
export function useAccountScope(){
 const [revision,setRevision]=useState(0);
 useEffect(()=>{const changed=()=>setRevision(v=>v+1),storage=(event:StorageEvent)=>{if(!event.key||['yandao_user_token','yandao_user_profile','yandao_login_broadcast'].includes(event.key))changed();};window.addEventListener('yandao-auth-change',changed);window.addEventListener('storage',storage);return()=>{window.removeEventListener('yandao-auth-change',changed);window.removeEventListener('storage',storage);};},[]);
 return `${getUserToken()?getUserProfile()?.userId||'pending-account':'guest'}:${revision}`;
}
