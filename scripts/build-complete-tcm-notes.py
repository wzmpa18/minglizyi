"""Create a new content-only learning archive without replacing prior releases."""
import argparse
import copy
import hashlib
import json
from pathlib import Path
import zipfile


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def build(source, medical, courses, output, version):
    if output.exists():
        raise FileExistsError("A published or candidate archive must never be overwritten")
    replacements = {
        "data/medical-study-library.json": medical.read_bytes(),
        "data/ni-teacher-courses.json": courses.read_bytes(),
    }
    med, ni = [json.loads(raw) for raw in replacements.values()]
    if med["schema"] != "yandao.medical.study-library.v1" or ni["schema"] != "yandao.ni-course-collection.v1":
        raise ValueError("Content schemas do not match the supported readers")
    with zipfile.ZipFile(source) as old:
        manifest = json.loads(old.read("manifest.json"))
        if manifest["packId"] != "tcm-learning-complete":
            raise ValueError("Wrong source archive")
        for row in manifest["files"]:
            raw = old.read(row["path"])
            if len(raw) != row["bytes"] or digest(raw) != row["sha256"]:
                raise ValueError("Source archive failed full readback")
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
        ]:
            row = next((item for item in manifest["members"] if item["packId"] == pack_id), None)
            if row is None:
                row = {"packId": pack_id}
                manifest["members"].append(row)
            raw = replacements[path]
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
    receipt = {"packId": manifest["packId"], "version": version,
               "bytes": output.stat().st_size, "sha256": digest(output.read_bytes()),
               "files": len(manifest["files"]), "members": len(manifest["members"]),
               "medicalVersion": med["version"], "courses": len(ni["courses"]),
               "chapters": sum(len(course["chapters"]) for course in ni["courses"]),
               "allFilesReadbackVerified": True, "originalArchivePreserved": True}
    output.with_suffix(".receipt.json").write_text(json.dumps(receipt, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(receipt, ensure_ascii=False))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    for name in ["source", "medical", "courses", "output"]:
        parser.add_argument(name, type=Path)
    parser.add_argument("--version", required=True)
    args = parser.parse_args()
    build(args.source, args.medical, args.courses, args.output, args.version)
