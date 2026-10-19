"use client";
import {Capacitor,registerPlugin} from "@capacitor/core";
import {privateAtomic,privateRead,privatePage} from "./storageManager";
type Row={key:string;value:unknown};
const native=registerPlugin<{commit:(o:{rows:Row[];check?:{key:string;etag:string|null}})=>Promise<void>;page:(o:{prefix:string;after:string;limit:number})=>Promise<{rows:Row[]}>;read:(o:{key:string})=>Promise<{value?:unknown}>}>("LifeVault");
const nativeRequired=()=>{if(Capacitor.isNativePlatform()&&!Capacitor.isPluginAvailable("LifeVault"))throw Error("此安装包尚不支持原生私人档案，请升级；不会静默改用网页缓存");return Capacitor.isNativePlatform();};
export const vaultStorage={
 async commit(rows:Row[],check?:{key:string;etag:string|null}){if(nativeRequired())await native.commit({rows,check});else await privateAtomic(rows,check);},
 async read<T>(key:string):Promise<T|undefined>{return nativeRequired()?(await native.read({key})).value as T|undefined:privateRead<T>(key);},
 async page(prefix:string,after="",limit=100):Promise<Row[]>{return nativeRequired()?(await native.page({prefix,after,limit})).rows:privatePage(prefix,after,limit);},
 location(){return Capacitor.isNativePlatform()?"应用私有目录 / SQLite（记录与附件均为密文，排除自动系统备份）":"当前浏览器 IndexedDB / USER_PRIVATE_DATA（密文；清除网站数据或系统回收可能丢失）";}
};
