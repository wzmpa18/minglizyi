"""Read the published Guoxue pages, version API and complete APK over public HTTPS."""
import argparse, datetime, hashlib, json, time, re
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.request import Request, urlopen

ORIGIN = 'https://yandaoguoxue.yandao.vip'


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--version', required=True)
    p.add_argument('--build', type=int, required=True)
    p.add_argument('--bytes', type=int, required=True)
    p.add_argument('--sha256', required=True)
    p.add_argument('--parallel-ranges', type=int, choices=[1, 4], default=1)
    p.add_argument('--get-only', action='store_true', help='Independent full installer GET probe; does not claim page or HEAD acceptance')
    p.add_argument('--output', type=Path, required=True)
    a = p.parse_args()
    assert re.fullmatch(r'\d+\.\d+\.\d+', a.version) and re.fullmatch(r'[a-f0-9]{64}', a.sha256)
    assert 0 < a.build < 2**31 and 0 < a.bytes < 134217728
    assert not a.output.exists()
    proof = {'checkedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'scope': 'independent-public-HTTPS-client', 'version': a.version, 'build': a.build, 'pages': [], 'state': 'READING'}
    proof.update(getOnly=a.get_only, headAcceptanceChecked=False)
    save = lambda: a.output.write_text(json.dumps(proof, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    save()
    try:
        for page in ([] if a.get_only else ['/', '/download/', '/zhongyi/', '/zhongyi/anatomy3d/', '/zhongyi/meridian/', '/zhongyi/ni-study/', '/agreements/', '/share-code/', '/discover/', '/groups/', '/privacy/']):
            with urlopen(ORIGIN + page, timeout=30) as response:
                raw = response.read(2_000_000)
                assert response.status == 200 and raw and response.headers.get_content_type() == 'text/html'
                proof['pages'].append({'path': page, 'status': response.status, 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()})
        with urlopen(ORIGIN + '/version.json', timeout=30) as response:
            assert json.load(response)['version'] == 'v' + a.version
        with urlopen(ORIGIN + '/api/public/app-version?platform=android', timeout=30) as response:
            data = json.load(response)['data']
        target = ORIGIN + '/downloads/' + str(a.build) + '/YandaoGuoxue_' + a.version + '_' + str(a.build) + '.apk'
        resolver = ORIGIN + '/api/public/app-version/android-installer/' + str(a.build) + '.apk'
        entrypoint = data['downloadUrl']
        assert data['latestVersion'] == a.version and data['latestVersionCode'] == a.build and data['forceUpdate'] is False and entrypoint in (target, resolver)
        if entrypoint == resolver and not a.get_only:
            with urlopen(Request(resolver, method='HEAD'), timeout=30) as response:
                assert response.url == target and int(response.headers['Content-Length']) == a.bytes
        proof['versionApi'] = {'version': data['latestVersion'], 'build': data['latestVersionCode'], 'forceUpdate': data['forceUpdate'], 'downloadUrl': entrypoint}
        proof['downloadEntrances'] = []
        for route in ([] if a.get_only else ['/latest.apk', '/app-download/latest.apk', '/app-download/guoxue-chuancheng.apk', '/app-download/guoxue-chuancheng-v1.0-release.apk']):
            with urlopen(Request(ORIGIN + route, method='HEAD'), timeout=30) as response:
                assert response.status == 200 and response.url == target and int(response.headers['Content-Length']) == a.bytes
                proof['downloadEntrances'].append({'path': route, 'status': response.status, 'target': response.url, 'bytes': int(response.headers['Content-Length'])})
        save()
        proof['headAcceptanceChecked'] = not a.get_only
        h, size, started = hashlib.sha256(), 0, time.monotonic()
        if a.parallel_ranges == 4:
            def part(index):
                start, end = index * a.bytes // 4, (index + 1) * a.bytes // 4 - 1
                request = Request(entrypoint, headers={'Range': f'bytes={start}-{end}', 'Accept-Encoding': 'identity'})
                with urlopen(request, timeout=40) as response:
                    assert response.status == 206 and response.headers['Content-Range'] == f'bytes {start}-{end}/{a.bytes}'
                    assert int(response.headers['Content-Length']) == end - start + 1
                    data = bytearray()
                    for chunk in iter(lambda: response.read(1024 * 1024), b''):
                        data.extend(chunk)
                        assert len(data) <= end - start + 1 and time.monotonic() - started < 1200
                    assert len(data) == end - start + 1
                    return data, {'start': start, 'end': end, 'bytes': len(data), 'etag': response.headers.get('ETag'), 'sha256': hashlib.sha256(data).hexdigest()}
            with ThreadPoolExecutor(max_workers=4) as pool:
                parts = list(pool.map(part, range(4)))
            assert len({row['etag'] for _, row in parts}) == 1 and parts[0][1]['etag']
            proof['ranges'] = []
            for data, row in parts:
                h.update(data)
                size += len(data)
                proof['ranges'].append(row)
            del parts
        else:
            with urlopen(entrypoint, timeout=40) as response:
                assert response.status == 200 and int(response.headers['Content-Length']) == a.bytes
                from urllib.parse import urlsplit
                final = urlsplit(response.url)
                proof['transport'] = {'host': final.hostname, 'path': final.path, 'temporaryQueryLogged': False}
                for chunk in iter(lambda: response.read(1024 * 1024), b''):
                    size += len(chunk)
                    assert size <= a.bytes and time.monotonic() - started < 900
                    h.update(chunk)
                    proof['partialDownload'] = {'bytes': size, 'elapsedSeconds': round(time.monotonic() - started, 2)}
                    if size % (8 * 1024 * 1024) == 0: save()
        assert size == a.bytes and h.hexdigest() == a.sha256
        proof.update(state='PASS', apk={'bytes': size, 'sha256': h.hexdigest(), 'seconds': round(time.monotonic() - started, 2)}, noLocalApkDuplicateCreated=True)
    except Exception as error:
        proof.update(state='FAILED', error=type(error).__name__ + ': ' + str(error))
        raise
    finally:
        save()
    print(json.dumps(proof, ensure_ascii=False))


if __name__ == '__main__':
    main()
