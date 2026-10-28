"""Import owner's local course documents without editing the originals.

Legacy Word text is read from MS-DOC's FIB/CLX piece table, not guessed from
strings in the file. RTF documents are recognised by magic rather than suffix.
Only paragraphs and text survive; source originals remain the layout reference.
No generated explanations, fabricated headings or clinical corrections are added.
MS-DOC reference: https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-doc/01d5d8c4-cf9c-4ef9-80fd-439e763cfe01
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import re
import struct

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(r"D:\开发八字命理APP最新整理核心逻辑资料\言道国学资料\中医\倪海厦人纪天纪地纪文档")
EVIDENCE = Path(r"D:\言道国学项目资料总库\05_教材与知识资料\课程课件\倪师专区_用户补充原件整理_20261026")
COURSES = [
    ("ni-acupuncture", "人纪·针灸教程", "倪海厦授课；民间爱好者整理", "人纪课程", "倪海夏-人纪-简体针灸教程.doc", "针灸课程整理稿，按原有授课标题及时间码阅读。", "acupuncture", "LECTURE_TRANSCRIPT"),
    ("ni-materia", "人纪·神农本草经讲解", "倪海厦讲解；民间爱好者整理", "人纪课程", "倪海夏-人纪-简体横版神农本草经.doc", "本草讲解整理稿，按原书药物条目研读。", "materia", "COMMUNITY_COURSE_NOTES"),
    ("ni-shanghan", "人纪·伤寒论", "倪海厦讲解；民间爱好者整理", "人纪课程", "倪海夏-人纪-简体横版伤寒论.doc", "按所提供版本的六经篇目研读；保留原稿字词。", "shanghan", "LECTURE_TRANSCRIPT"),
    ("ni-jingui", "人纪·金匮要略", "倪海厦授课；民间爱好者整理", "人纪课程", "《金匮要略》——倪海厦人纪教程简体整理稿.doc", "金匮课程整理稿，含续伤寒霍乱篇及原有篇目。", "jingui", "LECTURE_TRANSCRIPT"),
    ("ni-neijing", "人纪·黄帝内经解读", "倪海厦解读；整理者未详", "人纪课程", "倪海夏-人纪-黄帝内经.doc", "所提供的内经原文与解读交替编排版本。", "neijing", "COMMUNITY_COURSE_NOTES"),
    ("ni-materia-print", "本草讲解·打印整理本", "倪海厦批注；含历代医家论述及编者整理", "人纪课程", "倪海夏《神农本草经》完整版可直接打印.doc", "独立打印整理版本；与横版讲解稿分别保留。", "materia", "COMMUNITY_COURSE_NOTES"),
    ("ni-diji", "地纪日记·前言及一至七", "倪海厦；本地整理版本", "研习记录", "倪海厦地纪日记0-7.doc", "按原稿前言及七篇日记顺序阅读。", "diji", "STUDY_REFERENCE"),
    ("ni-cases", "汉唐文章与医案集", "倪海厦、跟诊者及转载作者；以各篇署名为准", "研习记录", "倪海厦汉唐中医经典文章医案集.doc", "多作者文章汇编；保留原稿，按阅读分段浏览。", "segments", "STUDY_REFERENCE"),
    ("ni-observation", "传统中医跟诊心得", "跟诊学生及整理者；非全部为倪海厦本人文字", "研习记录", "倪海厦传统中医跟诊过程.doc", "学生跟诊体会，按原有主题阅读。", "observation", "COMMUNITY_COURSE_NOTES"),
    ("supplement-fuyang", "扶阳讲记", "卢崇汉；刘力红序", "补充研习", "扶阳讲记(完整版).doc", "卢崇汉讲记，单列作者，供对照研习。", "segments", "STUDY_REFERENCE"),
    ("supplement-formulas", "经典配方·资料汇编", "编者未详；具体来源以原稿为准", "补充研习", "经典配方.doc", "本地处方资料汇编，按阅读分段保留原稿。", "segments", "STUDY_REFERENCE"),
    ("supplement-questionnaire", "快乐生活的问诊单", "作者及整理者未详", "补充研习", "快乐生活的问诊单.doc", "原有问诊单资料，归入补充研习。", "segments", "STUDY_REFERENCE"),
]


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def u16(data, offset):
    return struct.unpack_from("<H", data, offset)[0]


def u32(data, offset):
    return struct.unpack_from("<I", data, offset)[0]


class CompoundFile:
    """Read-only, bounded CFB streams sufficient for Word 97 documents."""
    def __init__(self, data):
        if data[:8] != bytes.fromhex("d0cf11e0a1b11ae1"):
            raise ValueError("Not a compound document")
        self.data = data
        self.sector_size, self.mini_size = 1 << u16(data, 30), 1 << u16(data, 32)
        if self.sector_size not in (512, 4096) or self.mini_size != 64:
            raise ValueError("Unsupported CFB sector size")
        self.cutoff = u32(data, 56)
        difat = list(struct.unpack_from("<109I", data, 76))
        next_sector, count = u32(data, 68), u32(data, 72)
        for _ in range(count):
            block = self.sector(next_sector)
            numbers = list(struct.unpack("<" + "I" * (self.sector_size // 4), block))
            difat.extend(numbers[:-1])
            next_sector = numbers[-1]
        fat_sectors = [s for s in difat if s < 0xFFFFFFFA][:u32(data, 44)]
        if len(fat_sectors) != u32(data, 44):
            raise ValueError("Incomplete CFB FAT")
        self.fat = []
        for sector in fat_sectors:
            self.fat.extend(struct.unpack("<" + "I" * (self.sector_size // 4), self.sector(sector)))
        directory = self.chain(u32(data, 48))
        self.entries = {}
        root = None
        for offset in range(0, len(directory), 128):
            entry = directory[offset:offset + 128]
            length, kind = u16(entry, 64), entry[66]
            if not kind:
                continue
            if length < 2 or length > 64:
                raise ValueError("Invalid CFB directory name")
            name = entry[:length - 2].decode("utf-16le")
            record = (u32(entry, 116), struct.unpack_from("<Q", entry, 120)[0])
            if kind == 5:
                root = record
            elif kind == 2:
                self.entries[name] = record
        if root is None:
            raise ValueError("Missing CFB root")
        self.mini_stream = self.chain(root[0])[:root[1]]
        mini_fat_data = self.chain(u32(data, 60))[:u32(data, 64) * self.sector_size]
        self.mini_fat = list(struct.unpack("<" + "I" * (len(mini_fat_data) // 4), mini_fat_data))

    def sector(self, sector):
        start = (sector + 1) * self.sector_size
        block = self.data[start:start + self.sector_size]
        if sector >= 0xFFFFFFFA or len(block) != self.sector_size:
            raise ValueError("CFB sector outside file")
        return block

    def chain(self, sector, mini=False):
        chunks, seen = [], set()
        table = self.mini_fat if mini else self.fat
        while sector != 0xFFFFFFFE:
            if sector in seen or sector >= len(table):
                raise ValueError("Invalid/cyclic CFB chain")
            seen.add(sector)
            if mini:
                start = sector * self.mini_size
                block = self.mini_stream[start:start + self.mini_size]
                if len(block) != self.mini_size:
                    raise ValueError("Mini stream outside file")
            else:
                block = self.sector(sector)
            chunks.append(block)
            sector = table[sector]
        return b"".join(chunks)

    def stream(self, name):
        start, size = self.entries[name]
        data = self.chain(start, size < self.cutoff)[:size]
        if len(data) != size:
            raise ValueError("Truncated CFB stream")
        return data


def word_text(data):
    ole = CompoundFile(data)
    word = ole.stream("WordDocument")
    if u16(word, 0) != 0xA5EC or u16(word, 10) & 0x100:
        raise ValueError("Unsupported or encrypted Word document")
    table = ole.stream("1Table" if u16(word, 10) & 0x200 else "0Table")
    position = 32
    position += 2 + u16(word, position) * 2
    longs = position
    position += 2 + u16(word, position) * 4
    pairs = u16(word, position)
    position += 2
    if pairs < 34:
        raise ValueError("Word CLX record missing")
    start, size = struct.unpack_from("<II", word, position + 33 * 8)
    ccp_text = u32(word, longs + 2 + 3 * 4)
    clx = table[start:start + size]
    cursor = 0
    while cursor < len(clx) and clx[cursor] == 1:
        cursor += 3 + u16(clx, cursor + 1)
    if cursor >= len(clx) or clx[cursor] != 2:
        raise ValueError("Word piece table missing")
    length = u32(clx, cursor + 1)
    plc = clx[cursor + 5:cursor + 5 + length]
    if len(plc) != length or length < 4 or (length - 4) % 12:
        raise ValueError("Invalid Word piece table")
    count = (length - 4) // 12
    positions = list(struct.unpack_from("<" + "I" * (count + 1), plc))
    if positions != sorted(positions) or positions[0] != 0 or positions[-1] < ccp_text:
        raise ValueError("Invalid Word text extent")
    pieces, consumed = [], 0
    for index in range(count):
        if positions[index] >= ccp_text:
            break
        size = min(positions[index + 1], ccp_text) - positions[index]
        fc = u32(plc, 4 * (count + 1) + index * 8 + 2)
        compressed = bool(fc & 0x40000000)
        offset = (fc & 0x3FFFFFFF) // (2 if compressed else 1)
        raw = word[offset:offset + size * (1 if compressed else 2)]
        if len(raw) != size * (1 if compressed else 2):
            raise ValueError("Word text piece outside stream")
        pieces.append(raw.decode("cp1252" if compressed else "utf-16le", errors="strict"))
        consumed += size
    if consumed != ccp_text:
        raise ValueError("Incomplete Word text extraction")
    text = "".join(pieces)
    # Field instructions (e.g. page-number code) are not body text; retain results.
    text = re.sub(r"\x13[^\x14\x15]*\x14", "", text).replace("\x15", "")
    return text, {"format": "MS-DOC", "mainTextCharacters": ccp_text, "pieceCount": count}


def rtf_text(data):
    tokens = re.finditer(rb"\\([a-zA-Z]+)(-?\d+)? ?|\\'([0-9a-fA-F]{2})|\\([^a-zA-Z])|([{}])|([^\\{}]+)", data)
    skip_destinations = {b"fonttbl", b"colortbl", b"stylesheet", b"info", b"pict", b"object", b"objdata", b"header", b"footer", b"headerl", b"headerr", b"footerl", b"footerr", b"listtable", b"listoverridetable", b"rsidtbl", b"generator", b"xmlnstbl", b"datastore", b"themedata", b"colorschememapping", b"fldinst"}
    state, stack, output, pending = {"skip": False, "uc": 1, "cp": "cp936"}, [], [], bytearray()
    fallback = 0
    def flush():
        if pending:
            output.append(bytes(pending).decode(state["cp"], errors="strict"))
            pending.clear()
    for token in tokens:
        word, argument, hexadecimal, symbol, brace, raw = token.groups()
        if brace:
            flush()
            if brace == b"{":
                stack.append(state.copy())
            elif stack:
                state = stack.pop()
            else:
                raise ValueError("Unbalanced RTF groups")
        elif word:
            flush()
            number = int(argument) if argument else None
            if word in skip_destinations:
                state["skip"] = True
            elif word == b"ansicpg" and number:
                state["cp"] = "cp" + str(number)
            elif word == b"uc" and number is not None:
                state["uc"] = number
            elif word == b"u" and number is not None:
                if not state["skip"]:
                    output.append(chr(number % 65536))
                fallback = state["uc"]
            elif not state["skip"] and word in {b"par", b"line", b"row", b"cell", b"page", b"sect"}:
                output.append("\n")
            elif not state["skip"] and word == b"tab":
                output.append("\t")
            elif not state["skip"] and word in {b"emdash", b"endash", b"bullet", b"lquote", b"rquote", b"ldblquote", b"rdblquote"}:
                output.append({b"emdash": "—", b"endash": "–", b"bullet": "•", b"lquote": "‘", b"rquote": "’", b"ldblquote": "“", b"rdblquote": "”"}[word])
        elif hexadecimal:
            if fallback:
                fallback -= 1
            elif not state["skip"]:
                pending.append(int(hexadecimal, 16))
        elif symbol:
            if fallback:
                fallback -= 1
            elif symbol == b"*":
                state["skip"] = True
            elif not state["skip"] and symbol in (b"\\", b"{", b"}"):
                pending.extend(symbol)
            elif not state["skip"] and symbol == b"~":
                flush()
                output.append(" ")
        elif raw and not state["skip"]:
            raw = raw.replace(b"\r", b"").replace(b"\n", b"")
            skipped = min(fallback, len(raw))
            fallback -= skipped
            pending.extend(raw[skipped:])
    flush()
    if stack:
        raise ValueError("Unbalanced RTF document")
    # Join UTF-16 surrogate pairs emitted by successive RTF unicode controls.
    text = "".join(output).encode("utf-16le", errors="surrogatepass").decode("utf-16le")
    return text, {"format": "RTF", "decodedTextCharacters": len(text)}


def extract(path):
    data = path.read_bytes()
    if data[:8] == bytes.fromhex("d0cf11e0a1b11ae1"):
        text, info = word_text(data)
    elif data.startswith(b"{\\rtf"):
        text, info = rtf_text(data)
    else:
        text, info = data.decode("gb18030"), {"format": "text", "encoding": "GB18030"}
    text = text.replace("\r\n", "\n").replace("\r", "\n").replace("\x07", "\n").replace("\x0b", "\n").replace("\x0c", "\n")
    text = re.sub(r"[\x00-\x06\x08-\x09\x0e-\x1f]", "", text)
    text = "\n".join(line.strip() for line in text.splitlines())
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    # All byte decoding above is strict. A literal U+FFFD already in the source
    # document must be preserved and flagged, not silently repaired or discarded.
    quality = {"literalReplacementCharacters": text.count("\ufffd"), "decoding": "strict", "medicalProofreading": False}
    return text, {"filename": path.name, "sourceBytes": len(data), "sourceSha256": sha(data), "textCharacters": len(text), "textSha256": sha(text.encode()), "quality": quality, **info}


def heading(line, mode):
    if not line or len(line) > 100 or re.search(r"[·.。]{3,}", line):
        return False
    chinese = "一二三四五六七八九十百千万〇零壹贰叁肆伍陆柒捌玖拾佰"
    if mode == "acupuncture":
        # The timestamp's leading number is the original lecture recording.
        # Keep every timestamped heading from that recording inside one lesson.
        return bool(re.search(r"[（(]\d+-\d\d:\d\d:\d\d[）)]$", line))
    if mode == "materia":
        return bool((re.match("^[" + chinese + "]+[、．][^，。；：]{1,25}$", line) and "──" not in line) or re.match("^第[" + chinese + "]+章", line) or re.match("^[壹贰叁]、[上中下]经$", line))
    if mode == "shanghan":
        return bool(re.match(r"^辨.{1,20}(?:脉证|脉症).{0,12}$", line) and len(line) < 40)
    if mode == "jingui":
        return line == "续伤寒霍乱篇" or bool(re.match("^[?？]?[\\u4e00-\\u9fff]{3,35}第[" + chinese + "]+$", line))
    if mode == "neijing":
        return bool(re.match("^.{2,25}篇第[" + chinese + "]+$", line))
    if mode == "diji":
        return bool(re.match(r"^倪海厦地纪日记\s*(?:前言|[0-7])", line))
    if mode == "observation":
        return bool(re.match("^[" + chinese + "]、[^。]{1,35}$", line))
    return False


def make_chapters(text, course_id, mode):
    lines = text.splitlines(keepends=True)
    boundaries = [(i, line.strip()) for i, line in enumerate(lines) if heading(line.strip(), mode)]
    if mode == "acupuncture":
        # Multiple chapter/topic headings can belong to one long recording.
        # Make one reader lesson per source recording, not one lesson per
        # subheading and not arbitrary 14k-character fragments.
        lectures = []
        for position, title in boundaries:
            match = re.search(r"[（(](\d+)-\d\d:\d\d:\d\d[）)]$", title)
            if not match:
                continue
            number = int(match.group(1))
            if not lectures or lectures[-1][2] != number:
                clean_title = re.sub(r"\s*[（(]\d+-\d\d:\d\d:\d\d[）)]$", "", title).strip()
                lectures.append([position, f"第{number}讲 · {clean_title}", number])
        boundaries = [(position, title) for position, title, _ in lectures]
    if mode == "jingui":
        starts = [i for i, line in enumerate(lines) if line.strip() == "续伤寒霍乱篇"]
        if len(starts) > 1:
            boundaries = [(i, title) for i, title in boundaries if i >= starts[1]]
    if not boundaries or boundaries[0][0] > 0:
        boundaries.insert(0, (0, "原稿前言与目录" if mode != "segments" else "原稿阅读"))
    result = []
    for b, (start, title) in enumerate(boundaries):
        end = boundaries[b + 1][0] if b + 1 < len(boundaries) else len(lines)
        content = "".join(lines[start:end])
        if not content.strip():
            continue
        # A few reference compilations have no structural headings at all.
        # Preserve their old paragraph-based reader pages, while real course
        # lessons keep their original lecture boundaries intact.
        if mode == "segments" and len(content) > 90000:
            first = start
            part = 1
            while first < end:
                last, size = first, 0
                while last < end and (size < 14000 or last == first):
                    size += len(lines[last]); last += 1
                chunk = "".join(lines[first:last])
                result.append({"id": f"{course_id}-{len(result) + 1:04d}", "title": title + f" · 阅读分段 {part}",
                               "content": chunk, "lineStart": first + 1, "lineEnd": last,
                               "sha256": sha(chunk.encode("utf-8"))})
                first, part = last, part + 1
        else:
            result.append({"id": f"{course_id}-{len(result) + 1:04d}", "title": title,
                           "content": content, "lineStart": start + 1, "lineEnd": end,
                           "sha256": sha(content.encode("utf-8"))})
    if "".join(chapter["content"] for chapter in result) != text:
        raise ValueError("Chapter splitting omitted or reordered source text")
    return result


def canonical(value):
    # Match JSON.stringify in the browser for stable imported-course integrity.
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def build_courses(records, evidence, publish=False, version="1.0.0"):
    by_name = {r["filename"]: r for r in records}
    catalogue, courses = [], []
    package_dir = evidence / "本机导入课程"
    package_dir.mkdir(exist_ok=True)
    for course_id, title, author, group, filename, description, mode, kind in COURSES:
        record = by_name[filename]
        text = (evidence / record["extractedFile"]).read_text(encoding="utf-8").removesuffix("\n")
        chapters = make_chapters(text, course_id, mode)
        restriction = bool(re.search(r"不得.{0,12}商业|商业行为|内部学习|内部交流", text[:8000]))
        license_note = "原稿标有非商业或内部学习限制；此整理仅供文件持有者本机导入，未获公开商业发行许可。" if restriction else "用户提供的本地文件；尚未取得公开商业再分发证明，此包仅供本机导入。"
        if publish:
            license_note = ("原稿的旧限制说明保留；" if restriction else "用户提供的本地文件；") + "项目负责人于2026年10月26日确认已获授权，并说明原限制为本人旧备注，本轮明确授权整理使用。"
        quality_note = "文字整理版，保留原稿字词；未逐字影印校勘或完成医学审校。原文件图版与排版保留在原件，未以文字提取冒充图版完整复制。"
        if record["quality"]["literalReplacementCharacters"]:
            quality_note += "原文件含2处替换字符及其他待核文字，未擅自补写。"
        if course_id == "ni-shanghan":
            quality_note += "所提供稿件存在断句及缺字现象，应与原典对照。"
        if course_id == "ni-cases":
            quality_note += "多作者历史观点及个案记录不等于现代医学结论。"
        source = {"filename": filename, "sha256": record["sourceSha256"], "kind": kind,
                  "licenseNote": license_note, "qualityNote": quality_note}
        course = {"schema": "yandao.ni-course.v1", "version": version, "id": course_id,
                  "title": title, "author": author, "group": group, "description": description,
                  "source": source, "chapters": chapters, "contentSha256": sha(canonical(chapters).encode())}
        course_bytes = (canonical(course) + "\n").encode()
        (package_dir / (course_id + ".json")).write_bytes(course_bytes)
        catalogue.append({"id": course_id, "title": title, "author": author, "group": group,
                          "description": description, "chapterCount": len(chapters),
                          "characters": len(text.encode('utf-16le')) // 2, "sourceFilename": filename,
                          "sourceSha256": source["sha256"], "version": version,
                          "recordSha256": sha(canonical(course).encode()),
                          "contentSha256": course["contentSha256"], "distribution": "OWNER_CONFIRMED_EVIDENCE_PENDING" if publish else "LOCAL_IMPORT_ONLY"})
        courses.append(course)
    bundle = {"schema": "yandao.ni-course-collection.v1", "version": version, "catalogue": catalogue, "courses": courses}
    (package_dir / "倪师与补充研习_本机导入.json").write_bytes((canonical(bundle) + "\n").encode())
    target = ROOT / "src/data/niTeacherCourseCatalogue.json"
    target.write_bytes((json.dumps(catalogue, ensure_ascii=False, indent=2) + "\n").encode())
    release = {"version": version, "collectionSha256": sha(canonical(bundle).encode())}
    (ROOT / "src/data/niTeacherCourseRelease.json").write_bytes((json.dumps(release, ensure_ascii=False, indent=2) + "\n").encode())
    if publish:
        (evidence / "ni-teacher-courses.json").write_bytes((canonical(bundle) + "\n").encode())
    return catalogue


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--extract", action="store_true")
    parser.add_argument("--build", action="store_true", help="Create private local import JSON and metadata-only app catalogue")
    parser.add_argument("--publish-owner-authorized", action="store_true", help="Owner confirmed rights on 2026-10-26; keep evidence-pending status, never fabricate a licence")
    parser.add_argument("--version", default="1.0.0", help="Content-only version; increment for any published data change")
    parser.add_argument("--source", type=Path, default=SOURCE)
    parser.add_argument("--evidence", type=Path, default=EVIDENCE)
    args = parser.parse_args()
    if not args.extract:
        parser.error("Use --extract to explicitly create derivative local text copies")
    args.evidence.mkdir(parents=True, exist_ok=True)
    records = []
    for path in sorted(args.source.iterdir()):
        if path.suffix.lower() not in {".txt", ".doc"}:
            continue
        text, info = extract(path)
        target = args.evidence / (path.name + ".extracted.txt")
        target.write_bytes((text + "\n").encode("utf-8"))
        info["extractedFile"] = target.name
        info["originalPath"] = str(path)
        records.append(info)
        print(json.dumps(info, ensure_ascii=False))
    (args.evidence / "extraction-manifest.json").write_bytes((json.dumps({"schema": "yandao.owner-course-extraction.v1", "files": records}, ensure_ascii=False, indent=2) + "\n").encode())
    if args.build:
        if not re.fullmatch(r"(?:0|[1-9]\d{0,5})\.(?:0|[1-9]\d{0,5})\.(?:0|[1-9]\d{0,5})", args.version):
            raise ValueError("Invalid content version")
        catalogue = build_courses(records, args.evidence, args.publish_owner_authorized, args.version)
        print(json.dumps({"courses": [{"id": c["id"], "chapters": c["chapterCount"], "characters": c["characters"]} for c in catalogue]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
