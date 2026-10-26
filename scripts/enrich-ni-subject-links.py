"""Add exact chapter-title links from owner-supplied Ni course editions.

Input/output are different immutable medical-library candidates. No substring
search of disease paragraphs is used. Course original files remain unchanged.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def sha(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def norm(value):
    return value.strip().replace('谿', '溪').replace('後', '后').replace('崑', '昆').replace('顖', '囟')


def title_names(title, acupuncture=False):
    title = re.sub(r'\s*·\s*阅读分段\s*\d+$', '', title)
    title = re.sub(r'^[一二三四五六七八九十百零〇壹贰貳叁參肆伍陆陸柒捌玖拾\d]+[、.．]\s*', '', title)
    title = re.sub(r'[（(]\d+-[\d:]+[）)]', '', title)
    if any(word in title for word in ['前言', '目录', '索引', '总义']):
        return []
    names = []
    aliases = re.findall(r'[（(](?:又名)?([^）)]+)[）)]', title)
    title = re.sub(r'[（(][^）)]*[）)]', '', title)
    parts = [title] + (re.split(r'、|与|及|至|—|－|：|:|\s+', title) if acupuncture else re.split(r'、|与|及', title))
    for value in parts + aliases:
        value = norm(value)
        if acupuncture:
            value = re.sub(r'穴$', '', value)
        if re.fullmatch(r'[\u3400-\u9fff]{1,20}', value):
            names.append(value)
    return names


def chunks(text, start):
    """Exact contiguous text chunks, <=2400 code points, without lost chars."""
    position = 0
    while position < len(text):
        end = min(position + 2400, len(text))
        if end < len(text):
            newline = text.rfind('\n', position + 1000, end)
            if newline > position:
                end = newline + 1
        piece = text[position:end]
        yield piece, start + text[:position].count('\n')
        position = end


def build(source_file, output, receipt_file, courses_dir):
    if output.exists() or source_file.resolve() == output.resolve():
        raise FileExistsError('New candidate must not overwrite a source or previous version')
    library = json.loads(source_file.read_text(encoding='utf-8'))
    original_subjects = json.loads(json.dumps(library['subjects']))
    herbs = json.loads((ROOT/'src/algorithm-core/modules/tcm/data/herbs.json').read_text(encoding='utf-8'))['herbs']
    points = json.loads((ROOT/'src/algorithm-core/modules/tcm/data/meridians.json').read_text(encoding='utf-8'))['acupoints']
    evidence = json.loads((ROOT/'src/data/acupointOverviewEvidence.json').read_text(encoding='utf-8'))['points']
    by_name, by_alias = {}, {}
    for herb in herbs:
        by_name.setdefault(norm(herb['name']), []).append(herb)
        for alias in herb.get('alias', []):
            by_alias.setdefault(norm(alias), []).append(herb)
    covered_herbs, covered_points, new_links, matched_chapters = set(), set(), 0, 0
    details = []
    for course_id in ['ni-materia', 'ni-materia-print', 'ni-acupuncture']:
        course_path = courses_dir/f'{course_id}.json'
        course = json.loads(course_path.read_text(encoding='utf-8'))
        assert all(sha(chapter['content']) == chapter['sha256'] for chapter in course['chapters'])
        source_id = 'ni-user-' + course_id
        library['sources'][source_id] = {'title':course['title'], 'author':course['author'],
            'kind':course['source']['kind'], 'sha256':course['source']['sha256'],
            'localOriginalName':course['source']['filename'], 'inAppBook':False,
            'license':course['source']['licenseNote'] + ' ' + course['source']['qualityNote']}
        current_meridian = ''
        reached_index = False
        course_hits = 0
        for chapter in course['chapters']:
            # A long final original chapter includes the alphabetical index;
            # the whole original remains in the course reader but that index
            # must not become this herb's individual passage.
            if reached_index or chapter['title'].startswith('原稿'):
                continue
            index_heading = re.search(r'(?m)^药物索引[（(]拼音顺序[）)]\s*$',chapter['content'])
            text = chapter['content'][:index_heading.start()] if index_heading else chapter['content']
            reached_index = bool(index_heading)
            if not text.strip():
                continue
            if course_id == 'ni-acupuncture':
                for meridian in ['肺经','大肠经','胃经','脾经','心经','小肠经','膀胱经','肾经','心包经','三焦经','胆经','肝经','督脉','任脉']:
                    if re.search(r'^[一二三四五六七八九十]+、',chapter['title']) and meridian in chapter['title']:
                        current_meridian = meridian
                tokens = title_names(chapter['title'], True)
                targets = []
                for point in points:
                    canonical = point['code'].replace('DU','GV').replace('RN','CV')
                    names = {norm(point['name'])}
                    row = evidence.get(canonical)
                    if row:
                        names.add(norm(re.split(r'[（(]',row['heading'])[0]))
                    literal_name = norm(point['name']) in tokens
                    if names.intersection(tokens) and (literal_name or not current_meridian or point['meridian'].endswith(current_meridian)):
                        targets.append(('point:'+point['code'], point['name']))
                # “府舍穴至腹哀穴” explicitly names an ordered interval in
                # one meridian. Link its interior points as course context;
                # this remains topic=related, never a single-point quotation.
                if '至' in chapter['title'] and len(targets) == 2:
                    a,b = [key.split(':')[1].replace('DU','GV').replace('RN','CV') for key,_ in targets]
                    match_a,match_b = re.fullmatch(r'([A-Z]+)(\d+)',a),re.fullmatch(r'([A-Z]+)(\d+)',b)
                    if match_a and match_b and match_a[1] == match_b[1]:
                        low,high=sorted([int(match_a[2]),int(match_b[2])])
                        for point in points:
                            code=point['code'].replace('DU','GV').replace('RN','CV')
                            match=re.fullmatch(r'([A-Z]+)(\d+)',code)
                            if match and match[1]==match_a[1] and low<=int(match[2])<=high:
                                targets.append(('point:'+point['code'],point['name']))
            else:
                tokens = title_names(chapter['title'])
                targets = []
                for token in tokens:
                    literal = by_name.get(token)
                    candidates = literal or by_alias.get(token, [])
                    # An alias shared by multiple drugs must not identify one.
                    if literal or len({herb['name'] for herb in candidates}) == 1:
                        targets.extend(('herb:'+herb['id'], herb['name']) for herb in candidates)
            targets = list(dict.fromkeys(targets))
            if not targets:
                continue
            pieces = list(chunks(text, chapter['lineStart']))
            if any(len(library['subjects'].get(key,{}).get('references',[])) + len(pieces) > 100 for key,_ in targets):
                raise ValueError('Subject reference bound exceeded; do not silently drop course text')
            for key, name in targets:
                subject = library['subjects'].setdefault(key, {'kind':key.split(':')[0],'name':name,'references':[]})
                for piece, line in pieces:
                    # Identity includes the target: one range lesson can be
                    # linked to several points without overwriting its exact
                    # subject-mapping assertion with the final point's code.
                    pid = sha(source_id+'\n'+chapter['id']+'\n'+str(line)+'\n'+key+'\n'+piece)[:24]
                    library['passages'][pid] = {'source':source_id, 'chapter':chapter['id'],
                        'chapterTitle':chapter['title'], 'text':piece, 'lineStart':line,
                        'lineEnd':line+piece.count('\n'), 'sha256':sha(piece), 'topic':'related',
                        'mappingNote':('EXACT_ACUPOINT_COURSE_TITLE:' if key.startswith('point:') else 'EXACT_HERB_COURSE_TITLE:')+key.split(':',1)[1]}
                    if pid not in subject['references']:
                        subject['references'].append(pid)
                        new_links += 1
                (covered_points if key.startswith('point:') else covered_herbs).add(key)
            matched_chapters += 1
            course_hits += 1
        details.append({'course':course_id,'matchedChapters':course_hits,'courseJsonSha256':hashlib.sha256(course_path.read_bytes()).hexdigest()})
    library['version'] = '1.2.0'
    # Every old link/illustration remains; only exact sourced chapter links added.
    for key, subject in original_subjects.items():
        new = library['subjects'][key]
        assert all(value in new['references'] for value in subject['references'])
        assert subject.get('illustrations') == new.get('illustrations')
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps(library,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    report={'source':str(source_file),'candidate':str(output),'coursesDirectory':str(courses_dir),'version':library['version'],
        'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'newExactHerbCoverage':len(covered_herbs),
        'newExactPointCourseCoverage':len(covered_points),'addedLinks':new_links,'matchedChapters':matched_chapters,
        'courses':details,'herbsWithoutNewExactCourseChapter':[{'id':h['id'],'name':h['name']} for h in herbs if 'herb:'+h['id'] not in covered_herbs],
        'preservedSubjects':len(original_subjects),'preservedImages':True,'preservedOriginalPassages':True}
    receipt_file.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({key:value for key,value in report.items() if key!='herbsWithoutNewExactCourseChapter'},ensure_ascii=False))


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('source',type=Path)
    parser.add_argument('output',type=Path)
    parser.add_argument('receipt',type=Path)
    parser.add_argument('--courses-dir',type=Path,required=True,help='Read-only owner-material directory; course text must not be put in public/ or Git')
    args=parser.parse_args()
    build(args.source,args.output,args.receipt,args.courses_dir)
