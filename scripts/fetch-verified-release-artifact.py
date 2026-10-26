"""Fetch one successful, source-pinned native artifact without a temporary ZIP."""
import argparse, hashlib, io, json, subprocess, zipfile
from pathlib import Path, PurePosixPath


def api(path):
    return subprocess.check_output(['gh', 'api', 'repos/wzmpa18/minglizyi/' + path])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run', type=int, required=True)
    parser.add_argument('--source', required=True)
    parser.add_argument('--artifact', choices=['yandao-guoxue-ios-ipa', 'yandao-guoxue-android-apk', 'yandao-guoxue-android-aab'], required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--proof', type=Path, required=True)
    args = parser.parse_args()
    run = json.loads(api(f'actions/runs/{args.run}'))
    assert run['head_sha'] == args.source and run['status'] == 'completed' and run['conclusion'] == 'success'
    assert run['path'] == ('.github/workflows/ios-build.yml' if args.artifact.endswith('ios-ipa') else '.github/workflows/android-build.yml')
    matches = [row for row in json.loads(api(f'actions/runs/{args.run}/artifacts'))['artifacts'] if row['name'] == args.artifact and not row['expired']]
    assert len(matches) == 1
    meta = matches[0]
    raw = api(f"actions/artifacts/{meta['id']}/zip")
    assert meta['digest'] == 'sha256:' + hashlib.sha256(raw).hexdigest()
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        entries = [row for row in archive.infolist() if not row.is_dir()]
        assert len(entries) == 1 and entries[0].file_size < 268435456
        relative = PurePosixPath(entries[0].filename)
        assert not relative.is_absolute() and '..' not in relative.parts
        suffix = '.ipa' if args.artifact.endswith('ios-ipa') else '.apk' if args.artifact.endswith('-apk') else '.aab'
        assert relative.suffix == args.output.suffix == suffix
        data = archive.read(entries[0])
    digest = hashlib.sha256(data).hexdigest()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    if args.output.exists():
        assert args.output.read_bytes() == data, 'Existing destination differs; preserve it'
    else:
        args.output.write_bytes(data)
    proof = {'run': args.run, 'source': args.source, 'artifactId': meta['id'], 'artifactName': args.artifact, 'artifactZipSha256': meta['digest'].split(':')[1], 'output': str(args.output), 'bytes': len(data), 'sha256': digest, 'successfulPinnedBuild': True, 'identityCheckedSeparately': True}
    assert not args.proof.exists()
    args.proof.parent.mkdir(parents=True, exist_ok=True)
    args.proof.write_text(json.dumps(proof, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(proof, ensure_ascii=False))


if __name__ == '__main__':
    main()
