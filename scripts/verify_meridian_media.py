from __future__ import annotations

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
MEDIA = ROOT / "public" / "assets" / "meridians"
SLUGS = (
    "lung",
    "large-intestine",
    "stomach",
    "spleen",
    "heart",
    "small-intestine",
    "bladder",
    "kidney",
    "pericardium",
    "triple-energizer",
    "gallbladder",
    "liver",
    "governor-vessel",
    "conception-vessel",
)


def inspect(path: Path) -> dict[str, object]:
    if not path.is_file() or path.stat().st_size <= 0:
        raise AssertionError(f"missing or empty: {path}")
    with Image.open(path) as image:
        frames = int(getattr(image, "n_frames", 1))
        if frames <= 1:
            raise AssertionError(f"not animated: {path}")
        image.seek(frames - 1)
        image.load()
        return {
            "path": str(path.relative_to(ROOT)).replace("\\", "/"),
            "bytes": path.stat().st_size,
            "width": image.width,
            "height": image.height,
            "frames": frames,
        }


def main() -> None:
    rows = []
    for slug in SLUGS:
        rows.append({"slug": slug, "acupoints": inspect(MEDIA / f"{slug}.webp"), "skeleton": inspect(MEDIA / "skeleton" / f"{slug}.webp")})
    result = {"meridians": len(rows), "animatedFiles": len(rows) * 2, "items": rows}
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
