import base64
import hashlib
import json
import os
from pathlib import Path
import urllib.request

root = Path('.aegis-upload')
manifest = json.loads((root / 'manifest.json').read_text())
repo = os.environ['GITHUB_REPOSITORY']
if repo != 'ThorFabian85/aegis-introduction':
    raise RuntimeError('Unexpected repository')
api_root = 'https://api.github.com/repos/' + repo

def api(method, path, payload=None):
    data = None if payload is None else json.dumps(payload).encode()
    request = urllib.request.Request(api_root + path, data=data, method=method,
        headers={'Authorization': 'Bearer ' + os.environ['GH_TOKEN'],
                 'Accept': 'application/vnd.github+json',
                 'Content-Type': 'application/json',
                 'X-GitHub-Api-Version': '2022-11-28'})
    with urllib.request.urlopen(request, timeout=180) as response:
        body = response.read()
        return json.loads(body) if body else None

entries = []
for item in manifest['files']:
    if item.get('parts'):
        data = b''.join((root / 'parts' / part).read_bytes() for part in item['parts'])
        actual = hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()
        if actual != item['sha'] or len(data) != item['size']:
            raise RuntimeError('Reassembly mismatch: ' + item['path'])
        blob = api('POST', '/git/blobs', {'content': base64.b64encode(data).decode(), 'encoding': 'base64'})
        if blob['sha'] != item['sha']:
            raise RuntimeError('Upload mismatch: ' + item['path'])
    entries.append({'path': item['path'], 'mode': '100644', 'type': 'blob', 'sha': item['sha']})
    print('Verified:', item['path'], flush=True)

tree = api('POST', '/git/trees', {'tree': entries})
commit = api('POST', '/git/commits', {
    'message': 'Replace introduction site with complete renovated edition',
    'tree': tree['sha'], 'parents': [manifest['parent_sha']]})
print('AEGIS_READY_COMMIT=' + commit['sha'], flush=True)
print('AEGIS_READY_TREE=' + tree['sha'], flush=True)

branch = os.environ['GITHUB_REF_NAME']
if branch == 'upload-aegis-introduction-20260914':
    api('DELETE', '/git/refs/heads/' + branch)
    print('Removed temporary upload branch.', flush=True)
