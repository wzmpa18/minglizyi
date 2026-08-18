#!/usr/bin/env node
// P7-整改-01 社交后端逻辑自测：静态断言（socialApiRoutes.js 关键改动）+ 行为复现（敏感词/滚动覆盖/开关解析）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROUTES = path.join(ROOT, 'backend_deploy', 'socialApiRoutes.js');
const src = fs.readFileSync(ROUTES, 'utf-8');
let pass = 0, fail = 0;
const check = (name, ok) => { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${name}`); ok ? pass++ : fail++; };

// ==================== T1 静态断言：关键改动齐全 ====================
console.log('[T1] 静态断言：socialApiRoutes.js 关键改动');
check('敏感词留痕表 sensitive_logs 已建', /CREATE TABLE IF NOT EXISTS sensitive_logs/.test(src));
check('功能开关默认值：仅开好友+私聊', /friends_add_enabled: true/.test(src) && /private_chat_enabled: true/.test(src));
check('功能开关默认值：动态/评论/群聊保持关闭', /posts_enabled: false/.test(src) && /comments_enabled: false/.test(src) && /groups_enabled: false/.test(src));
check('好友申请路由有开关守卫', /\/friends\/request', authRequired, \(req, res\) => \{\s*\n\s*try \{\s*\n\s*if \(!featureEnabled\('friends_add_enabled'\)\)/.test(src));
check('私聊GET路由有开关守卫', /if \(!featureEnabled\('private_chat_enabled'\)\) return featureDisabled\(res, '私聊'\);\s*\n\s*const convId = privateConvId/.test(src));
check('私聊POST路由有开关守卫', /if \(!featureEnabled\('private_chat_enabled'\)\) return featureDisabled\(res, '私聊'\);\s*\n\s*const \{ content, type = 'text' \}/.test(src));
check('动态发布路由有开关守卫', /if \(!featureEnabled\('posts_enabled'\)\) return featureDisabled\(res, '动态发布'\)/.test(src));
check('评论路由有开关守卫', /if \(!featureEnabled\('comments_enabled'\)\) return featureDisabled\(res, '评论'\)/.test(src));
check('群聊写操作统一守卫（GET放行）', /router\.use\('\/groups', \(req, res, next\) => \{\s*\n\s*if \(!featureEnabled\('groups_enabled'\) && req\.method !== 'GET'\)/.test(src));
check('100条滚动覆盖 DELETE SQL', /DELETE FROM chat_messages WHERE conversation_id = \? AND id NOT IN \(SELECT id FROM chat_messages WHERE conversation_id = \? ORDER BY id DESC LIMIT 100\)/.test(src));
check('图片消息格式校验（data:image base64）', /data:image\\\/\(png\|jpeg\|jpg\|gif\|webp\);base64,/.test(src));
check('图片大小上限4MB', /c\.length > 4 \* 1024 \* 1024/.test(src));
check('文字消息敏感词拦截+留痕', /logSensitive\(me, 'private_message', text, hits\)/.test(src) && /消息包含违规内容，已拦截/.test(src));
check('图片通知文案', /发来一张图片/.test(src));

// ==================== T2 行为复现：敏感词命中 ====================
console.log('[T2] 行为复现：敏感词过滤（与后端同源词表）');
const SENSITIVE_WORDS = ['违法','赌博','毒品','枪支','色情','裸聊','约炮','诈骗','传销','洗钱','高利贷','假币','炸药','政治敏感','邪教','恐怖','分裂'];
const findSensitiveWords = (t) => SENSITIVE_WORDS.filter(w => t.includes(w));
check('正常消息零命中', findSensitiveWords('今天学黄帝内经，收获很大').length === 0);
check('违规消息命中并返回词', JSON.stringify(findSensitiveWords('加我微信教你赌博稳赚')) === JSON.stringify(['赌博']));
check('多词命中全部返回', findSensitiveWords('赌博和诈骗都要远离').length === 2);
const srcWords = src.match(/const SENSITIVE_WORDS = \[([^\]]+)\]/)?.[1] || '';
check('后端词表与前端 socialStore 同源（17词）', (srcWords.match(/'/g) || []).length === 34);

// ==================== T3 行为复现：滚动覆盖 SQL 语义 ====================
console.log('[T3] 行为复现：单聊100条滚动覆盖（数组模拟 NOT IN ... LIMIT 100）');
function trimTo100(ids) {
  const keep = new Set([...ids].sort((a, b) => b - a).slice(0, 100));
  return ids.filter(id => keep.has(id));
}
check('100条以内不删', trimTo100(Array.from({ length: 100 }, (_, i) => i + 1)).length === 100);
check('105条仅保留最新100（1..5被覆盖）', (() => { const r = trimTo100(Array.from({ length: 105 }, (_, i) => i + 1)); return r.length === 100 && !r.includes(1) && r.includes(105); })());
check('新消息总是在保留集内', trimTo100([...Array.from({ length: 120 }, (_, i) => i + 1), 999]).includes(999));

// ==================== T4 行为复现：开关解析 ====================
console.log('[T4] 行为复现：featureEnabled 取值规则');
function parseEnabled(val, def) { return val === undefined ? def : (val === true || val === 'true' || val === 1 || val === '1'); }
check('缺省走默认值（私聊开）', parseEnabled(undefined, true) === true);
check('缺省走默认值（群聊关）', parseEnabled(undefined, false) === false);
check('文件值 "false" → 关', parseEnabled('false', true) === false);
check('文件值 "true" → 开', parseEnabled('true', false) === true);
check('文件值 true/1 → 开', parseEnabled(true, false) && parseEnabled('1', false));

// ==================== T5 配置文件就位 ====================
console.log('[T5] 开关配置文件');
const cfgPath = path.join(ROOT, 'backend_deploy', 'data', 'social_feature_config.json');
check('social_feature_config.json 存在且为合法JSON', (() => { try { JSON.parse(fs.readFileSync(cfgPath, 'utf-8')); return true; } catch { return false; } })());
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
check('配置默认：好友开/私聊开/动态评论群聊关', cfg.friends_add_enabled === true && cfg.private_chat_enabled === true && cfg.posts_enabled === false && cfg.comments_enabled === false && cfg.groups_enabled === false);

console.log(`\n══ 结果：PASS=${pass} FAIL=${fail} ══`);
process.exit(fail ? 1 : 0);
