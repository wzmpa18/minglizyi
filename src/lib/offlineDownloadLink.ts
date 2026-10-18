interface PackIdentity { packId: string; version: string; sha256: string; size: number; downloadUrl: string; }
/** Metadata comes from the already-authorized app endpoint; COS gets no app JWT. */
export function validateOfflineDownloadLink(value: unknown, pack: PackIdentity) {
  if (!value || typeof value !== 'object') throw Error('资料下载信息无效，请刷新内容包列表后重试');
  const data = value as Record<string, unknown>;
  if (data.success !== true || data.sha256 !== pack.sha256 || data.size !== pack.size || data.version !== pack.version || typeof data.downloadUrl !== 'string') throw Error('资料版本已变化，请刷新内容包列表后重试');
  const path = `/api/offline/packs/${encodeURIComponent(pack.packId)}/download`;
  if (data.deliveryProvider === 'LOCAL' && data.downloadUrl === path && pack.downloadUrl === path) return { url: path, applicationAuth: true };
  if (data.deliveryProvider === 'COS') {
    const url = new URL(data.downloadUrl);
    if (url.protocol === 'https:' && !url.username && !url.password && !url.port && !url.hash && /^[a-z0-9-]+-\d+\.cos\.[a-z0-9-]+\.myqcloud\.com$/i.test(url.hostname) && url.pathname.startsWith('/learning-content/offline-packs/') && !url.pathname.includes('..')) return { url: url.href, applicationAuth: false };
  }
  throw Error('资料下载地址不受支持，请稍后重试');
}
