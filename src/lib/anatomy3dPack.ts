"use client";

import { unzipSync } from "fflate";
import {
  downloadPack,
  fetchManifest,
  loadPackContent,
  type DownloadProgress,
} from "./offlinePackClient";

export const ANATOMY_3D_PACK_ID = "tcm-anatomy-3d-v1";

export type AnatomyLayerId = "skeletal" | "visceral" | "muscular";

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
  return parsed;
}

export async function openInstalledAnatomyPack(): Promise<OpenedAnatomyPack | null> {
  const packed = await loadPackContent(ANATOMY_3D_PACK_ID);
  if (!packed) return null;
  const files = unzipSync(new Uint8Array(packed));
  const manifestBytes = files["manifest.json"];
  if (!manifestBytes) throw new Error("3D 解剖包缺少清单");
  const manifest = decodeManifest(manifestBytes);
  for (const layer of manifest.layers) {
    if (!files[layer.file]) throw new Error(`3D 解剖包缺少${layer.name}模型`);
  }
  return { manifest, files };
}

export async function downloadAnatomyPack(onProgress?: DownloadProgress): Promise<void> {
  const manifest = await fetchManifest();
  const pack = manifest?.packs.find((item) => item.packId === ANATOMY_3D_PACK_ID);
  if (!pack) throw new Error("3D 解剖离线包尚未发布，请稍后再试");
  const result = await downloadPack(pack, onProgress);
  if (!result.ok) throw new Error(result.error || "3D 解剖包下载失败");
}

export function copyUint8ArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copied = new Uint8Array(bytes.byteLength);
  copied.set(bytes);
  return copied.buffer;
}
