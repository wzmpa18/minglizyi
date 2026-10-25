"""Render self-authored subtitle micro-lessons; never download third-party videos."""
from pathlib import Path
import argparse, hashlib, json, shutil, subprocess, textwrap

p = argparse.ArgumentParser()
p.add_argument('--ffmpeg', required=True)
p.add_argument('--font', required=True, help='Local licensed font; not distributed with the app')
p.add_argument('--work-dir', required=True)
a = p.parse_args()
root = Path(__file__).resolve().parent.parent
work = Path(a.work_dir).resolve()
work.mkdir(parents=True, exist_ok=False)
shutil.copyfile(a.font, work / 'font.ttc')
lessons = json.loads((root / 'src/data/builtinLearningVideos.json').read_text('utf8'))
records = []
for lesson in lessons:
    folder = work / lesson['id']
    folder.mkdir()
    shutil.copyfile(work / 'font.ttc', folder / 'font.ttc')
    (folder / 'course.txt').write_text(lesson['title'], encoding='utf8')
    (folder / 'footer.txt').write_text('言道国学 · 原创学习方法\n字幕微课 · 无配音 · 可暂停阅读', encoding='utf8')
    filters = [
        "drawtext=fontfile=font.ttc:textfile=course.txt:fontcolor=0xE9D5FF:fontsize=32:x=48:y=100",
        "drawtext=fontfile=font.ttc:textfile=footer.txt:fontcolor=0xD8B4FE:fontsize=24:line_spacing=16:x=48:y=1120",
    ]
    start = 0
    for index, section in enumerate(lesson['sections']):
        end = start + section['seconds']
        (folder / f'heading-{index}.txt').write_text(section['title'], encoding='utf8')
        body = '\n\n'.join(textwrap.fill(line, width=18) for line in section['lines'])
        (folder / f'body-{index}.txt').write_text(body, encoding='utf8')
        enabled = f"enable='gte(t,{start})*lt(t,{end})'"
        filters.append(f"drawtext=fontfile=font.ttc:textfile=heading-{index}.txt:fontcolor=white:fontsize=40:x=48:y=270:{enabled}")
        filters.append(f"drawtext=fontfile=font.ttc:textfile=body-{index}.txt:fontcolor=0xF3E8FF:fontsize=32:line_spacing=20:x=48:y=400:{enabled}")
        start = end
    target = (root / 'public' / lesson['media'].lstrip('/')).resolve()
    assert (root / 'public/assets/study-videos').resolve() in target.parents
    target.parent.mkdir(parents=True, exist_ok=True)
    cmd = [a.ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i',
           f'color=c=0x241238:s=720x1280:r=12:d={start}', '-vf', ','.join(filters), '-an',
           '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-pix_fmt', 'yuv420p',
           '-movflags', '+faststart', '-threads', '2', str(target)]
    subprocess.run(cmd, cwd=folder, check=True)
    subprocess.run([a.ffmpeg, '-hide_banner', '-loglevel', 'error', '-i', str(target), '-f', 'null', '-'], check=True)
    records.append({'id': lesson['id'], 'file': target.name, 'bytes': target.stat().st_size,
                    'sha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'seconds': start,
                    'width': 720, 'height': 1280, 'codec': 'H264/yuv420p', 'audio': False,
                    'source': '本项目原创学习方法字幕，非古籍原文、非真人名师授课',
                    'thirdPartyVideoDownloaded': False, 'fontFileDistributed': False})
(root / 'public/assets/study-videos/MANIFEST.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps(records,ensure_ascii=False,indent=2))
