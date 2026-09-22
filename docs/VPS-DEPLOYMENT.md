# Deploying Hazlitt on a Debian VPS

This runbook deploys the complete Atlas, persistent SQLite database, and CPU-based QMD search on one VPS. It records the OVH Debian 12 deployment verified on 22 September 2026: public HTTPS, administrator login, 53 restored projects, QMD retrieval, synchronized map results, and keyword fallback/recovery. Replace the example hostname and address for other servers. No passwords or database exports belong in Git.

## Architecture and requirements

Use an x86-64 Linux VPS with Docker Engine and Compose v2. The verified server has 8 GB RAM and four CPUs. QMD is limited to 5 GB and three CPUs; benchmark larger catalogues or concurrent traffic before increasing load.

| Component | Location | Persistence and access |
|---|---|---|
| Caddy | Host service, ports 80/443 | `/etc/caddy/Caddyfile`; service-managed certificates |
| Atlas | Docker service `atlas` | Host loopback port 8081 to container 8080 |
| SQLite | `/data/atlas.sqlite` in Atlas | Named volume `atlas-data`, Compose-project prefixed |
| QMD | Docker service `qmd`, internal port 8080 | No published port; shared secret authenticates requests |
| Models and index | `/data` in QMD | Named volume `qmd-data` |

Caddy forwards HTTPS requests to Atlas. `PUBLIC_ORIGIN` lets the Node adapter recognize HTTPS without trusting arbitrary forwarded headers. Atlas contacts `http://qmd:8080` only when the explicit private-network setting is enabled. QMD reads the public catalogue over HTTPS and refreshes its catalogue cache at most once per minute. Its index excludes editor notes, credentials and analytics.

## Install prerequisites and obtain source

Run server commands in an SSH session on the VPS. Install Docker using the official Debian instructions: https://docs.docker.com/engine/install/debian/. Keep existing Docker firewall rules intact. Verify:

```bash
sudo docker run --rm hello-world
sudo docker compose version
sudo apt-get update
sudo apt-get install -y git gh python3 sqlite3
```

The GitHub repository is private. Authenticate on the VPS separately from your browser:

```bash
gh auth login
gh auth setup-git
mkdir -p ~/apps
cd ~/apps
gh repo clone artscii/Hazlitt
cd Hazlitt
```

Use GitHub's device login flow; do not put access tokens in clone URLs. The corrected Dockerfiles install build dependencies and normalize source permissions for the non-root runtime user. No manual Dockerfile edits are required.

## Initial Atlas startup

For a fresh installation only, create the administrator hash. The helper displays typed input; run it in a private terminal. Do not rerun it over an existing `.env` because it replaces that file.

```bash
sudo docker run --rm -it --user "$(id -u):$(id -g)" \
  -v "$PWD:/workspace" -w /workspace \
  node:24-bookworm-slim node scripts/password.mjs
chmod 600 .env
```

Add this line to `.env`, retaining the password hash:

```dotenv
PUBLIC_ORIGIN=https://vps-f8d31735.vps.ovh.ca
```

```bash
sudo docker compose up -d --build
sudo docker compose ps
curl -fsS http://127.0.0.1:8081/healthz
```

A new volume starts with seed data, not the production catalogue. For private browser testing, run this on your **Mac**, leaving it open:

```bash
ssh -N -o ExitOnForwardFailure=yes \
  -L 127.0.0.1:8098:127.0.0.1:8081 debian@vps-f8d31735.vps.ovh.ca
```

Open `http://127.0.0.1:8098/`. A quiet SSH terminal after authentication is normal.

## Public HTTPS

Confirm public DNS A and AAAA records match addresses assigned to the VPS. Local `/etc/hosts` may resolve the hostname to 127.0.1.1; use a public DNS resolver to distinguish that from public DNS. Both published IP families must reach the server. Allow ports 80/443 in any host and provider firewall while retaining SSH access.

Install Caddy using https://caddyserver.com/docs/install#debian-ubuntu-raspbian. Back up any existing Caddyfile before replacing it. Configure:

```caddyfile
vps-f8d31735.vps.ovh.ca {
    encode gzip
    reverse_proxy 127.0.0.1:8081
}
```

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl enable --now caddy
sudo systemctl reload caddy
curl -I https://vps-f8d31735.vps.ovh.ca/
sudo journalctl -u caddy --no-pager -n 30
```

Verify public `/admin` login, not only tunnel login. Certificates are issued and renewed automatically by Caddy. Do not expose the Atlas or QMD container ports directly. The server is self-managed: arrange security updates and SSH key access separately.

## Transfer and validate a complete database

Use **Admin → DB backup** on the original installation. Excel is not a complete backup. SQL backups contain credential hashes, sessions, analytics and history; store privately and transfer with SCP, never Git. Check the backup timestamp for freshness.

Create a directory on the VPS with mode 700 and set the uploaded SQL file to mode 600. Restore into a NEW database, substituting the actual SQL path:

```bash
cd ~/hazlitt-migration
umask 077
RESTORED=$(mktemp "$PWD/atlas-restore-XXXXXX.sqlite")
sqlite3 -safe -bail "$RESTORED" < YOUR_BACKUP.sql
sqlite3 "$RESTORED" 'PRAGMA integrity_check; PRAGMA foreign_key_check;'
sqlite3 "$RESTORED" 'SELECT COUNT(*) FROM records WHERE deleted=0;'
printf '%s\n' "$RESTORED"
```

Proceed only with `ok`, no foreign-key errors, and the expected project count. Keep the path printed above. Restoring this file has not changed the running database.

For the cutover, use a shell with `set -e` and set `RESTORED` to the validated absolute path. Discover the volume before stopping Atlas:

```bash
cd ~/apps/Hazlitt
CONTAINER=$(sudo docker compose ps -q atlas)
DATA_PATH=$(sudo docker inspect "$CONTAINER" --format '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Source}}{{end}}{{end}}')
test -n "$DATA_PATH"
sudo test -f "$DATA_PATH/atlas.sqlite"
sqlite3 -bail "$RESTORED" 'DELETE FROM sessions;'
sudo docker compose stop atlas
BACKUP="$HOME/hazlitt-migration/before-restore-$(date +%Y%m%d-%H%M%S).tar"
sudo tar -C "$DATA_PATH" -cpf "$BACKUP" .
sudo chmod 600 "$BACKUP"
DB_OWNER=$(sudo stat -c '%u:%g' "$DATA_PATH/atlas.sqlite")
sudo cp "$RESTORED" "$DATA_PATH/atlas.sqlite.new"
sudo chown "$DB_OWNER" "$DATA_PATH/atlas.sqlite.new"
sudo chmod 600 "$DATA_PATH/atlas.sqlite.new"
sudo rm -f "$DATA_PATH/atlas.sqlite-wal" "$DATA_PATH/atlas.sqlite-shm"
sudo mv "$DATA_PATH/atlas.sqlite.new" "$DATA_PATH/atlas.sqlite"
sudo docker compose start atlas
```

Stop on any error. Removing sidecars is appropriate here only because Atlas is stopped and its complete previous data directory has been archived. Verify catalogue count, public login and a known version history. The restored database determines the administrator password; the bootstrap hash does not overwrite an existing credential.

## Enable QMD

Generate a service secret without displaying it or replacing other settings:

```bash
cd ~/apps/Hazlitt
python3 - <<'PY'
from pathlib import Path
import secrets
p = Path('.env')
text = p.read_text()
if not any(line.startswith('QMD_SERVICE_TOKEN=') for line in text.splitlines()):
    p.write_text(text.rstrip() + '\nQMD_SERVICE_TOKEN=' + secrets.token_hex(32) + '\n')
p.chmod(0o600)
PY
```

The verified OVH setup needed an explicit hostname mapping inside QMD because its catalogue request resolved to 127.0.1.1. Create this local override, substituting your hostname and actual public IPv4:

```yaml
# compose.qmd-dns.yaml
services:
  qmd:
    extra_hosts:
      - "vps-f8d31735.vps.ovh.ca:148.113.251.72"
```

Keep the mapping updated if the IP changes. It preserves HTTPS verification. Use the same Compose files and project directory on every subsequent deployment. Define this convenience function in each new VPS shell:

```bash
dc() { sudo docker compose -f compose.yaml -f compose.qmd.yaml -f compose.qmd-dns.yaml "$@"; }
dc up -d --build qmd
dc exec qmd node pilot/warm.mjs
```

Initial downloads and indexing can take several minutes. The CPU-only warning is expected. A healthy QMD container proves HTTP availability, not search readiness. Warmup must complete successfully. For the verified catalogue, `screening country:Kenya` returns one project. Do not require that fixture if your catalogue differs.

```bash
dc up -d --build --no-deps atlas
dc ps
curl -sS --max-time 20 https://vps-f8d31735.vps.ovh.ca/api/search-pilot/compare \
  -H 'Origin: https://vps-f8d31735.vps.ovh.ca' \
  -H 'Content-Type: application/json' \
  --data '{"query":"screening country:Kenya","scope":{},"deep":false}' \
  -w '\nHTTP status: %{http_code}\n'
```

Expect HTTP 200 and `kinondo` in `b`. In the browser, verify Semantic search, the matching profile and Kenya marker. Cached responses retain original retrieval timing; `totalMs` describes the current server request, excluding browser/network overhead.

## Fallback and recovery test

During a short maintenance test:

```bash
dc stop qmd
```

Search plain `Kinondo` in the browser. Verify keyword fallback status and correct profile/map results. Restart even if the test fails:

```bash
dc start qmd
dc exec qmd node pilot/warm.mjs
```

Refresh the browser and retest semantic search. Browser timeout is eight seconds; the server's QMD timeout is 7.5 seconds. Immediate errors can trigger fallback sooner. The browser uses keyword search for a 30-second cooldown after failure. Current fallback does not fully interpret QMD inline filter syntax. Cold or uncached CPU searches may exceed the timeout; investigate before promising consistent semantic performance. QMD also serializes searches and limits requests; concurrent callers may fall back.

## Updates and rollback

Before updating, make a verified database backup and record `git rev-parse HEAD`. Keep `.env`, the local DNS override and volume names unchanged. Do not use `docker compose down -v` or prune the data volumes.

```bash
git status --short
git pull --ff-only
dc build
dc up -d qmd
dc exec qmd node pilot/warm.mjs
dc up -d --no-deps atlas
dc ps
```

Repeat health, catalogue, login and search tests. A GitHub push alone does not update the VPS. To roll back code, check out the recorded known-good commit only after resolving local changes, rebuild and recreate the services with the same volumes. Check database migration compatibility first: a code rollback does not undo migrations.

For database rollback, stop Atlas, preserve the failed/current data directory separately, and restore the complete pre-change archive into the same volume with its original ownership. Do not merge old WAL/SHM files with a different database. Restart the compatible app version and verify integrity, catalogue and login.

## Backups and operational limitations

Schedule SQLite-aware backups and copy them off the VPS; this repository does not yet configure that automation. A manual offline backup may stop Atlas and archive its entire `/data` directory. A live backup must use SQLite's backup mechanism rather than copying only the main database while writes continue. Test restoration in isolation. QMD's index is rebuildable; the Atlas database and protected configuration are essential. Provider snapshots are an additional layer, not a substitute for tested database backups.

## Troubleshooting

| Symptom | Action |
|---|---|
| `EACCES` under `/app` | Pull corrected Dockerfiles and rebuild; retain non-root runtime user. Do not chmod the whole host or run the service as root. |
| `node-gyp` cannot find Python | QMD image needs Python, compiler and CMake; pull the current Dockerfile. |
| `ECONNREFUSED 127.0.1.1:443` | Use the QMD DNS override and all three Compose files. |
| Public 502 | Check Atlas logs and `curl -I http://127.0.0.1:8081/healthz`; inspect Caddy logs. |
| Invalid request origin | Verify `PUBLIC_ORIGIN` matches the browser HTTPS origin and recreate Atlas. |
| QMD CPU warning | Expected without GPU; inspect logs and `sudo docker stats --no-stream` for progress. |
| Zero filtered results | Compare country-only, exact project name, and combined queries. Current normal retrieval avoids QMD's 20-candidate branch cap. |
| Password differs after restore | Use the credential from the restored database; changing `.env` alone does not reset it. |
| Changed data appears missing | Check Compose project name and actual volume mounts before creating or deleting anything. |

Useful diagnostics:

```bash
dc logs --tail=60 atlas qmd
sudo journalctl -u caddy --no-pager -n 30
sudo docker stats --no-stream
```

Do not share `.env`, raw SQL backups, authorization headers or full rendered Compose configuration containing secrets.
