"""Import a small, reviewed public-domain classics batch from Wikisource.

The importer uses the MediaWiki API instead of OCR.  It stores source and
license metadata beside every text so the app can show one unified notice.
Run it deliberately when updating the vetted catalogue; it never scans local
user documents or imports modern translations/annotations.
"""

from __future__ import annotations

import json
import html
import hashlib
import re
import urllib.parse
import urllib.request
import urllib.error
import time
from datetime import datetime, timezone
from pathlib import Path


API = "https://zh.wikisource.org/w/api.php"
OUTPUT = Path(__file__).resolve().parents[1] / "src" / "data" / "guoxueClassics.json"
CACHE_DIR = Path.home() / ".cache" / "yandao-classics"

BOOKS = [
    {"id": "lunyu", "title": "论语", "wikiTitle": "論語/全覽", "category": "儒家", "author": "孔子弟子及再传弟子编纂"},
    {"id": "daxue", "title": "大学章句", "wikiTitle": "四書章句集註/大學章句", "category": "儒家", "author": "朱熹章句"},
    {"id": "zhongyong", "title": "中庸章句", "wikiTitle": "四書章句集註 (四庫全書本)/中庸", "category": "儒家", "author": "朱熹章句"},
    {"id": "daodejing_wangbi", "title": "道德经（王弼本）", "wikiTitle": "道德經 (王弼本)", "category": "道家", "author": "老子；王弼注"},
    {"id": "sunzibingfa", "title": "孙子兵法", "wikiTitle": "孫子兵法", "category": "兵家", "author": "孙武"},
    {"id": "sanzijing", "title": "三字经", "wikiTitles": ["新刊三字經"], "category": "蒙学", "author": "王应麟（传统署名）"},
    {"id": "baijiaxing", "title": "百家姓", "wikiTitle": "百家姓", "category": "蒙学", "author": "佚名"},
    {"id": "qianziwen", "title": "千字文", "wikiTitle": "千字文", "category": "蒙学", "author": "周兴嗣"},
    {"id": "dizigui", "title": "弟子规", "wikiTitle": "弟子規", "category": "蒙学", "author": "李毓秀"},
    {"id": "zhuzijiaxun", "title": "朱子家训", "wikiTitle": "朱子家訓", "category": "家训", "author": "朱柏庐"},
    {"id": "shenglvqimeng", "title": "声律启蒙", "wikiTitle": "聲律啟蒙", "category": "蒙学", "author": "车万育"},
    {"id": "zengguangxianwen", "title": "增广贤文", "wikiTitle": "增廣賢文", "category": "蒙学", "author": "佚名"},
]


def fetch_extract(title: str) -> tuple[str, str]:
    cache_file = CACHE_DIR / f"{hashlib.sha256(title.encode('utf-8')).hexdigest()}.json"
    if cache_file.exists():
        cached = json.loads(cache_file.read_text(encoding="utf-8"))
        return cached["title"], cached["content"]
    params = urllib.parse.urlencode(
        {
            "action": "parse",
            "prop": "text",
            "redirects": "1",
            "page": title,
            "format": "json",
            "formatversion": "2",
            "origin": "*",
        }
    )
    request = urllib.request.Request(
        f"{API}?{params}",
        headers={"User-Agent": "YandaoGuoxue/1.0 classics-importer"},
    )
    for attempt in range(8):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                page = json.load(response)["parse"]
            break
        except urllib.error.HTTPError as error:
            if error.code != 429 or attempt == 7:
                raise
            time.sleep(min(5 * (attempt + 1), 30))
    time.sleep(1.0)
    rendered = str(page.get("text") or "")
    rendered = re.sub(r"<(script|style|table)[^>]*>.*?</\1>", "", rendered, flags=re.I | re.S)
    rendered = re.sub(r"<span[^>]*class=\"mw-editsection[^>]*>.*?</span>", "", rendered, flags=re.I | re.S)
    rendered = re.sub(r"<(br|p|div|li|h[1-6])\b[^>]*>", "\n", rendered, flags=re.I)
    text = html.unescape(re.sub(r"<[^>]+>", "", rendered))
    text = re.sub(r"[ \t]+", " ", text).replace("\r\n", "\n")
    text = re.sub(r"一作「[^」]*」", "", text)
    text = re.sub(r"编辑(?=\n|$)", "", text)
    text = re.sub(r"\n(?:此作品在全世界|Public domain)[\s\S]*$", "", text)
    text = re.sub(r"^Image\s*$", "", text, flags=re.M)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    if len(text) < 80:
        raise RuntimeError(f"Wikisource extract too short: {title} ({len(text)})")
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_file.write_text(json.dumps({"title": page["title"], "content": text}, ensure_ascii=False), encoding="utf-8")
    return str(page["title"]), text


def main() -> None:
    existing = {}
    if OUTPUT.exists():
        existing = {item["id"]: item for item in json.loads(OUTPUT.read_text(encoding="utf-8")).get("books", [])}
    imported = []
    for book in BOOKS:
        if book["id"] in existing:
            imported.append(existing[book["id"]])
            continue
        requested_titles = book.get("wikiTitles") or [book["wikiTitle"]]
        parts = []
        resolved_titles = []
        for requested_title in requested_titles:
            resolved_title, content = fetch_extract(requested_title)
            resolved_titles.append(resolved_title)
            parts.append(content)
        content = "\n\n".join(parts)
        imported.append(
            {
                "id": book["id"],
                "title": book["title"],
                "category": book["category"],
                "author": book["author"],
                "content": content,
                "sourceName": "维基文库",
                "sourceUrl": "https://zh.wikisource.org/wiki/" + urllib.parse.quote(resolved_titles[0]),
                "sourcePages": ["https://zh.wikisource.org/wiki/" + urllib.parse.quote(title) for title in resolved_titles],
                "license": "Public domain or CC BY-SA 4.0; see source page",
            }
        )
    payload = {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "notice": "仅收录可核验的古籍原文；不含现代译注。文本来自维基文库，具体公版或 CC BY-SA 4.0 状态以来源页为准。",
        "books": imported,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {len(imported)} books to {OUTPUT}")
    for item in imported:
        print(item["title"], len(item["content"]))


if __name__ == "__main__":
    main()
