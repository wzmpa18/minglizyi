// 查看freepublish/batchget原始响应结构（只读）
const { getAccessToken } = require('/www/yandaoguoxue-backend/wechatTokenManager');
(async () => {
  const token = await getAccessToken();
  const res = await fetch(`https://api.weixin.qq.com/cgi-bin/freepublish/batchget?access_token=${token}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ offset: 0, count: 20, no_content: 1 }),
  });
  const raw = await res.text();
  console.log('RAW_LEN:', raw.length);
  console.log(raw.slice(0, 2000));
})();
