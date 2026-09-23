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

## Enable QMD (current: 4.13.7)

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
dc up -d --build atlas qmd
dc ps
```

Initial downloads and indexing can take several minutes. The CPU-only warning is expected. A healthy QMD container proves HTTP availability, not search readiness. Since 4.13.5, the service warms automatically on startup and retries failed warm-up at roughly 30-second intervals. Do not launch the manual warm command during startup: it competes for the same search slot. Wait for readiness first. For the verified catalogue, `screening country:Kenya` returns one project. Do not require that fixture if your catalogue differs.

```bash
# Repeat until ready is true; warming can take minutes on the first install.
curl -fsS https://vps-f8d31735.vps.ovh.ca/api/search/status

# Once ready, verify a real query:
curl -sS --max-time 20 https://vps-f8d31735.vps.ovh.ca/api/search/query \
  -H 'Origin: https://vps-f8d31735.vps.ovh.ca' \
  -H 'Content-Type: application/json' \
  --data '{"query":"screening country:Kenya","scope":{},"deep":false}' \
  -w '\nHTTP status: %{http_code}\n'
```

Expect HTTP 200 and `kinondo` in `results`. In the browser, verify the green cloud, matching profile and Kenya marker. There is no A/B mode or semantic status text line. Refresh older browser tabs after upgrading from pre-4.13.7 endpoints. Cached responses retain original retrieval timing; `totalMs` describes the current server request, excluding browser/network overhead.

## Fallback and recovery test

During a short maintenance test:

```bash
dc stop qmd
```

Search plain `Kinondo` in the browser. Verify the crossed-out cloud and correct keyword profile/map results. Restart even if the test fails:

```bash
dc start qmd
# Automatic warm-up runs on startup. Repeat this check until ready is true.
curl -fsS https://vps-f8d31735.vps.ovh.ca/api/search/status
```

Refresh the browser and retest semantic search. Browser timeout is eight seconds; the server's QMD timeout is 7.5 seconds. Immediate errors can trigger fallback sooner. The browser uses keyword search for a 30-second cooldown after failure; a successful readiness poll clears it earlier. Visible pages check readiness every 15 seconds and on focus. Current fallback does not fully interpret QMD inline filter syntax. Cold or uncached CPU searches may exceed the timeout; investigate before promising consistent semantic performance. QMD also serializes searches and limits requests; concurrent callers may fall back.

## Updates and rollback

Before updating, make a verified database backup and record `git rev-parse HEAD`. Keep `.env`, the local DNS override and volume names unchanged. Do not use `docker compose down -v` or prune the data volumes.

```bash
git status --short
git pull --ff-only
dc up -d --build atlas qmd
dc ps
```

Wait for `/api/search/status` to report `ready: true`, then repeat health, catalogue, login and search tests. For a confirmed Atlas-only UI change, `dc up -d --build --no-deps atlas` preserves the warmed QMD process. API or QMD changes require rebuilding both services. A GitHub push alone does not update the VPS. To roll back code, check out the recorded known-good commit only after resolving local changes, rebuild and recreate the services with the same volumes. Check database migration compatibility first: a code rollback does not undo migrations.

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

## Keeping QMD warm and measuring performance

QMD warms automatically on startup and retries failed warm-up every 30 seconds.
The pinned QMD 2.8.3 per-store runtime keeps its embedding weights and context
resident; container memory limits still apply. Readiness polls inspect state
without repeatedly embedding a probe. Metadata-only queries and exact project
names/IDs avoid semantic inference. Other searches retain the bounded cache.
Up to three requests may wait for the single search slot, for at most two seconds;
overflow returns 429 so Atlas can use keyword fallback.

After deploying, inspect `docker stats --no-stream` alongside Compose logs.
`QMD_PROFILE` separates loading, context setup, embedding and retrieval;
`QMD_REQUEST` reports HTTP status, elapsed time, process CPU time and RSS memory.
Logs do not include query text. Compare first-start and warm searches, then repeat
a query for a cache hit. Persistent high memory, restarts/OOM or repeated 429/503
responses warrant capacity review. These logs are diagnostics, not an alerting service.


### Practical performance checks

Keep the VPS and QMD container running; avoid scale-to-zero and scheduled QMD restarts. The pinned runtime disables model/context idle unloading, so periodic synthetic searches are unnecessary. Persist `qmd-data`: it retains downloaded models and the index across rebuilds, but process memory still has to warm after a restart. A green cloud confirms sampled readiness, not a guarantee that every query meets the timeout.

Use these commands from `~/apps/Hazlitt` after defining `dc` above:

```bash
curl -fsS https://vps-f8d31735.vps.ovh.ca/api/search/status
dc logs --since=10m qmd | grep -E 'QMD_PROFILE|QMD_REQUEST|QMD readiness'
sudo docker stats --no-stream
dc ps
```

Try two different natural-language searches, then repeat one. A unique query exercises inference; a repeat may use the result cache. Country-only filters and exact names/IDs bypass inference and are not useful model benchmarks. `dc exec qmd node pilot/warm.mjs` remains an optional diagnostic **after** startup readiness, not a recurring warm-up job.

- `modelLoadMs` and `contextSetupMs`: startup work; expect near zero on warm requests.
- `embeddingMs`: query inference; `vectorLookupAndOverheadMs`: the remaining vector retrieval work.
- `catalogMs`, `indexMs`, `queueMs`: catalogue refresh, index synchronization and contention.
- `QMD_REQUEST.totalMs`, HTTP status, `cpuMs`, `rssMB`: overall service request and process resource diagnostics. CPU is process-wide, not a per-query isolated measurement.
- `cached: true`: no new query inference; use current total time rather than retained original retrieval timings.

The observed VPS cold readiness was about 10 seconds, versus 0.25–1.23 seconds for warm query processing. These are observations, not a service guarantee. Current QMD limits are 5 GB RAM and 3 CPUs; leave room for Atlas, Caddy and Debian. Check for OOM/restarts before increasing memory limits. Repeated 429s indicate queue/rate pressure; 503s/timeouts require log inspection. Do not simply raise timeouts to conceal a cold-start or capacity problem.

Operational logging is provided; automatic alerts and offsite backups still need separate configuration. Keep logs access-controlled and use Docker log rotation to bound disk usage.

## Country geolocation for VPS visitor statistics (4.13.13)

Atlas now looks up visitor countries locally with `geoip-country` (IPv4 and IPv6). No IP is sent to a third-party lookup API, and visitor analytics store only the resulting country code, not the raw IP. Country is approximate: VPNs, mobile networks and proxies can change it. Private/unmapped addresses return Unknown. Previous Unknown visits cannot be reconstructed; existing active sessions keep their original country.

For the documented **host Caddy → loopback-published Atlas container** topology, add this line to `.env` (edit an existing value rather than adding duplicates):

```dotenv
CADDY_PROXY_MODE=1
```

Caddy normally supplies `X-Forwarded-For`. Atlas trusts only one immediate loopback/private proxy hop and takes the nearest forwarded client address, not an arbitrary leftmost value. It replaces any inbound `CF-IPCountry` with the local lookup. Leave proxy mode off for direct deployments. Do not enable it on an exposed container or untrusted shared private network. Keep `127.0.0.1:8081:8080`; additional upstream CDNs/proxies require a separate trust review. Administrator audit-IP behavior is unchanged.

```bash
cd ~/apps/Hazlitt
git pull --ff-only
# Edit .env and set CADDY_PROXY_MODE=1 for this Caddy topology.
nano .env
sudo docker compose -f compose.yaml -f compose.qmd.yaml -f compose.qmd-dns.yaml up -d --build --no-deps atlas
```

Verify with a new private-browser session on the public HTTPS URL, while logged out of Admin, then open a project. In a separate authenticated Admin session, inspect visitor statistics. Authenticated admins, bots, Do Not Track and Global Privacy Control requests are excluded. SSH-tunnel visits can remain Unknown. If public visits are still Unknown, check Caddy forwarding and proxy-mode configuration; do not reset analytics or trust arbitrary country headers to fix it.

The dependency bundles a country database; rebuilding a pinned dependency does not guarantee fresh data. Periodically review and update the pinned `geoip-country` package in a tested repository release, then rebuild Atlas. No automatic database refresh has been configured. Preserve the package's data licensing and attribution: this product includes GeoLite2 data created by [MaxMind](https://www.maxmind.com/), distributed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). See the dependency README for supported database update options.

## Umami analytics (4.13.14 onward)

The Admin analytics section now links to a separately authenticated Umami dashboard. Old visit history is not migrated; its SQLite tables remain unused by the new tracker. Umami stores new data in a separate PostgreSQL volume. Atlas database backups do **not** include this volume. This replaces the visitor-country collection workflow described earlier: Umami uses its own geolocation database and trusted client-IP header.

The optional `compose.umami.yaml` pins Umami 3.4.0, adds PostgreSQL 16, health checks, restart policies, log rotation and resource limits (1 GB for Umami, 512 MB for PostgreSQL). Database ports are not published; Umami binds only to localhost:8082. QMD retains its existing model volume and warm process. Monitor `docker stats` on the 8 GB VPS; these caps are limits, not guarantees of performance.

### First-time setup

Run on the VPS:

```sh
cd ~/apps/Hazlitt
git pull --ff-only github main
sudo docker run --rm --user "$(id -u):$(id -g)" -v "$PWD:/work" -w /work node:24-alpine node scripts/umami-setup.mjs
sudo docker compose -f compose.yaml -f compose.qmd.yaml -f compose.qmd-dns.yaml -f compose.umami.yaml up -d umami
```

Use your actual remote name (`git remote -v`); replace `github` with `origin` if necessary. The setup script generates secrets in `.env` with restricted permissions and preserves existing values. Keep these secrets backed up securely; do not commit `.env` or regenerate the PostgreSQL password after initialization.

Before exposing the dashboard, open an SSH tunnel **on your Mac**, keeping its terminal open:

```sh
ssh -N -L 8099:127.0.0.1:8082 debian@vps-f8d31735.vps.ovh.ca
```

Open http://127.0.0.1:8099. Log in with Umami's initial `admin` / `umami` credentials and immediately change the password. Add a website named Hazlitt Creek Evidence Atlas with domain `vps-f8d31735.vps.ovh.ca`. Copy its website UUID. In the VPS `.env`, add:

```dotenv
UMAMI_WEBSITE_ID=replace-with-the-website-uuid
UMAMI_DASHBOARD_URL=https://vps-f8d31735.vps.ovh.ca:8443/
```

After changing the password, review `deploy/Caddyfile.umami`. It preserves the Atlas route, serves only the tracker and collection endpoint under `/metrics/`, and exposes the password-protected dashboard on HTTPS port 8443. No custom domain is required. It overwrites the analytics client-IP header with the real peer address; this configuration assumes Caddy directly receives internet traffic, with no additional proxy or CDN.

```sh
sudo cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.before-umami
sudo cp deploy/Caddyfile.umami /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
sudo docker compose -f compose.yaml -f compose.qmd.yaml -f compose.qmd-dns.yaml -f compose.umami.yaml up -d --build --no-deps atlas
```

Allow inbound TCP 8443 in any active host/OVH firewall for dashboard access. Leave 8081, 8082 and PostgreSQL private. Public visitors continue using ordinary HTTPS 443. Do not replace a customized Caddy configuration without merging its existing routes.

### Verify and operate

```sh
curl -fsS http://127.0.0.1:8082/api/heartbeat
curl -fsS https://vps-f8d31735.vps.ovh.ca/api/analytics/config
curl -fsS https://vps-f8d31735.vps.ovh.ca/metrics/script.js -o /tmp/atlas-umami-tracker.js
sudo docker compose -f compose.yaml -f compose.qmd.yaml -f compose.qmd-dns.yaml -f compose.umami.yaml ps
```

Anonymous config should report `enabled:true`. In a private browser window without a privacy opt-out, visit Atlas and open a project. Confirm a visit and `project-view` event (property `project_id`) in Umami. Confirm Admin's dashboard link opens the protected dashboard. Admin sessions, `/admin`, Do Not Track and Global Privacy Control opt-outs do not load the tracker. URLs sent by this integration omit search strings, fragments and referrers. Ad blockers may also prevent collection. Umami's country/device charts replace the old built-in graphics. No project descriptions or admin edit fields are sent.

For subsequent Atlas-only updates, retain all four Compose files and use `up -d --build --no-deps atlas`; this does not restart QMD. To update Umami, deliberately change its pinned image after checking release notes, back up PostgreSQL, pull and recreate only Umami. Do not use `down -v` on production.

Back up analytics separately:

```sh
mkdir -p ~/hazlitt-backups
chmod 700 ~/hazlitt-backups
sudo docker compose -f compose.yaml -f compose.qmd.yaml -f compose.qmd-dns.yaml -f compose.umami.yaml exec -T umami-db pg_dump -U umami -d umami -Fc > ~/hazlitt-backups/umami-$(date +%Y%m%d-%H%M%S).dump
chmod 600 ~/hazlitt-backups/umami-*.dump
```

Copy backups off the VPS securely and verify restores in a separate PostgreSQL instance. The former 365-day cleanup does not apply to Umami; establish a retention policy and monitor database size. To disable new tracking, clear `UMAMI_WEBSITE_ID` and recreate Atlas with all four Compose files. The site continues working if Umami is unavailable.

Local validation uses an isolated disposable Compose project: `node tests/umami-ui.mjs`, `node tests/analytics.mjs` after building, and `node tests/umami-container.mjs` against loopback:8082 with the test stack's default credentials. Never run the container test against production. Official references: https://docs.umami.is/docs/install and https://docs.umami.is/docs/environment-variables.

## Search events, heatmaps and replay (4.13.16)

For an already configured Umami deployment, update the repository and Caddy routes, then rebuild only Atlas:

```sh
cd ~/apps/Hazlitt
git pull --ff-only
sudo cp /etc/caddy/Caddyfile "/etc/caddy/Caddyfile.backup-$(date +%Y%m%d-%H%M%S)"
sudo cp deploy/Caddyfile.umami /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile && sudo systemctl reload caddy
sudo docker compose -f compose.yaml -f compose.qmd.yaml -f compose.qmd-dns.yaml -f compose.umami.yaml up -d --build --no-deps atlas
```

Merge rather than replace Caddy if you have added custom routes. The new routes expose only `/metrics/recorder.js`, `/metrics/api/record`, and UUID-specific recorder configuration in addition to the existing tracker routes. QMD, Umami and PostgreSQL do not need restarting.

In Umami, edit the Atlas website and open **Replays & Heatmaps**. Enable both features. Set replay sample rate to **0.15**, mask level **moderate**, maximum duration **300000 ms**. Keep inputs masked. Heatmap sampling is independently configurable; begin at 15% and adjust to traffic/storage needs. Umami manages recorder settings; merely updating Atlas does not enable recording in Umami.

Test:

1. Confirm the Atlas footer reads 4.13.16. Check `curl -fsS https://vps-f8d31735.vps.ovh.ca/metrics/recorder.js -o /tmp/atlas-recorder.js` succeeds.
2. In a fresh browser session without an Atlas Admin login or privacy opt-out, search `Kenya`, then a phrase with no matches. Pause after results settle. Umami should show `project-search` events with query, result_count, engine and origin. Search content is retained without email/phone filtering. URLs in standard event payloads still omit query strings.
3. Click a map marker or continent button and confirm a search event with origin `map`. Initial default selection is not counted as an intentional search. Repeating the same completed search consecutively should not inflate counts.
4. For deterministic replay testing, temporarily set replay and heatmap sample rates to **1**, save, and use a new browser session. Click, scroll and navigate to a project; leave the page to flush pending events. Check Replays and Heatmaps in Umami. Verify inputs are masked and no Admin form is recorded. Return both rates to **0.15** afterward.
5. Check search remains responsive and the QMD readiness indicator still works. Run `sudo docker stats --no-stream` and monitor PostgreSQL disk usage as traffic grows. Replay data is materially larger than normal analytics.

If recording is absent, check browser network requests to `/metrics/api/websites/<website-id>/recorder` and `/metrics/api/record`; configuration must be enabled and requests successful. Sampling, opt-outs and ad blockers can explain absent sessions. Umami documents 30-day replay storage; monitor your self-hosted storage and backups. Heatmaps combine page states, so use replay to interpret moving map markers and filtered cards. No old history is backfilled.
