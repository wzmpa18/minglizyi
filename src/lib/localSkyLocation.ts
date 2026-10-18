import { Capacitor, registerPlugin } from '@capacitor/core';
export interface LocalSkyPosition { latitude: number; longitude: number; accuracy: number }
const NativeLocation = registerPlugin<{ getCurrentPosition(): Promise<LocalSkyPosition> }>('LocalSkyLocation');

/** Called by an explicit button only. Coordinates are never persisted or sent. */
export async function getLocalSkyPosition(): Promise<LocalSkyPosition> {
  if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('LocalSkyLocation')) return NativeLocation.getCurrentPosition();
  if (typeof navigator === 'undefined' || !navigator.geolocation) throw Error('当前设备不支持定位，请手动选择城市或填写经纬度。');
  return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(
    position => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy }),
    error => reject(Error(error.code === 1 ? '未获得定位权限，请手动选择城市，或在系统设置中允许本应用定位。' : error.code === 3 ? '定位超时，请重试或手动选择地点。' : '暂时无法取得位置，请检查定位服务或手动选择地点。')),
    { enableHighAccuracy: false, maximumAge: 60000, timeout: 20000 },
  ));
}
