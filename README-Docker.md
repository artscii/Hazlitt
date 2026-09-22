> This older guide is retained for reference. Use [VPS deployment](docs/VPS-DEPLOYMENT.md) for the current Atlas, QMD, HTTPS and database migration procedure.

# Hazlitt Creek Evidence Atlas — Docker

Requires Docker Compose (or compatible Podman Compose) and Node.js 24 or newer for password setup.

1. Run `node scripts/password.mjs` and enter the admin password you want (the hosted atlas uses Bombo). This writes a local, ignored `.env` containing a salted hash.
2. Run `docker compose up --build -d`.
3. Open http://localhost:8081.

Admin appears above the footer. Unlock to add, edit or delete projects, choose countries, and restore versions in the edit log. Restoring creates a new version and preserves history. Exact normalized project names are blocked; shared evidence links trigger a possible-duplicate warning.

Records, sessions and edit history persist in the `atlas-data` volume. Normal restarts and rebuilds retain them. Do not run `docker compose down -v` unless you intend to erase the local database. Back up the database volume before maintenance.

The local container database is separate from the hosted atlas database. IP logging uses the immediate network peer in Docker; behind a proxy this can be the proxy address. The hosted site uses the platform-provided visitor IP. Logs are visible only after admin login. Keep the local service bound to localhost unless you configure HTTPS and an appropriate reverse proxy.

The runtime uses Node built-in SQLite; no external database is needed. The Docker recipe has been reviewed but was not executed on a Docker engine in this workspace.
