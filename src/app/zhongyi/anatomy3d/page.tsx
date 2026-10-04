"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { BrandHeader } from "@/components/shared";
import { ACUPOINTS_DB } from "@/algorithm-core/modules/tcm/meridians";
import {
  ANATOMY_3D_PACK_ID,
  copyUint8ArrayBuffer,
  downloadAnatomyPack,
  openInstalledAnatomyPack,
  type AnatomyLayerId,
  type OpenedAnatomyPack,
} from "@/lib/anatomy3dPack";

const BRAND = "#7B2FBE";
const BRAND_BG = "#F3EDF7";
const LAYERS: Array<{ id: AnatomyLayerId; label: string; color: string }> = [
  { id: "skin", label: "体表", color: "#D49B78" },
  { id: "muscular", label: "肌肉", color: "#B85C55" },
  { id: "visceral", label: "脏腑", color: "#9B4B3D" },
  { id: "skeletal", label: "骨骼", color: "#C9A76B" },
];

const LAYER_PRESETS: Array<{ id: string; label: string; layers: AnatomyLayerId[] }> = [
  { id: "surface", label: "完整人体", layers: ["skin"] },
  { id: "muscles", label: "剥离皮肤", layers: ["muscular"] },
  { id: "organs", label: "查看脏腑", layers: ["visceral", "skeletal"] },
  { id: "bones", label: "查看骨骼", layers: ["skeletal"] },
];

interface Acupoint3DMarker {
  side: "primary" | "mirrored";
  position: [number, number, number];
  normal: [number, number, number];
}

interface Acupoint3DEntry {
  code: string;
  name: string;
  meridian: string;
  view: "front" | "back";
  markers: Acupoint3DMarker[];
  placementStatus: "schematic_unvalidated";
  needleDirection: null | { mode: "perpendicular" | "oblique" | "transverse"; angleDeg?: number };
  needleReviewStatus: "pending_medical_review" | "reviewed";
}

interface Acupoint3DDocument {
  schema: "yandao.tcm.acupoints-3d.v1";
  pointCount: number;
  markerCount: number;
  points: Acupoint3DEntry[];
}

const MERIDIAN_COLORS: Record<string, number> = {
  肺经: 0x4e8b87, 大肠经: 0xc55c52, 胃经: 0xc98b3c, 脾经: 0x9b6d3f,
  心经: 0xb84747, 小肠经: 0xd06b45, 膀胱经: 0x476fa3, 肾经: 0x66558f,
  心包经: 0xa34d72, 三焦经: 0xbd6f35, 胆经: 0x5b8e4a, 肝经: 0x3f8062,
  督脉: 0x395b9b, 任脉: 0x87509e,
};

function canonicalAcupointCode(value: string): string {
  const code = value.trim().toUpperCase();
  if (code.startsWith("DU")) return `GV${code.slice(2)}`;
  if (code.startsWith("RN")) return `CV${code.slice(2)}`;
  if (code.startsWith("SJ")) return `TE${code.slice(2)}`;
  if (code.startsWith("LV")) return `LR${code.slice(2)}`;
  return code;
}

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
    if (!(node instanceof THREE.Mesh) && !(node instanceof THREE.Line)) return;
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
    markerMesh?: THREE.InstancedMesh;
    selectedMarker?: THREE.Mesh;
    needleGuide?: THREE.Group;
    markerLookup: Array<{ point: Acupoint3DEntry; markerIndex: number }>;
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
  const [acupoints, setAcupoints] = useState<Acupoint3DEntry[]>([]);
  const [pointsVisible, setPointsVisible] = useState(true);
  const [pointQuery, setPointQuery] = useState("");
  const [selectedPoint, setSelectedPoint] = useState<Acupoint3DEntry | null>(null);

  const focusAcupoint = useCallback((point: Acupoint3DEntry, markerIndex = 0) => {
    const rt = runtimeRef.current;
    const marker = point.markers[markerIndex] || point.markers[0];
    if (!rt || !marker) return;
    setSelectedPoint(point);
    setSelected(`${point.name}（${point.code}）· ${point.meridian}`);
    const target = new THREE.Vector3(...marker.position);
    if (rt.selectedMarker) {
      rt.selectedMarker.position.copy(target);
      rt.selectedMarker.visible = true;
    }
    if (rt.needleGuide) {
      rt.needleGuide.children.forEach(disposeObject);
      rt.needleGuide.clear();
      rt.needleGuide.visible = false;
      if (point.needleReviewStatus === "reviewed" && point.needleDirection) {
        const outward = new THREE.Vector3(...marker.normal).normalize();
        const inward = outward.clone().multiplyScalar(-1);
        const requested = point.needleDirection.angleDeg ?? (point.needleDirection.mode === "perpendicular" ? 90 : point.needleDirection.mode === "oblique" ? 45 : 15);
        if (requested < 89) {
          const tangent = new THREE.Vector3(0, 1, 0).cross(outward);
          if (tangent.lengthSq() < 0.001) tangent.set(1, 0, 0);
          tangent.normalize();
          inward.applyAxisAngle(tangent, THREE.MathUtils.degToRad(90 - requested));
        }
        const start = target.clone().add(inward.clone().multiplyScalar(-0.1));
        rt.needleGuide.add(new THREE.ArrowHelper(inward, start, 0.115, 0x00a37a, 0.022, 0.012));
        rt.needleGuide.visible = true;
      }
    }
    rt.controls.target.copy(target);
    const cameraDistance = 0.48;
    rt.camera.position.set(target.x + 0.08, target.y + 0.04, target.z + (point.view === "front" ? cameraDistance : -cameraDistance));
    rt.camera.near = 0.002;
    rt.camera.updateProjectionMatrix();
    rt.controls.update();
  }, []);

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
          const lower = node.name.toLowerCase();
          if (lower.endsWith(".j") || lower.includes("hair") || lower.includes("eyelash")) node.visible = false;
          material.color.set(0xd49b78);
          material.transparent = true;
          material.opacity = 0.92;
          material.depthWrite = true;
          material.roughness = 0.9;
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
    const rt: NonNullable<typeof runtimeRef.current> = {
      scene, camera, renderer, controls, loader, draco,
      raycaster: new THREE.Raycaster(), objects: new Map<AnatomyLayerId, THREE.Object3D>(),
      markerLookup: [],
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
      if (rt.markerMesh?.visible) {
        const markerHit = rt.raycaster.intersectObject(rt.markerMesh, false)[0];
        if (markerHit?.instanceId !== undefined) {
          const found = rt.markerLookup[markerHit.instanceId];
          if (found) {
            focusAcupoint(found.point, found.markerIndex);
            return;
          }
        }
      }
      const hits = rt.raycaster.intersectObjects([...rt.objects.values()].filter((obj) => obj.visible), true);
      const named = hits.find((hit) => hit.object.visible && hit.object.name);
      if (named) setSelected(structureLabel(named.object.name));
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);
    window.addEventListener("resize", resize);
    void loadLayer("skin").then((obj) => { if (obj) { obj.visible = true; fitCamera(); } }).catch((e) => setError((e as Error).message));
    void fetch("/assets/anatomy3d/acupoints-3d.json", { cache: "force-cache" })
      .then((response) => {
        if (!response.ok) throw new Error(`穴位模型数据加载失败 HTTP ${response.status}`);
        return response.json() as Promise<Acupoint3DDocument>;
      })
      .then((document) => {
        if (runtimeRef.current !== rt || document.schema !== "yandao.tcm.acupoints-3d.v1" || document.pointCount !== 361) {
          throw new Error("穴位模型数据不完整");
        }
        const lookup: Array<{ point: Acupoint3DEntry; markerIndex: number }> = [];
        document.points.forEach((entry) => entry.markers.forEach((_, markerIndex) => lookup.push({ point: entry, markerIndex })));
        const geometry = new THREE.SphereGeometry(0.007, 10, 7);
        const material = new THREE.MeshStandardMaterial({ roughness: 0.65, metalness: 0, depthTest: true, transparent: true, opacity: 0.94, vertexColors: true });
        const markers = new THREE.InstancedMesh(geometry, material, lookup.length);
        const matrix = new THREE.Matrix4();
        lookup.forEach((item, index) => {
          matrix.makeTranslation(...item.point.markers[item.markerIndex].position);
          markers.setMatrixAt(index, matrix);
          markers.setColorAt(index, new THREE.Color(MERIDIAN_COLORS[item.point.meridian] || 0x7b2fbe));
        });
        markers.instanceMatrix.needsUpdate = true;
        if (markers.instanceColor) markers.instanceColor.needsUpdate = true;
        markers.renderOrder = 20;
        markers.frustumCulled = false;
        markers.visible = true;
        markers.name = "361穴位标记";
        scene.add(markers);
        const selectedMarker = new THREE.Mesh(
          new THREE.SphereGeometry(0.013, 16, 12),
          new THREE.MeshStandardMaterial({ color: 0xffd54f, emissive: 0x8b5a00, emissiveIntensity: 0.55, depthTest: false }),
        );
        selectedMarker.renderOrder = 30;
        selectedMarker.visible = false;
        scene.add(selectedMarker);
        const needleGuide = new THREE.Group();
        needleGuide.name = "经医学复核的进针方向示意";
        needleGuide.visible = false;
        needleGuide.renderOrder = 31;
        scene.add(needleGuide);
        rt.markerMesh = markers;
        rt.selectedMarker = selectedMarker;
        rt.needleGuide = needleGuide;
        rt.markerLookup = lookup;
        setAcupoints(document.points);
      })
      .catch((reason) => setError((reason as Error).message));
    return () => {
      window.removeEventListener("resize", resize);
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
      cancelAnimationFrame(rt.frame);
      controls.dispose();
      draco.dispose();
      rt.objects.forEach(disposeObject);
      if (rt.markerMesh) disposeObject(rt.markerMesh);
      if (rt.selectedMarker) disposeObject(rt.selectedMarker);
      if (rt.needleGuide) disposeObject(rt.needleGuide);
      renderer.dispose();
      renderer.domElement.remove();
      runtimeRef.current = null;
    };
  }, [fitCamera, focusAcupoint, loadLayer, pack]);

  useEffect(() => {
    if (runtimeRef.current?.markerMesh) runtimeRef.current.markerMesh.visible = pointsVisible;
    if (!pointsVisible && runtimeRef.current?.selectedMarker) runtimeRef.current.selectedMarker.visible = false;
  }, [pointsVisible]);

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

  const applyLayerPreset = async (layers: AnatomyLayerId[]) => {
    if (loadingLayer) return;
    try {
      for (const layer of layers) await loadLayer(layer);
      const next: Record<AnatomyLayerId, boolean> = { skin: false, muscular: false, visceral: false, skeletal: false };
      layers.forEach((layer) => { next[layer] = true; });
      runtimeRef.current?.objects.forEach((object, id) => { object.visible = next[id]; });
      setActive(next);
      setSelected(layers.includes("visceral") ? "已剥离体表与肌肉，可点按查看脏腑" : layers.includes("skeletal") ? "已剥离外层，可点按查看骨骼" : layers.includes("muscular") ? "已剥离体表，可点按查看肌肉" : "完整人体表面");
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
            完整包含体表、肌肉、脏腑、骨骼四层。下载并校验后永久保存在手机，断网和关机重启后仍可使用。该离线包为会员学习权益。
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
          <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, padding: "0 12px 8px" }}>
            {LAYER_PRESETS.map((preset) => (
              <button key={preset.id} type="button" onClick={() => void applyLayerPreset(preset.layers)} disabled={!!loadingLayer}
                style={{ border: "1px solid #DCCFE6", borderRadius: 10, padding: "8px 3px", background: "#FFF", color: BRAND, fontWeight: 700, fontSize: 11 }}>
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
          <section style={{ margin: "0 12px 10px", padding: 10, borderRadius: 12, background: "#FFF", display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
            <input value={pointQuery} onChange={(event) => setPointQuery(event.target.value)} placeholder="搜索穴位名称或编码，如：合谷 / LI4"
              style={{ minWidth: 0, border: "1px solid #D9CFDF", borderRadius: 9, padding: "9px 10px", fontSize: 13, outline: "none" }} />
            <button type="button" onClick={() => setPointsVisible((value) => !value)}
              style={{ border: `1px solid ${pointsVisible ? BRAND : "#CCC"}`, borderRadius: 9, padding: "7px 9px", background: pointsVisible ? BRAND_BG : "#FFF", color: pointsVisible ? BRAND : "#888", fontSize: 12, fontWeight: 700 }}>
              {pointsVisible ? `穴位已显示 ${acupoints.length || 361}` : "显示穴位"}
            </button>
            {pointQuery.trim() && (
              <div style={{ gridColumn: "1 / -1", display: "flex", gap: 6, overflowX: "auto", paddingTop: 2 }}>
                {acupoints.filter((point) => `${point.name}${point.code}${point.meridian}`.toLowerCase().includes(pointQuery.trim().toLowerCase())).slice(0, 10).map((point) => (
                  <button key={point.code} type="button" onClick={() => { setPointsVisible(true); focusAcupoint(point); }}
                    style={{ flex: "0 0 auto", border: "1px solid #DDD1E5", borderRadius: 16, padding: "6px 10px", background: "#FAF7FC", color: BRAND, fontSize: 12 }}>
                    {point.name} {point.code}
                  </button>
                ))}
              </div>
            )}
          </section>
          <div ref={mountRef} style={{ position: "relative", height: "min(68vh, 660px)", minHeight: 470, margin: "0 10px", borderRadius: 18, overflow: "hidden", background: "#F1F5F4", boxShadow: "inset 0 0 0 1px #DDE5E2" }}>
            <div style={{ pointerEvents: "none", position: "absolute", right: 12, bottom: 10, zIndex: 2, color: "#6D5E5870", fontSize: 11, fontWeight: 700 }}>言道国学 · 3D解剖</div>
          </div>
          <section style={{ margin: "10px 12px", padding: "10px 12px", borderRadius: 12, background: "#FFF", color: "#514945", fontSize: 12, lineHeight: 1.6 }}>
            <strong style={{ color: BRAND }}>当前结构：</strong>{selected}
            {selectedPoint && (() => {
              const detail = ACUPOINTS_DB.find((point) => canonicalAcupointCode(point.code) === selectedPoint.code);
              return detail ? <div style={{ marginTop: 7, paddingTop: 7, borderTop: "1px solid #EEE" }}>
                <div><strong>定位：</strong>{detail.location}{detail.location_detail ? `；${detail.location_detail}` : ""}</div>
                <div><strong>传统功用：</strong>{detail.function}</div>
                <div style={{ color: "#9A6B28" }}><strong>进针示意：</strong>{selectedPoint.needleReviewStatus === "reviewed" ? "已通过医学复核" : "待医学复核，当前不显示角度和深度"}</div>
              </div> : null;
            })()}
          </section>
          {error && <div style={{ margin: "0 12px 10px", color: "#C62828", fontSize: 12 }}>{error}</div>}
        </>
      )}

      <section style={{ margin: "0 12px 18px", padding: "10px 12px", borderRadius: 12, background: "#FFF7E6", color: "#795548", fontSize: 11, lineHeight: 1.65 }}>
        人体结构与361穴位采用可旋转、可放大的学习示意定位。未经医学复核的进针方向、角度与深度不会展示；针灸等医疗操作须由具备资质的专业人员实施。离线包编号：{ANATOMY_3D_PACK_ID}。
        <div style={{ marginTop: 5, color: "#8D6E63" }}>
          模型来源：Z-Anatomy / BodyParts3D 派生开放数据；依原授权采用 CC BY-SA，完整授权与署名文件随离线包保存。
        </div>
        <div style={{ marginTop: 5, color: "#8D6E63" }}>
          穴位示意坐标基于 <a href="https://github.com/MuzikPro/letenergyflow" target="_blank" rel="noreferrer" style={{ color: BRAND }}>Let Energy Flow authors</a> 的 CC BY-SA 4.0 数据，经体表投影生成；坐标状态为学习示意、尚未经过独立医学专家复核。
        </div>
      </section>
    </main>
  );
}
