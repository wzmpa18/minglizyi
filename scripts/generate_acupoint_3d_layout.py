from __future__ import annotations

import json
import math
import struct
from pathlib import Path

import numpy as np


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "scripts" / "data" / "acupoint-layout-source.json"
CATALOG = ROOT / "src" / "algorithm-core" / "modules" / "tcm" / "data" / "meridians.json"
SKIN = Path(r"D:\CodexResearch\yandao-anatomy\skin-raw.glb")
OUTPUT = ROOT / "public" / "assets" / "anatomy3d" / "acupoints-3d.json"

COMPONENT_DTYPES = {
    5120: np.int8,
    5121: np.uint8,
    5122: np.int16,
    5123: np.uint16,
    5125: np.uint32,
    5126: np.float32,
}
TYPE_WIDTHS = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}


def matrix_from_trs(node: dict) -> np.ndarray:
    if "matrix" in node:
        return np.asarray(node["matrix"], dtype=np.float64).reshape((4, 4), order="F")
    translation = np.asarray(node.get("translation", [0, 0, 0]), dtype=np.float64)
    scale = np.asarray(node.get("scale", [1, 1, 1]), dtype=np.float64)
    x, y, z, w = node.get("rotation", [0, 0, 0, 1])
    rotation = np.array(
        [
            [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w), 0],
            [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w), 0],
            [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y), 0],
            [0, 0, 0, 1],
        ],
        dtype=np.float64,
    )
    result = rotation @ np.diag([*scale, 1.0])
    result[:3, 3] = translation
    return result


def load_glb_triangles(path: Path) -> np.ndarray:
    raw = path.read_bytes()
    magic, version, length = struct.unpack_from("<4sII", raw, 0)
    if magic != b"glTF" or version != 2 or length != len(raw):
        raise ValueError("invalid GLB")
    offset = 12
    chunks: dict[bytes, bytes] = {}
    while offset < len(raw):
        chunk_length, chunk_type = struct.unpack_from("<I4s", raw, offset)
        offset += 8
        chunks[chunk_type] = raw[offset : offset + chunk_length]
        offset += chunk_length
    doc = json.loads(chunks[b"JSON"].decode("utf-8"))
    binary = chunks[b"BIN\x00"]

    def accessor(index: int) -> np.ndarray:
        item = doc["accessors"][index]
        view = doc["bufferViews"][item["bufferView"]]
        dtype = np.dtype(COMPONENT_DTYPES[item["componentType"]]).newbyteorder("<")
        width = TYPE_WIDTHS[item["type"]]
        byte_offset = int(view.get("byteOffset", 0)) + int(item.get("byteOffset", 0))
        stride = int(view.get("byteStride", dtype.itemsize * width))
        count = int(item["count"])
        if stride == dtype.itemsize * width:
            return np.frombuffer(binary, dtype=dtype, count=count * width, offset=byte_offset).reshape(count, width)
        return np.ndarray((count, width), dtype=dtype, buffer=binary, offset=byte_offset, strides=(stride, dtype.itemsize)).copy()

    world: dict[int, np.ndarray] = {}

    def visit(index: int, parent: np.ndarray) -> None:
        matrix = parent @ matrix_from_trs(doc["nodes"][index])
        world[index] = matrix
        for child in doc["nodes"][index].get("children", []):
            visit(child, matrix)

    roots = doc["scenes"][doc.get("scene", 0)]["nodes"]
    for root in roots:
        visit(root, np.eye(4, dtype=np.float64))

    all_triangles = []
    for node_index, node in enumerate(doc["nodes"]):
        if "mesh" not in node:
            continue
        matrix = world[node_index]
        for primitive in doc["meshes"][node["mesh"]]["primitives"]:
            if primitive.get("mode", 4) != 4 or "POSITION" not in primitive["attributes"]:
                continue
            positions = accessor(primitive["attributes"]["POSITION"]).astype(np.float64)
            homogeneous = np.c_[positions, np.ones(len(positions))]
            positions = (matrix @ homogeneous.T).T[:, :3]
            if "indices" in primitive:
                indices = accessor(primitive["indices"]).reshape(-1).astype(np.int64)
            else:
                indices = np.arange(len(positions), dtype=np.int64)
            all_triangles.append(positions[indices.reshape(-1, 3)])
    if not all_triangles:
        raise ValueError("skin GLB has no triangle geometry")
    return np.concatenate(all_triangles, axis=0)


def canonical_code(code: str) -> str:
    code = code.upper().replace(" ", "")
    if code.startswith("DU"):
        return "GV" + code[2:]
    if code.startswith("RN") or code.startswith("REN"):
        return "CV" + code[2:] if code.startswith("RN") else "CV" + code[3:]
    if code.startswith("SJ"):
        return "TE" + code[2:]
    if code.startswith("LV"):
        return "LR" + code[2:]
    return code


def project(
    triangles: np.ndarray,
    min_xy: np.ndarray,
    max_xy: np.ndarray,
    x: float,
    y: float,
    view: str,
) -> tuple[list[float], list[float], float]:
    # The source atlas uses a 400×924 schematic figure. Two source-checked
    # anchors (LU1 and ST36) establish this affine frame; the final point is
    # then cast onto the actual skin mesh rather than left floating in space.
    base_x = (x - 0.5) * 0.67
    base_y = 1.843 - 1.91 * y
    attempts = [(0.0, 0.0)]
    for radius in (0.004, 0.008, 0.014, 0.022, 0.032):
        attempts.extend((dx * radius, dy * radius) for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (1, -1), (-1, 1), (1, 1)))

    for dx, dy in attempts:
        px, py = base_x + dx, base_y + dy
        candidates = np.where((min_xy[:, 0] <= px) & (max_xy[:, 0] >= px) & (min_xy[:, 1] <= py) & (max_xy[:, 1] >= py))[0]
        if not len(candidates):
            continue
        tri = triangles[candidates]
        a, b, c = tri[:, 0], tri[:, 1], tri[:, 2]
        denom = (b[:, 1] - c[:, 1]) * (a[:, 0] - c[:, 0]) + (c[:, 0] - b[:, 0]) * (a[:, 1] - c[:, 1])
        valid = np.abs(denom) > 1e-12
        w1 = np.zeros_like(denom)
        w2 = np.zeros_like(denom)
        w1[valid] = ((b[valid, 1] - c[valid, 1]) * (px - c[valid, 0]) + (c[valid, 0] - b[valid, 0]) * (py - c[valid, 1])) / denom[valid]
        w2[valid] = ((c[valid, 1] - a[valid, 1]) * (px - c[valid, 0]) + (a[valid, 0] - c[valid, 0]) * (py - c[valid, 1])) / denom[valid]
        w3 = 1 - w1 - w2
        inside = valid & (w1 >= -1e-8) & (w2 >= -1e-8) & (w3 >= -1e-8)
        if not inside.any():
            continue
        tri = tri[inside]
        w1, w2, w3 = w1[inside], w2[inside], w3[inside]
        zs = w1 * tri[:, 0, 2] + w2 * tri[:, 1, 2] + w3 * tri[:, 2, 2]
        chosen = int(np.argmax(zs) if view == "front" else np.argmin(zs))
        point = np.array([px, py, zs[chosen]], dtype=np.float64)
        normal = np.cross(tri[chosen, 1] - tri[chosen, 0], tri[chosen, 2] - tri[chosen, 0])
        normal /= np.linalg.norm(normal) or 1.0
        wanted_z = 1 if view == "front" else -1
        if normal[2] * wanted_z < 0:
            normal *= -1
        point += normal * 0.004
        return point.round(6).tolist(), normal.round(6).tolist(), math.hypot(dx, dy)

    # Hands, toes and ear edges can extend outside the 2D atlas silhouette after
    # it is fitted to a different body mesh. Snap those few cases to the nearest
    # actual skin triangle and record the correction for the release audit.
    dx = np.maximum(np.maximum(min_xy[:, 0] - base_x, 0), base_x - max_xy[:, 0])
    dy = np.maximum(np.maximum(min_xy[:, 1] - base_y, 0), base_y - max_xy[:, 1])
    distance = np.hypot(dx, dy)
    nearest = np.argpartition(distance, min(63, len(distance) - 1))[:64]
    extreme = triangles[nearest, :, 2].max(axis=1) if view == "front" else triangles[nearest, :, 2].min(axis=1)
    tolerance = float(distance[nearest].min()) + 0.004
    pool = nearest[distance[nearest] <= tolerance]
    pool_extreme = triangles[pool, :, 2].max(axis=1) if view == "front" else triangles[pool, :, 2].min(axis=1)
    chosen_tri = int(pool[np.argmax(pool_extreme) if view == "front" else np.argmin(pool_extreme)])
    tri = triangles[chosen_tri]
    chosen_vertex = int(np.argmin((tri[:, 0] - base_x) ** 2 + (tri[:, 1] - base_y) ** 2))
    point = tri[chosen_vertex].copy()
    normal = np.cross(tri[1] - tri[0], tri[2] - tri[0])
    normal /= np.linalg.norm(normal) or 1.0
    wanted_z = 1 if view == "front" else -1
    if normal[2] * wanted_z < 0:
        normal *= -1
    point += normal * 0.004
    correction = math.hypot(point[0] - base_x, point[1] - base_y)
    return point.round(6).tolist(), normal.round(6).tolist(), correction


def main() -> None:
    source_doc = json.loads(SOURCE.read_text(encoding="utf-8"))
    catalog_doc = json.loads(CATALOG.read_text(encoding="utf-8"))
    source_by_code = {
        canonical_code(item["code"]): item
        for item in source_doc["points"]
        if canonical_code(item["code"]) != "GV29"
    }
    catalog = catalog_doc["acupoints"]
    canonical_catalog = {canonical_code(item["code"]): item for item in catalog}
    if len(source_by_code) != 361 or len(canonical_catalog) != 361 or set(source_by_code) != set(canonical_catalog):
        missing = sorted(set(canonical_catalog) - set(source_by_code))
        extra = sorted(set(source_by_code) - set(canonical_catalog))
        raise ValueError(f"catalog mismatch missing={missing} extra={extra}")

    triangles = load_glb_triangles(SKIN)
    min_xy = triangles[:, :, :2].min(axis=1)
    max_xy = triangles[:, :, :2].max(axis=1)
    rows = []
    fallback_count = 0
    for canonical, catalog_item in canonical_catalog.items():
        source_item = source_by_code[canonical]
        placement = source_item["placement"]
        variants = [("primary", float(placement["x"]))]
        if placement["side"] != "midline":
            variants.append(("mirrored", 1.0 - float(placement["x"])))
        markers = []
        for side, normalized_x in variants:
            position, normal, correction = project(triangles, min_xy, max_xy, normalized_x, float(placement["y"]), placement["view"])
            fallback_count += int(correction > 0)
            markers.append({"side": side, "position": position, "normal": normal, "projectionCorrection": round(correction, 6)})
        rows.append(
            {
                "code": canonical,
                "name": catalog_item["name"],
                "meridian": catalog_item["meridian"],
                "view": placement["view"],
                "markers": markers,
                "placementStatus": "schematic_unvalidated",
                "sourceIds": source_item.get("sourceIds", ["src_project_schematic"]),
                "sourceReviewStatus": source_item.get("reviewStatus", "unreviewed"),
                "needleDirection": None,
                "needleReviewStatus": "pending_medical_review",
            }
        )

    output = {
        "schema": "yandao.tcm.acupoints-3d.v1",
        "version": "1.0.0-draft",
        "pointCount": len(rows),
        "markerCount": sum(len(row["markers"]) for row in rows),
        "coordinateStatus": "schematic_unvalidated",
        "needleStatus": "pending_medical_review",
        "source": "Let Energy Flow schematic atlas coordinates projected to the Z-Anatomy skin mesh",
        "sourceUrl": source_doc["source"],
        "license": "CC BY-SA 4.0",
        "projectionFallbacks": fallback_count,
        "points": rows,
    }
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")), encoding="utf-8", newline="\n")
    print(json.dumps({key: output[key] for key in ("pointCount", "markerCount", "projectionFallbacks")}, ensure_ascii=False))


if __name__ == "__main__":
    main()
