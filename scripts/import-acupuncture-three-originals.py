"""Append three pinned CC0 text editions to an explicitly verified local pack.

Creates a new candidate only. It never changes published archives, source
originals, clinical values, application code or the active offline catalogue.
Illustration references are recorded, not copied under the text licence.
"""
import argparse
import copy
import hashlib
import html
import json
from pathlib import Path
import re
import sys
import urllib.parse
import urllib.request
import zipfile

sys.dont_write_bytecode = True
from import_tcm_clinical_editions import BookParser

SOURCE_ROOT = Path(r"D:\言道国学项目资料总库\05_教材与知识资料\中医学习\新增针灸三典_CC0固定源_20261026")
COPYRIGHT_URL = "https://jicheng.tw/tcm/copyright.html"
COPYRIGHT_SHA = "bac3ece0c27e5371c78b0a0bbfd7e3bd74b3394d361a5068730e86a6bf05d2a0"
SOURCES = [
    {"id": "wang-zisheng-original", "title": "針灸資生經", "name": "针灸资生经·录文版（不含原图）", "author": "王执中", "dynasty": "南宋", "pinyin": "Zhen Jiu Zi Sheng Jing", "revision": "0f1836bbc3bd37250b0c2c838b299bb228d841ef", "rawSha256": "85e7edbd1d5cfcba80defb9ae9161762a6be10c03d88327f7383c47db5e345c9", "chapters": 8, "characters": 142942, "images": 36, "extent": "序及第一至第七卷", "tail": "（見寒熱。千翼）"},
    {"id": "hua-shisijing-original", "title": "十四經發揮", "name": "十四经发挥·录文版（不含原图）", "author": "滑寿", "dynasty": "元", "pinyin": "Shi Si Jing Fa Hui", "revision": "be09a796c9102aeca0f855a3bcdb5c7966fcff55", "rawSha256": "28667ac64f895c193e9eb8de6ecafeeecbc1ab06bd3796b16aceceed67d1f232", "chapters": 8, "characters": 25589, "images": 14, "extent": "序、自序、凡例、新刊序及卷上、卷中、卷下", "tail": "參合為篇。"},
    {"id": "li-qijing-bamai-original", "title": "奇經八脈考", "name": "奇经八脉考·录文版（不含原图）", "author": "李时珍", "dynasty": "明", "pinyin": "Qi Jing Ba Mai Kao", "revision": "2c35982f388b6493b7b05001a75754d5428dd992", "rawSha256": "0cc56128121a861ed4c05d34d9968db26c621311f652fdec096f42737c4ed73c", "chapters": 18, "characters": 15166, "images": 1, "extent": "奇经八脉总说至释音，共十八篇", "tail": "洒洒　音洗，同義。"},
]


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def fetch_source(source, folder):
    name = "pages/book/" + source["title"] + "/index.html"
    url = "https://gitlab.com/api/v4/projects/jicheng%2Fjc.data/repository/files/" + urllib.parse.quote(name, safe="") + "/raw?ref=" + source["revision"]
    request = urllib.request.Request(url, headers={"User-Agent": "YandaoGuoxue pinned source-edition audit"})
    with urllib.request.urlopen(request, timeout=45) as response:
        raw = response.read(2000000)
    if digest(raw) != source["rawSha256"]:
        raise ValueError("Pinned source changed: " + source["title"])
    target = folder / (source["title"] + ".html")
    if target.exists() and target.read_bytes() != raw:
        raise ValueError("Existing source original differs; never overwrite it")
    if not target.exists():
        target.write_bytes(raw)


def import_book(source, raw):
    if digest(raw) != source["rawSha256"]:
        raise ValueError("Local source SHA mismatch: " + source["title"])
    markup = raw.decode("utf-8")
    parser = BookParser("h1")
    parser.feed(markup)
    parser.finish()
    chapters = [{"id": source["id"] + "-" + str(i), **section} for i, section in enumerate(parser.sections, 1)]
    content = "\n".join(chapter["content"] for chapter in chapters)
    if len(chapters) != source["chapters"] or len(content) != source["characters"] or not content.endswith(source["tail"]) or parser.images != source["images"]:
        raise ValueError("Source extent, directory or image reference changed")
    # Independent reconstruction includes every chapter/subheading/caption, in
    # order. Only whitespace and brackets added around double-line notes differ.
    stripped = re.sub(r"<header\b[^>]*>.*?</header>", "", markup, flags=re.S)
    stripped = re.sub(r"<!--.*?-->", "", stripped, flags=re.S)
    stripped = html.unescape(re.sub(r"<[^>]+>", "", stripped))
    compact = lambda text: re.sub(r"[\s〔〕]", "", text)
    if compact(stripped) != compact("".join(chapter["title"] + chapter["content"] for chapter in chapters)):
        raise ValueError("Source text omitted or reordered")
    public = "https://jicheng.tw/tcm/book/" + urllib.parse.quote(source["title"]) + "/index.html"
    revision_url = "https://gitlab.com/jicheng/jc.data/-/blob/" + source["revision"] + "/pages/book/" + urllib.parse.quote(source["title"]) + "/index.html"
    images = re.findall(r'<img\b[^>]*\bsrc=["\x27]([^"\x27]+)', markup)
    return {"id": source["id"], "name": source["name"], "pinyin": source["pinyin"], "author": source["author"], "dynasty": source["dynasty"],
        "description": "收录所据固定版本的" + source["extent"] + "全部文字、原有小标题及文字图注；图片未收录，不冒称完整图版。",
        "sourceName": "中医笈成（固定Git文本版本）", "sourceUrl": public, "sourceRevisionUrl": revision_url,
        "sourcePages": [{"url": public, "revisionUrl": revision_url}], "sourceRawSha256": source["rawSha256"], "sourceRevision": source["revision"],
        "sourceQualityLabel": "本页未提供品质数值", "contentSha256": digest(content.encode("utf-8")),
        "license": "古代原作文本；中医笈成对公有领域文字的编排、标点及附注以CC0释出。版权页：" + COPYRIGHT_URL + "。本候选不复制原页图片，不将文字CC0套用于图片或第三方素材。",
        "verification": "已固定原HTML SHA、完整目录、逐卷文字长度及末尾，并独立逐字符核对顺序，保留繁体底本文字。仅清除HTML及将双行夹注加〔〕；未逐字核对影印本或完成医学专业审校。古籍药物、定位、针法及剂量仅为原文记载。",
        "textNormalization": {"body": "繁体原文字词保留；未转换或校改药名、穴名、数值和否定词", "simplifiedSearch": "仅书名及检索别名；未声称已完成正文繁简异体字索引", "addedNoteBrackets": "〔〕"},
        "searchAliases": [source["title"], source["name"].split("·")[0]],
        "excludedSourceIllustrations": {"count": parser.images, "references": images, "reason": "原图许可及可用源另核，当前仅录文候选"},
        "rightsEvidence": {"url": COPYRIGHT_URL, "snapshotSha256": COPYRIGHT_SHA, "checkedOn": "2026-10-26", "scope": "TEXT_ONLY_CC0"}, "chapters": chapters}


def main():
    command = argparse.ArgumentParser()
    command.add_argument("--sources-dir", type=Path, default=SOURCE_ROOT)
    command.add_argument("--fetch", action="store_true")
    command.add_argument("--base-archive", type=Path, required=True)
    command.add_argument("--expected-base-sha256", required=True)
    command.add_argument("--output", type=Path, required=True)
    command.add_argument("--version", default="1.4.0")
    args = command.parse_args()
    if args.output.exists() or args.output.with_suffix(".receipt.json").exists():
        raise FileExistsError("Candidate or receipt already exists; published and prior files stay unchanged")
    if not re.fullmatch(r"[a-f0-9]{64}", args.expected_base_sha256) or not re.fullmatch(r"\d+\.\d+\.\d+", args.version):
        raise ValueError("Explicit source digest and data version required")
    args.sources_dir.mkdir(parents=True, exist_ok=True)
    if args.fetch:
        for source in SOURCES:
            fetch_source(source, args.sources_dir)
    rights = args.sources_dir / "copyright-site-snapshot.html"
    if digest(rights.read_bytes()) != COPYRIGHT_SHA:
        raise ValueError("The preserved official CC0 rights snapshot is missing or changed")
    books = [import_book(source, (args.sources_dir / (source["title"] + ".html")).read_bytes()) for source in SOURCES]
    hash_stream = hashlib.sha256()
    with args.base_archive.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1048576), b""):
            hash_stream.update(chunk)
    if hash_stream.hexdigest() != args.expected_base_sha256:
        raise ValueError("Approved base archive SHA differs")
    with zipfile.ZipFile(args.base_archive) as archive:
        manifest = json.loads(archive.read("manifest.json"))
        row = next(item for item in manifest["members"] if item["packId"] == "tcm-original-editions-approved")
        raw = archive.read(row["entryPath"])
        if len(raw) != row["bytes"] or digest(raw) != row["sha256"]:
            raise ValueError("Approved base book member failed integrity check")
    base = json.loads(raw)
    if base["schema"] != "yandao.tcm.original-editions.v1" or any(book["id"] in {item["id"] for item in base["books"]} for book in books):
        raise ValueError("Wrong base or duplicate book identity")
    result = copy.deepcopy(base)
    result["version"] = args.version
    result["books"].extend(books)
    if len(result["books"]) > 50 or result["books"][:len(base["books"])] != base["books"]:
        raise ValueError("Existing books changed or reader capacity exceeded")
    output = (json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(output)
    receipt = {"candidateOnly": True, "published": False, "path": str(args.output), "bytes": len(output), "sha256": digest(output), "dataVersion": args.version,
        "baseArchiveSha256": args.expected_base_sha256, "previousBooksUnchanged": len(base["books"]), "candidateBooks": len(result["books"]),
        "addedBooks": [{"id": book["id"], "name": book["name"], "chapters": len(book["chapters"]), "contentSha256": book["contentSha256"], "sourceRawSha256": book["sourceRawSha256"], "sourceRevision": book["sourceRevision"], "imageReferencesNotCopied": book["excludedSourceIllustrations"]["count"]} for book in books],
        "fullNonWhitespaceTextSequenceVerified": True, "rightsSnapshotSha256": COPYRIGHT_SHA, "sourceOriginalsChanged": False}
    args.output.with_suffix(".receipt.json").write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(receipt, ensure_ascii=False))


if __name__ == "__main__":
    main()
