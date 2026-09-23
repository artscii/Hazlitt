# QMD deployment

Use the maintained [Debian/OVH VPS runbook](../docs/VPS-DEPLOYMENT.md) for the complete Atlas and QMD deployment. The `pilot/` directory name is retained only for deployment compatibility; this is the production semantic search service.

Current release: 4.13.7. Rebuild Atlas and QMD together when upgrading the search API. Public endpoints are `/api/search/query` and `/api/search/status`; the gateway keeps the QMD bearer token private. The service stays on the private Docker network, with a persistent `/data` volume and outbound HTTPS for catalogue/model downloads.

Warm-up runs automatically at startup. Model weights and embedding contexts remain resident; readiness checks do not repeatedly run embeddings once warm. `/health` is process liveness, not model readiness. Wait for the public status endpoint to report `ready: true` before testing semantic queries. Avoid periodic restarts or external keep-alive searches.

The runbook includes rebuild commands, DNS overrides, fallback verification, profiling, resource monitoring, database backup and rollback guidance. Never commit service tokens, password hashes or production database exports.
