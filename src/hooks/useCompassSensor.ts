"use client";

// 专业电子罗盘传感器层 - NICHE-TOOLS-08 v25.0.68
// ============================================================================
// 数据链路（降级顺序）：
//   1) Rotation Vector → deviceorientationabsolute（Android/Chromium，磁北基准）
//   2) iOS webkitCompassHeading（磁力计，磁北基准）
//   3) 加速度计 + 磁力计（W3C Generic Sensor API）：重力向量解算水平基座，
//      磁场水平分量投影为磁北 → 顶边航向（磁北基准）
//   4) 相对 deviceorientation（非绝对，仅示警展示）→ 5) 手动模式
// 传感器航向按磁北口径解算；真北由算法层 WMM2025 磁偏角修正（见 compass 模块）。
// 平滑：环形平滑器（引擎 CircularSmoother，跨零角单位向量均值，窗口 10）。
// 磁场干扰：Magnetometer 实测总场强（μT）交由引擎与 WMM2025 理论值对拍。
// 协议：本层只做物理量解算，不输出任何吉凶断语。
// ============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { CircularSmoother, normalizeDeg } from "@/algorithm-core/modules/compass";

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/** 航向数据来源 */
export type CompassSource =
  | "absolute"     // deviceorientationabsolute（Rotation Vector）
  | "webkit"       // iOS webkitCompassHeading
  | "accel-mag"    // 加速度计+磁力计自解算
  | "relative"     // 非绝对 deviceorientation（参考性，需校准）
  | "none";

export interface CompassSensorState {
  /** 是否有任何航向来源（含降级链路） */
  supported: boolean;
  /** 是否正在监听 */
  active: boolean;
  /** 当前生效来源 */
  source: CompassSource;
  /** 平滑后磁北航向（度；null=暂无读数） */
  headingMagnetic: number | null;
  /** 最近一帧原始磁北航向（度） */
  rawHeading: number | null;
  /** 平滑度 0~1（1=完全稳定） */
  stability: number;
  /** 磁力计实测总场强（μT；null=无磁力计） */
  fieldMicroT: number | null;
  /** 设备是否大致平放（航向可信） */
  screenUp: boolean;
  /** 是否横持（建议竖屏平持） */
  landscape: boolean;
  /** 非绝对来源：提示 8 字校准 */
  needsCalibration: boolean;
  /** 错误信息 */
  error: string | null;
}

interface DeviceOrientationEventWithCompass extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
}

interface SensorLike {
  start: () => void;
  stop: () => void;
  addEventListener: (type: string, cb: () => void) => void;
  removeEventListener: (type: string, cb: () => void) => void;
}
interface MagnetometerLike extends SensorLike {
  x: number | null;
  y: number | null;
  z: number | null;
}
interface AccelerometerLike extends SensorLike {
  x: number | null;
  y: number | null;
  z: number | null;
}
type MagnetometerCtor = new (opts?: { frequency?: number }) => MagnetometerLike;
type AccelerometerCtor = new (opts?: { frequency?: number }) => AccelerometerLike;

const INITIAL: CompassSensorState = {
  supported: false,
  active: false,
  source: "none",
  headingMagnetic: null,
  rawHeading: null,
  stability: 0,
  fieldMicroT: null,
  screenUp: true,
  landscape: false,
  needsCalibration: false,
  error: null,
};

/**
 * deviceorientation(alpha,beta,gamma) → 顶边（设备 y 轴）水平投影航向（度，磁北起顺时针）。
 * 推导：W3C ZXY 旋转矩阵，y 轴在地球系的水平投影为 (m12, m22)，
 *   m12 = -cosβ·sinα，m22 = cosα·cosβ；heading = atan2(m12, m22)。
 * 平放（β=γ=0）时退化为 (360-α)%360，与通行公式一致。
 */
function headingFromOrientationImpl(alpha: number, beta: number, gamma: number): number {
  const a = alpha * RAD;
  const b = beta * RAD;
  const m12 = -Math.cos(b) * Math.sin(a);
  const m22 = Math.cos(a) * Math.cos(b);
  const h = Math.atan2(m12, m22) * DEG;
  return normalizeDeg(h);
}

/**
 * 加速度计（含重力，g 朝上）+ 磁力计 → 顶边航向（度，磁北起顺时针）。
 * 算法：up = normalize(acc)（设备系竖直向上）；把设备 y 轴与磁场向量各自投影到水平面，
 *   north_dev = normalize(H - (H·up)up)；east_dev = cross(north_dev, up)；
 *   heading = atan2(y_h·east_dev, y_h·north_dev)。
 * 平放时：up=(0,0,1)，y_h=(0,1,0)，H 北向水平分量 → (0,1,0) 磁北，heading=0，自洽。
 */
function headingFromAccelMagImpl(
  ax: number, ay: number, az: number,
  hx: number, hy: number, hz: number,
): number | null {
  const am = Math.hypot(ax, ay, az);
  const hm = Math.hypot(hx, hy, hz);
  if (am < 1 || hm < 1) return null;
  const ux = ax / am, uy = ay / am, uz = az / am;
  // 水平面上的磁场分量（磁北方向，设备系）
  const dH = hx * ux + hy * uy + hz * uz;
  let nx = hx - dH * ux, ny = hy - dH * uy, nz = hz - dH * uz;
  const nm = Math.hypot(nx, ny, nz);
  if (nm < hm * 0.1) return null; // 场向量近乎竖直（高纬磁倾角极端），投影退化
  nx /= nm; ny /= nm; nz /= nm;
  // east = north × up
  const ex = ny * uz - nz * uy;
  const ey = nz * ux - nx * uz;
  const ez = nx * uy - ny * ux;
  // 设备 y 轴（顶边）的水平投影
  let yx = -uy * ux, yy = 1 - uy * uy, yz = -uy * uz;
  const ym = Math.hypot(yx, yy, yz);
  if (ym < 0.2) return null; // 手机近乎竖直，顶边投影退化
  yx /= ym; yy /= ym; yz /= ym;
  const h = Math.atan2(yx * ex + yy * ey + yz * ez, yx * nx + yy * ny + yz * nz) * DEG;
  return normalizeDeg(h);
}

export function useCompassSensor() {
  const [state, setState] = useState<CompassSensorState>(INITIAL);
  const smootherRef = useRef<CircularSmoother | null>(null);
  const orientationAbsHandler = useRef<((e: DeviceOrientationEvent) => void) | null>(null);
  const orientationHandler = useRef<((e: DeviceOrientationEventWithCompass) => void) | null>(null);
  const magSensor = useRef<MagnetometerLike | null>(null);
  const accSensor = useRef<AccelerometerLike | null>(null);
  const magReading = useRef<{ x: number; y: number; z: number; t: number } | null>(null);
  const accReading = useRef<{ x: number; y: number; z: number; t: number } | null>(null);
  const sourceRef = useRef<CompassSource>("none");
  const lastEmit = useRef(0);

  const emit = useCallback((patch: Partial<CompassSensorState>) => {
    setState((s) => ({ ...s, ...patch }));
  }, []);

  /** 航向高频推送：限频 ~11Hz（传感器事件持续触发，跳过帧由下一事件补齐） */
  const pushHeading = useCallback((raw: number, screenUp: boolean, landscape: boolean) => {
    const now = Date.now();
    if (now - lastEmit.current < 90) return;
    lastEmit.current = now;
    if (!smootherRef.current) smootherRef.current = new CircularSmoother(10);
    const sm = smootherRef.current;
    sm.push(raw);
    const smh = sm.get();
    emit({
      rawHeading: Math.round(raw * 10) / 10,
      headingMagnetic: smh == null ? null : Math.round(smh * 10) / 10,
      stability: Math.round(sm.stability() * 100) / 100,
      screenUp,
      landscape,
    });
  }, [emit]);

  const stop = useCallback(() => {
    if (orientationAbsHandler.current && typeof window !== "undefined") {
      window.removeEventListener("deviceorientationabsolute", orientationAbsHandler.current as EventListener);
      orientationAbsHandler.current = null;
    }
    if (orientationHandler.current && typeof window !== "undefined") {
      window.removeEventListener("deviceorientation", orientationHandler.current as EventListener);
      orientationHandler.current = null;
    }
    try { magSensor.current?.stop(); } catch { /* ignore */ }
    try { accSensor.current?.stop(); } catch { /* ignore */ }
    magSensor.current = null;
    accSensor.current = null;
    magReading.current = null;
    accReading.current = null;
    smootherRef.current?.reset();
    sourceRef.current = "none";
    setState((s) => ({
      ...s,
      active: false,
      headingMagnetic: null,
      rawHeading: null,
      stability: 0,
      fieldMicroT: null,
    }));
  }, []);

  const start = useCallback(async (): Promise<void> => {
    if (typeof window === "undefined") return;
    setState({ ...INITIAL, supported: true, active: true });

    // iOS 13+ 需要用户手势授权 DeviceOrientation（start 由按钮触发，满足手势要求）
    const DOE = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<"granted" | "denied">;
    };
    if (typeof DOE?.requestPermission === "function") {
      try {
        const res = await DOE.requestPermission();
        if (res !== "granted") {
          setState((s) => ({ ...s, active: false, error: "方向传感器授权被拒绝，可在系统设置中开启后重试，或使用手动模式" }));
          return;
        }
      } catch {
        setState((s) => ({ ...s, error: "方向传感器授权失败，请使用手动模式" }));
      }
    }

    // 1) Rotation Vector（deviceorientationabsolute，Chromium/Android WebView）
    if ("ondeviceorientationabsolute" in window && typeof window.addEventListener === "function") {
      const h = (e: DeviceOrientationEvent) => {
        if (e.alpha == null || e.beta == null || e.gamma == null) return;
        if (sourceRef.current !== "absolute" && sourceRef.current !== "webkit") {
          sourceRef.current = "absolute";
          emit({ source: "absolute", needsCalibration: false });
        }
        if (sourceRef.current !== "absolute") return; // webkit 已接管则跳过
        const beta = e.beta!;
        const gamma = e.gamma!;
        pushHeading(
          headingFromOrientationImpl(e.alpha!, beta, gamma),
          Math.abs(Math.sin(beta * RAD)) < 0.7 && Math.abs(Math.sin(gamma * RAD)) < 0.7,
          Math.abs(Math.sin(gamma * RAD)) > 0.7,
        );
      };
      orientationAbsHandler.current = h;
      window.addEventListener("deviceorientationabsolute", h as EventListener);
    }

    // 2) iOS webkitCompassHeading；3) 降级：相对 deviceorientation（示警）
    const h2 = (e: DeviceOrientationEventWithCompass) => {
      const beta = e.beta ?? 0;
      const gamma = e.gamma ?? 0;
      const screenUp = Math.abs(Math.sin(beta * RAD)) < 0.7 && Math.abs(Math.sin(gamma * RAD)) < 0.7;
      const landscape = Math.abs(Math.sin(gamma * RAD)) > 0.7;
      if (typeof e.webkitCompassHeading === "number" && isFinite(e.webkitCompassHeading)) {
        if (sourceRef.current !== "webkit") {
          sourceRef.current = "webkit";
          emit({ source: "webkit", needsCalibration: false });
        }
        if (e.webkitCompassAccuracy != null && e.webkitCompassAccuracy < 0) {
          emit({ needsCalibration: true }); // iOS 磁力计未校准（accuracy=-1）
        }
        pushHeading(e.webkitCompassHeading, screenUp, landscape);
        return;
      }
      // Chromium 相对事件：仅当 absolute 从未触发时作为参考性来源
      if (e.alpha == null) return;
      if (sourceRef.current === "absolute" || sourceRef.current === "webkit") return;
      sourceRef.current = "relative";
      emit({ source: "relative", needsCalibration: true });
      pushHeading(headingFromOrientationImpl(e.alpha, beta, gamma), screenUp, landscape);
    };
    orientationHandler.current = h2;
    window.addEventListener("deviceorientation", h2 as EventListener);

    // 4) 磁力计（实测场强；无绝对航向时兼作航向来源）+ 加速度计
    try {
      const MagCtor = (window as unknown as { Magnetometer?: MagnetometerCtor }).Magnetometer;
      const AccCtor = (window as unknown as { Accelerometer?: AccelerometerCtor }).Accelerometer;
      if (MagCtor) {
        const m = new MagCtor({ frequency: 10 });
        const onRead = () => {
          if (m.x == null || m.y == null || m.z == null) return;
          magReading.current = { x: m.x, y: m.y, z: m.z, t: Date.now() };
          const f = Math.hypot(m.x, m.y, m.z);
          emit({ fieldMicroT: Math.round(f * 10) / 10 });
          // 无绝对方位来源时：加速度计+磁力计自解算航向（accel-mag 生效后持续推送，
          // 直至 absolute/webkit 接管）
          if (
            (sourceRef.current === "none" ||
              sourceRef.current === "relative" ||
              sourceRef.current === "accel-mag") &&
            accReading.current
          ) {
            const a = accReading.current;
            const dt = Math.abs(magReading.current.t - a.t);
            if (dt < 300) {
              const h = headingFromAccelMagImpl(a.x, a.y, a.z, m.x, m.y, m.z);
              if (h != null) {
                if (sourceRef.current !== "accel-mag") {
                  sourceRef.current = "accel-mag";
                  emit({ source: "accel-mag", needsCalibration: false });
                }
                const az = Math.hypot(a.x, a.y, a.z);
                const up = a.z / (az || 1);
                pushHeading(h, up > 0.7, Math.abs(a.x / (az || 1)) > 0.7);
              }
            }
          }
        };
        m.addEventListener("reading", onRead);
        m.addEventListener("error", () => {
          try { m.stop(); } catch { /* ignore */ }
          if (magSensor.current === m) magSensor.current = null;
        });
        m.start();
        magSensor.current = m;
      }
      if (AccCtor) {
        const a = new AccCtor({ frequency: 10 });
        const onRead = () => {
          if (a.x == null || a.y == null || a.z == null) return;
          accReading.current = { x: a.x, y: a.y, z: a.z, t: Date.now() };
        };
        a.addEventListener("reading", onRead);
        a.addEventListener("error", () => {
          try { a.stop(); } catch { /* ignore */ }
          if (accSensor.current === a) accSensor.current = null;
        });
        a.start();
        accSensor.current = a;
      }
    } catch {
      // Generic Sensor API 不可用（权限策略/兼容性）：静默降级，干扰监测置 unknown
    }

    // 5 秒后若仍无任何来源 → 报告不支持
    window.setTimeout(() => {
      setState((s) => {
        if (s.active && s.source === "none" && s.rawHeading == null && s.fieldMicroT == null) {
          return { ...s, active: false, supported: false, error: "当前环境无可用方向传感器，已切换手动模式" };
        }
        return s;
      });
    }, 5000);
  }, [emit, pushHeading]);

  useEffect(() => () => stop(), [stop]);

  return { state, start, stop };
}

// 导出纯数学函数供黄金测试对拍（不参与运行时渲染链路）
export const headingFromOrientation = headingFromOrientationImpl;
export const headingFromAccelMag = headingFromAccelMagImpl;
