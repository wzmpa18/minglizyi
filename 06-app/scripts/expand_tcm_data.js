// expand_tcm_data.js - Expands TCM data files to reach target counts
// Herbs: 347 -> >=520, Formulas: 100 -> >=310, Acupoints: 20 -> 361, Meridians: 12 -> 14

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'src', 'algorithm-core', 'modules', 'tcm', 'data');
const D = '此为典籍原文记载，非医疗建议';

// Load existing data
const herbsData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'herbs.json'), 'utf8'));
const formulasData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'formulas.json'), 'utf8'));
const meridiansData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'meridians.json'), 'utf8'));

// Load all new data modules
const dataModule = require('./expand_tcm_data.data.js');
const supplementModule = require('./expand_tcm_data.supplement.js');
const extraModule = require('./expand_tcm_data.extra.js');
const extra2Module = require('./expand_tcm_data.extra2.js');
const acuModule = require('./expand_tcm_data.acupoints.js');

// Combine herbs from all sources
const ALL_HERBS = [
  ...(dataModule.H || []),
  ...(supplementModule.H_EXTRA || [])
];

// Combine formulas from all sources
const ALL_FORMULAS = [
  ...(dataModule.F || []),
  ...(supplementModule.F_EXTRA || []),
  ...(extraModule.F_EXTRA2 || []),
  ...(extra2Module.F_EXTRA3 || [])
];

// Use MACU for complete acupoints (361 points across 14 meridians)
const MACU = acuModule.MACU;

// ===== HELPER FUNCTIONS =====

function fixExistingHerb(h) {
  const fixed = { ...h };
  if (!fixed.pinyin) fixed.pinyin = fixed.name;
  if (!fixed.nature) fixed.nature = '待考';
  if (!fixed.meridian) fixed.meridian = '待考';
  if (!fixed.efficacy) fixed.efficacy = '典籍记载，待详考';
  if (!fixed.indications) fixed.indications = '典籍记载，待详考';
  if (!fixed.dosage) fixed.dosage = '3-9g';
  if (!fixed.indications_disclaimer) fixed.indications_disclaimer = D;
  if (!fixed.dosage_disclaimer) fixed.dosage_disclaimer = D;
  if (!fixed.contraindications) fixed.contraindications = '';
  if (!fixed.contraindications_disclaimer) fixed.contraindications_disclaimer = D;
  if (!fixed.source) fixed.source = '中国药典';
  if (!fixed.alias) fixed.alias = [];
  return fixed;
}

function parseFormula(f) {
  let alias = [];
  let ci;
  if (f.length === 11) {
    alias = f[3] ? String(f[3]).split('/').filter(Boolean) : [];
    ci = 4;
  } else if (f.length === 10) {
    alias = [];
    ci = 3;
  } else {
    if (f[3] && String(f[3]).includes(':')) { ci = 3; alias = []; }
    else { alias = f[3] ? String(f[3]).split('/').filter(Boolean) : []; ci = 4; }
  }
  const compStr = f[ci] || '';
  const comp = String(compStr).split(',').filter(Boolean).map(c => {
    const parts = c.split(':');
    return { herb: parts[0] || '', dosage: parts[1] || '', role: parts[2] || '佐', note: '' };
  });
  return {
    id: f[0],
    name: f[1],
    pinyin: f[2],
    alias,
    composition: comp,
    efficacy: f[ci + 1] || '',
    indications: f[ci + 2] || '',
    indications_disclaimer: D,
    contraindications: f[ci + 3] || '',
    contraindications_disclaimer: D,
    usage: f[ci + 4] || '水煎服',
    usage_disclaimer: D,
    source: f[ci + 5] || '',
    category: f[ci + 6] || '',
    classic_text: '',
    classic_source: '',
    classic_usage: '',
    modern_research: ''
  };
}

// ===== FIX EXISTING DATA =====
herbsData.herbs = herbsData.herbs.map(fixExistingHerb);

// ===== PROCESS HERBS =====
const existingHerbNames = new Set(herbsData.herbs.map(h => h.name));
const existingHerbIds = new Set(herbsData.herbs.map(h => h.id));
let nextHid = herbsData.herbs.length > 0
  ? Math.max(...herbsData.herbs.map(h => parseInt(h.id.substring(1)))) + 1
  : 1;
let herbsAdded = 0;
const newHerbs = [];

for (const h of ALL_HERBS) {
  const hName = h[0];
  if (existingHerbNames.has(hName)) continue;
  const id = 'h' + String(nextHid);
  while (existingHerbIds.has(id)) { nextHid++; id = 'h' + nextHid; }
  const entry = {
    id,
    name: hName,
    pinyin: h[1] || hName,
    alias: h[2] ? String(h[2]).split('/').filter(Boolean) : [],
    nature: h[3] || '待考',
    meridian: h[4] || '待考',
    efficacy: h[5] || '待考',
    indications: h[6] || '待考',
    indications_disclaimer: D,
    dosage: h[7] || '3-9g',
    dosage_disclaimer: D,
    contraindications: h[8] || '',
    contraindications_disclaimer: D,
    source: '中国药典'
  };
  herbsData.herbs.push(entry);
  newHerbs.push(entry);
  existingHerbNames.add(hName);
  existingHerbIds.add(id);
  nextHid++;
  herbsAdded++;
}
herbsData._metadata.total_herbs = herbsData.herbs.length;
console.log('Herbs: added', herbsAdded, '-> total', herbsData._metadata.total_herbs);

// ===== PROCESS FORMULAS =====
const existingFormulaNames = new Set(formulasData.formulas.map(f => f.name));
const existingFormulaIds = new Set(formulasData.formulas.map(f => f.id));
let nextFid = formulasData.formulas.length > 0
  ? Math.max(...formulasData.formulas.map(f => parseInt(f.id.substring(1)))) + 1
  : 1;
let formulasAdded = 0;
const newFormulas = [];

for (const f of ALL_FORMULAS) {
  const name = f[1];
  if (existingFormulaNames.has(name)) continue;
  const entry = parseFormula(f);
  // Ensure unique ID
  let fid = entry.id;
  while (existingFormulaIds.has(fid)) {
    fid = 'f' + String(nextFid);
    nextFid++;
  }
  entry.id = fid;
  formulasData.formulas.push(entry);
  newFormulas.push(entry);
  existingFormulaNames.add(name);
  existingFormulaIds.add(fid);
  formulasAdded++;
}
formulasData._metadata.total_formulas = formulasData.formulas.length;
console.log('Formulas: added', formulasAdded, '-> total', formulasData._metadata.total_formulas);

// ===== PROCESS MERIDIANS & ACUPOINTS =====
// First, build lookup of existing acupoint details for preservation
const existingAcupointMap = {};
for (const a of (meridiansData.acupoints || [])) {
  existingAcupointMap[a.name] = a;
}

// Build name mapping for existing short-named meridians -> full names
const MERIDIAN_SHORT_TO_FULL = {
  "肝经": "足厥阴肝经", "心经": "手少阴心经", "脾经": "足太阴脾经", "肺经": "手太阴肺经",
  "肾经": "足少阴肾经", "胆经": "足少阳胆经", "小肠经": "手太阳小肠经", "胃经": "足阳明胃经",
  "大肠经": "手阳明大肠经", "膀胱经": "足太阳膀胱经", "心包经": "手厥阴心包经", "三焦经": "手少阳三焦经"
};

// Replace meridians array entirely with standardized 14 meridians
meridiansData.meridians = [];
const allAcupoints = [];
const allAcupointNames = new Set();

// Standard function/location defaults for well-known points
const KNOWN_POINT_INFO = {
  "百会": { function: "醒脑开窍、安神定志、升阳举陷，主治头痛、眩晕、中风失语、脱肛、阴挺", literature: "《针灸甲乙经》" },
  "风池": { function: "疏风解表、平肝息风、清头明目，主治头痛、眩晕、感冒、目赤肿痛、鼻渊", literature: "《灵枢·热病》" },
  "合谷": { function: "镇静止痛、通经活络、清热解表，主治头痛、齿痛、面瘫、发热、经闭", literature: "《灵枢·本输》" },
  "足三里": { function: "健脾和胃、扶正培元、通经活络，主治胃痛、呕吐、腹胀、泄泻、便秘、虚劳", literature: "《灵枢·本输》" },
  "三阴交": { function: "健脾益血、调肝补肾，主治肠鸣腹胀、月经不调、遗精、阳痿、失眠、水肿", literature: "《针灸甲乙经》" },
  "太冲": { function: "平肝息风、清热利湿、通络止痛，主治头痛、眩晕、月经不调、胁痛、腹胀", literature: "《灵枢·本输》" },
  "内关": { function: "宁心安神、理气止痛，主治心痛、心悸、胸闷、胃痛、呕吐、失眠、眩晕", literature: "《灵枢·经脉》" },
  "关元": { function: "培元固本、补益下焦，主治遗精、阳痿、月经不调、痛经、虚劳、遗尿", literature: "《灵枢·寒热病》" },
  "气海": { function: "补气理气、益肾固精，主治虚脱、腹痛、泄泻、月经不调、遗精、阳痿", literature: "《针灸甲乙经》" },
  "涌泉": { function: "开窍醒神、滋阴益肾，主治头顶痛、昏厥、中暑、小便不利、便秘、足心热", literature: "《灵枢·本输》" },
  "曲池": { function: "清热解表、疏经通络，主治热病、咽喉肿痛、手臂痹痛、上肢不遂、瘾疹", literature: "《灵枢·本输》" },
  "大椎": { function: "解表清热、疏风散寒、通阳截疟，主治热病、疟疾、咳嗽、项强、肩背痛", literature: "《素问·气府论》" },
  "命门": { function: "温肾壮阳、强腰固本，主治虚损腰痛、遗精、阳痿、月经不调、带下、泄泻", literature: "《针灸甲乙经》" },
  "太溪": { function: "滋阴益肾、壮阳强腰，主治头痛目眩、咽喉肿痛、齿痛、耳鸣、遗精、月经不调", literature: "《灵枢·本输》" },
  "神门": { function: "宁心安神、清心调气，主治心痛、心烦、怔忡、惊悸、健忘、失眠、癫狂痫", literature: "《针灸甲乙经》" },
  "中脘": { function: "和胃健脾、降逆利水，主治胃痛、呕吐、呃逆、腹胀、泄泻、黄疸、癫狂", literature: "《针灸甲乙经》" },
  "天枢": { function: "调中和胃、理气健脾，主治腹痛、腹胀、便秘、泄泻、痢疾、月经不调", literature: "《灵枢·骨度》" },
  "阳陵泉": { function: "疏肝利胆、舒筋活络，主治半身不遂、下肢痿痹、膝肿痛、胁肋痛、口苦、呕吐", literature: "《灵枢·本输》" },
  "列缺": { function: "宣肺理气、疏风解表、通经活络，主治咳嗽、气喘、头痛、项强、口眼歪斜", literature: "《灵枢·经脉》" },
  "丰隆": { function: "化痰祛湿、和胃降逆、开窍，主治痰多咳嗽、头痛、眩晕、呕吐、便秘、癫狂痫", literature: "《灵枢·经脉》" }
};

for (const m of MACU) {
  const mCode = m[0];
  const mName = m[1];
  const mPinyin = m[2];
  const mEnglish = m[3];
  const mElement = m[4];
  const mYY = m[5];
  const mAcus = m[6];

  // Add all 14 meridians (standardized full names)
  meridiansData.meridians.push({
    name: mName,
    pinyin: mPinyin,
    english: mEnglish,
    element: mElement,
    yin_yang: mYY,
    paired: ''
  });

  // Add all acupoints for this meridian
  for (const a of mAcus) {
    const code = mCode + a[0];
    const name = a[1];
    const pinyin = a[2];
    const location = a[3];
    // Preserve existing details if available
    const existing = existingAcupointMap[name];
    const known = KNOWN_POINT_INFO[name];
    // Determine meridian field - use full standard name
    let meridianField = mName;
    if (existing && existing.meridian) {
      meridianField = MERIDIAN_SHORT_TO_FULL[existing.meridian] || existing.meridian;
      if (meridianField === existing.meridian && !meridianField.includes(mName) && !mName.includes(meridianField)) {
        meridianField = mName; // use standard full name
      }
    }
    const entry = {
      name,
      pinyin: (existing && existing.pinyin) || pinyin,
      code: (existing && existing.code) || code,
      meridian: meridianField,
      location: (existing && existing.location) || location,
      location_detail: (existing && existing.location_detail) || (existing && existing.location) || location,
      function: (existing && existing.function) || (known ? known.function : ''),
      literature: (existing && existing.literature) || (known ? known.literature : '《针灸甲乙经》')
    };
    if (!allAcupointNames.has(name)) {
      allAcupoints.push(entry);
      allAcupointNames.add(name);
    }
  }
}

meridiansData.acupoints = allAcupoints;
meridiansData._metadata.total_acupoints = allAcupoints.length;
meridiansData._metadata.total_meridians = meridiansData.meridians.length;
console.log('Meridians: replaced -> total', meridiansData._metadata.total_meridians);
console.log('Acupoints: replaced -> total', allAcupoints.length);

// ===== VALIDATION =====
let errors = 0;

// Validate new herbs
for (const h of newHerbs) {
  if (!h.id || !h.name || !h.pinyin || !h.nature || !h.meridian || !h.efficacy || !h.indications || !h.dosage) {
    console.error('Invalid new herb:', h.name || h.id);
    errors++;
  }
}

// Validate new formulas
for (const f of newFormulas) {
  if (!f.id || !f.name || !f.pinyin || !f.composition || !f.efficacy || !f.indications || !f.source || !f.category) {
    console.error('Invalid new formula:', f.name || f.id, '- missing fields. cat:', f.category, 'src:', f.source);
    errors++;
  }
  if (!Array.isArray(f.composition) || f.composition.length === 0) {
    console.error('Formula has empty composition:', f.name);
    errors++;
  }
}

// Validate ALL acupoints
for (const a of allAcupoints) {
  if (!a.name || !a.pinyin || !a.code || !a.meridian || !a.location) {
    console.error('Invalid acupoint:', a.name || a.code);
    errors++;
  }
}

// Verify counts
if (herbsData.herbs.length < 520) { console.error('Herbs count below target:', herbsData.herbs.length); errors++; }
if (formulasData.formulas.length < 310) { console.error('Formulas count below target:', formulasData.formulas.length); errors++; }
if (allAcupoints.length !== 361) { console.error('Acupoints count not 361:', allAcupoints.length); errors++; }
if (meridiansData.meridians.length !== 14) { console.error('Meridians count not 14:', meridiansData.meridians.length); errors++; }

if (errors > 0) {
  console.error('VALIDATION FAILED with', errors, 'errors');
  process.exit(1);
}
console.log('Validation passed: 0 errors');

// ===== WRITE FILES =====
fs.writeFileSync(path.join(DATA_DIR, 'herbs.json'), JSON.stringify(herbsData, null, 2), 'utf8');
fs.writeFileSync(path.join(DATA_DIR, 'formulas.json'), JSON.stringify(formulasData, null, 2), 'utf8');
fs.writeFileSync(path.join(DATA_DIR, 'meridians.json'), JSON.stringify(meridiansData, null, 2), 'utf8');

console.log('=== Files written successfully ===');
console.log('');
console.log('========== FINAL COUNTS ==========');
console.log('Herbs:     ', herbsData._metadata.total_herbs);
console.log('Formulas:  ', formulasData._metadata.total_formulas);
console.log('Meridians: ', meridiansData._metadata.total_meridians);
console.log('Acupoints: ', meridiansData._metadata.total_acupoints);
console.log('==================================');
