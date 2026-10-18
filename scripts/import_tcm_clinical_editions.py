"""Import three complete, pinned CC0 source editions, without generating text.

Default is a local integrity check; --fetch --write explicitly regenerates data.
Only the plain book fragment from the source's public Git repository is read.
No raw HTML/cache is retained. Chapter metadata states the source's own review
label; structural completeness never means medical proofreading.
"""
import argparse
import hashlib
import html as html_module
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "src/data/tcmClinicalOriginalEditions.json"
SOURCES = [
    {"id": "shanghan-original", "title": "傷寒論（宋本）", "name": "伤寒论·宋本原文", "author": "张机（张仲景）；历代传本", "dynasty": "东汉原作，后世传本", "revision": "b787d864bdd268b6d6cad760f2ed7ae5a9c08e89", "level": "h2", "count": 12, "minimum": 45000, "last": "已上二方，病證並在第七卷内。", "structure": "林亿校序、张仲景原序与卷一至卷十"},
    {"id": "jingui-original", "title": "金匱要略方論", "name": "金匮要略方论原文", "author": "张机（张仲景）；林亿等校传", "dynasty": "东汉原作，后世传本", "revision": "02f8d5fd4a6f47325c16969740efac05da476b15", "level": "h2", "count": 26, "minimum": 40000, "last": "通除諸毒藥。", "structure": "序及第一至第二十五篇"},
    {"id": "wenbing-original", "title": "溫病條辨", "name": "温病条辨原文", "author": "吴瑭（吴鞠通）", "dynasty": "清", "revision": "91bb425e75429516fad0cef2adec954b0a7ca99c", "level": "h1", "count": 9, "minimum": 100000, "last": "覽者諒之。", "structure": "原序、凡例、原病篇及卷一至卷六"},
]


def digest(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


class BookParser(HTMLParser):
    blocks = {"p", "div", "h1", "h2", "h3", "h4", "h5", "h6", "li", "tr", "blockquote"}
    voids = {"br", "hr", "img", "meta", "link", "input", "wbr", "source", "area", "base", "embed", "param", "track", "col"}

    def __init__(self, level):
        super().__init__(convert_charrefs=True)
        self.level, self.stack, self.sections = level, [], []
        self.title, self.body, self.heading, self.images = None, [], None, 0

    def visible(self):
        return not self.stack or not self.stack[-1][1]

    def finish(self):
        if self.title is not None:
            content = re.sub(r"\n{3,}", "\n\n", "\n".join(line.strip() for line in "".join(self.body).splitlines())).strip()
            if not content:
                raise ValueError("Empty source chapter: " + self.title)
            self.sections.append({"title": self.title.strip(), "content": content})
        self.title, self.body = None, []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        skipped = not self.visible() or tag in {"header", "script", "style", "nav", "footer"} or attrs.get("data-rev") == "古版"
        if tag == "img" and not skipped:
            self.images += 1  # Never silently drop source illustrations.
        if tag == self.level and not skipped:
            self.finish()
            self.heading = []
        elif not skipped and self.title is not None and tag in self.blocks | {"br", "hr"}:
            self.body.append("\n")
        annotation = tag == "small" and "雙行夾注" in attrs.get("class", "")
        if annotation and not skipped and self.title is not None:
            self.body.append("〔")
        if tag not in self.voids:
            self.stack.append((tag, skipped, annotation))

    def handle_endtag(self, tag):
        visible = self.visible()
        annotation = False
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                annotation = self.stack[i][2]
                self.stack = self.stack[:i]
                break
        if visible and tag == self.level and self.heading is not None:
            self.title = "".join(self.heading)
            self.heading = None
        elif visible and self.title is not None:
            if annotation:
                self.body.append("〕")
            if tag in self.blocks:
                self.body.append("\n")

    def handle_data(self, value):
        if self.visible():
            if self.heading is not None:
                self.heading.append(value)
            elif self.title is not None:
                self.body.append(value)


def import_book(source):
    file = "pages/book/" + source["title"] + "/index.html"
    url = "https://gitlab.com/api/v4/projects/jicheng%2Fjc.data/repository/files/" + urllib.parse.quote(file, safe="") + "/raw?ref=" + source["revision"]
    request = urllib.request.Request(url, headers={"User-Agent": "YandaoGuoxue-LearningEdition/1.0 (pinned public-domain edition audit)"})
    with urllib.request.urlopen(request, timeout=45) as response:
        raw = response.read()
    html = raw.decode("utf-8")
    if re.search(r"方未校|待補|校訂不足|錯誤百出|校订不足|错误百出", html):
        raise ValueError("Source contains an unresolved incompleteness warning")
    parser = BookParser(source["level"])
    parser.feed(html)
    parser.finish()
    assert parser.images == 0, "Illustrations need a separately verified source/license before importing"
    chapters = [{"id": f"{source['id']}-{i}", **item} for i, item in enumerate(parser.sections, 1)]
    assert len(chapters) == source["count"], "Source chapter count changed"
    content = "\n".join(chapter["content"] for chapter in chapters)
    assert len(content) >= source["minimum"] and content.endswith(source["last"]), "Source extent/terminal marker mismatch"
    # Independent tag-stripping check: every non-whitespace source character
    # outside the metadata header must survive, in order, including formulae,
    # amounts, nested headings and small-print annotations. Only the added
    # annotation brackets are ignored. Length/terminal checks alone are weaker.
    stripped = re.sub(r"<header\b[^>]*>.*?</header>", "", html, flags=re.S)
    stripped = re.sub(r"<!--.*?-->", "", stripped, flags=re.S)
    stripped = html_module.unescape(re.sub(r"<[^>]+>", "", stripped))
    compact = lambda text: re.sub(r"[\s〔〕]", "", text)
    reconstructed = "".join(c["title"] + c["content"] for c in chapters)
    assert compact(stripped) == compact(reconstructed), "Source text omitted or reordered during extraction"
    quality = re.search(r"<dt>品質</dt><dd>(.*?)</dd>", html)
    source_quality = quality.group(1) if quality else "未提供"
    public_url = "https://jicheng.tw/tcm/book/" + urllib.parse.quote(source["title"]) + "/index.html"
    revision_url = "https://gitlab.com/jicheng/jc.data/-/blob/" + source["revision"] + "/" + urllib.parse.quote(file, safe="/")
    return {"id": source["id"], "name": source["name"], "pinyin": {"shanghan-original": "Shang Han Lun", "jingui-original": "Jin Kui Yao Lue Fang Lun", "wenbing-original": "Wen Bing Tiao Bian"}[source["id"]], "dynasty": source["dynasty"], "author": source["author"], "description": "完整收录本来源版本的" + source["structure"] + "，不含本站AI扩写。保留古版录文字形。", "sourceName": "中医笈成（固定Git源版本）", "sourceUrl": public_url, "sourceRevisionUrl": revision_url, "sourcePages": [{"url": public_url, "revisionUrl": revision_url}], "sourceRawSha256": hashlib.sha256(raw).hexdigest(), "sourceRevision": source["revision"], "sourceQualityLabel": source_quality, "license": "古代原作公有领域；中医笈成对公有领域文本的筛选、编排、标点、附注等编辑以CC0释出。许可声明：https://jicheng.tw/tcm/copyright.html 。未收录该站图片。仅去除HTML标签，将双行夹注加〔〕以便阅读，未改写原文字词。", "verification": "已核对本来源目录、完整卷篇、正文长度及末尾标记，并固定原始文件和正文SHA-256。来源自标「品质" + source_quality + "」（非本应用医学准确率，来源未说明计算口径）；本站尚未逐字对照影印本或完成医学校勘。古代药物、剂量和治法均为文献原文，不供自行诊疗、用药或针刺。", "contentSha256": digest(content), "chapters": chapters}


def verify(books):
    assert len(books) == len(SOURCES)
    for source, book in zip(SOURCES, books):
        assert book["id"] == source["id"] and book["sourceRevision"] == source["revision"]
        assert len(book["chapters"]) == source["count"]
        assert len({c["id"] for c in book["chapters"]}) == source["count"]
        assert all(c["title"] and c["content"] for c in book["chapters"])
        content = "\n".join(c["content"] for c in book["chapters"])
        assert len(content) >= source["minimum"] and content.endswith(source["last"])
        assert digest(content) == book["contentSha256"]
        print(json.dumps({"id": book["id"], "chapters": len(book["chapters"]), "characters": len(content), "sourceQualityLabel": book["sourceQualityLabel"], "sha256": book["contentSha256"]}, ensure_ascii=False))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--fetch", action="store_true")
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    if args.write and not args.fetch:
        parser.error("--write requires explicit --fetch")
    books = [import_book(source) for source in SOURCES] if args.fetch else json.loads(TARGET.read_text(encoding="utf-8"))
    verify(books)
    if args.write:
        TARGET.write_bytes((json.dumps(books, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))


if __name__ == "__main__":
    main()
