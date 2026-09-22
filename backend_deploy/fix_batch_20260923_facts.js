// ============================================================================
// 2026-09-23 批次事实核查修正脚本
// 范围：#28玄奘(重写) #24汉字文化圈(重写) #25河图洛书(定点14处) #26数字减法(定点5处) #17坤卦(定点2处)
// 流程：替换校验 → 更新DB → draft/get取全字段 → draft/update同步微信草稿
// 安全：替换串未命中立即中止，不做任何部分写入；先校验全部通过才写DB
// ============================================================================
const { getDb } = require('/www/yandaoguoxue-backend/wechatOaDb');
const { getAccessToken } = require('/www/yandaoguoxue-backend/wechatTokenManager');
const draftService = require('/www/yandaoguoxue-backend/wechatDraftService');
const { ART28, DIG28, ART24, DIG24 } = require('/www/yandaoguoxue-backend/rewrite_24_28');

const WX_BASE = 'https://api.weixin.qq.com/cgi-bin';

// ---------------- #25 河图洛书：定点替换（14处） ----------------
const PATCH25 = [
  ['《周髀算经》开篇即言：“禹治洪水，始广勾股弦之术。”',
   '《周髀算经》开篇，周公问数于商高，商高答：“数之法出于圆方，圆出于方，方出于矩，矩出于九九八十一。”'],
  ['连密码都暗藏玄机。2023年某房产中介调研显示，68%的购房者在选择楼层时会优先考虑尾数带8的房源。这种对数字的迷信已渗透到生活的每个毛孔：',
   '连密码都暗藏玄机——这些偏好不必查什么调研数据，看看自己和身边人就够了。这种对数字的迷信已渗透到生活的每个毛孔：'],
  ['《汉书·律历志》记载：“数者，一十百千万也。”东汉学者郑玄注解：“数始于一，三三如九，终于九九八十一。”古人早已将数字视为宇宙秩序的体现。北宋邵雍在《皇极经世》中构建了庞大的数字哲学体系，认为“天地之本，其起于中乎”。',
   '《汉书·律历志》记载：“数者，一十百千万也，所以算数事物，顺性命之理也。”数字与万物之理，从正史的第一页就绑在了一起。北宋邵雍的《皇极经世》，更是用一整套数理体系推演天地运化的节律。'],
  ['考古发现，河南舞阳贾湖遗址出土的龟甲上，距今已有8000年的数字刻符，与河图的数字逻辑惊人相似。',
   '河南舞阳的贾湖遗址，出土过距今约八千年的龟甲契刻符号——它们算不算最早的数字，学界至今仍在讨论；但把符号刻上龟甲的冲动，比甲骨文早了四千多年。'],
  ['考古学家在四川广汉三星堆出土的商代玉璋上，发现了类似洛书的九宫格图案。这绝非简单的数学游戏。',
   '到了殷商，甲骨文里的记数已经是一套成熟的十进制体系。这绝非简单的数学游戏。'],
  ['北宋理学家朱熹在《易学启蒙》中专门论述：“河图之数，阳奇阴偶，生成相配，以明体用。”',
   '南宋朱熹作《易学启蒙》，用一整章分辨河图洛书：阳奇阴偶，一生一成，一一相配。'],
  ['洛书的“九宫”则体现五行相生：1水、2火、3木、4金、5土，6水、7火、8木、9金、10土，数字从来不是孤立存在的',
   '这些成对之数又各配五行：一六为水，二七为火，三八为木，四九为金，五十为土——数字从来不是孤立存在的'],
  ['明代数学家程大位在《算法统宗》中举例：“算盘一上四下五，珠动数出，其用无穷。”',
   '明代程大位在《算法统宗》里把珠算口诀整理成册——“一上一，一下五去四”，数字在他手里是可以拨动的乾坤。'],
  ['南宋数学家秦九韶在《数书九章》中提出“大衍求一术”，强调“大衍之数五十，其用四十有九”，告诉我们系统比数量更重要。',
   '《周易·系辞》说“大衍之数五十，其用四十有九”；南宋秦九韶更在《数书九章》中把“大衍求一术”做成一整套算法。古人早就明白：系统比数量更重要。'],
  ['唐代天文学家一行在《大衍历》中运用数字推算节气，将365.25天分为24节气，每个节气约15天，这种数字排列体现了“天人合一”的智慧。',
   '唐代一行禅师编《大衍历》，以数字推步节气日月——历法的本质，就是给时间建立数字的秩序。'],
  ['《周髀算经》说：“数术穷天地，制作侔造化。”数字可以成为连接人与天地的桥梁。',
   '《周易·系辞》说：“极其数，遂定天下之象。”数字可以成为连接人与天地的桥梁。'],
  ['北宋沈括在《梦溪笔谈》中记载：“卫朴造历，以算术推步，凡五年而成。”这种对数字的敬畏与运用',
   '沈括在《梦溪笔谈》里专门记过一位盲人历算家卫朴：推算日月交食不用算筹，全凭心算，沈括亲自验证过他的本事。这种对数字的敬畏与运用'],
  ['明代数学家徐光启在《几何原本》序言中说：“算术者，推步之基也。”数字不仅用于计数',
   '明代徐光启译《几何原本》，在序言里称之为“度数之宗”——一切测算的总源头。数字不仅用于计数'],
  ['设置密码时，可以尝试用河图的“天地生成数”组合（如1+6=7，2+7=9），既符合自然规律又便于记忆。',
   '设置密码时，可以试试河图的成对之数（如16、27、38、49），暗合相生之理又便于记忆。'],
];

// ---------------- #26 数字减法：定点替换（5处） ----------------
const PATCH26 = [
  ['考古发现，距今约8000年的贾湖遗址出土的龟甲上，刻有数字符号，比甲骨文早4000余年。这些刻痕不仅是计数，更是先民对宇宙秩序的原始探索。',
   '考古发现，距今约八千年的贾湖遗址出土的龟甲上，刻着成组的契刻符号——它们算不算最早的数字，学界至今仍在讨论，但比甲骨文早了四千多年。这些刻痕，是先民对秩序的原始探索。'],
  ['《周髀算经》记载：“禹治洪水，始定山川，始立疆理，始分疆域。”数字在文明初萌时',
   '《周髀算经》开篇，周公问数于商高，商高答：“数之法出于圆方，圆出于方，方出于矩，矩出于九九八十一。”数字在文明初萌时'],
  ['这种排列与《礼记·月令》中的物候变化完全吻合，证明古人已将数字与自然节律精准对应。',
   '这种排列与《礼记·月令》里的四时物候大体相应，可见古人有心把数字与自然节律对应起来。'],
  ['数字整理的悖论在宋代达到顶峰。朱熹《朱子语类》卷六十四批评：“世儒记诵词章，以为足以尽天下之理，而不知所以致用之实。”当时文人整理典籍，编撰《永乐大典》时，因过度分类导致文献割裂。就像庄子所说：“吾生也有涯，而知也无涯。”数字整理若只关注形式，便会陷入“以有涯随无涯”的困境。明代王阳明在《传习录》中更直言：“学者溺于词章记诵之末，而不知反求诸心。”',
   '这种悖论，朱熹在《大学章句序》里早就点破：“俗儒记诵词章之习，其功倍于小学而无用。”历代类书越编越大，动辄千卷，可真正常读常新的，还是那几部原典。就像庄子所说：“吾生也有涯，而知也无涯。”数字整理若只关注形式，便会陷入“以有涯随无涯”的困境。王阳明在《传习录》里也反复提醒学者：功夫别花在记诵词章的末梢上。'],
  ['数字整理术可追溯到北宋沈括的《梦溪笔谈》。他在“技艺”篇中记载：“算术有三等：一曰筭术，二曰筹术，三珠术。”现代人可借鉴古人的“三才”分类法：天（重要文件）、人（常用资料）、地（临时文件）。',
   '数字整理不必舍近求远，古人早有“三才”的分类智慧，现代人可以直接借用：天（重要文件）、人（常用资料）、地（临时文件）'],
];

// ---------------- #17 坤卦：定点替换（2处） ----------------
const PATCH17 = [
  ['据《旧唐书·狄仁杰传》记载，他每次面圣只说母子之情，从不直接批评武则天。被贬彭泽县令时，他踏踏实实治水救灾，一句怨言都没有。',
   '据《旧唐书·狄仁杰传》记载，他屡屡借母子之情委婉进言，从不正面顶撞武则天。被贬彭泽县令时，他踏踏实实劝农减赋，一句怨言都没有。'],
  ['《周易·系辞》中说：“坤，顺也。”',
   '《周易·说卦传》开宗明义：“坤，顺也。”'],
];

// ---------------- 校验 ----------------
function wordCount(html) {
  return html.replace(/<[^>]+>/g, '').replace(/\s/g, '').length;
}
// 部分文章正文含ASCII直引号（JSON修复路径产物），而替换串统一全角引号——先按文本节点配对规范化，再打补丁
function normalizeQuotes(html) {
  return html.split(/(<[^>]+>)/g).map((seg) => {
    if (seg.startsWith('<')) return seg;
    const dq = (seg.match(/"/g) || []).length;
    const sq = (seg.match(/'/g) || []).length;
    if (dq % 2 !== 0 || sq % 2 !== 0) return seg;
    let dOpen = true;
    let sOpen = true;
    let out = '';
    for (const ch of seg) {
      if (ch === '"') { out += dOpen ? '“' : '”'; dOpen = !dOpen; }
      else if (ch === "'") { out += sOpen ? '‘' : '’'; sOpen = !sOpen; }
      else out += ch;
    }
    return out;
  }).join('');
}
const RISK_PATTERNS = [
  [/某高校|某大学|某研究|某房产|某学院/],
  [/实验表明|调研显示|研究表明，/],
  [/\d+(?:\.\d+)?%/],
  [/提升37%|《日本书记》|张教授/],
];
function assertNoRisk(html, label) {
  const text = html.replace(/<[^>]+>/g, '');
  for (const re of RISK_PATTERNS) {
    const m = text.match(re);
    if (m) throw new Error(`${label} 残留风险模式: ${m[0]}`);
  }
}

(async () => {
  const db = getDb();

  // ① 构造更新集（内存中完成，全部通过才写库）
  const updates = [
    { id: 28, html: ART28, digest: DIG28, note: '全文重写(虚构引文/伪实验15+处→可考史料)' },
    { id: 24, html: ART24, digest: DIG24, note: '全文重写(时代错乱/伪引文10+处→可考史料)' },
    { id: 25, patches: PATCH25, note: '定点修复14处(68%调研/三星堆九宫格/伪引文等)' },
    { id: 26, patches: PATCH26, note: '定点修复5处(周髀伪引/梦溪伪引/永乐大典时代错)' },
    { id: 17, patches: PATCH17, note: '定点修复2处(说卦传出处/彭泽德政细节)' },
  ];

  for (const u of updates) {
    if (u.patches) {
      const row = db.prepare('SELECT content_html FROM wechat_articles WHERE article_id = ?').get(u.id);
      let html = normalizeQuotes(row.content_html);
      for (const [oldStr, newStr] of u.patches) {
        if (html.includes(oldStr)) {
          html = html.split(oldStr).join(newStr);
        } else if (html.includes(newStr)) {
          // 已应用过（幂等重跑）
        } else {
          throw new Error(`#${u.id} 替换串未命中: ${oldStr.slice(0, 40)}…`);
        }
      }
      u.html = html;
    }
    const wc = wordCount(u.html);
    if (wc < 1450 || wc > 2550) throw new Error(`#${u.id} 字数${wc}不在区间`);
    assertNoRisk(u.html, `#${u.id}`);
    console.log(`#${u.id} 校验通过 字数=${wc} ${u.note}`);
  }

  // ② 写库
  for (const u of updates) {
    if (u.digest) db.prepare('UPDATE wechat_articles SET content_html = ?, digest = ? WHERE article_id = ?').run(u.html, u.digest, u.id);
    else db.prepare('UPDATE wechat_articles SET content_html = ? WHERE article_id = ?').run(u.html, u.id);
    console.log(`#${u.id} DB已更新`);
  }

  // ③ 同步微信草稿（draft/get 取全字段 → 仅替换 content/digest → draft/update）
  const token = await getAccessToken();
  for (const u of updates) {
    const row = db.prepare('SELECT title, wechat_media_id FROM wechat_articles WHERE article_id = ?').get(u.id);
    if (!row.wechat_media_id) { console.log(`#${u.id} 无media_id，跳过微信同步`); continue; }
    const res = await fetch(`${WX_BASE}/draft/get?access_token=${token}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ media_id: row.wechat_media_id }),
    });
    const data = await res.json();
    if (!data.news_item || !data.news_item.length) throw new Error(`#${u.id} draft/get失败: ${JSON.stringify(data).slice(0, 200)}`);
    const it = data.news_item[0];
    const article = {
      title: it.title,
      author: it.author,
      digest: (u.digest || it.digest || '').slice(0, 110),
      content: u.html,
      thumb_media_id: it.thumb_media_id,
      need_open_comment: it.need_open_comment ? 1 : 0,
      only_fans_can_comment: it.only_fans_can_comment ? 1 : 0,
    };
    const upd = await draftService.updateDraft(row.wechat_media_id, 0, article);
    if (upd.errcode !== 0) throw new Error(`#${u.id} draft/update失败: ${JSON.stringify(upd)}`);
    console.log(`#${u.id} 微信草稿已同步: ${it.title}`);
  }

  // ④ 终验：草稿箱仍7篇
  const cnt = await draftService.getDraftCount();
  console.log('草稿箱总数:', JSON.stringify(cnt));
  console.log('=== 全部完成 ===');
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
