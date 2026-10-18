"use client";
import {useEffect} from "react";
import {hasNativeCalendar,syncNativeCalendar} from "@/lib/nativeCalendar";
export function NativeCalendarInit(){
 useEffect(()=>{
  if(!hasNativeCalendar())return;
  let stopped=false,timer:ReturnType<typeof setTimeout>;
  const update=()=>{clearTimeout(timer);timer=setTimeout(()=>{if(!stopped)void syncNativeCalendar().catch(()=>{window.dispatchEvent(new CustomEvent("yandao-calendar-status",{detail:"系统日历同步未成功，请打开组件设置检查。"}));});},500);};
  update();window.addEventListener("yandao-auth-change",update);window.addEventListener("yandao-calendar-changed",update);window.addEventListener("focus",update);
  return()=>{stopped=true;clearTimeout(timer);window.removeEventListener("yandao-auth-change",update);window.removeEventListener("yandao-calendar-changed",update);window.removeEventListener("focus",update);};
 },[]);return null;
}
