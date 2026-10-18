"""Refresh the attributed, chapter-complete Nanjing reading edition.

Uses only public page content. Never generates or paraphrases classical text.
Run from the repository root: python scripts/import_nanjing.py
"""
import hashlib
import json
import re
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

URL = "https://zh.wikisource.org/wiki/%E9%9B%A3%E7%B6%93"


class Chapters(HTMLParser):
    def __init__(self):
        super().__init__()
        self.depth = 0
        self.root = None
        self.heading = False
        self.paragraph = False
        self.buffer = []
        self.current = None
        self.rows = []

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if tag == "div":
            self.depth += 1
            if self.root is None and "mw-parser-output" in attributes.get("class", "").split():
                self.root = self.depth
        if self.root is None:
            return
        if tag == "h2":
            self.heading = True
            self.buffer = []
        if tag == "p" and self.current:
            self.paragraph = True
            self.buffer = []

    def handle_data(self, data):
        if self.heading or self.paragraph:
            self.buffer.append(data)

    def handle_endtag(self, tag):
        if tag == "h2" and self.heading:
            title = "".join(self.buffer).replace("[编辑]", "").replace("[編輯]", "").strip()
            self.heading = False
            if re.fullmatch(r"第[一二三四五六七八九十百]+難", title):
                self.current = {"title": title, "paragraphs": []}
                self.rows.append(self.current)
            else:
                self.current = None
        if tag == "p" and self.paragraph:
            text = "".join(self.buffer).strip()
            if text and self.current:
                self.current["paragraphs"].append(text)
            self.paragraph = False
        if tag == "div":
            if self.depth == self.root:
                self.root = None
                self.current = None
            self.depth -= 1


def number(value):
    digits = {character: i for i, character in enumerate("零一二三四五六七八九")}
    if "十" in value:
        left, right = value.split("十")
        return (digits[left] if left else 1) * 10 + (digits[right] if right else 0)
    return digits[value]


def main():
    request = urllib.request.Request(URL, headers={"User-Agent": "YandaoClassicsAudit/1.0"})
    html = urllib.request.urlopen(request, timeout=40).read().decode("utf-8")
    parser = Chapters()
    parser.feed(html)
    assert len(parser.rows) == 81, "Source chapter count changed; review before import"
    assert [number(row["title"][1:-1]) for row in parser.rows] == list(range(1, 82))
    chapters = []
    for index, row in enumerate(parser.rows, 1):
        content = "\n\n".join(row["paragraphs"])
        assert len(content) >= 20, f"Chapter {index} is missing text"
        assert not any(word in content for word in ("Creative Commons", "此页面最后", "本页面最后"))
        chapters.append({"id": f"nanjing-original-{index}", "title": row["title"], "content": content})
    revision = re.search(r'id="t-permalink".*?oldid=(\d+)', html, re.S)
    assert revision, "No revision identity; refuse an untraceable import"
    book = {
        "id": "nanjing-original", "name": "难经·八十一难原文", "pinyin": "Nan Jing",
        "dynasty": "成书年代有争议", "author": "旧题扁鹊",
        "description": "按维基文库所载次序收录第一难至第八十一难。保留原文繁体，不含本站AI扩写；篇章齐备不等于医学审校通过。",
        "sourceName": "维基文库《難經》", "sourceUrl": URL,
        "sourceRevisionUrl": f"https://zh.wikisource.org/w/index.php?oldid={revision.group(1)}",
        "license": "古代原文公有领域；维基文库编排与贡献遵循来源页的CC BY-SA 4.0条款",
        "verifiedAt": datetime.now(timezone.utc).date().isoformat(),
        "verification": "81章顺序、非空正文和来源版本核验；未进行逐字校勘或医学专业审校",
        "contentSha256": hashlib.sha256(json.dumps(chapters, ensure_ascii=False).encode()).hexdigest(),
        "chapters": chapters,
    }
    destination = Path(__file__).resolve().parents[1] / "src/data/nanjingOriginal.json"
    destination.write_text(json.dumps(book, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Imported {len(chapters)} chapters; content SHA-256 {book['contentSha256']}")


if __name__ == "__main__":
    main()
