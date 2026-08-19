#!/usr/bin/env node
// AI 通道与产线健康勘察（只读）
'use strict';
const fs = require('fs');
const env = fs.readFileSync('/www/yandaoguoxue-backend/.env', 'utf8');
const keys = env.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#')).map(l => l.split('=')[0]);
console.log('===== .env 配置项（仅键名） =====');
console.log(keys.join(', '));
console.log('HUNYUAN_API_KEY:', env.includes('HUNYUAN_API_KEY=') && env.match(/HUNYUAN_API_KEY=(\S+)/) ? '已配置(len=' + env.match(/HUNYUAN_API_KEY=(\S+)/)[1].length + ')' : '未配置');
console.log('DEEPSEEK_API_KEY:', env.includes('DEEPSEEK_API_KEY=') && env.match(/DEEPSEEK_API_KEY=(\S+)/) ? '已配置(len=' + env.match(/DEEPSEEK_API_KEY=(\S+)/)[1].length + ')' : '未配置');
console.log('OPENAI_API_KEY:', env.includes('OPENAI_API_KEY=') && env.match(/OPENAI_API_KEY=(\S+)/) ? '已配置(len=' + env.match(/OPENAI_API_KEY=(\S+)/)[1].length + ')' : '未配置');
const m = env.match(/HUNYUAN_MODEL=(\S+)/); console.log('HUNYUAN_MODEL:', m ? m[1] : '(默认hy3)');
const u = env.match(/HUNYUAN_API_URL=(\S+)/); console.log('HUNYUAN_API_URL:', u ? u[1] : '(默认tokenhub)');

const D = require('/www/yandaoguoxue-backend/node_modules/better-sqlite3')('/www/yandaoguoxue-backend/data/academy.db', { readonly: true });
const cols = D.prepare("PRAGMA table_info(ai_call_logs)").all().map(c => c.name);
console.log('\n===== ai_call_logs 列 =====');
console.log(cols.join(', '));
console.log('\n===== 最近 AI 调用统计 =====');
if (cols.includes('scene')) {
  const hasModel = cols.includes('model');
  const rows = D.prepare(hasModel
    ? "SELECT scene, model, COUNT(*) n, MAX(created_at) last FROM ai_call_logs GROUP BY scene, model ORDER BY n DESC LIMIT 12"
    : "SELECT scene, COUNT(*) n, MAX(created_at) last FROM ai_call_logs GROUP BY scene ORDER BY n DESC LIMIT 12").all();
  for (const r of rows) console.log(`${r.scene}\t${r.model || ''}\t${r.n}次\t最后:${r.last}`);
  const total = D.prepare("SELECT COUNT(*) n FROM ai_call_logs").get();
  console.log('总调用:', total.n);
}
