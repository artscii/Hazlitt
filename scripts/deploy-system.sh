#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Preserve all existing credentials and settings. Never print the new token.
python3 - <<'PY'
from pathlib import Path
import re, secrets
p=Path('.env')
s=p.read_text()
m=re.search(r'^MONITOR_SERVICE_TOKEN=(.*)$',s,re.M)
if not m:
    p.write_text(s.rstrip()+'\nMONITOR_SERVICE_TOKEN='+secrets.token_hex(32)+'\n')
elif len(m.group(1).strip())<32:
    raise SystemExit('Existing MONITOR_SERVICE_TOKEN is too short; replace it with a random token of at least 32 characters.')
p.chmod(0o600)
PY
args=(-f compose.yaml -f compose.qmd.yaml -f compose.qmd-dns.yaml -f compose.umami.yaml -f compose.system.yaml)
for file in compose.qmd-dns.yaml compose.umami.yaml; do test -f "$file" || { echo "Missing existing deployment overlay: $file"; exit 1; }; done
services=(atlas monitor)
if [[ "${1:-}" == "--with-qmd" ]]; then services+=(qmd);
elif [[ -n "${1:-}" ]]; then echo "Usage: $0 [--with-qmd]"; exit 2; fi
revision=$(git rev-parse HEAD)
sudo env ATLAS_SOURCE_REVISION="$revision" docker compose "${args[@]}" build "${services[@]}"
sudo env ATLAS_SOURCE_REVISION="$revision" docker compose "${args[@]}" up -d "${services[@]}"
sudo docker compose "${args[@]}" ps
curl --retry 20 --retry-connrefused --retry-all-errors --retry-delay 3 --max-time 5 -fsS http://127.0.0.1:8081/healthz
printf "\nDeployment started. Check QMD readiness with scripts/verify-performance.sh.\n"
