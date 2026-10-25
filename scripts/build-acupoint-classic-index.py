"""Index exact ancient-source quotations by meridian and point, with audit gaps.

No indication summaries or clinical recommendations are generated. Missing
matches remain missing; they are never filled from neighbouring point records.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path

CHAPTERS = {
    '肺经': '1ly7mvzyyzod7', '大肠经': '1ly7mvzyz0dnf', '胃经': '1ly7mvzyz0qaj',
    '脾经': '1ly7mvzyz1fkr', '心经': '1ly7mvzyz24uz', '小肠经': '1ly7mvzyz2u57',
    '膀胱经': '1ly7mvzyz3jff', '肾经': '1ly7mvzyz48pn', '心包经': '1ly7mwa32i6mz',
    '三焦经': '1ly7mwa32ivx7', '胆经': '1ly7mwa32jl7f', '肝经': '1ly7mwa32kahn',
    '任脉': '1ly7mwa32kzrv', '督脉': '1ly7mwa32lp23',
}
# Edition spellings only, scoped to their own meridian. Ambiguous names such as
# 通谷/三里/阳关 must never be resolved across different meridian chapters.
ALIASES = {'侠白': ['夹白'], '阳溪': ['阳谿'], '解溪': ['解谿'], '足三里': ['三里'],
           '手三里': ['三里'], '承扶': ['扶承'], '膻中': ['亶中'], '腰俞': ['腰腧'],
           '腰阳关': ['阳关'], '膝阳关': ['阳关'], '足临泣': ['临泣'], '头临泣': [],
           '足窍阴': ['窍阴'], '头窍阴': [], '腹通谷': ['通谷'], '足通谷': ['通谷'],
           '中髎': ['中窌'], '上髎': ['上窌'], '次髎': ['次窌'], '下髎': ['下窌'],
           '手五里': ['五里'], '足五里': ['五里'], '口禾髎': ['禾髎'], '耳和髎': ['和髎'],
           '后溪': ['後谿', '後溪'], '太溪': ['太谿'], '侠溪': ['侠谿', '夹谿'],
           '天溪': ['天谿'], '睛明': ['聙明'], '膈俞': ['鬲俞'], '膈关': ['鬲关'],
           '肓门': ['育门'], '肓俞': ['育俞'], '彧中': ['或中'], '上关': ['客主人'],
           '渊腋': ['渊液'], '悬钟': ['绝骨'], '哑门': ['瘂门'], '后顶': ['後顶'],
           '龈交': ['齗交'], '昆仑': ['崑仑'], '大钟': ['大锺'], '筑宾': ['筑賔'],
           '络却': ['络郄'], '膏肓': ['膏肓俞'], '跗阳': ['附阳'],
           '上巨虚': ['巨虚上廉', '上廉'], '下巨虚': ['巨虚下廉', '下廉'],
           '络却': ['络郄', '络𨚫'], '膏肓': ['膏肓俞', '膏盲俞'],
           '悬钟': ['绝骨', '悬锺'], '囟会': ['顖会'],
           '头临泣': ['临泣'], '头窍阴': ['窍阴']}
EDITION_TARGETS = {('胆经', '临泣', 15): 'GB15', ('胆经', '临泣', 41): 'GB41',
                   ('胆经', '窍阴', 11): 'GB11', ('胆经', '窍阴', 44): 'GB44'}
# Explicit combinations checked against the cited 百症赋 clauses. Do not turn
# arbitrary co-occurrence, an alias guess, or an AI answer into a prescription.
PAIRING_QUOTES = [
    ('天府', '合谷', '天府、合谷，鼻中衄血宜追'),
    ('颊车', '地仓', '颊车、地仓穴，正口喎于片时'),
    ('液门', '鱼际', '喉痛兮液门、鱼际去疗'),
    ('金门', '丘墟', '转筋兮金门、丘墟来医'),
    ('少商', '曲泽', '少商、曲泽，血虚口渴同施'),
    ('天鼎', '间使', '天鼎、间使，失音嗫嚅而休迟'),
    ('束骨', '天柱', '项强多恶风，束骨相连于天柱'),
    ('大都', '经渠', '热病汗不出，大都更接于经渠'),
    ('建里', '内关', '建里、内关，扫𥁞胸中之苦闷'),
    ('气户', '华盖', '久知胁肋疼痛，气户、华盖有灵'),
    ('下脘', '陷谷', '腹内肠鸣，下脘、陷谷能平'),
    ('神藏', '璇玑', '胸满项强，神藏、璇玑已试'),
    ('水道', '筋缩', '脊强兮水道、筋缩'),
    ('颧髎', '大迎', '目眩兮颧髎、大迎'),
    ('委阳', '天池', '委阳、天池，腋肿针而速散'),
    ('厉兑', '隐白', '梦魇不宁，厉兑相谐于隐白'),
    ('上脘', '神门', '发狂奔走，上脘同起于神门'),
    ('天冲', '大横', '反张悲哭，仗天冲、大横须精'),
    ('身柱', '本神', '癫疾必身柱、本神之令'),
    ('少冲', '曲池', '发热仗少冲、曲池之津'),
    ('行间', '涌泉', '行间、涌泉，主消渴之肾竭'),
    ('地机', '血海', '抑又论妇人经事改常，自有地机、血海'),
    ('交信', '合阳', '女子少气漏血，不无交信、合阳'),
    ('冲门', '气冲', '带下産崩，冲门、气冲宜审'),
    ('阴交', '石关', '无子收阴交、石关之乡'),
    ('肓俞', '横骨', '且如肓俞、横骨，泻五淋之久积'),
]


def build(source, output, audit):
    source_bytes = source.read_bytes()
    document = json.loads(source_bytes)
    root = Path(__file__).resolve().parents[1]
    points = json.loads((root / 'src/algorithm-core/modules/tcm/data/meridians.json').read_text(encoding='utf-8'))['acupoints']
    chapters = {chapter['chapterId']: chapter for chapter in document['chapters']}
    records = {}
    missing = []
    for meridian, chapter_id in CHAPTERS.items():
        chapter = chapters[chapter_id]
        members = [point for point in points if point['meridian'].endswith(meridian)]
        if not members:
            raise RuntimeError('No baseline points for ' + meridian)
        by_name = {}
        for point in members:
            for name in [point['name'], *ALIASES.get(point['name'], [])]:
                if name in by_name and by_name[name]['code'] != point['code']:
                    by_name[name] = None  # requires explicit edition locator
                    continue
                by_name[name] = point
        names = '|'.join(re.escape(name) for name in sorted(by_name, key=len, reverse=True))
        # Keep paragraph continuations together. The edition sometimes places
        # the next point name at the end of the previous HTML paragraph.
        text = '\n'.join(p['searchText'] for p in chapter['paragraphs'])
        marker = re.compile(r'(' + names + r')[一，,。\s]*[○〇]|(?:^|\n)(' + names + r')[，,：]')
        matches = list(marker.finditer(text))
        if matches:
            for index, match in enumerate(matches):
                edition_name = match.group(1) or match.group(2)
                ordinal = text[:match.start()].count('\n') + 1
                target = EDITION_TARGETS.get((meridian, edition_name, ordinal))
                point = next((p for p in members if p['code'] == target), None) if target else by_name[edition_name]
                if point is None:
                    continue
                excerpt = text[match.start():matches[index + 1].start() if index + 1 < len(matches) else len(text)].strip()
                # 主治 must start an actual source sentence/clause, not 主人/主客.
                indication = re.search(r'(?:^|[。；，\n])[○〇\s]*主(?!人|客|脉)([^。]+)', excerpt)
                if not indication:
                    indication = re.search(r'(?:针|鍼)[一二三四五六七八九十]+分主([^。]+)', excerpt)
                if not indication:
                    continue
                quote = '主' + indication.group(1) + '。'
                record = {'sourceId': 'zhenjiu-dacheng-shidian', 'chapterId': chapter_id,
                          'paragraph': ordinal, 'editionPageStart': chapter['editionPage'],
                          'url': chapter['url'], 'sourceSha256': chapter['sourceSha256'],
                          'kind': 'CLASSIC_INDICATION_QUOTE', 'text': quote,
                          'editionPointName': edition_name, 'originalScript': 'traditional',
                          'displayConversion': 'Windows LCMapStringW simplified',
                          'reviewState': 'SOURCE_TRANSCRIPTION'}
                records.setdefault(point['code'], []).append(record)
        missing.extend({'code': point['code'], 'name': point['name'], 'meridian': meridian}
                       for point in members if point['code'] not in records)
    pair_chapter = chapters['1ly7muxz8350m']
    by_canonical = {point['name']: point for point in points}
    pairing_count = 0
    for first, second, quote in PAIRING_QUOTES:
        paragraph = next((p for p in pair_chapter['paragraphs'] if quote in p['searchText']), None)
        if paragraph is None:
            raise RuntimeError('Pairing quotation absent from source: ' + quote)
        codes = [by_canonical[first]['code'], by_canonical[second]['code']]
        record = {'sourceId': 'zhenjiu-dacheng-shidian', 'chapterId': pair_chapter['chapterId'],
                  'paragraph': paragraph['ordinal'], 'editionPageStart': pair_chapter['editionPage'],
                  'url': pair_chapter['url'], 'sourceSha256': pair_chapter['sourceSha256'],
                  'kind': 'CLASSIC_PAIRING_QUOTE', 'text': quote, 'pointCodes': codes,
                  'chapterTitle': '百症赋', 'reviewState': 'SOURCE_TRANSCRIPTION'}
        for code in codes:
            records.setdefault(code, []).append(record)
        pairing_count += 1
    payload = {'schema': 'yandao.tcm.point-study.v1', 'version': '2026.10.25',
               'sources': [{'id': 'zhenjiu-dacheng-shidian', 'title': '针灸大成', 'author': '明·杨继洲',
                            'edition': '识典古籍 NCM011X411999030508 经穴篇原文',
                            'notice': '古籍主治记载，保留原书病名；不等同于现代诊断或个人治疗建议。'}],
               'points': records}
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    report = {'sourceIndexSha256': hashlib.sha256(source_bytes).hexdigest(),
              'pointCount': len(records), 'quotationCount': sum(map(len, records.values())), 'explicitPairings': pairing_count,
              'missing': missing, 'status': 'INCOMPLETE' if missing else 'ALL_BASE_POINTS_SOURCE_LINKED',
              'clinicalReview': 'NOT_CLAIMED', 'pairings': 'PARTIAL_SOURCE_CHECKED'}
    audit.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--audit', type=Path, required=True)
    args = parser.parse_args()
    build(args.source, args.output, args.audit)
