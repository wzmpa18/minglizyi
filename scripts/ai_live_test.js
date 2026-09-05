// AI 通道实测：复用部署版 callAI（混元 hy3），验证解析/命题场景可用
'use strict';
require('/www/yandaoguoxue-backend/node_modules/dotenv').config({ path: '/www/yandaoguoxue-backend/.env' });
const academy = require('/www/yandaoguoxue-backend/academyRoutes.js');

(async () => {
  const t0 = Date.now();
  try {
    const out = await academy.callAI(
      '你是国学知识结构化引擎。将用户提供的资料拆分为知识点数组，严格输出 JSON：[{"chapter":"章节名","title":"知识点标题(20字内)","content":"知识点说明(150字内)","tags":["标签"],"difficulty":"easy|medium|hard","location":"原文位置","confidence":0.9}] 只输出 JSON。',
      '赛道资料内容（第1/1段）：\n六爻纳甲装卦：装六亲以卦宫五行为基准，生我者为父母，我生者为子孙，克我者为官鬼，我克者为妻财，比和者为兄弟。【典籍来源：《卜筮正宗》】',
      'parse_material', {}
    );
    const parsed = academy.extractJson(out);
    console.log('AI_REPLY_LEN:', (out || '').length);
    console.log('EXTRACTED:', JSON.stringify(parsed));
    console.log('MODEL:', academy.currentAIModel());
    console.log('AI_LIVE_TEST_OK', Date.now() - t0, 'ms');
  } catch (e) {
    console.error('AI_LIVE_TEST_FAIL:', e.message);
    process.exit(1);
  }
})();
