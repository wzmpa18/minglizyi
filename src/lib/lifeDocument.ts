"use client";
import {Capacitor,registerPlugin} from "@capacitor/core";
import {b64} from "./lifeVaultCrypto";
import type {OcrBlock} from "./lifeRecords";
const plugin=registerPlugin<{ocr:(o:{base64:string})=>Promise<{model:string;blocks:OcrBlock[]}>;saveDocument:(o:{name:string;type:string;base64:string})=>Promise<{saved:boolean}>}>("LifeVault");
export async function recognizeLifeImage(blob:Blob){if(!Capacitor.isNativePlatform()||!Capacitor.isPluginAvailable("LifeVault"))throw Error("本浏览器没有已验证的离线识字引擎，请手动录入核对；不会改用服务器或云AI");if(!blob.type.startsWith("image/"))throw Error("当前只支持逐张图片本机识字，PDF请按页选择图片，原PDF仍完整保留");return plugin.ocr({base64:b64(new Uint8Array(await blob.arrayBuffer()))});}
export async function saveLifeDocument(blob:Blob,name:string){
 if(Capacitor.isNativePlatform()){if(!Capacitor.isPluginAvailable("LifeVault"))throw Error("请升级支持私人档案的安装包");const result=await plugin.saveDocument({name,type:blob.type||"application/octet-stream",base64:b64(new Uint8Array(await blob.arrayBuffer()))});if(!result.saved)throw Error("已取消保存，未记录备份成功");return;}
 const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
 // A browser download gesture is not evidence of a completed cloud backup.
}
