/**
 * 从 APP 当前已采用的 14 经络 / 361 穴基线生成持久离线内容包。
 * 只生成包文件，不自动发布；上线须走离线包后台 register -> publish。
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const source = path.join(__dirname, '..', 'src', 'algorithm-core', 'modules', 'tcm', 'data', 'meridians.json');
const outputDir = path.join(__dirname, 'data', 'offline_pack_sources');
const output = path.join(outputDir, 'tcm-acupoints-v1.0.0.pack');
const data = JSON.parse(fs.readFileSync(source, 'utf8'));

if (!Array.isArray(data.meridians) || data.meridians.length !== 14) throw new Error('经络基线数量必须为 14');
if (!Array.isArray(data.acupoints) || data.acupoints.length !== 361) throw new Error('穴位基线数量必须为 361');
const codes = new Set(data.acupoints.map((v) => String(v.code || '').toUpperCase()));
if (codes.size !== data.acupoints.length || codes.has('')) throw new Error('穴位编码存在空值或重复');

const payload = {
  schema: 'yandao.tcm.acupoints.v1',
  version: '1.0.0',
  generatedAt: new Date().toISOString(),
  reviewState: 'APPROVED_EXISTING_BASELINE',
  contentScope: '传统文化学习字段：经络、名称、定位、功效、典籍；不含针刺操作指导',
  sourceNotice: '基于项目现有 tcm-cli MIT 数据基线生成；完整声明随源码保留。',
  meridians: data.meridians,
  acupoints: data.acupoints,
};
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(output, JSON.stringify(payload), 'utf8');
const bytes = fs.readFileSync(output);
console.log(JSON.stringify({
  ok: true,
  packId: 'tcm-acupoints',
  contentType: 'STUDY_MATERIALS',
  version: payload.version,
  filePath: output,
  size: bytes.length,
  sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  meridians: data.meridians.length,
  acupoints: data.acupoints.length,
  nextAction: '通过 /api/admin/offline/packs 注册为 DRAFT，复核后 publish',
}, null, 2));
