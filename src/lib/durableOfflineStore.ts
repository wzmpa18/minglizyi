"use client";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { get, getStrict, put, remove } from "./storageManager";
const Files=registerPlugin<{
 read(o:{key:string}):Promise<{value:string|null}>;
 write(o:{key:string;value:string}):Promise<{saved:boolean;bytes:number}>;
 remove(o:{key:string}):Promise<void>;
}>("OfflineFiles");
export async function readOfflineFile<T>(key:string):Promise<T|null> {
 if(Capacitor.isPluginAvailable("OfflineFiles")) {
  const r=await Files.read({key});return r.value===null?null:JSON.parse(r.value) as T;
 }
 return get<T>("OFFLINE_PACK",`durable:${key}`);
}
export async function writeOfflineFile(key:string,value:unknown):Promise<void> {
 if(Capacitor.isPluginAvailable("OfflineFiles")) {
  await Files.write({key,value:JSON.stringify(value)});return;
 }
 await put("OFFLINE_PACK",`durable:${key}`,value);
}
/** Personal notes cannot treat a storage error as an empty document. */
export async function readOfflineFileStrict<T>(key:string):Promise<T|null>{
 if(Capacitor.isPluginAvailable("OfflineFiles"))return readOfflineFile<T>(key);
 return getStrict<T>("OFFLINE_PACK",`durable:${key}`);
}
export async function removeOfflineFile(key:string):Promise<void> {
 if(Capacitor.isPluginAvailable("OfflineFiles")){await Files.remove({key});return;}
 await remove("OFFLINE_PACK",`durable:${key}`);
}
