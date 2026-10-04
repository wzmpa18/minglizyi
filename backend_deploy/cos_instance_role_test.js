'use strict';

const http = require('http');
const provider = require('./cosCredentialProvider');

async function main() {
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/metadata/') return res.end('YandaoLearningCosRole');
    if (req.url === '/metadata/YandaoLearningCosRole') {
      return res.end(JSON.stringify({
        Code: 0,
        TmpSecretId: 'tmp-id',
        TmpSecretKey: 'tmp-key',
        Token: 'tmp-token',
        ExpiredTime: Math.floor(Date.now() / 1000) + 1800,
      }));
    }
    res.statusCode = 404;
    res.end('{}');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    provider.resetCacheForTest();
    const port = server.address().port;
    const env = { COS_AUTH_MODE: 'CVM_ROLE', COS_CVM_METADATA_URL: `http://127.0.0.1:${port}/metadata/` };
    const checked = provider.validateAuth(env);
    if (!checked.valid || checked.mode !== 'CVM_ROLE') throw new Error('角色模式校验失败');
    const creds = await provider.getCvmRoleCredentials(env);
    if (creds.TmpSecretId !== 'tmp-id' || creds.Token !== 'tmp-token') throw new Error('临时凭据读取失败');
    const options = provider.createClientOptions(env);
    const sdkAuth = await new Promise((resolve) => options.getAuthorization({}, resolve));
    if (sdkAuth.TmpSecretKey !== 'tmp-key' || !sdkAuth.ExpiredTime) throw new Error('SDK 鉴权回调失败');
    console.log('COS_INSTANCE_ROLE_TEST_PASS');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
