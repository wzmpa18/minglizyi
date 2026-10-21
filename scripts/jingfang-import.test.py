"""Regression tests for text omissions, image positions and publication boundaries."""
import sys
sys.dont_write_bytecode=True
import unittest
from import_jingfang_originals import parse_source,sha

def fixture(body,**changes):
    raw=('<header><h1>合成原典</h1><dl><dt>作者</dt><dd>古代作者</dd></dl></header>'+body).encode()
    source={'title':'合成原典','id':'synthetic','rawSha256':sha(raw),'sourceChapterCount':1,'chapterCount':1,'minimumCharacters':8,'terminalText':'完整末句。','imagePositions':0,'level':'h1',**changes}
    return raw,source

class ImportTests(unittest.TestCase):
    def test_unheaded_and_mixed_level_prefaces_cannot_silently_disappear(self):
        raw,s=fixture('<h2>原书序</h2><p>前言文字也必须保留。</p><h1>卷一</h1><p>正文全部保留完整末句。</p>',prefaceLevel='h2',sourceChapterCount=2,chapterCount=2)
        chapters,_=parse_source(raw,s);self.assertEqual([c['title'] for c in chapters],['原书序','卷一'])
        del s['prefaceLevel'];s['sourceChapterCount']=s['chapterCount']=1
        with self.assertRaisesRegex(AssertionError,'omitted'):parse_source(raw,s)
        raw,s=fixture('<p>未分篇题署不能丢。</p><h1>卷一</h1><p>正文全部保留完整末句。</p>',prefaceTitle='卷前题署（整理索引）',sourceChapterCount=2,chapterCount=2)
        self.assertIn('未分篇题署不能丢',parse_source(raw,s)[0][0]['content'])

    def test_figures_are_explicitly_marked_not_downloaded_or_fabricated(self):
        raw,s=fixture('<h1>卷一</h1><p>此为原文，下面有图。</p><img alt="原图标题" src="unverified.jpg"><p>完整末句。</p>',imagePositions=1)
        text=parse_source(raw,s)[0][0]['content'];self.assertIn('原书插图位置：原图标题',text);self.assertIn('本录文未收录图像',text);self.assertNotIn('unverified.jpg',text)

    def test_body_word_daibu_is_not_an_editorial_missing_text_notice(self):
        raw,s=fixture('<h1>卷一</h1><p>文献内“必待補而愈”保留原文，完整末句。</p>')
        self.assertIn('待補',parse_source(raw,s)[0][0]['content'])
        raw=raw.replace(b'</header>','<p>正文待補</p></header>'.encode());s['rawSha256']=sha(raw)
        with self.assertRaisesRegex(ValueError,'unresolved'):parse_source(raw,s)

    def test_exact_source_and_explicit_original_work_scope_are_required(self):
        raw,s=fixture('<h1>现代编者序</h1><p>此段不属于原作正文。</p><h1>原作正文</h1><p>正文全部保留完整末句。</p>',sourceChapterCount=2,includeTitles=['原作正文'])
        chapters,_=parse_source(raw,s);self.assertEqual(len(chapters),1);self.assertNotIn('此段不属于',chapters[0]['content'])
        with self.assertRaisesRegex(AssertionError,'hash changed'):parse_source(raw+b'altered',s)


class ContinuingStudyTests(unittest.TestCase):
    def test_existing_courses_and_books_are_unchanged(self):
        import json,hashlib
        from pathlib import Path
        c=json.loads(Path('backend_deploy/data/study-starter-public.json').read_bytes())
        b=json.loads(Path('backend_deploy/data/tcm-jingfang-originals.json').read_bytes())
        digest=lambda value:hashlib.sha256(json.dumps(value,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
        self.assertEqual(digest(c['lessons'][:25]),'2c7eb5b136e7df5b01bfc0addd9514cb0771406e993c7a568e167c0c219bec18')
        self.assertEqual(digest(b[:22]),'05c47872b6d360fce981e53578a5c41108b8c855763a7249d07d76f84b188fb7')
        self.assertEqual(len(b[-4:]),4)
        self.assertEqual(sum(len(x['chapters']) for x in b[-4:]),32)

    def test_modern_teacher_resources_are_metadata_not_copied_lessons(self):
        import json
        from pathlib import Path
        m=json.loads(Path('backend_deploy/data/jingfang-continuing-study.json').read_bytes())
        self.assertEqual(len(m['courses']),3)
        self.assertEqual([x['listedEpisodes'] for x in m['courses']],[61,14,2])
        self.assertIn('未获转载',m['rights'])
        self.assertIn('未核实',m['identity']['status'])
        for item in m['courses']:self.assertEqual(set(item),{'id','title','url','listedEpisodes','lastListedUpdate','note'})

    def test_guide_preserves_attribution_escapes_text_and_refuses_unreviewed_links(self):
        import json,copy
        from pathlib import Path
        from publish_jingfang_guide import render
        read=lambda name:json.loads(Path(name).read_bytes())
        m=read('backend_deploy/data/jingfang-continuing-study.json');bib=read('backend_deploy/data/jingfang-bibliography.json')
        books=[*read('src/data/tcmOriginalEditions.json'),read('src/data/nanjingOriginal.json'),*read('src/data/tcmClinicalOriginalEditions.json'),*read('backend_deploy/data/tcm-jingfang-originals.json')]
        page=render(bib,books,m)
        self.assertIn('归真医学 · 公开课程研读索引',page)
        self.assertIn('36部622篇卷',page)
        for item in m['courses']:self.assertIn(item['url'],page)
        for item in m['originalBooks']:self.assertIn('?book='+item['id'],page)
        injected=copy.deepcopy(m);injected['courses'][0]['title']='<script>bad</script>'
        self.assertIn('&lt;script&gt;bad&lt;/script&gt;',render(bib,books,injected))
        injected['courses'][0]['url']='javascript:alert(1)'
        with self.assertRaises(AssertionError):render(bib,books,injected)

if __name__=='__main__':unittest.main()
