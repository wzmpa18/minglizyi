from __future__ import annotations

import hashlib
import json
import shutil
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WORKSPACE = ROOT.parent
V1 = WORKSPACE / "deliverables" / "anatomy3d-pack-v1.0.0"
SKIN = Path(r"D:\CodexResearch\yandao-anatomy\skin-raw.glb")
OUT = WORKSPACE / "deliverables" / "anatomy3d-pack-v2.0.0"

LAYERS = [
    ("skin", "体表", SKIN, "skin_male.glb"),
    ("muscular", "肌肉", V1 / "muscular_male.glb", "muscular_male.glb"),
    ("visceral", "脏腑", V1 / "visceral_male.glb", "visceral_male.glb"),
    ("skeletal", "骨骼", V1 / "skeletal_male.glb", "skeletal_male.glb"),
]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> None:
    missing = [str(source) for _, _, source, _ in LAYERS if not source.is_file()]
    if missing:
        raise SystemExit("missing anatomy source files: " + ", ".join(missing))

    OUT.mkdir(parents=True, exist_ok=True)
    layer_rows = []
    for layer_id, name, source, target_name in LAYERS:
        target = OUT / target_name
        shutil.copy2(source, target)
        layer_rows.append(
            {
                "id": layer_id,
                "name": name,
                "file": target_name,
                "size": target.stat().st_size,
                "sha256": sha256(target),
            }
        )

    license_text = """言道国学 3D 人体解剖离线包 — 第三方模型授权

本离线包中的体表、肌肉、脏腑和骨骼网格，均源自或派生自
BodyParts3D / Z-Anatomy 开放解剖数据。

BodyParts3D：Database Center for Life Science (DBCLS), Japan
https://dbarchive.biosciencedbc.jp/en/bodyparts3d/
原始数据许可：Creative Commons Attribution-ShareAlike 2.1 Japan
https://creativecommons.org/licenses/by-sa/2.1/jp/

Z-Anatomy：The libre 3D atlas of anatomy
https://www.z-anatomy.com/
https://github.com/Z-Anatomy/Models-of-human-anatomy
许可：Creative Commons Attribution-ShareAlike 4.0 International
https://creativecommons.org/licenses/by-sa/4.0/

本包对上游模型进行了格式转换、分层整理、压缩与显示材质适配；
模型衍生文件继续按 CC BY-SA 4.0 提供。言道国学应用程序源代码
不因此改变许可；应用只是加载并显示独立离线模型文件。
"""
    notice_text = """用途与限制

1. 本模型用于人体结构、经络与穴位的学习展示，不是医学影像或临床导航系统。
2. 人体结构、穴位与经络显示存在个体差异和示意误差。
3. 任何针刺、艾灸、复位等专业操作须由具备资质的专业人员实施。
4. 体表模型取自 Z-Anatomy 的 Regions of human body 数据；其余三层来自同一
   BodyParts3D / Z-Anatomy 派生体系，四层采用同一坐标尺度装配。
5. 版本 2.0.0 新增体表层，并保留肌肉、脏腑、骨骼独立开关，以支持逐层剥离。
"""
    (OUT / "ANATOMY_LICENSE.txt").write_text(license_text, encoding="utf-8", newline="\n")
    (OUT / "ANATOMY_NOTICE.txt").write_text(notice_text, encoding="utf-8", newline="\n")

    manifest = {
        "format": "yandao-anatomy-3d",
        "version": "2.0.0",
        "name": "3D人体四层解剖学习包",
        "layers": layer_rows,
        "license": "CC BY-SA 4.0（模型衍生文件）",
        "source": "BodyParts3D / Z-Anatomy derived assets",
        "notice": "学习示意，不用于临床定位或自行操作。",
    }
    manifest_path = OUT / "manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
        newline="\n",
    )

    pack_path = OUT / "yandao-anatomy-3d-v2.0.0.pack"
    members = [
        "manifest.json",
        *[row[3] for row in LAYERS],
        "ANATOMY_LICENSE.txt",
        "ANATOMY_NOTICE.txt",
    ]
    with zipfile.ZipFile(pack_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for name in members:
            archive.write(OUT / name, arcname=name)

    summary = {
        "pack": str(pack_path),
        "size": pack_path.stat().st_size,
        "sha256": sha256(pack_path),
        "layers": layer_rows,
    }
    (OUT / "BUILD-RESULT.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8", newline="\n"
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
