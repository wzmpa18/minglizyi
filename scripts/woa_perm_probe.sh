#!/bin/bash
# 交叉验证账号权限等级（判断是否已微信认证）
cd /www/yandaoguoxue-backend
node <<'EOF'
require('dotenv').config();
const tm = require('./wechatTokenManager');
(async () => {
  const token = await tm.getAccessToken();
  const tests = [
    ['菜单查询 menu/get', 'https://api.weixin.qq.com/cgi-bin/menu/get?access_token='],
    ['关注者 user/get', 'https://api.weixin.qq.com/cgi-bin/user/get?access_token='],
    ['标签 tags/get', 'https://api.weixin.qq.com/cgi-bin/tags/get?access_token='],
    ['草稿箱 draft/batchget', 'https://api.weixin.qq.com/cgi-bin/draft/batchget?access_token='],
  ];
  for (const [name, base] of tests) {
    try {
      const res = await fetch(base + token + (name.includes('draft') ? '&offset=0&count=1&no_content=1' : ''));
      const data = await res.json();
      const brief = data.errcode !== undefined && data.errcode !== 0
        ? `${data.errcode} ${data.errmsg}`.slice(0, 70)
        : 'OK ' + JSON.stringify(data).slice(0, 60);
      console.log(name.padEnd(24), brief);
    } catch (e) { console.log(name.padEnd(24), 'FAIL', e.message); }
  }
})();
EOF
