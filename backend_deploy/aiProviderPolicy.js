'use strict';

// Owner confirmed 2026-10-29: this product uses its existing Hunyuan service.
// Empty values (rather than deleting keys) also prevent later default dotenv
// calls from re-enabling another provider in this process. Originals stay in
// the protected configuration; no other application's environment is changed.
function activateHunyuanOnly(env = process.env) {
  for (const name of ['ZHIPU_API_KEY', 'DEEPSEEK_API_KEY', 'OPENAI_API_KEY']) env[name] = '';
  env.GUOXUE_AI_PROVIDER_MODE = 'hunyuan-only';
  return {mode: 'hunyuan-only', ready: Boolean(env.HUNYUAN_API_KEY),
    model: env.HUNYUAN_MODEL || 'hy3'};
}

module.exports = {activateHunyuanOnly};
