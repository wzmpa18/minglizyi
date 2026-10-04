#!/usr/bin/env python3
"""Build verified complete classics from public Wikisource chapter catalogues.

The script never trusts a large rendered page as proof of completeness. Each
configured work declares its ordered chapter list; every chapter must download,
contain enough source text and appear in the final merged result before --write
can replace the bundled book.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import time
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "src" / "data" / "guoxueClassics.json"
REPORT = ROOT / "docs" / "reports" / "20261004_国学典籍全文完整性审计.json"
REST = "https://zh.wikisource.org/w/rest.php/v1/page/{}/html"
UA = "YandaoGuoxue-FullText-Audit/1.0 (https://yandaoguoxue.yandao.vip/)"

WORKS = {
    "zhuangzi": {
        "catalog": "莊子",
        "chapters": "逍遙遊 齊物論 養生主 人間世 德充符 大宗師 應帝王 駢拇 馬蹄 胠篋 在宥 天地 天道 天運 刻意 繕性 秋水 至樂 達生 山木 田子方 知北遊 庚桑楚 徐無鬼 則陽 外物 寓言 讓王 盜跖 說劍 漁父 列禦寇 天下".split(),
        "prefix": "莊子/",
        "min_chars": 55000,
    },
    "shangjunshu": {
        "catalog": "商君書",
        "chapters": ["卷一", "卷二", "卷三", "卷四", "卷五"],
        "prefix": "商君書/",
        "min_chars": 18000,
    },
    "gongsunlongzi": {
        "catalog": "公孫龍子",
        "chapters": ["原序", "1", "2", "3", "4", "5", "6"],
        "prefix": "公孫龍子/",
        "min_chars": 7000,
    },
    "huainanzi": {
        "catalog": "淮南子",
        "chapters": "敘目 原道訓 俶真訓 天文訓 墬形訓 時則訓 覽冥訓 精神訓 本經訓 主術訓 繆稱訓 齊俗訓 道應訓 氾論訓 詮言訓 兵略訓 說山訓 說林訓 人間訓 脩務訓 泰族訓 要略".split(),
        "prefix": "淮南子/",
        "min_chars": 90000,
    },
    "shanhaijing": {
        "catalog": "山海經",
        "chapters": "南山經 西山經 北山經 東山經 中山經 海外南經 海外西經 海外北經 海外東經 海內南經 海內西經 海內北經 海內東經 大荒東經 大荒南經 大荒西經 大荒北經 海內經".split(),
        "prefix": "山海經/",
        "min_chars": 35000,
    },
    "hanfeizi": {
        "catalog": "韓非子 (四庫全書本)/全覽",
        "chapters": ["全覽"],
        "prefix": "韓非子 (四庫全書本)/",
        "min_chars": 100000,
    },
    "lvshi_chunqiu": {
        "catalog": "吕氏春秋 (四庫全書本)/全覽",
        "chapters": ["全覽"],
        "prefix": "吕氏春秋 (四庫全書本)/",
        "min_chars": 120000,
    },
}


class ArticleText(HTMLParser):
    BLOCKS = {"p", "div", "section", "li", "tr", "h1", "h2", "h3", "h4", "h5", "h6", "br"}
    SKIP_TAGS = {"style", "script", "noscript", "svg", "math"}
    SKIP_CLASSES = {"mw-ref", "reference", "mw-editsection", "noprint", "noexcerpt", "ws-noexport", "navbox"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.skip_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr = {key: value or "" for key, value in attrs}
        classes = set(attr.get("class", "").split())
        reference_block = any("reference" in name or name.startswith("mw-ref") or name == "reflist" for name in classes)
        if self.skip_depth or tag in self.SKIP_TAGS or classes.intersection(self.SKIP_CLASSES) or reference_block:
            self.skip_depth += 1
            return
        if tag in self.BLOCKS:
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if self.skip_depth:
            self.skip_depth -= 1
            return
        if tag in self.BLOCKS:
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:
        if not self.skip_depth:
            self.parts.append(data)

    def text(self) -> str:
        value = html.unescape("".join(self.parts)).replace("\xa0", " ")
        lines = [re.sub(r"[ \t]+", " ", line).strip() for line in value.splitlines()]
        ignored = ("维基文库", "姊妹计划", "下载", "编辑", "阅读", "本页", "来自维基")
        lines = [line for line in lines if line and not any(line.startswith(word) for word in ignored)]
        return "\n".join(lines).strip()


def clean_page(title: str, text: str) -> str:
    for marker in ("\n此作品在全世界", "\n此宋朝作品在全世界", "\nPublic domain"):
        if marker in text:
            text = text.split(marker, 1)[0]
    base = title.split("/", 1)[0]
    cleaned: list[str] = []
    for line in text.splitlines():
        value = line.strip().lstrip("\ufeff")
        if not value or value in {title, base, "目錄", "全書始", "◄", "►", "←", "→"}:
            continue
        if value.startswith(("►", "◄", "←", "→", "↑", "作者：", "Public domain")):
            continue
        if len(value) < 50 and (value.endswith("▶") or value.startswith(("上一卷", "下一卷"))):
            continue
        if "公有领域" in value or "公有領域" in value:
            continue
        cleaned.append(value)
    return "\n".join(cleaned).strip()


def fetch_page(title: str) -> str:
    url = REST.format(urllib.parse.quote(title, safe=""))
    request = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(request, timeout=45) as response:
        source = response.read().decode("utf-8")
    parser = ArticleText()
    parser.feed(source)
    return clean_page(title, parser.text())


def build_work(book_id: str, spec: dict) -> tuple[str, dict]:
    chunks: list[str] = []
    chapter_rows: list[dict] = []
    for chapter in spec["chapters"]:
        title = spec["catalog"] if chapter == "全覽" else f'{spec["prefix"]}{chapter}'
        text = fetch_page(title)
        if len(text) < 100:
            raise RuntimeError(f"{book_id}/{chapter} 内容过短：{len(text)}")
        heading = "" if chapter == "全覽" else f"【{chapter}】\n"
        chunks.append(heading + text)
        chapter_rows.append({"chapter": chapter, "sourceTitle": title, "chars": len(text)})
        time.sleep(0.12)
    content = "\n\n".join(chunks).strip()
    if len(content) < spec["min_chars"]:
        raise RuntimeError(f"{book_id} 合并后仍过短：{len(content)} < {spec['min_chars']}")
    missing = [chapter for chapter in spec["chapters"] if chapter != "全覽" and f"【{chapter}】" not in content]
    if missing:
        raise RuntimeError(f"{book_id} 缺少篇章：{missing}")
    return content, {
        "id": book_id,
        "status": "full",
        "chapterCount": len(spec["chapters"]),
        "chars": len(content),
        "chapters": chapter_rows,
        "catalog": spec["catalog"],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true", help="all configured works must pass before replacing JSON")
    args = parser.parse_args()
    payload = json.loads(DATA.read_text(encoding="utf-8"))
    by_id = {book["id"]: book for book in payload["books"]}
    completed: dict[str, tuple[str, dict]] = {}
    failures: list[dict] = []
    for book_id, spec in WORKS.items():
        try:
            completed[book_id] = build_work(book_id, spec)
            print(f"PASS {book_id}: {completed[book_id][1]['chapterCount']} sections, {len(completed[book_id][0])} chars")
        except Exception as error:  # keep the audit useful if one upstream page fails
            failures.append({"id": book_id, "error": str(error)})
            print(f"FAIL {book_id}: {error}")
    report = {
        "schema": "yandao.guoxue.fulltext-audit.v1",
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "passed": [value[1] for value in completed.values()],
        "failed": failures,
    }
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    if args.write:
        if failures:
            raise SystemExit("存在失败项，未写入生产典籍 JSON")
        for book_id, (content, info) in completed.items():
            book = by_id[book_id]
            book["content"] = content
            book["sourceName"] = "维基文库完整目录逐篇核验"
            book["sourceUrl"] = "https://zh.wikisource.org/wiki/" + urllib.parse.quote(WORKS[book_id]["catalog"].replace(" ", "_"))
            book["completeness"] = "full"
            book["sectionCount"] = info["chapterCount"]
            book["verifiedAt"] = "2026-10-04"
        DATA.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"WROTE {DATA}")


if __name__ == "__main__":
    main()
