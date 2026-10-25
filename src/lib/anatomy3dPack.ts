"use client";

import { unzipSync } from "fflate";
import {
  loadPackContent,
  type DownloadProgress,
} from "./offlinePackClient";

export const ANATOMY_3D_PACK_ID = "tcm-anatomy-3d-v2";

export type AnatomyLayerId = "skin" | "muscular" | "visceral" | "skeletal";

export interface AnatomyLayerManifest {
  id: AnatomyLayerId;
  name: string;
  file: string;
  size: number;
  sha256: string;
}

export interface AnatomyPackManifest {
  format: "yandao-anatomy-3d";
  version: string;
  name: string;
  layers: AnatomyLayerManifest[];
  license: string;
  source: string;
  notice: string;
}

export interface OpenedAnatomyPack {
  manifest: AnatomyPackManifest;
  files: Record<string, Uint8Array>;
}

function decodeManifest(bytes: Uint8Array): AnatomyPackManifest {
  const parsed = JSON.parse(new TextDecoder("utf-8").decode(bytes)) as AnatomyPackManifest;
  if (parsed.format !== "yandao-anatomy-3d" || !Array.isArray(parsed.layers)) {
    throw new Error("3D 解剖包格式不受支持");
  }
  const required: AnatomyLayerId[] = ["skin", "muscular", "visceral", "skeletal"];
  if (required.some((id) => !parsed.layers.some((layer) => layer.id === id))) {
    throw new Error("3D 解剖包不是完整四层版本，请重新下载");
  }
  return parsed;
}

export async function openInstalledAnatomyPack(): Promise<OpenedAnatomyPack | null> {
  const packed = await loadPackContent(ANATOMY_3D_PACK_ID);
  if (!packed) return null;
  return decodeAnatomyPack(packed);
}

export async function decodeAnatomyPack(packed: ArrayBuffer): Promise<OpenedAnatomyPack> {
  const files = unzipSync(new Uint8Array(packed));
  const manifestBytes = files["manifest.json"];
  if (!manifestBytes) throw new Error("3D 解剖包缺少清单");
  const manifest = decodeManifest(manifestBytes);
  for (const layer of manifest.layers) {
    const bytes=files[layer.file];
    if (!bytes || bytes.byteLength!==layer.size) throw new Error(`3D 解剖包缺少或损坏${layer.name}模型`);
    const hash=await crypto.subtle.digest("SHA-256",new Uint8Array(bytes).buffer);
    const actual=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,"0")).join("");
    if(actual!==layer.sha256)throw new Error(`3D 解剖包${layer.name}校验失败，原有资料保留`);
  }
  return { manifest, files };
}

export async function downloadAnatomyPack(onProgress?: DownloadProgress): Promise<void> {
  await (await import("./anatomyLearningBundle")).downloadCompleteAnatomy(onProgress);
}

export function copyUint8ArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copied = new Uint8Array(bytes.byteLength);
  copied.set(bytes);
  return copied.buffer;
}
