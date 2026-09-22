# Public QMD service deployment

Status: deployment files prepared; no server provisioned and container build not yet verified.

Build from repository root: `docker build -f pilot/Dockerfile -t hazlitt-qmd .`.
Run behind managed HTTPS with a persistent volume mounted at `/data`. Configure:

- `QMD_SERVICE_TOKEN`: randomly generated secret of at least 32 characters, stored in the hosting secret manager.
- `ATLAS_CATALOG_URL`: `https://cervical-screening-evidence-atlas.rubric.chatgpt.site/api/catalog`
- `PORT`: internal service port, default 8080.

Configure the Atlas Worker with `QMD_SERVICE_URL` (HTTPS service base URL) and the same `QMD_SERVICE_TOKEN` as a protected secret. Never place this secret in frontend assets, the repository, or public build arguments.

The service reads the public catalogue, refreshing at most once per minute; the index whitelist excludes edit notes, administrator credentials and analytics. It cannot modify the Atlas database. The persistent volume stores models, the index, and generated search documents. Allow outbound HTTPS for model downloads and catalogue fetches. Health endpoint `/health` indicates HTTP process availability, not model readiness. Warm and test a real authenticated query before routing public traffic. Native CPU runtime and memory capacity must be verified on the selected host.

Search is serialized and globally limited to a burst of 12 requests and 12 per minute thereafter. Add per-client limits at the hosting edge before launch. Cold model loading may exceed the client's eight-second limit, triggering keyword fallback. Keep the service running; avoid scale-to-zero until cold-start performance is measured. Do not enable verbose query logging.

Release checklist: build container; provision volume and HTTPS; set secrets; warm models; verify known-country results and catalogue refresh; configure Worker; deploy Atlas; verify actual public QMD results; simulate service failure and confirm keyword fallback. Remove the Worker QMD settings to disable semantic search without changing records.
