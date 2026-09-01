#!/bin/bash
cd /www/yandaoguoxue-backend
echo "FROM_EMAIL=$(grep -E '^TENCENT_SES_FROM_EMAIL=' .env | cut -d= -f2-)"
echo "TEMPLATE_ID=$(grep -E '^TENCENT_SES_TEMPLATE_ID=' .env | cut -d= -f2-)"
echo "===带错误输出的邮件测试==="
node <<'EOF'
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const tencentcloud = require('tencentcloud-sdk-nodejs-ses');
const client = new tencentcloud.ses.v20201002.Client({
  credential: { secretId: process.env.TENCENT_SES_SECRET_ID, secretKey: process.env.TENCENT_SES_SECRET_KEY },
  region: 'ap-hongkong',
  profile: { httpProfile: { endpoint: 'ses.tencentcloudapi.com' } },
});
client.SendEmail({
  FromEmailAddress: process.env.TENCENT_SES_FROM_EMAIL,
  Destination: ['wuzhimin666@163.com'],
  Subject: '言道国学公众号内容任务完成提醒（链路测试）',
  Template: { TemplateID: Number(process.env.TENCENT_SES_TEMPLATE_ID), TemplateData: JSON.stringify({ content: '公众号内容调度邮件链路测试：本邮件由定时任务notify阶段自动发送。' }) },
}).then((r) => console.log('EMAIL_SENT', JSON.stringify(r))).catch((e) => console.log('EMAIL_FAIL', e.message));
EOF
