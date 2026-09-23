#!/usr/bin/env bash
set -euo pipefail
# Read-only public checks; no database changes or credentials printed.
python3 - "${1:-https://vps-f8d31735.vps.ovh.ca}" <<'PY'
import json, sys, time, urllib.request
base = sys.argv[1].rstrip('/')
def request(path, payload=None):
    body = None if payload is None else json.dumps(payload).encode()
    req = urllib.request.Request(base + path, data=body, headers={'Origin': base, 'Content-Type': 'application/json'})
    t = time.monotonic()
    with urllib.request.urlopen(req, timeout=15) as response:
        data = json.load(response)
    return data, round((time.monotonic()-t)*1000)
for attempt in range(60):
    state, elapsed = request('/api/search/status')
    if state.get('disabled'):
        raise SystemExit('QMD is disabled in Admin Search. Enable it to verify semantic performance.')
    if state.get('ready'): break
    if attempt % 5 == 0: print('QMD warming; lexical search remains available.', flush=True)
    time.sleep(2)
else: raise SystemExit('QMD did not become ready. Inspect qmd logs before proceeding.')
print('QMD ready')
for query in ['umami', 'country:Kenya', 'screening']:
    for repeat in range(2):
        data, elapsed = request('/api/search/query', {'query':query, 'scope':{}})
        if data.get('semanticUnavailable'):
            raise SystemExit('QMD fell back during verification. Inspect QMD_REQUEST/QMD_PROFILE logs.')
        results = data.get('results', [])
        if query == 'umami' and results: raise SystemExit('FAIL: noise query returned projects')
        print(json.dumps({'query':query, 'run':repeat+1, 'results':len(results), 'requestMs':elapsed,
            'serverMs':data.get('totalMs'), 'cached':data.get('cached', False),
            'lexicalOnly':data.get('lexicalOnly', False), 'semanticUnavailable':data.get('semanticUnavailable',False)}))
print('Read-only checks complete. Compare uncached/cached times; these few requests are not a load test.')
PY
