'use strict';

const http = require('http');

const DEFAULT_METADATA_URL = 'http://metadata.tencentyun.com/latest/meta-data/cam/security-credentials/';
let cachedRole = '';
let cachedCredentials = null;

function authMode(env = process.env) {
  if (env.COS_SECRET_ID && env.COS_SECRET_KEY) return 'STATIC';
  if (String(env.COS_AUTH_MODE || '').toUpperCase() === 'CVM_ROLE' || env.COS_CVM_ROLE_NAME) return 'CVM_ROLE';
  return 'UNCONFIGURED';
}

function validateAuth(env = process.env) {
  const mode = authMode(env);
  if (mode === 'STATIC') return { valid: true, mode };
  if (mode === 'CVM_ROLE') {
    return {
      valid: true,
      mode,
      note: '使用 CVM 实例角色的自动轮换临时凭据；服务器不保存永久 SecretKey',
    };
  }
  return {
    valid: false,
    mode,
    missing: ['COS_SECRET_ID/COS_SECRET_KEY 或 COS_AUTH_MODE=CVM_ROLE'],
  };
}

function createClientOptions(env = process.env) {
  const mode = authMode(env);
  if (mode === 'STATIC') {
    return { SecretId: env.COS_SECRET_ID, SecretKey: env.COS_SECRET_KEY };
  }
  if (mode !== 'CVM_ROLE') throw new Error('COS 身份未配置');
  return {
    getAuthorization(_options, callback) {
      getCvmRoleCredentials(env)
        .then((data) => callback({
          TmpSecretId: data.TmpSecretId,
          TmpSecretKey: data.TmpSecretKey,
          SecurityToken: data.Token,
          StartTime: data.StartTime,
          ExpiredTime: data.ExpiredTime,
          ScopeLimit: false,
        }))
        .catch((error) => callback({ error: error.message }));
    },
  };
}

async function getCvmRoleCredentials(env = process.env) {
  const now = Math.floor(Date.now() / 1000);
  if (cachedCredentials && Number(cachedCredentials.ExpiredTime) > now + 120) return cachedCredentials;

  const base = String(env.COS_CVM_METADATA_URL || DEFAULT_METADATA_URL).replace(/\/+$/, '') + '/';
  const role = String(env.COS_CVM_ROLE_NAME || cachedRole || await requestText(base)).trim();
  if (!role || /<html/i.test(role)) {
    throw new Error('CVM 尚未绑定 CAM 角色，或 COS_CVM_ROLE_NAME 未配置');
  }
  if (!/^[A-Za-z0-9_.-]{1,64}$/.test(role)) throw new Error('CVM CAM 角色名称非法');

  const data = JSON.parse(await requestText(base + encodeURIComponent(role)));
  if (Number(data.Code) !== 0 || !data.TmpSecretId || !data.TmpSecretKey || !data.Token || !data.ExpiredTime) {
    throw new Error(data.Message || 'CVM 实例角色未返回完整临时凭据');
  }
  cachedRole = role;
  cachedCredentials = {
    TmpSecretId: data.TmpSecretId,
    TmpSecretKey: data.TmpSecretKey,
    Token: data.Token,
    StartTime: Number(data.StartTime) || now - 30,
    ExpiredTime: Number(data.ExpiredTime),
  };
  return cachedCredentials;
}

function requestText(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: 2000, headers: { Host: 'metadata.tencentyun.com' } }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
        if (body.length > 65536) req.destroy(new Error('CVM 元数据响应过大'));
      });
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`CVM 元数据 HTTP ${res.statusCode}`));
        resolve(body);
      });
    });
    req.on('timeout', () => req.destroy(new Error('CVM 元数据请求超时')));
    req.on('error', reject);
  });
}

function resetCacheForTest() {
  cachedRole = '';
  cachedCredentials = null;
}

module.exports = { authMode, validateAuth, createClientOptions, getCvmRoleCredentials, resetCacheForTest };
