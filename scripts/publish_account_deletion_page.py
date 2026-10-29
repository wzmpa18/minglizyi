"""Restore the public deletion instructions without changing application services."""
import argparse
import base64
import hashlib
import json
import shlex
import subprocess
from pathlib import Path
from urllib.request import Request, urlopen

REMOTE = r'''
import sys,json,base64,hashlib
from pathlib import Path
spec=json.load(sys.stdin)
base=Path('/root/yandaoguoxue/releases').resolve()
root=Path('/root/yandaoguoxue/current').resolve()
assert root.parent==base and root.name==spec['expectedCurrent']
data=base64.b64decode(spec['content'])
assert hashlib.sha256(data).hexdigest()==spec['sha256']
result=[]
for name in ('legal/account-deletion.html','marketing/20261020/account-deletion.html'):
    dest=root/name
    assert root in dest.resolve().parents and not dest.is_symlink()
    for parent in dest.parents:
        if parent==root: break
        assert not parent.is_symlink()
    dest.parent.mkdir(parents=True,exist_ok=True)
    if dest.exists(): assert dest.read_bytes()==data, 'Preserve differing existing document'
    else: dest.write_bytes(data)
    assert hashlib.sha256(dest.read_bytes()).hexdigest()==spec['sha256']
    result.append(name)
print(json.dumps({'current':str(root),'sha256':spec['sha256'],'restored':result}))
'''


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--expected-current', required=True)
    parser.add_argument('--proof', type=Path, required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    data = (root / 'public/legal/account-deletion.html').read_bytes()
    assert (root / 'public/marketing/20261020/account-deletion.html').read_bytes() == data
    digest = hashlib.sha256(data).hexdigest()
    spec = {'expectedCurrent': args.expected_current, 'content': base64.b64encode(data).decode(), 'sha256': digest}
    result = subprocess.run(['ssh', '-o', 'BatchMode=yes', 'root@82.156.228.87', 'python3 -c ' + shlex.quote(REMOTE)],
                            input=json.dumps(spec).encode(), capture_output=True, check=True, timeout=60)
    proof = json.loads(result.stdout)
    proof['publicChecks'] = []
    for name in proof['restored']:
        url = 'https://yandaoguoxue.yandao.vip/' + name
        with urlopen(Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=30) as response:
            body = response.read()
            assert response.status == 200 and body == data
            proof['publicChecks'].append({'url': url, 'status': response.status, 'sha256': hashlib.sha256(body).hexdigest()})
    args.proof.parent.mkdir(parents=True, exist_ok=True)
    assert not args.proof.exists()
    args.proof.write_text(json.dumps(proof, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(proof, ensure_ascii=False))


if __name__ == '__main__':
    main()
