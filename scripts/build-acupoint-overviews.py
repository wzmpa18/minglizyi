"""Extract exact named acupoint sections and repair ambiguous subject links.

Reads an existing verified complete learning ZIP; never changes that archive.
Windows LCMapStringW only converts display script, not wording or medical units.
Outputs a compact bundled evidence index and a NEW medical-library candidate.
"""
import argparse
import ctypes
import hashlib
import json
from pathlib import Path
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def sha(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def simplified(text):
    out = ctypes.create_unicode_buffer(len(text) * 2 + 2)
    if not ctypes.windll.kernel32.LCMapStringW(0x0804, 0x02000000, text, len(text), out, len(out)):
        raise ValueError("Chinese display-script conversion failed")
    return out.value


def norm(text):
    return text.replace("谿", "溪").replace("後", "后").replace("崑", "昆").replace("顖", "囟")


def direct(point, passage, source):
    """Conservative match: a disease substring is never an acupoint identity."""
    name = point["name"]
    text = norm(simplified(passage["text"]))
    if passage.get("mappingNote", "").startswith("DIRECT_ACUPOINT_SECTION:"):
        return passage["mappingNote"].split(":", 1)[1] == point["code"]
    if name + "穴" in text:
        return True
    acupuncture = bool(re.search("[针針鍼]灸|经穴|經穴|腧穴", source["title"]))
    if not acupuncture:
        return False
    return bool(re.search(re.escape(norm(name)) + r"(?=[\s，。、；：『（〔]|$)", text))


def build(archive, output, evidence):
    if output.exists():
        raise FileExistsError("Never replace an existing candidate: " + str(output))
    with zipfile.ZipFile(archive) as bundle:
        medical = json.loads(bundle.read("data/medical-study-library.json"))
        books = json.loads(bundle.read("data/tcm-original-editions-approved.json"))["books"]
    book = next(value for value in books if value["id"] == "yang-zhenjiu-dacheng-original")
    baseline = json.loads((ROOT / "src/algorithm-core/modules/tcm/data/meridians.json").read_text(encoding="utf-8"))["acupoints"]
    records = []
    for chapter in book["chapters"][5:7]:
        for match in re.finditer(r"^◎([^：\n]{1,80})：\n\n(.*?)(?=\n\n◎|\Z)", chapter["content"], re.M | re.S):
            title, body = simplified(match[1]), simplified(match[2])
            # Only the first paragraphs under this heading are eligible. This
            # prevents a final point absorbing the next meridian essay.
            paragraphs = body.split("\n\n")
            location = re.split(r"《|(?:针|灸|禁针|禁灸)", paragraphs[0], maxsplit=1)[0].strip()
            indication = next((p for p in paragraphs[1:5] if p.startswith("主")), "")
            records.append({"title": title, "originalName": re.split(r"[（(]", match[1])[0], "base": norm(re.split(r"[（(]", title)[0]),
                            "location": location, "indications": indication,
                            "chapter": chapter["id"], "chapterTitle": chapter["title"],
                            "lineStart": chapter["content"][:match.start()].count("\n") + 1,
                            "text": simplified(match[0]).split("\n\n", 3)[:3]})
    aliases = {"LI10": "三里", "LI13": "五里", "LI19": "禾髎", "ST36": "三里", "ST37": "上廉", "ST39": "下廉", "BL43": "膏肓俞", "BL59": "附阳", "BL66": "通谷", "KI20": "通谷", "TE22": "和髎", "GB3": "客主人", "GB11": "窍阴", "GB15": "临泣", "GB22": "渊液", "GB33": "阳关", "GB41": "临泣", "GB44": "窍阴", "LR10": "五里", "GV3": "阳关"}
    second = {"ST36", "ST37", "ST39", "KI20", "GB41", "GB44", "LR10", "GV3"}
    index = {"schema": "yandao.tcm.acupoint-overview-evidence.v1", "version": "2026.10.26", "source": {
        "title": "针灸大成", "author": book["author"], "sourceUrl": book["sourceRevisionUrl"],
        "sourceSha256": book["sourceRawSha256"], "edition": "中医笈成固定版本，卷六、卷七经穴条目",
        "notice": "经典原文定位，与现行标准及不同传本可能有差异。"}, "points": {}}
    removed, added = 0, 0
    missing = []
    for point in baseline:
        code = point["code"].replace("DU", "GV").replace("RN", "CV")
        candidates = [record for record in records if record["base"] == norm(aliases.get(code, point["name"]))]
        chosen = candidates[1 if code in second else 0] if candidates else None
        subject = medical["subjects"].get("point:" + point["code"])
        if subject:
            before = subject["references"]
            subject["references"] = [key for key in before if direct(point, medical["passages"][key], medical["sources"][medical["passages"][key]["source"]])]
            removed += len(before) - len(subject["references"])
        if not chosen:
            missing.append({"code": code, "name": point["name"]})
            continue
        location, indications = chosen["location"], chosen["indications"]
        # A section without a location is not silently promoted to a location.
        row = {"name": point["name"], "originalName": chosen["originalName"], "heading": chosen["title"], "location": location,
               "indications": indications, "chapter": chosen["chapter"],
               "chapterTitle": chosen["chapterTitle"], "lineStart": chosen["lineStart"],
               "locationSha256": sha(location), "indicationsSha256": sha(indications)}
        index["points"][code] = row
        if subject:
            text = "\n\n".join(chosen["text"]).strip()
            if not text or len(text) > 2500:
                raise ValueError("Exact section excerpt outside protocol limit: " + code)
            key = sha(code + "\n" + text)[:24]
            medical["passages"][key] = {"source": book["id"], "chapter": chosen["chapter"],
                "chapterTitle": chosen["chapterTitle"] + " · " + point["name"] + "（" + code + "）",
                "text": text, "lineStart": chosen["lineStart"], "lineEnd": chosen["lineStart"] + text.count("\n"),
                "sha256": sha(text), "mappingNote": "DIRECT_ACUPOINT_SECTION:" + point["code"], "topic": "indication_context"}
            subject["references"].insert(0, key)
            added += 1
    # No herb, Dong, original passage text, image or source is removed. Rejected
    # links are kept in the original immutable previous package for recovery.
    medical["version"] = "1.1.0"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(medical, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (ROOT / "src/data/acupointOverviewEvidence.json").write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    receipt = {"archive": str(archive), "output": str(output), "sourceBookSha256": book["sourceRawSha256"],
               "exactNamedPointSections": len(index["points"]), "pointsWithoutExactSection": missing,
               "removedAmbiguousPointLinks": removed, "addedExactPointLinks": added,
               "preservedSubjects": len(medical["subjects"]), "candidateSha256": hashlib.sha256(output.read_bytes()).hexdigest()}
    evidence.write_text(json.dumps(receipt, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(receipt, ensure_ascii=False))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("archive", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("evidence", type=Path)
    args = parser.parse_args()
    build(args.archive, args.output, args.evidence)
