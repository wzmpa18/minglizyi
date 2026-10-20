"""Publish only a pinned Guoxue CI web artifact, in RAM, with an atomic switch.

Requires the existing authenticated gh/ssh CLIs. No private credential arguments,
local dependency tree, ZIP file or extracted site is created. Retiring an older
release is deliberately separate and must follow browser acceptance.
"""
import argparse
import hashlib
import io
import json
import re
import shlex
import subprocess
import tarfile
import zipfile
from pathlib import Path, PurePosixPath

REMOTE = r'''
from pathlib import Path
import sys,tarfile,json,hashlib,os,shutil,datetime
base=Path('/root/yandaoguoxue/releases').resolve()
link=Path('/root/yandaoguoxue/current')
with tarfile.open(fileobj=sys.stdin.buffer,mode='r|gz') as archive:
    entries=iter(archive)
    first=next(entries)
    assert first.name=='__DEPLOY_EXPECTED.json' and first.isfile()
    expected=json.loads(archive.extractfile(first).read())
    target=base/expected['releaseName']
    old=link.resolve()
    assert old==base/expected['expectedCurrent'] and old.is_dir()
    assert target.parent==base and not target.exists()
    target.mkdir()
    try:
        for entry in entries:
            assert entry.isfile() and entry.name in expected['hashes']
            destination=(target/entry.name).resolve()
            assert target in destination.parents
            destination.parent.mkdir(parents=True,exist_ok=True)
            with destination.open('xb') as output:
                output.write(archive.extractfile(entry).read())
        actual={str(p.relative_to(target)):hashlib.sha256(p.read_bytes()).hexdigest() for p in target.rglob('*') if p.is_file()}
        assert actual==expected.pop('hashes')
        # Public store/deletion URLs must survive an atomic front-end update.
        # Never carry old APK test downloads or unverified executable content.
        marketing=old/'marketing'/'20261020'
        preserved=[]
        if marketing.exists():
            assert not marketing.is_symlink()
            candidates=list(marketing.rglob('*'))
            assert len(candidates)<200
            for item in candidates:
                assert not item.is_symlink() and marketing.resolve() in item.resolve().parents
                if not item.is_file(): continue
                assert item.suffix in {'.html','.jpg','.png','.json','.css'}
                data=item.read_bytes(); assert len(data)<10_000_000
                relative='marketing/20261020/'+str(item.relative_to(marketing))
                destination=target/relative; destination.parent.mkdir(parents=True,exist_ok=True)
                if destination.exists(): assert destination.read_bytes()==data
                else: destination.write_bytes(data)
                preserved.append({'path':relative,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
        expected['preservedPublicAssets']=preserved
        pending=link.parent/'.current-next'
        assert not pending.exists() and not pending.is_symlink()
        pending.symlink_to(target)
        os.replace(pending,link)
        result={**expected,'current':str(target),'rollback':str(old),'verifiedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'state':'all-files-hash-verified-switched-awaiting-browser','releaseStatus':'web live, no store submission implied'}
        Path('/root/yandaoguoxue/latest-deployment.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
        print(json.dumps(result,ensure_ascii=False))
    except:
        if link.resolve()!=target and target.exists():
            shutil.rmtree(target)
        raise
'''


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--artifact-id', required=True, type=int)
    parser.add_argument('--sha256', required=True)
    parser.add_argument('--source', required=True, help='Pinned CI commit, 7 to 40 hex digits')
    parser.add_argument('--expect-current', required=True, help='Exact existing release directory basename')
    parser.add_argument('--host', default='82.156.228.87')
    parser.add_argument('--evidence', type=Path)
    args = parser.parse_args()
    if not re.fullmatch(r'[0-9a-f]{7,40}', args.source):
        parser.error('Source must be a Git commit hash')
    if not re.fullmatch(r'[0-9a-f]{64}', args.sha256):
        parser.error('An exact artifact SHA-256 is required')
    if not re.fullmatch(r'v[0-9._]+-[a-z0-9-]+', args.expect_current):
        parser.error('Expected release must be a bounded basename')
    if args.host.startswith('-') or not re.fullmatch(r'[A-Za-z0-9_.@:-]+',args.host):
        parser.error('Invalid SSH host')
    metadata = json.loads(subprocess.check_output(['gh','api',f'repos/wzmpa18/minglizyi/actions/artifacts/{args.artifact_id}']))
    assert metadata['name'] == 'study-layout-review-preview' and not metadata['expired']
    assert metadata['workflow_run']['head_sha'].startswith(args.source)
    assert metadata['digest'] == 'sha256:' + args.sha256
    raw = subprocess.check_output(['gh','api',f'repos/wzmpa18/minglizyi/actions/artifacts/{args.artifact_id}/zip'])
    assert hashlib.sha256(raw).hexdigest() == args.sha256
    archive = zipfile.ZipFile(io.BytesIO(raw))
    files = [entry for entry in archive.infolist() if not entry.is_dir()]
    assert 1 < len(files) < 10000 and sum(entry.file_size for entry in files) < 200_000_000
    assert all(not PurePosixPath(entry.filename).is_absolute() and '..' not in PurePosixPath(entry.filename).parts and '\\' not in entry.filename for entry in files)
    assert len({entry.filename for entry in files}) == len(files)
    assert 'index.html' in archive.namelist() and 'calendar/index.html' in archive.namelist()
    assert '__DEPLOY_EXPECTED.json' not in archive.namelist()
    version = json.loads(archive.read('version.json'))['version']
    assert re.fullmatch(r'v\d+\.\d+\.\d+(?:_\d+)?',version)
    hashes = {entry.filename: hashlib.sha256(archive.read(entry)).hexdigest() for entry in files}
    proof = {'source':metadata['workflow_run']['head_sha'],'workflow':str(metadata['workflow_run']['id']),'artifactId':args.artifact_id,'artifactZipSha256':args.sha256,'files':len(files),'bytes':sum(entry.file_size for entry in files),'manifestSha256':hashlib.sha256(json.dumps(hashes,sort_keys=True).encode()).hexdigest(),'releaseName':version+'-calendar-community-'+args.source[:7],'expectedCurrent':args.expect_current,'hashes':hashes}
    payload = io.BytesIO()
    with tarfile.open(fileobj=payload,mode='w:gz') as bundle:
        data = json.dumps(proof).encode()
        header = tarfile.TarInfo('__DEPLOY_EXPECTED.json')
        header.size = len(data)
        bundle.addfile(header,io.BytesIO(data))
        for entry in files:
            data = archive.read(entry)
            header = tarfile.TarInfo(entry.filename)
            header.size, header.mode = len(data), 0o644
            bundle.addfile(header,io.BytesIO(data))
    result = subprocess.run(['ssh','-o','BatchMode=yes',args.host,'python3 -c '+shlex.quote(REMOTE)],input=payload.getvalue(),capture_output=True,check=True)
    published = json.loads(result.stdout)
    if args.evidence:
        args.evidence.parent.mkdir(parents=True,exist_ok=True)
        args.evidence.write_text(json.dumps(published,ensure_ascii=False,indent=2),encoding='utf8')
    print(json.dumps(published,ensure_ascii=False))


if __name__ == '__main__':
    main()
