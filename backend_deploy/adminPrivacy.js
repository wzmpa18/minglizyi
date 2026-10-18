'use strict';

/**
 * 管理后台隐私最小化：数据库仍保留业务必需数据，但任何后台列表、导出、
 * 审计日志和运行日志都不得返回完整手机号或邮箱。
 */
function maskPhone(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 7) {
    const masked = digits.slice(0, 3) + '****' + digits.slice(-4);
    return raw.startsWith('+') ? '+' + masked : masked;
  }
  if (raw.length <= 2) return '*'.repeat(raw.length);
  return raw.slice(0, 1) + '*'.repeat(Math.max(1, raw.length - 2)) + raw.slice(-1);
}

function maskEmail(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const at = raw.lastIndexOf('@');
  if (at <= 0) return maskContact(raw);
  const local = raw.slice(0, at);
  const domain = raw.slice(at + 1);
  const localMasked = local.slice(0, 1) + '***';
  const parts = domain.split('.');
  const host = parts.shift() || '';
  const hostMasked = host ? host.slice(0, 1) + '***' : '***';
  return `${localMasked}@${hostMasked}${parts.length ? '.' + parts.join('.') : ''}`;
}

function maskContact(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.includes('@')) return maskEmail(raw);
  if (/^\+?[\d\s()-]{7,}$/.test(raw)) return maskPhone(raw);
  if (raw.length <= 3) return raw.slice(0, 1) + '**';
  return raw.slice(0, 2) + '***' + raw.slice(-2);
}

function redactSensitiveText(value) {
  return String(value == null ? '' : value)
    .replace(/\b1[3-9]\d{9}\b/g, (m) => maskPhone(m))
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, (m) => maskEmail(m));
}

function sanitizeAdminData(value, key = '') {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map((item) => sanitizeAdminData(item, key));
  if (typeof value === 'object') {
    const out = {};
    for (const [childKey, childValue] of Object.entries(value)) {
      out[childKey] = sanitizeAdminData(childValue, childKey);
    }
    return out;
  }
  if (typeof value !== 'string' && typeof value !== 'number') return value;

  const normalized = String(key || '').toLowerCase();
  if (/(^|_)phone$|mobile$|telephone$/.test(normalized)) return maskPhone(value);
  if (/(^|_)email$/.test(normalized)) return maskEmail(value);
  if (normalized === 'contact' || normalized.endsWith('_contact')) return maskContact(value);
  return typeof value === 'string' ? redactSensitiveText(value) : value;
}

module.exports = { maskPhone, maskEmail, maskContact, redactSensitiveText, sanitizeAdminData };
