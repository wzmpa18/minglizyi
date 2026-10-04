"use client";

import { useCallback, useEffect, useState } from 'react';
import { CloudUpload, HardDriveDownload, RefreshCw, Upload } from 'lucide-react';
import { AdminCard, LoadingSpinner, THEME, styles, useMounted, useToast } from '../_shared';
import { getAdminKey } from '@/lib/admin/client';

interface PackRow {
  packId: string;
  contentType: string;
  name: string;
  version: string;
  size: number;
  sizeMB: number;
  sha256: string;
  required: boolean;
  description: string;
  status: 'DRAFT' | 'PUBLISHED' | 'DEPRECATED';
  accessLevel: 'PUBLIC' | 'MEMBER';
  deliveryProvider: 'LOCAL' | 'COS';
  storageReady: boolean;
  updatedAt: string;
}

const initialForm = {
  packId: 'tcm-acupoints',
  contentType: 'STUDY_MATERIALS',
  version: '1.0.0',
  filePath: '/www/yandaoguoxue-backend/data/offline_pack_sources/tcm-acupoints-v1.0.0.pack',
  name: '经络穴位学习基线（14经络361穴）',
  minAppVersion: '25.0.97',
  required: false,
  accessLevel: 'MEMBER',
  description: '传统文化学习字段；下载并校验后长期保存在手机，断网可用。',
};

async function request<T>(path: string, init?: RequestInit): Promise<{ ok: boolean; data?: T; error?: string }> {
  const key = getAdminKey();
  if (!key) return { ok: false, error: '未登录' };
  try {
    const response = await fetch(`/api/admin/offline${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, ...(init?.headers || {}) },
    });
    const json = await response.json();
    return { ok: response.ok && json.success, data: json.data, error: json.error };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export default function OfflineContentAdminPage() {
  const mounted = useMounted();
  const { show, toastNode } = useToast();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [packs, setPacks] = useState<PackRow[]>([]);
  const [form, setForm] = useState(initialForm);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await request<{ list: PackRow[] }>('/packs');
    if (result.ok) setPacks(result.data?.list || []);
    else show(result.error || '内容包列表加载失败', 'error');
    setLoading(false);
  }, [show]);

  useEffect(() => { if (mounted) void load(); }, [mounted, load]);

  const register = async () => {
    setBusy('register');
    const result = await request('/packs', { method: 'POST', body: JSON.stringify(form) });
    setBusy('');
    if (!result.ok) return show(result.error || '注册失败', 'error');
    show('内容包已注册为草稿，请复核哈希和内容后再发布', 'success');
    await load();
  };

  const action = async (packId: string, verb: 'publish' | 'deprecate' | 'redraft') => {
    const prompt = verb === 'publish' ? '确认发布该内容包？用户端将发现并后台下载。' : verb === 'deprecate' ? '确认撤回该内容包？已下载文件仍可保留，manifest 不再下发。' : '确认恢复为草稿？';
    if (!window.confirm(prompt)) return;
    setBusy(`${packId}:${verb}`);
    const result = await request(`/packs/${encodeURIComponent(packId)}/action`, { method: 'POST', body: JSON.stringify({ action: verb }) });
    setBusy('');
    if (!result.ok) return show(result.error || '操作失败', 'error');
    show('状态已更新', 'success');
    await load();
  };

  const distribute = async (packId: string) => {
    if (!window.confirm('确认把该草稿上传到私有学习内容存储桶？上传成功后会清理服务器暂存副本。')) return;
    setBusy(`${packId}:distribute`);
    const result = await request(`/packs/${encodeURIComponent(packId)}/distribute`, { method: 'POST' });
    setBusy('');
    if (!result.ok) return show(result.error || '存储桶分发失败', 'error');
    show('已分发到私有对象存储，可以复核发布', 'success');
    await load();
  };

  if (!mounted || loading) return <LoadingSpinner text="正在读取离线内容包..." />;

  return <div>
    {toastNode}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
      <div><h1 style={{ margin: 0, fontSize: 22, color: THEME.textMain, display: 'flex', alignItems: 'center', gap: 8 }}><HardDriveDownload color={THEME.primary} /> 离线内容包</h1><div style={{ color: THEME.textSub, fontSize: 13, marginTop: 6 }}>新资料无需重发 APP；先注册草稿，复核后发布，客户端后台下载并永久保存</div></div>
      <button style={styles.btnSecondary} onClick={() => void load()}><RefreshCw size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />刷新</button>
    </div>

    <AdminCard title="注册服务器文件" style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, color: THEME.textSub, marginBottom: 12 }}>服务器文件只作为发布暂存；注册后必须先分发到私有对象存储。用户鉴权后取得短期下载地址，学习包流量不经过应用服务器。</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
        {(['packId','version','name','minAppVersion','filePath','description'] as const).map((key) => <label key={key}><span style={styles.label}>{({packId:'包ID',version:'版本',name:'名称',minAppVersion:'最低APP版本',filePath:'服务器文件路径',description:'说明'} as const)[key]}</span><input style={styles.input} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>)}
        <label><span style={styles.label}>内容类型</span><select style={styles.input} value={form.contentType} onChange={(e) => setForm({ ...form, contentType: e.target.value })}><option value="STUDY_MATERIALS">学习资料</option><option value="EXAM_BANK">题库</option><option value="TCM_CLASSICS">中医古籍</option><option value="IMAGE_ASSETS">图谱图片</option><option value="COURSE">课程</option><option value="TERMS_INDEX">术语索引</option></select></label>
        <label><span style={styles.label}>下载权限</span><select style={styles.input} value={form.accessLevel} onChange={(e) => setForm({ ...form, accessLevel: e.target.value })}><option value="MEMBER">会员专享</option><option value="PUBLIC">公开资料</option></select></label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 22 }}><input type="checkbox" checked={form.required} onChange={(e) => setForm({ ...form, required: e.target.checked })} />设为必须更新</label>
      </div>
      <button style={{ ...styles.btnPrimary, marginTop: 14 }} disabled={busy === 'register'} onClick={() => void register()}><Upload size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />{busy === 'register' ? '注册中…' : '注册为草稿'}</button>
    </AdminCard>

    <AdminCard title={`内容包列表（${packs.length}）`}>
      {!packs.length && <div style={{ color: THEME.textHint, fontSize: 13 }}>暂无内容包</div>}
      {packs.map((pack) => <div key={pack.packId} style={{ padding: '14px 0', borderBottom: `1px solid ${THEME.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><div><b style={{ color: THEME.textMain }}>{pack.name}</b><div style={{ fontSize: 12, color: THEME.textSub, marginTop: 4 }}>{pack.packId} · v{pack.version} · {pack.contentType} · {pack.sizeMB ? `${pack.sizeMB} MB` : `${pack.size} B`}</div><div style={{ fontSize: 12, color: pack.storageReady ? THEME.success : THEME.warning, marginTop: 4 }}>{pack.accessLevel === 'MEMBER' ? '会员专享' : '公开'} · {pack.storageReady ? 'COS 已就绪' : '仅服务器暂存，禁止发布'}</div><div style={{ fontSize: 11, color: THEME.textHint, marginTop: 4, wordBreak: 'break-all' }}>SHA-256：{pack.sha256}</div></div><span style={{ fontSize: 12, fontWeight: 700, color: pack.status === 'PUBLISHED' ? THEME.success : pack.status === 'DRAFT' ? THEME.warning : THEME.textHint }}>{pack.status}</span></div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          {pack.status === 'DRAFT' && !pack.storageReady && <button style={styles.btnSecondary} disabled={!!busy} onClick={() => void distribute(pack.packId)}><CloudUpload size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />分发到存储桶</button>}
          {pack.status !== 'PUBLISHED' && <button style={styles.btnPrimary} disabled={!!busy || !pack.storageReady} onClick={() => void action(pack.packId, 'publish')}>复核后发布</button>}
          {pack.status === 'PUBLISHED' && <button style={styles.btnDanger} disabled={!!busy} onClick={() => void action(pack.packId, 'deprecate')}>撤回</button>}
          {pack.status === 'DEPRECATED' && <button style={styles.btnSecondary} disabled={!!busy} onClick={() => void action(pack.packId, 'redraft')}>恢复草稿</button>}
        </div>
      </div>)}
    </AdminCard>
  </div>;
}
