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

if __name__=='__main__':unittest.main()
