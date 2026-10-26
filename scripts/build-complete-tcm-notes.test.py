"""Exercise real ZIP rebuilding entirely in memory; no cleanup or user files."""
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import sys
from types import SimpleNamespace
import unittest
import zipfile

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("bundle_builder", Path(__file__).with_name("build-complete-tcm-notes.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class MemoryPath(io.BytesIO):
    def __init__(self, data=b"", exists=False):
        super().__init__(data)
        self.present = exists
        self.receipt = None
        self.parent = SimpleNamespace(mkdir=lambda **kwargs: None)

    def exists(self):
        return self.present

    def write(self, data):
        self.present = True
        return super().write(data)

    def read_bytes(self):
        return self.getvalue()

    def write_text(self, value, **kwargs):
        self.seek(0)
        self.truncate()
        self.write(value.encode("utf-8"))

    def stat(self):
        return SimpleNamespace(st_size=len(self.getvalue()))

    def with_suffix(self, suffix):
        if self.receipt is None:
            self.receipt = MemoryPath()
        return self.receipt


def serialized(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode()


def fixture(extra=False):
    books = {"schema": "yandao.tcm.original-editions.v1", "version": "1.3.0", "books": [{"id": "old-book", "name": "保留原典", "chapters": [{"id": "old-chapter", "content": "不改原文。"}]}]}
    files = {
        "data/medical-study-library.json": serialized({"schema": "yandao.medical.study-library.v1", "version": "1.2.0"}),
        "data/ni-teacher-courses.json": serialized({"schema": "yandao.ni-course-collection.v1", "version": "1.0.1", "courses": [{"chapters": [{"content": "原课保留。"}]}]}),
        "data/tcm-original-editions-approved.json": serialized(books),
        "assets/acupoint-photos/test.jpg": b"synthetic-image-bytes" * 5,
    }
    manifest = {"packId": "tcm-learning-complete", "version": "1.1.1", "name": "原资料", "files": [{"path": path, "bytes": len(raw), "sha256": module.digest(raw)} for path, raw in files.items()], "members": [{"packId": "tcm-original-editions-approved", "entryPath": "data/tcm-original-editions-approved.json", "version": "1.3.0"}]}
    source = MemoryPath()
    with zipfile.ZipFile(source, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path, raw in files.items():
            archive.writestr(path, raw)
        archive.writestr("manifest.json", serialized(manifest))
        if extra:
            archive.writestr("data/undeclared.json", b"{}")
    source.seek(0)
    return source, files, books


def compressed_records(raw):
    output = {}
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        entries = archive.infolist()
        for index, entry in enumerate(entries):
            end = entries[index + 1].header_offset if index + 1 < len(entries) else archive.start_dir
            output[entry.filename] = raw[entry.header_offset:end]
    return output


class BuildTests(unittest.TestCase):
    def test_editions_only_preserves_other_bytes_and_compressed_records(self):
        source, files, books = fixture()
        source_bytes = source.getvalue()
        updated = json.loads(serialized(books))
        updated["version"] = "1.4.0"
        updated["books"].append({"id": "new-book", "name": "新增原典", "chapters": [{"id": "new-chapter", "content": "新的固定原文。"}]})
        candidate = MemoryPath()
        with contextlib.redirect_stdout(io.StringIO()):
            module.build(source, None, None, candidate, "1.1.2", MemoryPath(serialized(updated), True))
        self.assertEqual(source.getvalue(), source_bytes)
        old_blocks, new_blocks = compressed_records(source_bytes), compressed_records(candidate.getvalue())
        with zipfile.ZipFile(io.BytesIO(candidate.getvalue())) as archive:
            for path, original in files.items():
                if path == "data/tcm-original-editions-approved.json":
                    self.assertEqual(archive.read(path), serialized(updated))
                else:
                    self.assertEqual(archive.read(path), original)
                    self.assertEqual(new_blocks[path], old_blocks[path])
        receipt = json.loads(candidate.receipt.getvalue())
        self.assertEqual(receipt["replacedEntries"], ["data/tcm-original-editions-approved.json"])
        self.assertEqual(receipt["medicalVersion"], "1.2.0")
        self.assertEqual(receipt["courseVersion"], "1.0.1")

    def test_rejects_changing_a_previous_original_and_same_version(self):
        source, files, books = fixture()
        for change_version in [False, True]:
            changed = json.loads(serialized(books))
            if change_version:
                changed["books"][0]["name"] = "不允许改旧书"
            with self.assertRaises(ValueError):
                module.build(source, None, None, MemoryPath(), "1.1.2" if change_version else "1.1.1", MemoryPath(serialized(changed), True))

    def test_rejects_unregistered_source_entries_and_existing_outputs(self):
        source, files, books = fixture(extra=True)
        with self.assertRaisesRegex(ValueError, "undeclared"):
            module.build(source, None, None, MemoryPath(), "1.1.2", MemoryPath(serialized(books), True))
        with self.assertRaises(FileExistsError):
            module.build(source, None, None, MemoryPath(b"keep", True), "1.1.2", MemoryPath(serialized(books), True))


if __name__ == "__main__":
    unittest.main()
