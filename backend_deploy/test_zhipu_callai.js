// 智谱连通性小测试（直接fetch，几十个token，零成本验证）
// 运行：cd /www/yandaoguoxue-backend && node -r dotenv/config /tmp/test_zhipu_callai.js
(async () => {
  const res = await fetch(process.env.ZHIPU_API_URL || 'https://open.bigmodel.cn/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.ZHIPU_API_KEY}` },
    body: JSON.stringify({
      model: process.env.ZHIPU_MODEL || 'glm-4.5-flash',
      messages: [{ role: 'user', content: '请只回复四个字：连通正常' }],
      max_tokens: 20, temperature: 0.7, stream: false,
      thinking: { type: 'disabled' },
    }),
  });
  const raw = await res.text();
  console.log('HTTP:', res.status);
  console.log('RAW:', raw.slice(0, 300));
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
