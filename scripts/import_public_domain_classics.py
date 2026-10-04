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
    {"id": "yijing", "title": "易经", "plainUrl": "https://www.gutenberg.org/cache/epub/25501/pg25501.txt", "sourceUrl": "https://www.gutenberg.org/ebooks/25501", "category": "经部", "author": "佚名", "minLength": 30000},
    {"id": "shijing", "title": "诗经", "plainUrl": "https://www.gutenberg.org/cache/epub/23873/pg23873.txt", "sourceUrl": "https://www.gutenberg.org/ebooks/23873", "category": "经部", "author": "佚名", "minLength": 30000},
    {"id": "liji", "title": "礼记", "plainUrl": "https://www.gutenberg.org/cache/epub/24048/pg24048.txt", "sourceUrl": "https://www.gutenberg.org/ebooks/24048", "category": "经部", "author": "佚名", "minLength": 50000},
    {"id": "zuozhuan", "title": "左传", "plainUrl": "https://www.gutenberg.org/cache/epub/24136/pg24136.txt", "sourceUrl": "https://www.gutenberg.org/ebooks/24136", "category": "经部", "author": "传统题左丘明", "minLength": 100000},
    {"id": "daodejing_wangbi", "title": "道德经（王弼本）", "wikiTitle": "道德經 (王弼本)", "category": "道家", "author": "老子；王弼注"},
    {"id": "huangdi_yinfujing", "title": "黄帝阴符经", "wikiTitle": "黃帝陰符經", "category": "道家", "author": "传统题黄帝撰", "minLength": 300},
    {"id": "qingjingjing", "title": "太上老君说常清静经", "wikiTitle": "太上老君說常清靜經", "category": "道家", "author": "佚名", "minLength": 300},
    {"id": "taishang_ganying", "title": "太上感应篇", "wikiTitle": "太上感應篇", "category": "道家", "author": "佚名", "minLength": 500},
    {"id": "zhuangzi", "title": "庄子", "wikiPrefix": "莊子", "category": "道家", "author": "庄周及后学", "minLength": 10000},
    {"id": "liezi", "title": "列子", "wikiTitle": "列子 (四庫全書本)/全覽", "category": "道家", "author": "传统题列御寇", "minLength": 10000},
    {"id": "guiguzi", "title": "鬼谷子", "wikiTitle": "鬼谷子 (四庫全書本)", "category": "纵横家", "author": "传统题鬼谷子", "minLength": 5000},
    {"id": "mengzi", "title": "孟子", "wikiPrefix": "孟子", "category": "儒家", "author": "孟子及其弟子", "minLength": 10000},
    {"id": "xunzi", "title": "荀子", "wikiTitle": "荀子 (四庫全書本)/全覽", "category": "儒家", "author": "荀况", "minLength": 10000},
    {"id": "xiaojing", "title": "孝经", "wikiTitle": "今文孝經", "category": "儒家", "author": "佚名", "minLength": 1000},
    {"id": "hanfeizi", "title": "韩非子", "wikiPrefix": "韓非子 (四部叢刊本)", "category": "法家", "author": "韩非", "minLength": 30000},
    {"id": "shangjunshu", "title": "商君书", "wikiPrefix": "商君書", "category": "法家", "author": "商鞅及后学", "minLength": 5000},
    {"id": "guanzi", "title": "管子", "wikiTitle": "管子 (四庫全書本)/全覽", "category": "法家", "author": "传统题管仲", "minLength": 10000},
    {"id": "mozi", "title": "墨子", "wikiTitle": "墨子 (四庫全書本)/全覽", "category": "墨家", "author": "墨翟及墨家后学", "minLength": 10000},
    {"id": "gongsunlongzi", "title": "公孙龙子", "wikiPrefix": "公孫龍子", "category": "名家", "author": "公孙龙", "minLength": 1000},
    {"id": "lvshi_chunqiu", "title": "吕氏春秋", "wikiPrefix": "吕氏春秋 (四庫全書本)", "category": "杂家", "author": "吕不韦门客编纂", "minLength": 30000},
    {"id": "huainanzi", "title": "淮南子", "wikiPrefix": "淮南子", "category": "杂家", "author": "刘安及门客编纂", "minLength": 10000},
    {"id": "sunzibingfa", "title": "孙子兵法", "wikiTitle": "孫子兵法", "category": "兵家", "author": "孙武"},
    {"id": "wuzi", "title": "吴子兵法", "wikiTitle": "吳子兵法", "category": "兵家", "author": "吴起", "minLength": 1000},
    {"id": "simafa", "title": "司马法", "wikiTitle": "司馬法", "category": "兵家", "author": "传统题司马穰苴", "minLength": 1000},
    {"id": "liutao", "title": "六韬", "wikiTitle": "六韜", "category": "兵家", "author": "传统题姜太公", "minLength": 2000},
    {"id": "sanlue", "title": "黄石公三略", "wikiTitle": "黃石公三略", "category": "兵家", "author": "传统题黄石公", "minLength": 1000},
    {"id": "sushu", "title": "黄石公素书", "wikiTitle": "黃石公素書", "category": "兵家", "author": "传统题黄石公", "minLength": 500},
    {"id": "weiliaozhi", "title": "尉缭子", "wikiTitle": "尉繚子", "category": "兵家", "author": "尉缭", "minLength": 2000},
    {"id": "shanhaijing", "title": "山海经", "wikiPrefix": "山海經", "category": "地理博物", "author": "佚名", "minLength": 5000},
    {"id": "caigentan", "title": "菜根谭", "wikiTitle": "菜根譚", "category": "处世", "author": "洪应明", "minLength": 10000},
    {"id": "weiluyehua", "title": "围炉夜话", "wikiTitle": "圍爐夜話", "category": "处世", "author": "王永彬", "minLength": 5000},
    {"id": "youmengying", "title": "幽梦影", "wikiTitle": "幽夢影", "category": "处世", "author": "张潮", "minLength": 10000},
    {"id": "liaofansixun", "title": "了凡四训", "wikiTitle": "了凡四訓", "category": "家训", "author": "袁黄", "minLength": 5000},
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
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                page = json.load(response)["parse"]
            break
        except urllib.error.HTTPError as error:
            if error.code != 429 or attempt == 2:
                raise
            time.sleep(2 * (attempt + 1))
    time.sleep(0.7)
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


def fetch_plain_text(url: str, title: str) -> tuple[str, str]:
    cache_file = CACHE_DIR / f"plain-{hashlib.sha256(url.encode('utf-8')).hexdigest()}.json"
    if cache_file.exists():
        cached = json.loads(cache_file.read_text(encoding="utf-8"))
        return cached["title"], cached["content"]
    request = urllib.request.Request(url, headers={"User-Agent": "YandaoGuoxue/1.0 classics-importer"})
    with urllib.request.urlopen(request, timeout=45) as response:
        text = response.read().decode("utf-8-sig", errors="strict")
    start = re.search(r"\*\*\*\s*START OF (?:THE )?PROJECT GUTENBERG EBOOK[^\n]*\*\*\*", text, flags=re.I)
    end = re.search(r"\*\*\*\s*END OF (?:THE )?PROJECT GUTENBERG EBOOK[^\n]*\*\*\*", text, flags=re.I)
    if start:
        text = text[start.end():]
    if end:
        text = text[:max(0, end.start() - (start.end() if start else 0))]
    text = re.sub(r"\r\n?", "\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    if len(text) < 500:
        raise RuntimeError(f"plain text too short: {title} ({len(text)})")
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_file.write_text(json.dumps({"title": title, "content": text}, ensure_ascii=False), encoding="utf-8")
    return title, text


def api_request(params: dict[str, str], *, post: bool = False) -> dict:
    encoded = urllib.parse.urlencode(params).encode("utf-8")
    request = urllib.request.Request(
        API if post else f"{API}?{encoded.decode('ascii')}",
        data=encoded if post else None,
        headers={"User-Agent": "YandaoGuoxue/1.0 classics-importer"},
    )
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                result = json.load(response)
            time.sleep(0.7)
            return result
        except urllib.error.HTTPError as error:
            if error.code != 429 or attempt == 2:
                raise
            time.sleep(2 * (attempt + 1))
    raise RuntimeError("MediaWiki API unavailable")


def clean_plain_text(text: str) -> str:
    text = str(text or "").replace("\r\n", "\n")
    text = re.sub(r"一作「[^」]*」", "", text)
    text = re.sub(r"\n(?:此作品在全世界|Public domain)[\s\S]*$", "", text)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    return text


def fetch_subpages(prefix: str) -> tuple[list[str], str]:
    cache_file = CACHE_DIR / f"subpages-v2-{hashlib.sha256(prefix.encode('utf-8')).hexdigest()}.json"
    if cache_file.exists():
        cached = json.loads(cache_file.read_text(encoding="utf-8"))
        return cached["titles"], cached["content"]

    titles: list[str] = []
    continuation = ""
    while True:
        params = {
            "action": "query", "list": "allpages", "apprefix": f"{prefix}/",
            "apnamespace": "0", "aplimit": "max", "format": "json", "formatversion": "2",
        }
        if continuation:
            params["apcontinue"] = continuation
        result = api_request(params)
        titles.extend(item["title"] for item in result.get("query", {}).get("allpages", []))
        continuation = result.get("continue", {}).get("apcontinue", "")
        if not continuation:
            break

    excluded = ("/目錄", "/目录", "/全覽", "/全览", "/索引", "/版本", "/譯文", "/译文")
    titles = [title for title in titles if not any(token in title for token in excluded)]
    if not titles:
        raise RuntimeError(f"no readable subpages found for {prefix}")

    extracted: dict[str, str] = {}
    for offset in range(0, len(titles), 20):
        batch = titles[offset:offset + 20]
        result = api_request(
            {
                "action": "query", "prop": "extracts", "explaintext": "1", "redirects": "1",
                "titles": "|".join(batch), "format": "json", "formatversion": "2",
            },
            post=True,
        )
        for page in result.get("query", {}).get("pages", []):
            extracted[page.get("title", "")] = clean_plain_text(page.get("extract", ""))

    parts = []
    used_titles = []
    for title in titles:
        content = extracted.get(title, "")
        if len(content) < 80:
            try:
                _, content = fetch_extract(title)
            except Exception:
                continue
        used_titles.append(title)
        parts.append(f"【{title.split('/')[-1]}】\n{content}")
    if not parts:
        raise RuntimeError(f"subpages contain no readable text: {prefix}")
    content = "\n\n".join(parts)
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_file.write_text(json.dumps({"titles": used_titles, "content": content}, ensure_ascii=False), encoding="utf-8")
    return used_titles, content


def main() -> None:
    existing = {}
    if OUTPUT.exists():
        existing = {item["id"]: item for item in json.loads(OUTPUT.read_text(encoding="utf-8")).get("books", [])}
    imported = []
    for book in BOOKS:
        if book["id"] in existing:
            imported.append(existing[book["id"]])
            continue
        parts = []
        resolved_titles = []
        try:
            if book.get("plainUrl"):
                resolved_title, content = fetch_plain_text(book["plainUrl"], book["title"])
                resolved_titles.append(resolved_title)
                parts.append(content)
            elif book.get("wikiPrefix"):
                resolved_titles, content = fetch_subpages(book["wikiPrefix"])
                parts.append(content)
            else:
                requested_titles = book.get("wikiTitles") or [book["wikiTitle"]]
                for requested_title in requested_titles:
                    resolved_title, content = fetch_extract(requested_title)
                    resolved_titles.append(resolved_title)
                    parts.append(content)
        except Exception as error:
            print(f"skip {book['title']}: {error}")
            continue
        content = "\n\n".join(parts)
        if len(content) < int(book.get("minLength", 500)):
            print(f"skip {book['title']}: content too short ({len(content)})")
            continue
        imported.append(
            {
                "id": book["id"],
                "title": book["title"],
                "category": book["category"],
                "author": book["author"],
                "content": content,
                "sourceName": "Project Gutenberg" if book.get("plainUrl") else "维基文库",
                "sourceUrl": book.get("sourceUrl") or ("https://zh.wikisource.org/wiki/" + urllib.parse.quote(resolved_titles[0])),
                "sourcePages": [book["sourceUrl"]] if book.get("plainUrl") else ["https://zh.wikisource.org/wiki/" + urllib.parse.quote(title) for title in resolved_titles],
                "license": "Public domain; see Project Gutenberg source page" if book.get("plainUrl") else "Public domain or CC BY-SA 4.0; see source page",
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
