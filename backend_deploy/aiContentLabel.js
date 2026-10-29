'use strict';

const {randomUUID, createHash} = require('node:crypto');
const PRODUCER = '东莞言道科技有限公司';

// First-party metadata for generated text JSON. This does not certify upstream
// registration or add metadata to unrelated images, books, or user messages.
function labelAIResponse(payload, context = {}) {
  if (!payload || payload.success !== true || typeof payload.content !== 'string' || !payload.content.trim()) return payload;
  const AIGC = {
    Label: '1', ContentProducer: PRODUCER, ProduceID: randomUUID(),
    ReservedCode1: JSON.stringify({application: 'com.yandao.guoxue',
      provider: String(context.provider || 'unknown').slice(0, 40),
      model: String(context.model || 'unknown').slice(0, 120),
      requestDigest: createHash('sha256').update(String(context.requestId || '')).digest('hex')}),
    ContentPropagator: PRODUCER, PropagateID: '', ReservedCode2: '',
  };
  AIGC.PropagateID = AIGC.ProduceID;
  return {...payload, AIGC, contentLabel: 'AI生成（深度合成）内容',
    data: {...(payload.data || {}), AIGC}};
}

module.exports = {labelAIResponse};
