"""Source-linked reading index. Never infer a prescription from co-occurrence.

User-supplied lecture quotations and the already verified ancient editions are
kept distinct. Missing author/entity coverage is explicitly audited.
"""
import argparse
import collections
import ctypes
import hashlib
import json
import re
import subprocess
from pathlib import Path


def simple(value):
    if not value:
        return ''
    output = ctypes.create_unicode_buffer(len(value) * 2 + 1)
    if not ctypes.windll.kernel32.LCMapStringW(0x0804, 0x02000000, value, -1, output, len(output)):
        raise RuntimeError('Chinese conversion failed')
    return output.value


def digest(value):
    return hashlib.sha256(value.encode('utf-8')).hexdigest()


def chunks(lines):
    current, start = [], 1
    for number, line in enumerate(lines, 1):
        # Never surface contact adverts or potentially identifiable case records.
        if re.search(r'https?://|\b1[3-9]\d{9}\b|[\w.+-]+@[\w.-]+|姓名[:：]|患者[姓叫]|病人[姓叫]|身份证', line):
            if current:
                yield start, max(start, number - 1), '\n'.join(current)
            current = []
            continue
        for sentence in re.split(r'(?<=[。！？])', line):
            if not sentence.strip():
                continue
            if current and len('\n'.join(current)) + len(sentence) > 650:
                yield start, max(start, number - 1), '\n'.join(current)
                current = []
            if not current:
                start = number
            # Do not cut long unsplit medical clauses into misleading fragments.
            if len(sentence) > 1800:
                continue
            current.append(sentence)
    if current:
        yield start, len(lines), '\n'.join(current)


def build(lectures, output, audit, public_notes=None, materia_catalogue=None):
    root = Path(__file__).resolve().parents[1]
    points = json.loads((root/'src/algorithm-core/modules/tcm/data/meridians.json').read_text(encoding='utf-8'))['acupoints']
    herbs = json.loads((root/'src/algorithm-core/modules/tcm/data/herbs.json').read_text(encoding='utf-8'))['herbs']
    dong_names = re.findall(r'name: "([^"]+)"', (root/'src/algorithm-core/modules/tcm/dong-acupoints.ts').read_text(encoding='utf-8'))
    subjects = {**{'point:'+p['code']: {'name':p['name'], 'kind':'point'} for p in points},
                **{'herb:'+h['id']: {'name':h['name'], 'kind':'herb'} for h in herbs},
                **{'dong:'+name: {'name':name, 'kind':'dong'} for name in dong_names}}
    sources, passages, hits = {}, {}, collections.defaultdict(lambda: collections.defaultdict(list))
    names = collections.defaultdict(list)
    for key, item in subjects.items():
        term = item['name'][:-1] if item['kind']=='dong' and item['name'].endswith('穴') else item['name']
        if len(term) >= 2:
            names[term].append(key)
    for term,key in [('禾髎','point:LI19'),('和髎','point:TE22')]:
        names[term].append(key)
    for item in herbs:
        variants={'黄芪':['黄耆'],'肉苁蓉':['肉苁容','肉松容'],'厚朴':['厚樸'],'藁本':['藳本'],
                  '扁蓄':['萹蓄'],'螌蝥':['斑蝥'],'蟅虫':['䗪虫'],'水斳':['水芹']}.get(item['name'],[])
        for term in variants:names[term].append('herb:'+item['id'])
    # These two are distinguished by the cited anatomical context, never by a
    # blind global substitution of the shared historical name 阳关.
    names['阳关'].extend(['point:GB33','point:GV3'])
    names['五里'].extend(['point:LI13','point:LR10'])
    names['通谷'].extend(['point:BL66','point:KI20'])
    matcher = re.compile('|'.join(map(re.escape, sorted(names, key=len, reverse=True))))

    def ingest(source, chapter, title, lines, forced_keys=(), line_offset=0):
        for first, last, text in chunks(lines):
            if '\x00' in text:
                continue
            search = simple(text)
            terms = set(matcher.findall(search))
            if not terms and not forced_keys:
                continue
            identifier = digest(source+':'+chapter+':'+str(first)+':'+text)[:24]
            record = {'source':source, 'chapter':chapter, 'chapterTitle':title, 'text':text,
                      'lineStart':first+line_offset, 'lineEnd':last+line_offset, 'sha256':digest(text)}
            record['topic']=('combination_context' if re.search('配伍|配穴|合用|同用|相须|相使|相畏|相反|相恶',search)
                             else 'caution_context' if re.search('禁忌|忌用|不宜|有毒|慎用',search)
                             else 'indication_context' if re.search('主治|功效|药性|藥性',search) else 'related')
            keys=set(forced_keys)
            for term in terms:
                keys.update(names[term])
            for key in keys:
                    shared_context={'point:LI13':r'肘|臂|大肠经','point:LR10':r'曲骨|气冲|阴廉|肝经',
                                    'point:BL66':r'膀胱经|束骨|至阴|脚趾','point:KI20':r'肾经|上脘|幽门|阴都'}
                    if key in shared_context and subjects[key]['name'] not in search and not re.search(shared_context[key],search):continue
                    if key in ['point:GB33','point:GV3'] and subjects[key]['name'] not in search:
                        if key=='point:GB33' and not re.search('膝|胆经|膽經|阳陵泉|陽陵泉',search):continue
                        if key=='point:GV3' and not re.search('腰|督脉|督脈|十六椎',search):continue
                    if subjects[key]['kind'] == 'dong':
                        # A homonymous ancient point is not evidence about
                        # Dong's modern point. Its own editions need review.
                        continue
                    # Point words require an acupuncture context. An occurrence
                    # is an attributed related passage, never asserted 主治/配穴.
                    if subjects[key]['kind'] in ['point','dong'] and not re.search('穴|针|灸|經|经|俞|腧|刺',search):
                        continue
                    term=subjects[key]['name']
                    score = 20 if key in forced_keys else int(bool(re.match(r'^[\s#\d、（）()·.]*'+re.escape(term)+r'(?:穴|[，：。、\s（(])',search))) * 10
                    score += int(bool(re.search('主治|功效|配伍|配穴|药性|藥性|按[:：]|曰[:：]',search)))
                    hits[key][source].append((score,identifier))
                    passages[identifier] = record

    for file in sorted(lectures.glob('0[1-4]_*.md')):
        raw=file.read_bytes(); source='ni-'+file.stem[:2]
        sources[source]={'title':file.stem.split('_',1)[1].replace('_',' · '), 'author':'倪海厦课程文字整理（用户提供版）',
                         'kind':'LECTURE_TRANSCRIPT','sha256':hashlib.sha256(raw).hexdigest(), 'localOriginalName':file.name}
        ingest(source,source,file.stem,raw.decode('utf-8-sig').splitlines())
    books=json.loads(subprocess.check_output(['node','-e',"process.stdout.write(JSON.stringify(require('./backend_deploy/build_tcm_original_editions_pack.js').buildPack('1.3.0').books))"],cwd=root))
    for book in books:
        source=book['id']; sources[source]={'title':book['name'],'author':book['author'],'kind':'CLASSIC_ORIGINAL',
            'sha256':book['contentSha256'],'url':book['sourceRevisionUrl'],'license':book['license']}
        for chapter in book['chapters']:
            ingest(source,chapter['id'],chapter['title'],chapter['content'].splitlines())
    if materia_catalogue:
        import importlib.util
        spec=importlib.util.spec_from_file_location('materia_source',root/'scripts/collect-classic-materia.py')
        module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
        MateriaParser=module.MateriaParser
        catalogue=json.loads(materia_catalogue.read_text(encoding='utf-8'))
        herb_headings=collections.defaultdict(list)
        for key,item in subjects.items():
            if item['kind']=='herb':herb_headings[item['name']].append(key)
        for book in catalogue['books']:
            if book['status']!='FETCHED_FOR_SOURCE_REVIEW':continue
            raw=Path(book['rawFile']).read_bytes()
            if hashlib.sha256(raw).hexdigest()!=book['sha256']:raise RuntimeError('Original source changed')
            parser=MateriaParser();parser.feed(raw.decode('utf-8'))
            import html
            body=re.sub(r'<header\b.*?</header>','',raw.decode('utf-8'),flags=re.S|re.I)
            body=re.sub(r'<!--.*?-->','',body,flags=re.S)
            expected=re.sub(r'\s+','',html.unescape(re.sub(r'<[^>]+>','',body)))
            actual=re.sub(r'\s+','',''.join(token['text'] for token in parser.tokens))
            if expected!=actual:raise RuntimeError('Original edition body was not fully preserved')
            source='materia-'+book['id']
            author=next(spec[2] for spec in module.BOOKS if spec[0]==book['id'])
            sources[source]={'title':book['title'],'author':author,'kind':'CLASSIC_ORIGINAL',
                             'sha256':book['sha256'],'url':book['url'],'license':'古代原文录文；不包含现代译注','inAppBook':True}
            for record in parser.records:
                heading=simple(record['heading'])
                forced=herb_headings.get(re.sub(r'[（(].*[）)]$','',heading),[])
                ingest(source,source+'-section-'+str(record['section']),record['heading'] or book['title'],
                       [record['text']],forced,record['paragraph']-1)
    license_texts={}
    if public_notes:
        notes=json.loads(public_notes.read_text(encoding='utf-8'))
        if notes['license']!='MulanPSL-2.0':raise RuntimeError('Unreviewed public note licence')
        license_texts['MulanPSL-2.0']=notes['licenseText']
        for chapter in notes['records']:
            if not chapter['notes']:continue
            source='ni-notes-'+chapter['blobSha1'][:16]
            sources[source]={'title':'本草课程学习笔记 · '+chapter['chapterName'],'author':'公开课程笔记整理者（非倪师著作逐字原文）',
                             'kind':'COMMUNITY_COURSE_NOTES','sha256':chapter['sha256'],'url':chapter['url'],'license':'MulanPSL-2.0'}
            forced=[key for key,item in subjects.items() if item['kind']=='herb' and item['name']==chapter['chapterName']]
            for note in chapter['notes']:
                ingest(source,chapter['blobSha1'],chapter['chapterName'],note['text'].splitlines(),forced,note['lineStart']-1)
    selected=set(); coverage=[]
    for key,item in subjects.items():
        references=[]; authors=set()
        # Local lecture first; then diverse authors instead of one author's many books.
        options=sorted(hits[key],key=lambda source:(not source.startswith('ni-'),-max(s for s,_ in hits[key][source]),source))
        deferred=[]
        for source in options:
            author=sources[source]['author']
            if author in authors:
                deferred.append(source); continue
            authors.add(author)
            references.append(max(hits[key][source], key=lambda hit:hit[0])[1])
        for source in deferred:
            if len(references)>=20:break
            references.append(max(hits[key][source], key=lambda hit:hit[0])[1])
        item['references']=references[:24]; selected.update(item['references'])
        coverage.append({'key':key,'name':item['name'],'references':len(item['references']),
                         'niLecture':any(passages[p]['source'].startswith('ni-') for p in item['references']),
                         'authors':len({sources[passages[p]['source']]['author'] for p in item['references']}),'availableAuthors':len(authors)})
        coverage[-1]['niLecture']=any(sources[passages[p]['source']]['kind']=='LECTURE_TRANSCRIPT' for p in item['references'])
        coverage[-1]['niCourseNotes']=any(sources[passages[p]['source']]['kind']=='COMMUNITY_COURSE_NOTES' for p in item['references'])
    payload={'schema':'yandao.medical.study-library.v1','version':'1.0.0',
             'notice':'原典与课程相关段落索引，不把同段出现推断为配伍、配穴或现代疗效；原文异说分别保留。',
             'sources':sources,'licenseTexts':license_texts,'passages':{key:passages[key] for key in sorted(selected)},'subjects':subjects}
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_bytes(json.dumps(payload,ensure_ascii=False,separators=(',',':')).encode('utf-8'))
    report={'subjects':len(subjects),'passages':len(selected),'sources':len(sources),'bytes':output.stat().st_size,
            'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'coverage':coverage,
            'missingNiBencaoOriginal':True,'publicCourseNotesIncluded':bool(public_notes),'review':'RELATED_SOURCE_PASSAGES_NOT_SYNTHESIZED_OPINIONS'}
    audit.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k!='coverage'},ensure_ascii=True))
    print('Ni lecture coverage',sum(r['niLecture'] for r in coverage),'any source',sum(bool(r['references']) for r in coverage))


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--lectures',type=Path,required=True);parser.add_argument('--output',type=Path,required=True);parser.add_argument('--audit',type=Path,required=True);parser.add_argument('--public-ni-notes',type=Path)
    parser.add_argument('--materia-catalogue',type=Path)
    args=parser.parse_args();build(args.lectures,args.output,args.audit,args.public_ni_notes,args.materia_catalogue)
