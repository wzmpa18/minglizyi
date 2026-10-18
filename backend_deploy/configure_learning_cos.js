/**
 * 幂等维护学习内容桶 CORS。只补客户端公开版本请求头，不改来源、方法或其他规则。
 * 凭证只从服务器环境变量读取，禁止写入源码/聊天/数据库。
 * 用法：在国学生产后端目录加载 .env 后执行 node configure_learning_cos.js
 */
'use strict';

const COS = require('cos-nodejs-sdk-v5');
const cosCredentials = require('./cosCredentialProvider');
const { learningCorsRules } = require('./learningCorsPolicy');

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
};

client.getBucketCors(params, (error, current) => {
  if (error) {
    console.error('COS_CORS_READ_FAILED:', error.code || 'unavailable');
    process.exitCode = 1;
    return;
  }
  let next;
  try { next = learningCorsRules(current.CORSRules); }
  catch { console.error('COS_CORS_RULE_NOT_MATCHED_NO_CHANGE'); process.exitCode = 1; return; }
  client.putBucketCors({ ...params, CORSRules: next }, writeError => {
    if (writeError) { console.error('COS_CORS_WRITE_FAILED:', writeError.code || 'unavailable'); process.exitCode = 1; return; }
    client.getBucketCors(params, (readError, verified) => {
      if (readError || JSON.stringify(learningCorsRules(verified.CORSRules)) !== JSON.stringify(verified.CORSRules)) {
        console.error('COS_CORS_READBACK_FAILED'); process.exitCode = 1; return;
      }
      console.log('COS_CORS_CLIENT_VERSION_HEADERS_VERIFIED');
    });
  });
});
