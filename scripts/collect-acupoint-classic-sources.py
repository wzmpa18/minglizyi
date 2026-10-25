"""Collect public-domain source paragraphs, not AI-written point indications.

Keeps the fetched edition, paragraph order and SHA for later verification.
Does not publish content or modify the source library. Windows is required only
for the explicitly recorded traditional-to-simplified search conversion.
"""
import argparse
import ctypes
import hashlib
import json
import re
import time
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

PAIRING_CHAPTERS = {'1ly7muxz8350m', '1ly7muyboz3g3', '1ly7muybp0i0j', '1ly7muybp0unn',
                    '1ly7muybp3b5f', '1ly7mv7twdulq', '1ly7mv7twejvy', '1ly7mv8eercwq'}


class ChapterParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.active = False
        self.paragraph = None
        self.paragraphs = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'article' and attrs.get('class') == 'chapter-reader':
            self.active = True
        if self.active and tag == 'p':
            self.paragraph = []

    def handle_data(self, data):
        if self.active and self.paragraph is not None:
            self.paragraph.append(data)

    def handle_endtag(self, tag):
        if tag == 'p' and self.paragraph is not None:
            self.paragraphs.append(''.join(self.paragraph).strip())
            self.paragraph = None
        if tag == 'article':
            self.active = False


def simplified(text):
    if not text:
        return ''
    buffer = ctypes.create_unicode_buffer(len(text) * 2 + 1)
    # cchSrc counts UTF-16 code units, not Python code points; -1 includes the
    # terminator and prevents rare ancient characters truncating the paragraph.
    size = ctypes.windll.kernel32.LCMapStringW(0x0804, 0x02000000, text, -1, buffer, len(buffer))
    if not size:
        raise RuntimeError('Chinese search conversion failed')
    return buffer.value


def chapters_in(value):
    if isinstance(value, dict):
        if 'chapterId' in value and 'chapterName' in value:
            yield value
        for child in value.values():
            yield from chapters_in(child)
    elif isinstance(value, list):
        for child in value:
            yield from chapters_in(child)


def collect(output):
    output.mkdir(parents=True, exist_ok=True)
    base = 'https://www.shidianguji.com/zh/book/NCM011X411999030508/chapter/'
    first_id = '1ly7mvzyyzod7'

    def fetch(chapter_id):
        cache = output / (chapter_id + '.html')
        if not cache.exists():
            request = urllib.request.Request(base + chapter_id, headers={'User-Agent': 'YandaoGuoxue-SourceAudit/1.0'})
            with urllib.request.urlopen(request, timeout=45) as response:
                raw = response.read()
            cache.write_bytes(raw)
            time.sleep(0.5)
        return cache.read_bytes()

    first = fetch(first_id).decode('utf-8')
    state = json.JSONDecoder().raw_decode(first.split('window._ROUTER_DATA = ', 1)[1])[0]
    chapters = {item['chapterId']: item for item in chapters_in(state)
                if 610 <= item.get('startPageNum', 0) <= 870 or item['chapterId'] in PAIRING_CHAPTERS}
    result = []
    for chapter_id, item in sorted(chapters.items(), key=lambda pair: pair[1]['startPageNum']):
        raw = fetch(chapter_id)
        parser = ChapterParser()
        parser.feed(raw.decode('utf-8'))
        if not parser.paragraphs:
            raise RuntimeError('No public source paragraphs: ' + chapter_id)
        result.append({'chapterId': chapter_id, 'title': ''.join(p.get('content', '') for p in item['chapterName']),
                       'editionPage': item['startPageNum'], 'url': base + chapter_id,
                       'sourceSha256': hashlib.sha256(raw).hexdigest(),
                       'paragraphs': [{'ordinal': n + 1, 'original': text, 'searchText': simplified(text)}
                                      for n, text in enumerate(parser.paragraphs)]})
        print(chapter_id, len(parser.paragraphs), flush=True)
    record = {'book': '针灸大成', 'author': '明·杨继洲', 'scope': '经穴篇章原文；不含平台现代译注',
              'conversion': 'Windows LCMapStringW simplified, original preserved', 'chapters': result}
    (output / 'source-paragraphs.json').write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding='utf-8')


if __name__ == '__main__':
    args = argparse.ArgumentParser()
    args.add_argument('--output', type=Path, required=True)
    collect(args.parse_args().output)
