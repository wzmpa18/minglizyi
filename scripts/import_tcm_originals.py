"""Import public-domain reading editions with per-page revision provenance.

Run from repository root. Refuse missing/empty chapters, rather than generate text.
Source transcriptions remain uncollated; this does not verify medical accuracy.
"""
import hashlib
import json
import re
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

BASE = "https://zh.wikisource.org"


def fetch(url):
    request = urllib.request.Request(url, headers={"User-Agent": "YandaoClassicsAudit/1.0"})
    return urllib.request.urlopen(request, timeout=40).read().decode("utf-8")


class EditionParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.depth = 0
        self.root = None
        self.heading = None
        self.in_paragraph = False
        self.ignored_span = 0
        self.buffer = []
        self.rows = []
        self.current = None

    def handle_starttag(self, tag, attrs):
        attr = dict(attrs)
        if tag == "div":
            self.depth += 1
            if attr.get("id") == "mw-content-text":
                self.root = self.depth
        if self.root is None:
            return
        if tag == "span" and (self.ignored_span or "mw-editsection" in attr.get("class", "")):
            self.ignored_span += 1
        if tag in ("h2", "h3"):
            self.heading = tag
            self.buffer = []
        elif tag == "p" and self.current:
            self.in_paragraph = True
            self.buffer = []
        elif tag == "br" and self.in_paragraph:
            self.buffer.append("\n")

    def handle_data(self, value):
        if not self.ignored_span and (self.heading or self.in_paragraph):
            self.buffer.append(value)

    def handle_endtag(self, tag):
        if tag == "span" and self.ignored_span:
            self.ignored_span -= 1
        if tag == self.heading:
            title = "".join(self.buffer).strip()
            self.heading = None
            self.current = {"title": title, "paragraphs": []}
            self.rows.append(self.current)
        elif tag == "p" and self.in_paragraph:
            text = "".join(self.buffer).strip()
            if self.current and text and not re.match(r"^\[\d+\]", text) and not any(marker in text for marker in ("Public domain", "此作品在", "此页面最后", "本页面最后")):
                self.current["paragraphs"].append(re.sub(r"\[\d+\]", "", text))
            self.in_paragraph = False
        if tag == "div":
            if self.depth == self.root:
                self.root = None
                self.current = None
            self.depth -= 1


def extract(url):
    html = fetch(url)
    parser = EditionParser()
    parser.feed(html)
    revision = re.search(r'id="t-permalink".*?oldid=(\d+)', html, re.S)
    assert revision, f"No revision provenance: {url}"
    sections = [{"title": row["title"], "content": "\n\n".join(row["paragraphs"])} for row in parser.rows if row["paragraphs"]]
    return sections, {"url": url, "revisionUrl": f"{BASE}/w/index.php?oldid={revision.group(1)}"}


def chinese_number(value):
    digits = {char: index for index, char in enumerate("零一二三四五六七八九")}
    if "十" in value:
        left, right = value.split("十")
        return (digits[left] if left else 1) * 10 + (digits[right] if right else 0)
    return digits[value]


def main():
    catalogue_url = BASE + "/wiki/" + urllib.parse.quote("黃帝內經")
    catalogue = fetch(catalogue_url)
    configs = [
        ("suwen-original", "黄帝内经·素问原文", "Su Wen", "素問", 24, 81),
        ("lingshu-original", "黄帝内经·灵枢原文", "Ling Shu", "靈樞", 12, 81),
        ("shennong-original", "神农本草经原文", "Shen Nong Ben Cao Jing", None, 1, None),
    ]
    books = []
    for book_id, name, pinyin, section, volume_count, chapter_count in configs:
        if section:
            links = re.findall(r'<a\b[^>]*href="([^"]+)"', catalogue)
            pages = list(dict.fromkeys(BASE + href.split("#")[0] for href in links if re.fullmatch(r"/wiki/黃帝內經/" + section + r"第[一二三四五六七八九十]+卷", urllib.parse.unquote(href))))
        else:
            pages = [BASE + "/wiki/" + urllib.parse.quote("神農本草經")]
        assert len(pages) == volume_count, (name, len(pages), "unexpected volume count")
        with ThreadPoolExecutor(max_workers=3) as pool:
            extracted = list(pool.map(extract, pages))
        rows = [row for sections, _ in extracted for row in sections]
        if chapter_count:
            # Every chapter title carries its ordinal; no silently missing volumes.
            ordinals = []
            for row in rows:
                match = re.search(r"(?:第)?([一二三四五六七八九十]+)$", row["title"])
                assert match, (name, row["title"], "unexpected chapter title")
                ordinals.append(chinese_number(match.group(1)))
            assert ordinals == list(range(1, chapter_count + 1)), (name, ordinals, "chapter sequence mismatch")
        else:
            assert len(rows) >= 18 and rows[0]["title"] == "序", "Unexpected materia-medica structure"
        assert all(len(row["content"]) > 20 for row in rows), "Empty or suspiciously short chapter"
        chapters = [{"id": f"{book_id}-{index}", **row} for index, row in enumerate(rows, 1)]
        books.append({
            "id": book_id, "name": name, "pinyin": pinyin, "dynasty": "古代医学文献", "author": "历代传本，作者与成书年代有争议",
            "description": f"收录来源版本{len(chapters)}个篇章，保留原文繁体，不含本站AI扩写。",
            "sourceName": "维基文库电子录文", "sourceUrl": catalogue_url if section else pages[0],
            "sourceRevisionUrl": extracted[0][1]["revisionUrl"], "sourcePages": [source for _, source in extracted],
            "license": "古代原文公有领域；维基文库编排与贡献遵循来源页CC BY-SA 4.0条款",
            "verification": "已核对来源卷数、篇章顺序与非空正文；来源录文未逐字校勘，不作为医学规范或个人用药、针刺依据。",
            "verifiedAt": datetime.now(timezone.utc).date().isoformat(),
            "contentSha256": hashlib.sha256(json.dumps(chapters, ensure_ascii=False).encode()).hexdigest(), "chapters": chapters,
        })
        print(f"{book_id}: {len(pages)} source pages, {len(chapters)} chapters, {sum(len(row['content']) for row in rows)} characters")
    destination = Path(__file__).resolve().parents[1] / "src/data/tcmOriginalEditions.json"
    destination.write_text(json.dumps(books, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
