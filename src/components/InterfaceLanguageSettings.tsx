"use client";
import { useEffect } from "react";
import {restoreInterfaceLocale,useInterfaceLocale,INTERFACE_LOCALES,type InterfaceLocale} from "@/lib/interfaceLocale";
export function InterfaceLocaleInit(){useEffect(()=>{restoreInterfaceLocale();const update=()=>restoreInterfaceLocale();window.addEventListener("storage",update);return()=>window.removeEventListener("storage",update);},[]);return null;}
export function InterfaceLanguageSettings(){
  const {locale,setLocale,ui}=useInterfaceLocale();
  const names={"zh-CN":"简体中文","zh-TW":"繁體中文",ja:"日本語",en:"English"};
  return <section className="m-3 rounded-xl p-4" style={{background:"var(--theme-card-bg)",color:"var(--theme-text-primary)"}}>
    <label className="flex items-center justify-between gap-3"><strong>{ui("界面语言")}</strong><select aria-label="Interface language" className="max-w-[60%] rounded border p-2" value={locale} onChange={e=>setLocale(e.target.value as InterfaceLocale)}>{INTERFACE_LOCALES.map(value=><option key={value} value={value}>{names[value]}</option>)}</select></label>
    <p className="mt-2 text-xs leading-6">界面按钮语言不改变排算、时区、原始留言和古籍正文。Language changes controls, not classical texts or calculations.</p>
  </section>;
}
