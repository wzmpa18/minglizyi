"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { BrandHeader } from "@/components/shared";
import {
  ANATOMY_3D_PACK_ID,
  copyUint8ArrayBuffer,
  downloadAnatomyPack,
  openInstalledAnatomyPack,
  type AnatomyLayerId,
  type OpenedAnatomyPack,
} from "@/lib/anatomy3dPack";

const BRAND = "#7B2FBE";
const LAYERS: Array<{ id: AnatomyLayerId; label: string; color: string }> = [
  { id: "skin", label: "皮肤", color: "#D8A08A" },
  { id: "muscular", label: "肌肉", color: "#B85C55" },
  { id: "visceral", label: "脏腑", color: "#9B4B3D" },
  { id: "skeletal", label: "骨骼", color: "#C9A76B" },
];

const LAYER_PRESETS: Array<{ label: string; visible: AnatomyLayerId[] }> = [
  { label: "完整人体", visible: ["skin"] },
  { label: "肌肉层", visible: ["muscular"] },
  { label: "脏腑层", visible: ["visceral"] },
  { label: "骨骼层", visible: ["skeletal"] },
  { label: "叠加对照", visible: ["muscular", "visceral", "skeletal"] },
];

const COMMON_NAMES: Record<string, string> = {
  liver: "肝脏", gallbladder: "胆囊", stomach: "胃", pancreas: "胰腺",
  spleen: "脾脏", "kidney.l": "左肾", "kidney.r": "右肾",
  "superior lobe of left lung": "左肺上叶", "inferior lobe of left lung": "左肺下叶",
  "superior lobe of right lung": "右肺上叶", "middle lobe of right lung": "右肺中叶",
  "inferior lobe of right lung": "右肺下叶", trachea: "气管", oesophagus: "食管",
  "urinary bladder": "膀胱", prostate: "前列腺", duodenum: "十二指肠",
  jejunum: "空肠", "ascending colon": "升结肠", "descending colon": "降结肠",
  "transverse colon": "横结肠", "sigmoid colon": "乙状结肠", sacrum: "骶骨",
  mandible: "下颌骨", "occipital bone": "枕骨", "frontal bone": "额骨",
};

function organColor(name: string): number {
  const n = name.toLowerCase();
  if (n.includes("lung") || n.includes("bronch")) return 0xd99393;
  if (n.includes("liver") || n.includes("gall")) return 0x9b4b3d;
  if (n.includes("stomach") || n.includes("oesophagus")) return 0xd4867b;
  if (n.includes("colon") || n.includes("jejun") || n.includes("duod") || n.includes("appendix")) return 0xc78c71;
  if (n.includes("kidney") || n.includes("renal") || n.includes("ureter")) return 0x8f4c44;
  if (n.includes("pancreas")) return 0xe3b56b;
  if (n.includes("thyroid")) return 0xc9727c;
  return 0xb86f65;
}

function structureLabel(name: string): string {
  const key = name.toLowerCase();
  return COMMON_NAMES[key] ? `${COMMON_NAMES[key]} · ${name}` : name.replace(/\.(?:e?\d?|o\d?)[lr]$/i, "");
}

function disposeObject(root: THREE.Object3D) {
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    node.geometry.dispose();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => material.dispose());
  });
}

export default function Anatomy3DPage() {
  const mountRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    loader: GLTFLoader;
    draco: DRACOLoader;
    raycaster: THREE.Raycaster;
    objects: Map<AnatomyLayerId, THREE.Object3D>;
    frame: number;
    resize: () => void;
    pointerDown?: { x: number; y: number };
  } | null>(null);
  const packRef = useRef<OpenedAnatomyPack | null>(null);
  const [pack, setPack] = useState<OpenedAnatomyPack | null>(null);
  const [checking, setChecking] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [loadingLayer, setLoadingLayer] = useState<AnatomyLayerId | null>(null);
  const [active, setActive] = useState<Record<AnatomyLayerId, boolean>>({ skin: true, muscular: false, visceral: false, skeletal: false });
  const [selected, setSelected] = useState("点按模型结构可查看名称");

  const loadLocal = useCallback(async () => {
    setChecking(true);
    setError("");
    try {
      const installed = await openInstalledAnatomyPack();
      packRef.current = installed;
      setPack(installed);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => { void loadLocal(); }, [loadLocal]);

  const fitCamera = useCallback(() => {
    const rt = runtimeRef.current;
    if (!rt) return;
    const visible = [...rt.objects.values()].filter((obj) => obj.visible);
    if (!visible.length) return;
    const box = new THREE.Box3();
    visible.forEach((obj) => box.expandByObject(obj));
    if (box.isEmpty()) return;
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const max = Math.max(size.x, size.y, size.z);
    rt.controls.target.copy(center);
    rt.camera.position.set(center.x + max * 0.42, center.y + max * 0.04, center.z + max * 2.05);
    rt.camera.near = Math.max(max / 150, 0.001);
    rt.camera.far = max * 12;
    rt.camera.updateProjectionMatrix();
    rt.controls.minDistance = max * 0.22;
    rt.controls.maxDistance = max * 4.5;
    rt.controls.update();
  }, []);

  const loadLayer = useCallback(async (layer: AnatomyLayerId) => {
    const rt = runtimeRef.current;
    const opened = packRef.current;
    if (!rt || !opened) return null;
    const existing = rt.objects.get(layer);
    if (existing) return existing;
    const info = opened.manifest.layers.find((item) => item.id === layer);
    const bytes = info ? opened.files[info.file] : null;
    if (!info || !bytes) throw new Error("离线包缺少模型文件");
    setLoadingLayer(layer);
    try {
      const gltf = await rt.loader.parseAsync(copyUint8ArrayBuffer(bytes), "");
      const root = gltf.scene;
      root.name = layer;
      root.traverse((node) => {
        if (!(node instanceof THREE.Mesh)) return;
        node.castShadow = true;
        node.receiveShadow = true;
        const source = Array.isArray(node.material) ? node.material[0] : node.material;
        const material = source.clone() as THREE.MeshStandardMaterial;
        if (layer === "skin") {
          material.color.set(0xd8a08a);
          material.roughness = 0.9;
          material.transparent = true;
          material.opacity = 0.93;
        } else if (layer === "muscular") {
          const suffix = node.name.includes(".") ? node.name.split(".").pop() || "" : "";
          if (suffix && !["l", "r"].includes(suffix)) node.visible = false;
          material.color.set(0xb85c55);
          material.roughness = 0.82;
        } else if (layer === "visceral") {
          material.color.setHex(organColor(node.name));
          material.roughness = 0.75;
        } else {
          material.color.set(0xf1dfbd);
          material.roughness = 0.72;
        }
        node.material = material;
      });
      rt.scene.add(root);
      rt.objects.set(layer, root);
      return root;
    } finally {
      setLoadingLayer(null);
    }
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !pack) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf1f5f4);
    const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = true;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x68757a, 2.25));
    const key = new THREE.DirectionalLight(0xffffff, 2.1);
    key.position.set(4, 7, 6);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffded2, 1.1);
    fill.position.set(-5, 2, 4);
    scene.add(fill);
    const draco = new DRACOLoader();
    draco.setDecoderPath("/assets/draco/");
    draco.preload();
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);
    const rt = {
      scene, camera, renderer, controls, loader, draco,
      raycaster: new THREE.Raycaster(), objects: new Map<AnatomyLayerId, THREE.Object3D>(),
      frame: 0, resize: () => {}, pointerDown: undefined as { x: number; y: number } | undefined,
    };
    runtimeRef.current = rt;
    const resize = () => {
      const rect = mount.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      renderer.setSize(rect.width, rect.height, false);
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
    };
    rt.resize = resize;
    resize();
    const render = () => {
      controls.update();
      renderer.render(scene, camera);
      rt.frame = requestAnimationFrame(render);
    };
    render();
    const onDown = (event: PointerEvent) => { rt.pointerDown = { x: event.clientX, y: event.clientY }; };
    const onUp = (event: PointerEvent) => {
      const start = rt.pointerDown;
      rt.pointerDown = undefined;
      if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 7) return;
      const rect = renderer.domElement.getBoundingClientRect();
      const point = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      rt.raycaster.setFromCamera(point, camera);
      const hits = rt.raycaster.intersectObjects([...rt.objects.values()].filter((obj) => obj.visible), true);
      const named = hits.find((hit) => hit.object.visible && hit.object.name);
      if (named) setSelected(structureLabel(named.object.name));
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);
    window.addEventListener("resize", resize);
    void loadLayer("skin").then((obj) => { if (obj) { obj.visible = true; fitCamera(); } }).catch((e) => setError((e as Error).message));
    return () => {
      window.removeEventListener("resize", resize);
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
      cancelAnimationFrame(rt.frame);
      controls.dispose();
      draco.dispose();
      rt.objects.forEach(disposeObject);
      renderer.dispose();
      renderer.domElement.remove();
      runtimeRef.current = null;
    };
  }, [fitCamera, loadLayer, pack]);

  const toggleLayer = async (layer: AnatomyLayerId) => {
    if (loadingLayer) return;
    const next = !active[layer];
    if (!next && Object.entries(active).filter(([, on]) => on).length === 1) {
      setSelected("至少保留一个可见结构层");
      return;
    }
    try {
      const object = next ? await loadLayer(layer) : runtimeRef.current?.objects.get(layer);
      if (object) object.visible = next;
      setActive((old) => ({ ...old, [layer]: next }));
      window.setTimeout(fitCamera, 0);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const applyLayerPreset = async (visible: AnatomyLayerId[]) => {
    if (loadingLayer) return;
    try {
      for (const layer of visible) await loadLayer(layer);
      const enabled = new Set(visible);
      runtimeRef.current?.objects.forEach((object, layer) => { object.visible = enabled.has(layer); });
      setActive({
        skin: enabled.has("skin"),
        muscular: enabled.has("muscular"),
        visceral: enabled.has("visceral"),
        skeletal: enabled.has("skeletal"),
      });
      window.setTimeout(fitCamera, 0);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    setProgress(0);
    setError("");
    try {
      await downloadAnatomyPack((received, total) => setProgress(total ? Math.round(received / total * 100) : 0));
      await loadLocal();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <main style={{ maxWidth: 520, minHeight: "100vh", margin: "0 auto", background: "#EEF2F1", display: "flex", flexDirection: "column" }}>
      <BrandHeader title="3D人体解剖" showBack />
      <section style={{ padding: "10px 12px 8px" }}>
        <div style={{ fontSize: 12, color: "#665B56", lineHeight: 1.6 }}>
          单指旋转 · 双指缩放 · 双指移动 · 点按识别结构
        </div>
      </section>

      {checking ? (
        <div style={{ padding: 48, textAlign: "center", color: "#777" }}>正在读取手机中的3D离线包…</div>
      ) : !pack ? (
        <section style={{ margin: 12, padding: 20, borderRadius: 18, background: "#fff", boxShadow: "0 5px 20px #0000000b" }}>
          <div style={{ fontSize: 38, textAlign: "center", marginBottom: 8 }}>🫀</div>
          <h1 style={{ margin: "0 0 8px", textAlign: "center", fontSize: 18, color: "#342C29" }}>下载3D人体解剖离线包</h1>
          <p style={{ margin: "0 0 16px", fontSize: 13, lineHeight: 1.75, color: "#716762" }}>
            约13MB，含皮肤、肌肉、脏腑、骨骼四层。下载并校验后永久保存在手机，断网和关机重启后仍可使用。该离线包为会员学习权益。
          </p>
          <button onClick={handleDownload} disabled={downloading} style={{ width: "100%", border: 0, borderRadius: 12, padding: "12px 16px", color: "#fff", background: downloading ? "#AAA" : BRAND, fontSize: 15, fontWeight: 700 }}>
            {downloading ? `正在下载并校验 ${progress}%` : "下载到手机"}
          </button>
          <div style={{ height: 5, borderRadius: 4, background: "#EEE", overflow: "hidden", marginTop: 10 }}>
            <div style={{ height: "100%", width: `${progress}%`, background: BRAND, transition: "width .2s" }} />
          </div>
          {error && <p style={{ margin: "12px 0 0", fontSize: 12, color: "#C62828", lineHeight: 1.6 }}>{error}</p>}
        </section>
      ) : (
        <>
          <section style={{ display: "flex", gap: 7, padding: "0 12px 8px", overflowX: "auto" }}>
            {LAYER_PRESETS.map((preset) => (
              <button key={preset.label} onClick={() => void applyLayerPreset(preset.visible)} disabled={!!loadingLayer}
                style={{ flex: "0 0 auto", border: "1px solid #D7CBE1", borderRadius: 999, padding: "7px 11px", background: "#FFF", color: BRAND, fontWeight: 700, fontSize: 12 }}>
                {preset.label}
              </button>
            ))}
          </section>
          <section style={{ display: "flex", gap: 8, padding: "0 12px 10px" }}>
            {LAYERS.map((layer) => {
              const on = active[layer.id];
              return (
                <button key={layer.id} onClick={() => void toggleLayer(layer.id)} disabled={!!loadingLayer}
                  style={{ flex: 1, border: `1px solid ${on ? layer.color : "#D5D5D5"}`, borderRadius: 11, padding: "9px 6px", background: on ? `${layer.color}18` : "#FFF", color: on ? layer.color : "#888", fontWeight: 700, fontSize: 13 }}>
                  {loadingLayer === layer.id ? "加载中…" : `${on ? "✓ " : ""}${layer.label}`}
                </button>
              );
            })}
          </section>
          <div ref={mountRef} style={{ position: "relative", height: "min(68vh, 660px)", minHeight: 470, margin: "0 10px", borderRadius: 18, overflow: "hidden", background: "#F1F5F4", boxShadow: "inset 0 0 0 1px #DDE5E2" }}>
            <div style={{ pointerEvents: "none", position: "absolute", right: 12, bottom: 10, zIndex: 2, color: "#6D5E5870", fontSize: 11, fontWeight: 700 }}>言道国学 · 3D解剖</div>
          </div>
          <section style={{ margin: "10px 12px", padding: "10px 12px", borderRadius: 12, background: "#FFF", color: "#514945", fontSize: 12, lineHeight: 1.6 }}>
            <strong style={{ color: BRAND }}>当前结构：</strong>{selected}
          </section>
          {error && <div style={{ margin: "0 12px 10px", color: "#C62828", fontSize: 12 }}>{error}</div>}
        </>
      )}

      <section style={{ margin: "0 12px 18px", padding: "10px 12px", borderRadius: 12, background: "#FFF7E6", color: "#795548", fontSize: 11, lineHeight: 1.65 }}>
        人体结构与经络定位学习参考。当前版本不提供进针角度、深度或自行操作指导；针灸等医疗操作须由具备资质的专业人员实施。离线包编号：{ANATOMY_3D_PACK_ID}。
        <div style={{ marginTop: 5, color: "#8D6E63" }}>
          模型来源：Z-Anatomy / BodyParts3D 派生开放数据；依原授权采用 CC BY-SA，完整授权与署名文件随离线包保存。
        </div>
      </section>
    </main>
  );
}
