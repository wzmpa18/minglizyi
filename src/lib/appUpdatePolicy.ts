/** Fixed distribution policy. Server responses cannot enable app replacement. */
export const STORE_UPDATE_MESSAGE = '请通过安装本应用的应用商店检查更新；学习资料下载与现有权益不受影响。';
export function usesCompanyAppDistribution(channel: string): boolean {
  return channel === 'default' || channel === 'internal';
}
export function mayRefreshWebBuild(channel: string, nativeShell: boolean): boolean {
  return usesCompanyAppDistribution(channel) && !nativeShell;
}
