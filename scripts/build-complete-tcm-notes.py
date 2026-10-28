"""Create a new content-only learning archive without replacing prior releases."""
import argparse
import copy
import hashlib
import json
from pathlib import Path
import re
import zipfile


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def build(source, medical, courses, output, version, editions=None):
    if output.exists() or output.with_suffix(".receipt.json").exists():
        raise FileExistsError("A published or candidate archive must never be overwritten")
    replacements = {}
    for filename, path in [(medical, "data/medical-study-library.json"), (courses, "data/ni-teacher-courses.json"), (editions, "data/tcm-original-editions-approved.json")]:
        if filename is not None:
            replacements[path] = filename.read_bytes()
    if not replacements or not re.fullmatch(r"\d+\.\d+\.\d+", version):
        raise ValueError("Explicit content replacement and data version required")
    with zipfile.ZipFile(source) as old:
        manifest = json.loads(old.read("manifest.json"))
        if manifest["packId"] != "tcm-learning-complete":
            raise ValueError("Wrong source archive")
        if tuple(map(int, version.split('.'))) <= tuple(map(int, manifest["version"].split('.'))):
            raise ValueError("A replacement requires a newer immutable content version")
        if len(old.namelist()) != len(set(old.namelist())):
            raise ValueError("Duplicate source archive paths")
        declared = [row["path"] for row in manifest["files"]]
        if len(declared) != len(set(declared)) or set(old.namelist()) != {"manifest.json", *declared}:
            raise ValueError("Source archive contains undeclared or repeated files")
        for row in manifest["files"]:
            raw = old.read(row["path"])
            if len(raw) != row["bytes"] or digest(raw) != row["sha256"]:
                raise ValueError("Source archive failed full readback")
        med = json.loads(replacements.get("data/medical-study-library.json", old.read("data/medical-study-library.json")))
        ni = json.loads(replacements.get("data/ni-teacher-courses.json", old.read("data/ni-teacher-courses.json")))
        if med["schema"] != "yandao.medical.study-library.v1" or ni["schema"] != "yandao.ni-course-collection.v1":
            raise ValueError("Content schemas do not match the supported readers")
        previous_editions = json.loads(old.read("data/tcm-original-editions-approved.json")) if "data/tcm-original-editions-approved.json" in old.namelist() else None
        updated_editions = json.loads(replacements["data/tcm-original-editions-approved.json"]) if editions is not None else previous_editions
        if editions is not None:
            if updated_editions.get("schema") != "yandao.tcm.original-editions.v1" or not isinstance(updated_editions.get("books"), list) or not 1 <= len(updated_editions["books"]) <= 50:
                raise ValueError("Original edition schema does not match the current reader")
            updated_by_id = {book["id"]: book for book in updated_editions["books"]}
            if len(updated_by_id) != len(updated_editions["books"]) or any(updated_by_id.get(book["id"]) != book for book in (previous_editions or {}).get("books", [])):
                raise ValueError("Existing original book objects must stay unchanged")
        manifest["version"] = version
        manifest["name"] = "完整中医资料与课程学习笔记"
        for path, raw in replacements.items():
            row = next((item for item in manifest["files"] if item["path"] == path), None)
            if row is None:
                row = {"path": path}
                manifest["files"].append(row)
            row.update(bytes=len(raw), sha256=digest(raw), mime="application/json")
        for pack_id, path, data_version in [
            ("medical-study-library", "data/medical-study-library.json", med["version"]),
            ("ni-teacher-courses", "data/ni-teacher-courses.json", ni["version"]),
            ("tcm-original-editions-approved", "data/tcm-original-editions-approved.json", updated_editions["version"] if updated_editions else ""),
        ]:
            if path not in replacements:
                continue
            row = next((item for item in manifest["members"] if item["packId"] == pack_id), None)
            if row is None:
                row = {"packId": pack_id}
                manifest["members"].append(row)
            raw = replacements[path]
            if not re.fullmatch(r"\d+\.\d+\.\d+", data_version):
                raise ValueError("Invalid member data version")
            if "version" in row and (tuple(map(int, data_version.split('.'))) < tuple(map(int, row["version"].split('.'))) or (data_version == row["version"] and digest(raw) != row.get("sha256"))):
                raise ValueError("An existing member cannot downgrade or change bytes at the same version")
            row.update(version=data_version, entryPath=path, bytes=len(raw), sha256=digest(raw))
        output.parent.mkdir(parents=True, exist_ok=True)
        original = old.infolist()
        ends = {entry.filename: original[index + 1].header_offset if index + 1 < len(original) else old.start_dir for index, entry in enumerate(original)}
        with zipfile.ZipFile(output, "x", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as new:
            for row in manifest["files"]:
                if row["path"] in replacements:
                    new.writestr(row["path"], replacements[row["path"]])
                else:
                    # Keep already verified compressed blocks exactly. This
                    # avoids retransmitting unchanged scans and book texts.
                    entry = copy.copy(old.getinfo(row["path"]))
                    old.fp.seek(entry.header_offset)
                    raw = old.fp.read(ends[entry.filename] - entry.header_offset)
                    entry.header_offset = new.fp.tell()
                    new._writecheck(entry)
                    new._didModify = True
                    new.fp.write(raw)
                    new.start_dir = new.fp.tell()
                    new.filelist.append(entry)
                    new.NameToInfo[entry.filename] = entry
            new.writestr("manifest.json", json.dumps(manifest, ensure_ascii=False, separators=(",", ":")))
    with zipfile.ZipFile(output) as result:
        if set(result.namelist()) != {"manifest.json", *(row["path"] for row in manifest["files"])}:
            raise ValueError("Undeclared files in candidate")
        for row in manifest["files"]:
            raw = result.read(row["path"])
            if len(raw) != row["bytes"] or digest(raw) != row["sha256"]:
                raise ValueError("Candidate readback failed")
        unchanged = [row["path"] for row in manifest["files"] if row["path"] not in replacements]
        with zipfile.ZipFile(source) as previous:
            if any(result.read(path) != previous.read(path) for path in unchanged):
                raise ValueError("An unrelated source entry changed")
    receipt = {"packId": manifest["packId"], "version": version,
               "bytes": output.stat().st_size, "sha256": digest(output.read_bytes()),
               "files": len(manifest["files"]), "members": len(manifest["members"]),
               "medicalVersion": med["version"], "courses": len(ni["courses"]),
               "courseVersion": ni["version"], "editionVersion": updated_editions["version"] if updated_editions else None,
               "editionBooks": len(updated_editions["books"]) if updated_editions else None,
               "replacedEntries": sorted(replacements), "unchangedEntriesShaVerified": len(unchanged),
               "chapters": sum(len(course["chapters"]) for course in ni["courses"]),
               "allFilesReadbackVerified": True, "originalArchivePreserved": True}
    output.with_suffix(".receipt.json").write_text(json.dumps(receipt, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(receipt, ensure_ascii=False))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("inputs", type=Path, nargs="+", help="Legacy: medical courses output; editions-only: output --editions file")
    parser.add_argument("--editions", type=Path, help="Replace only the original-editions member, preserving all prior book objects")
    parser.add_argument("--courses-only", action="store_true", help="Replace only the course member, preserving all other verified archive entries")
    parser.add_argument("--version", required=True)
    args = parser.parse_args()
    if len(args.inputs) == 3:
        medical, courses, output = args.inputs
    elif len(args.inputs) == 2 and args.courses_only:
        medical, courses, output = None, args.inputs[0], args.inputs[1]
    elif len(args.inputs) == 1 and args.editions is not None:
        medical = courses = None
        output = args.inputs[0]
    else:
        parser.error("Use source medical courses output, or source output --editions candidate")
    build(args.source, medical, courses, output, args.version, args.editions)
