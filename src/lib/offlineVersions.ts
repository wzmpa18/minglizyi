/** Numeric app/content versions; accept the public version.json leading v. */
function parts(value: string): number[] {
  if (typeof value !== 'string' || !/^[vV]?\d{1,9}(?:\.\d{1,9}){0,2}$/.test(value.trim())) throw new Error('无效的内容包或应用版本号');
  const result = value.trim().replace(/^v/i, '').split('.').map(Number);
  return [result[0], result[1] ?? 0, result[2] ?? 0];
}
export function compareVersion(a: string, b: string): number {
  const left = parts(a), right = parts(b);
  for (let i = 0; i < 3; i++) {
    if (left[i] > right[i]) return 1;
    if (left[i] < right[i]) return -1;
  }
  return 0;
}
export function meetsMinAppVersion(minAppVersion: string, appVersion: string): boolean {
  try { return compareVersion(appVersion, minAppVersion) >= 0; }
  catch { return false; }
}
