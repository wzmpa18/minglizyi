/**
 * 一次性配置学习内容桶 CORS。凭证只从服务器环境变量读取，禁止写入源码/聊天/数据库。
 * 用法：在国学生产后端目录加载 .env 后执行 node configure_learning_cos.js
 */
'use strict';

const COS = require('cos-nodejs-sdk-v5');
const cosCredentials = require('./cosCredentialProvider');

const required = ['COS_BUCKET', 'COS_REGION'];
const missing = required.filter((key) => !process.env[key]);
const auth = cosCredentials.validateAuth();
if (!auth.valid) missing.push(...auth.missing);
if (missing.length) {
  console.error(`BLOCKED_EXTERNAL_CONFIG: ${missing.join(', ')}`);
  process.exit(2);
}

const client = new COS(cosCredentials.createClientOptions());
const params = {
  Bucket: process.env.COS_BUCKET,
  Region: process.env.COS_REGION,
  CORSRules: [{
    AllowedOrigins: [
      'https://yandaoguoxue.yandao.vip',
      'https://www.yandao.vip',
      'https://localhost',
      'capacitor://localhost',
    ],
    AllowedMethods: ['GET', 'HEAD'],
    AllowedHeaders: ['Range', 'Content-Type'],
    ExposeHeaders: ['Content-Length', 'Content-Range', 'Accept-Ranges', 'ETag'],
    MaxAgeSeconds: 3600,
  }],
};

client.putBucketCors(params, (error) => {
  if (error) {
    console.error('COS_CORS_FAILED:', error.message || error);
    process.exitCode = 1;
    return;
  }
  console.log('COS_CORS_CONFIGURED');
});
