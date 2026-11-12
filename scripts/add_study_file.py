"""Add one study document to the cloud catalog without rebuilding the app.

Example:
  python scripts/add_study_file.py --root /www/yandaoguoxue-backend/data/study-files \
    --group-id clinical-physician --group-title 临床执业医师 \
    --collection-id 2026 --collection-title '2026 年' \
    --document-id paper --document-title 真题 --file /tmp/2026-paper.pdf
"""

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import tempfile


SCHEMA = "yandao.study-files.v1"
ALLOWED_SUFFIXES = {".pdf", ".txt", ".md", ".png", ".jpg", ".jpeg"}


def slug(value: str) -> str:
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,63}", value):
        raise ValueError(f"Invalid ID: {value!r}")
    return value


def add_file(args: argparse.Namespace) -> dict:
    root = Path(args.root).resolve()
    source = Path(args.file).resolve(strict=True)
    if not source.is_file() or source.stat().st_size == 0:
        raise ValueError("Source file is empty or missing")
    suffix = source.suffix.lower()
    if suffix not in ALLOWED_SUFFIXES:
        raise ValueError(f"Unsupported document type: {suffix}")
    for value in (args.group_title, args.collection_title, args.document_title):
        if not value.strip() or len(value) > 100:
            raise ValueError("Titles must contain 1–100 characters")
    group_id, collection_id, document_id = map(slug, (args.group_id, args.collection_id, args.document_id))
    relative = Path(group_id, collection_id, document_id + suffix)
    destination = root / relative
    if destination.exists() and not args.replace:
        raise FileExistsError(f"Document already exists: {destination}")
    manifest_path = root / "manifest.json"
    if manifest_path.exists():
        catalog = json.loads(manifest_path.read_text(encoding="utf-8"))
        if catalog.get("schema") != SCHEMA or not isinstance(catalog.get("groups"), list):
            raise ValueError("Unsupported study catalog schema")
    else:
        catalog = {"schema": SCHEMA, "groups": []}
    group = next((item for item in catalog["groups"] if item["id"] == group_id), None)
    if group is None:
        group = {"id": group_id, "title": args.group_title, "description": "", "collections": []}
        catalog["groups"].append(group)
    collection = next((item for item in group["collections"] if item["id"] == collection_id), None)
    if collection is None:
        collection = {"id": collection_id, "title": args.collection_title, "documents": []}
        group["collections"].append(collection)
    existing = next((item for item in collection["documents"] if item["id"] == document_id), None)
    if existing and not args.replace:
        raise FileExistsError(f"Document ID already exists: {document_id}")

    destination.parent.mkdir(parents=True, exist_ok=True)
    digest = hashlib.sha256()
    with tempfile.NamedTemporaryFile(dir=destination.parent, prefix=".upload-", delete=False) as staged:
        temporary = Path(staged.name)
        try:
            with source.open("rb") as stream:
                while block := stream.read(1024 * 1024):
                    staged.write(block)
                    digest.update(block)
            staged.flush()
            os.fsync(staged.fileno())
        except BaseException:
            temporary.unlink(missing_ok=True)
            raise
    os.replace(temporary, destination)
    entry = {"id": document_id, "title": args.document_title, "file": relative.as_posix(), "size": destination.stat().st_size}
    if existing:
        collection["documents"][collection["documents"].index(existing)] = entry
    else:
        collection["documents"].append(entry)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=root, prefix=".manifest-", delete=False) as staged_manifest:
        temporary_manifest = Path(staged_manifest.name)
        json.dump(catalog, staged_manifest, ensure_ascii=False, indent=2)
        staged_manifest.write("\n")
        staged_manifest.flush()
        os.fsync(staged_manifest.fileno())
    os.replace(temporary_manifest, manifest_path)
    return {"file": str(destination), "bytes": entry["size"], "sha256": digest.hexdigest()}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    for key in ("root", "group-id", "group-title", "collection-id", "collection-title", "document-id", "document-title", "file"):
        parser.add_argument("--" + key, required=True)
    parser.add_argument("--replace", action="store_true", help="Replace an existing document with the same ID")
    print(json.dumps(add_file(parser.parse_args()), ensure_ascii=False))
