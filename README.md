> For the complete Debian/OVH installation and operations runbook, see [VPS deployment](docs/VPS-DEPLOYMENT.md).

# Hazlitt Creek Evidence Atlas

An interactive evidence atlas of AI-assisted cervical cancer screening and related early-intervention programmes, with particular attention to underserved communities. Readers can explore projects by geography, search the evidence, compare reported outcomes, and follow published sources and contact information. A separate administrator interface supports controlled editing and record history.

**[Open the published Atlas](https://cervical-screening-evidence-atlas.rubric.chatgpt.site/)** · [Change history](CHANGELOG.md)

## Technical goals

- Make geographically distributed evidence easy to find on desktop and iPhone, with responsive layouts, keyboard-accessible controls, readable contrast and reduced-motion support.
- Keep search fast and explainable: full-text matching includes outcomes and supporting fields; visible highlights and contextual excerpts explain matches. Configured deployments use QMD hybrid retrieval with browser-side keyword fallback; WebLLM is not used.
- Keep map markers, search results, project previews and location summaries synchronized. Searches hide markers outside the matching subset while preserving marker positions.
- Preserve evidence context: distinguish patient examinations from slide/image studies, record publication years and sample denominators, retain caveats, and track follow-up notes and dates.
- Support English summaries alongside retained original-language descriptions, rather than discarding source-language context.
- Make editorial changes reviewable and reversible through record versions, field differences, restoration, and audited bulk operations.
- Keep operational complexity low by sharing one request handler between hosted and local deployments.

The Atlas organizes reported evidence; inclusion does not itself establish clinical effectiveness or suitability for deployment. Outcome definitions, study populations and validation settings should be checked in the linked reports.

## Semantic search

The [QMD service](pilot/README.md) adds controlled semantic ranking to immediate BM25 results, with geography/year filters, readiness checks and profiling. Direct matches precede approved equivalents; QMD only ranks grounded related-concept candidates. Unrelated nearest neighbours are not admitted. BM25 remains available when QMD is unavailable. There is no A/B testing mode.

## Tools and architecture

| Layer | Implementation | Purpose |
| --- | --- | --- |
| Browser interface | Vanilla JavaScript, HTML and CSS | Public Atlas and admin forms; no React, Vue, Next.js or other UI framework |
| Map | SVG, geographic data and custom JavaScript | Country outlines, continent filtering, stable offset markers and project previews |
| Search | Custom browser-side full-text index (`dist/search.js`) | Keyword, geography and year matching without model downloads or AI inference |
| Application server | JavaScript using the Fetch API | JSON endpoints, authentication, records, version history, imports and analytics |
| Hosted runtime | Sites hosting, Cloudflare Worker-compatible output and D1 binding | Published application and persistent hosted SQLite data |
| Local runtime | Node.js 24+, `node:http`, `node:sqlite` | Runs the same application against a local SQLite database |
| Database tooling | Drizzle ORM schema definitions and Drizzle Kit | Schema definition and SQL migration generation; request handlers use SQL through the database binding |
| Excel transfers | ExcelJS 4.4.0 and a browser Web Worker | Spreadsheet import/export, validation and downloadable diff reports |
| Testing | Node.js assertions and JSDOM | Server behaviour and simulated browser interactions |
| Packaging | Custom Node build script; Docker Compose recipe | Embeds browser assets in the Worker build and supports local packaging |
| Source control | Git and GitHub | Source history and collaboration |

The build script generates the admin page from the public page's shared header/footer, copies the ExcelJS browser bundle, and embeds assets, seed data and server modules into `dist/server/index.js`. Local execution adapts the database binding to Node's SQLite API.

## Main capabilities

- Continent/country exploration, filtered project listings and shareable project URLs.
- Full-text search, blue match highlighting and excerpts for matches in otherwise hidden fields.
- Reported outcomes, evidence status, sources, sponsors, contacts and follow-up fields.
- Password-protected administration, project-number lookup and navigation through search subsets.
- Field-level version comparisons and restoration that preserves history.
- Excel dry runs and diff previews before import; unchanged duplicates are skipped, while proposed updates require review. Import undo protects against overwriting subsequent edits.
- Configurable colour palettes and page transitions.
- Lightweight country/device/project-interest analytics with 365-day visit-detail retention and administrator reset controls.

## Run locally

Use **Node.js 24 or newer** and npm. From the repository root:

```sh
npm ci
node scripts/password.mjs
npm run build
npm start
```

Open **http://localhost:8080/**; the editor is at **/admin**. The password helper writes a salted hash to the ignored `.env` file. Never commit passwords, `.env`, session data or database files.

To use another port and data directory:

```sh
PORT=8094 DATA_DIR=.local-data npm start
```

The default database is `.local-data/atlas.sqlite`. Startup applies pending SQL migrations. The local database and hosted database are separate: cloning this repository does **not** copy the live catalogue. Seed records initialize a fresh database; use the Atlas's Excel tools to transfer records intentionally.

The local server loads the generated Worker at startup. After changing application files, run `npm run build` and restart the server, then refresh the browser.

## Making the database persistent

Persistence is already supported. The essential requirement is to keep the **same durable database location** across restarts and deployments. Persistence and backups solve different problems: persistence retains normal changes; backups protect against accidental deletion, corruption or unwanted edits.

### Local Node.js installation

`server/local.mjs` stores SQLite in `DATA_DIR/atlas.sqlite`, defaulting to `.local-data/atlas.sqlite` relative to the directory from which the server starts. For a durable installation, use an **absolute path outside the source checkout** on a persistent disk:

```sh
mkdir -p "$HOME/Library/Application Support/Hazlitt"
DATA_DIR="$HOME/Library/Application Support/Hazlitt" PORT=8094 npm start
```

Set that same `DATA_DIR` in your service or startup configuration every time. Avoid `/tmp`, `/private/tmp`, temporary preview directories and disposable build folders. The development preview may use a temporary database; do not treat that as permanent storage.

If you already have records, setting a new directory alone will create a separate database. To move the existing database, stop the app and any other processes using it, copy the existing data directory to the durable location, then restart with the new `DATA_DIR`. Keep the old copy until you have verified the records, login and history. Do not replace an existing target database without first backing it up.

### Docker / Compose

The supplied Compose configuration already maps the named volume `atlas-data` to `/data`, and the container sets `DATA_DIR=/data`. Once the Docker build limitation noted below is corrected, that volume retains the database across container restarts, rebuilds and replacement containers using the same volume.

- Keep the Compose project name stable; changing it can create a different project-prefixed volume and make the app appear empty.
- Ordinary `docker compose down` retains named volumes. **Do not use `docker compose down -v` or delete/prune the database volume** unless you intend to erase its data.
- For storage with an explicit host location, replace the service's volume mapping with a bind mount such as `/srv/hazlitt-data:/data`. Create that directory on a persistent disk and ensure the container's `node` user can write to it.
- For a volume managed separately from this Compose project, provision a named volume and declare it `external: true` with an explicit `name`. Migrate existing data before switching mounts.

Do not store the database only in the container's writable layer: replacing that container would lose it. On a cloud VM, the volume or bind mount must ultimately reside on storage that survives VM replacement if that is part of your deployment process.

### Hosted Atlas

The published app uses the persistent D1 database exposed as `env.DB`; `.openai/hosting.json` declares its logical binding as `"d1": "DB"`. Reuse the existing Sites project and database binding when publishing new application versions. Browser storage, the Git repository and the Worker bundle are not the production database.

When deploying to another provider, explicitly provision a persistent database and configure the application binding or adapter. A newly created site, a different binding or a fresh local database does not automatically inherit the hosted records. Plan a separate data migration and verify it before switching users to the replacement deployment.

### Backups and recovery

In **Admin → DB backup**, choose **Download complete DB backup** to export the application schema and every application table as a portable `.sql` file. This includes records (including unedited seed projects and deleted-record state), version/audit history, settings, import history, analytics, password hashes and sessions. Keep it private. Unsaved edits and hosting-provider metadata are excluded.

Restore into a new, empty SQLite database:

```sh
sqlite3 restored.sqlite < Hazlitt-DB-backup.sql
```

Use the actual downloaded filename. The final integrity check should return `ok`. Stop the target app before replacing its database, preserve the old database, and place the restored file at `DATA_DIR/atlas.sqlite`. Use the same application version or a compatible newer version. The backup includes migration tracking for the local adapter. To invalidate transferred login sessions, run `DELETE FROM sessions;` against the restored database. Hosted imports require the provider's supported database import tools; the admin UI downloads backups but does not overwrite a running database.


- Back up the **whole database**, not just the project catalogue: it also contains versions, audit/import history, configuration and authentication state.
- For local SQLite, use a SQLite-aware backup operation for online backups. For a simple offline backup, stop all database users and copy the complete data directory, including any `atlas.sqlite-wal` and `atlas.sqlite-shm` companion files present. Copying only the main file while the app is running can miss recent transactions.
- Store dated backups on a separate durable location with restricted access; automate a schedule appropriate to how often records change. Protect backups as sensitive administrative data and periodically test a restore into an isolated instance.
- For hosted D1, arrange database backups/exports through the hosting platform's supported management tools. This repository does not configure an automatic hosted backup schedule.
- The admin Excel export is useful for record transfer and an additional catalogue snapshot, but **it is not a full database backup** and does not reproduce the complete version history, sessions or credential state.
- Before restoration, stop writes and preserve a copy of the current database. Restore into the configured persistent location, check permissions, then verify records, version history and admin access before reopening the app.

## Catalogue export snapshot

The user-provided [Excel catalogue export dated 2026-09-22](data/exports/Hazlitt-Creek-Atlas-2026-09-22.xlsx) is retained unchanged in `data/exports/`. It is a dated record snapshot, not a live database connection or a complete database backup. Use the admin **Test import** / **Preview import** workflow to review duplicates and proposed changes before importing it into another Atlas instance. Adding this file to the repository does not import it into the running app.

## Repository layout

| Path | Contents |
| --- | --- |
| `dist/index.html`, `dist/style.css` | Authored public page and shared styles |
| `dist/app.js`, `dist/search.js` | Public interactions, map synchronization and search |
| `dist/admin.js` | Editing, draft tracking and record-version interface |
| `dist/transfers.js`, `dist/spreadsheet-*.js` | Excel UI, worker and formatting helpers |
| `server/` | Shared request handler, transfer/analytics logic and local adapter |
| `db/schema.ts`, `drizzle/` | Database schema and versioned SQL migrations |
| `data/` | Seed catalogue and country metadata |
| `scripts/` | Build and password-setup utilities |
| `tests/` | Behavioural checks |
| `research/`, `docs/` | Research and supporting project documentation |
| `.openai/hosting.json` | Existing Sites project and logical database binding |

**Build distinction:** most browser files under `dist/` are maintained source files in this project. Do not delete that directory as disposable build output. `dist/admin.html` is generated from the shared shell; `dist/server/` and copied runtime bundles are generated artifacts.

## Validation and database changes

After installing dependencies and building, run the relevant checks:

```sh
node tests/search.mjs
node tests/search-ui.mjs
node tests/admin.mjs
node tests/backup.mjs
node tests/transfers.mjs
node tests/analytics.mjs
node tests/palettes.mjs
```

JSDOM checks do not replace visual testing in desktop and mobile browsers. For schema changes, edit `db/schema.ts`, run `npm run db:generate`, review the generated SQL and rebuild. Back up persistent data before applying changes to a production environment.

## Authentication and deployment notes

Admin passwords are stored as salted PBKDF2-SHA-256 hashes. `ADMIN_PASSWORD_HASH` bootstraps the persistent credential record; later authentication reads that database record. Replacing the environment value alone is therefore not a password-reset procedure for an initialized database.

Hosted releases use the existing Sites project identified in `.openai/hosting.json`. A GitHub push updates source control; it does not by itself publish the hosted site or synchronize its database.

Docker-related files are provided in `Dockerfile`, `compose.yaml` and [README-Docker.md](README-Docker.md). The Compose mapping is `127.0.0.1:8081:8080`, with a named data volume. The Dockerfile installs locked dependencies and checks source access as the non-root runtime user. The older Docker guide also predates the separate admin page and current version-history UI.

The local server is intended for development. Before exposing it beyond a trusted local environment, configure appropriate HTTPS, access controls, proxy handling and database backups.

### Umami analytics

Release 4.13.14 replaces the built-in visitor dashboard with an Admin link to optional, self-hosted Umami. Docker runs Umami and PostgreSQL separately from Atlas SQLite and QMD. New analytics start fresh; old visit history is not migrated. Follow [the VPS Umami setup guide](docs/VPS-DEPLOYMENT.md#umami-analytics-41314-onward) before enabling tracking. PostgreSQL requires its own backups.

### Search, heatmaps and session replay (4.13.16)

Umami receives `project-search` events after completed searches settle for 900 ms: `query`, `result_count`, `engine` (`qmd`/`keyword`) and `origin` (`typed`/`map`). Consecutive duplicate events are suppressed. Search text is not redacted; avoid entering personal information. Tracking excludes authenticated Admin visitors, Admin pages and browser privacy opt-outs.

The recorder supports click/scroll heatmaps and session replay. Enable these separately in the website's Umami settings; replay and heatmap sampling are now set to 100%, moderate input masking and a five-minute maximum. New Caddy collection routes must be deployed. See the VPS guide for activation and testing. This records the Atlas page, not other browser tabs.

### Public interaction event catalogue (4.13.19)

Events now include `map-marker-selected`, `continent-selected`, `project-read`, `project-list-end`, `evidence-link-clicked`, `contact-clicked`, `back-to-map`, `references-opened`, `reference-expanded`, `language-switched`, `share-copied`, `share-copy-failed`, `search-cleared`, `search-no-matches`, `search-fallback` and `catalogue-failed`. Existing `project-search` and `project-view` remain. Search events include elapsed milliseconds from the latest user input to the result update. A `project-read` requires 50% visibility for one second and is deduplicated per page; it measures exposure, not comprehension. Contact clicks do not prove a completed call/email. Automatic defaults and hover are not counted as intentional clicks.

Replay and heatmap sampling are **100% of eligible sessions**, configured in Umami rather than the Atlas repository. Admin and privacy exclusions still apply. Moderate masking and five-minute recording limits remain. Monitor PostgreSQL growth and maintain separate analytics backups.

### Search relevance and performance (4.13.21)

Admin → Configuration → Search includes an editable, versioned thesaurus. Equivalents expand lexical matching; related terms nominate candidates for QMD ranking. Review these mappings as editorial rules, not clinical assertions. Disabled entries have no effect. Restoring an older vocabulary creates a new revision when saved; concurrent edits are rejected. Public relevance excludes editor notes and source URLs.

Text searches use relevance order; geographic browsing retains project-number order. The map and list share the returned subset. The browser shares configuration/catalog requests, separates reusable map geometry, and caches search work. Versioned assets use immutable caching. QMD refreshes its snapshot in the background, retains models, coalesces duplicate work and bounds its queue. VPS database backups stream from a consistent read transaction.

Validation: automated relevance, service, queue, Admin, transfer, backup and responsive UI checks passed against the 53-project review snapshot. Noise queries `umami` and `unami` returned zero; `Kinondo Kwetu` returned one; `colposcopy` returned seven including an approved equivalent. Local native-model initialization failed and Docker was unavailable, so Linux container/model smoke tests remain required before production acceptance.

### Admin workspace (4.13.22)
Projects is the default workspace. Search accepts an exact project number or descriptive text, with numerically ordered matches and previous/next navigation. Data management groups Excel operations and SQL backups. Configuration separates Search/thesaurus, transitions and appearance. Vocabulary saves independently. Version history starts collapsed; switching workspace preserves the project draft. Analytics opens Umami in a separate tab.
