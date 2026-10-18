"use client";
import { useSyncExternalStore } from "react";
import cn from "@/locales/zh-CN.json";
import tw from "@/locales/zh-TW.json";
import ja from "@/locales/ja.json";
import en from "@/locales/en.json";
export const INTERFACE_LOCALES = ["zh-CN", "zh-TW", "ja", "en"] as const;
export type InterfaceLocale = typeof INTERFACE_LOCALES[number];
const dictionaries: Record<InterfaceLocale,Record<string,string>> = { "zh-CN":cn.ui,"zh-TW":tw.ui,ja:ja.ui,en:en.ui };
const KEY="yandao_interface_locale";
const listeners=new Set<()=>void>();
let locale:InterfaceLocale="zh-CN";
export function interfaceText(text:string, language:InterfaceLocale=locale) { return dictionaries[language][text] || text; }
export function setInterfaceLocale(value:InterfaceLocale) {
  if(!INTERFACE_LOCALES.includes(value))return;
  locale=value;
  try{localStorage.setItem(KEY,value);}catch{}
  if(typeof document!=="undefined")document.documentElement.lang=value;
  listeners.forEach(fn=>fn());
}
export function restoreInterfaceLocale(){try{const value=localStorage.getItem(KEY) as InterfaceLocale;if(INTERFACE_LOCALES.includes(value))setInterfaceLocale(value);}catch{}}
function subscribe(fn:()=>void){listeners.add(fn);return()=>{listeners.delete(fn);};}
export function useInterfaceLocale(){
  const current=useSyncExternalStore(subscribe,()=>locale,()=>"zh-CN" as InterfaceLocale);
  return {locale:current,setLocale:setInterfaceLocale,ui:(text:string)=>interfaceText(text,current)};
}
