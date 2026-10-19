"use client";
import {Capacitor,registerPlugin} from "@capacitor/core";
import {b64} from "./lifeVaultCrypto";
import type {OcrBlock} from "./lifeRecords";
const plugin=registerPlugin<{ocr:(o:{base64:string;type:string;page:number})=>Promise<{model:string;blocks:OcrBlock[];page:number;totalPages:number}>;previewPdfPage:(o:{base64:string;page:number})=>Promise<{base64:string;totalPages:number}>;renderPdf:(o:{text:string})=>Promise<{base64:string}>;saveDocument:(o:{name:string;type:string;base64:string})=>Promise<{saved:boolean}>}>("LifeVault");
export async function recognizeLifeImage(blob:Blob,page=1){if(!Capacitor.isNativePlatform()||!Capacitor.isPluginAvailable("LifeVault"))throw Error("本浏览器没有已验证的离线识字引擎，请手动录入核对；不会改用服务器或云AI");if(blob.size>20*1024*1024)throw Error("此版本本机识字单个文件上限20MiB，原件不变；可选择较小的副本，不能将识别失败当作已核对");if(!blob.type.startsWith("image/")&&blob.type!=="application/pdf")throw Error("只支持本机图片或逐页PDF识字");return plugin.ocr({base64:b64(new Uint8Array(await blob.arrayBuffer())),type:blob.type,page:blob.type==="application/pdf"?page:1});}
export async function saveLifeDocument(blob:Blob,name:string){
 if(Capacitor.isNativePlatform()){if(!Capacitor.isPluginAvailable("LifeVault"))throw Error("请升级支持私人档案的安装包");const result=await plugin.saveDocument({name,type:blob.type||"application/octet-stream",base64:b64(new Uint8Array(await blob.arrayBuffer()))});if(!result.saved)throw Error("已取消保存，未记录备份成功");return;}
 const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
 // A browser download gesture is not evidence of a completed cloud backup.
}

/** Native system fonts, local drawing only. Browser delegates to its print UI. */
export async function exportLifePdf(text:string,name:string){
 if(text.length>2_000_000)throw Error("单次PDF导出上限200万字符，请按日期分批；原资料未截断");
 if(Capacitor.isNativePlatform()){
  if(!Capacitor.isPluginAvailable("LifeVault"))throw Error("请升级支持私人档案的安装包");
  const result=await plugin.renderPdf({text});const binary=atob(result.base64),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
  await saveLifeDocument(new Blob([bytes],{type:"application/pdf"}),name);return;
 }
 const popup=window.open("","_blank");if(!popup)throw Error("浏览器阻止了打印窗口，请允许弹出窗口后重试");
 popup.document.title=name;const style=popup.document.createElement("style");style.textContent="body{font:16px sans-serif;white-space:pre-wrap;overflow-wrap:anywhere;margin:24px}@page{margin:20mm}";popup.document.head.append(style);const body=popup.document.createElement("main");body.textContent=text;popup.document.body.append(body);popup.focus();popup.print();
}

export async function previewLifePdf(blob:Blob,page=1){if(!Capacitor.isNativePlatform()||!Capacitor.isPluginAvailable("LifeVault"))throw Error("此浏览器未接入原生PDF页预览，请保存原件后用本机阅读器查看；不会发送到远程查看器");if(blob.size>20*1024*1024)throw Error("本机页预览上限20MiB，完整原件仍保留，可保存到本机阅读器查看");const result=await plugin.previewPdfPage({base64:b64(new Uint8Array(await blob.arrayBuffer())),page});return {blob:new Blob([Uint8Array.from(atob(result.base64),c=>c.charCodeAt(0))],{type:"image/png"}),totalPages:result.totalPages};}
