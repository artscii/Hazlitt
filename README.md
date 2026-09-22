# Hazlitt Creek Evidence Atlas

An interactive evidence atlas of AI-assisted cervical cancer screening and related early-intervention programmes, with particular attention to underserved communities. Readers can explore projects by geography, search the evidence, compare reported outcomes, and follow published sources and contact information. A separate administrator interface supports controlled editing and record history.

**[Open the published Atlas](https://cervical-screening-evidence-atlas.rubric.chatgpt.site/)** · [Change history](CHANGELOG.md)

## Technical goals

- Make geographically distributed evidence easy to find on desktop and iPhone, with responsive layouts, keyboard-accessible controls, readable contrast and reduced-motion support.
- Keep search fast and explainable: full-text matching includes outcomes and supporting fields; visible highlights and contextual excerpts explain matches. The current search does not use WebLLM, an LLM service or semantic embeddings.
- Keep map markers, search results, project previews and location summaries synchronized. Searches hide markers outside the matching subset while preserving marker positions.
- Preserve evidence context: distinguish patient examinations from slide/image studies, record publication years and sample denominators, retain caveats, and track follow-up notes and dates.
- Support English summaries alongside retained original-language descriptions, rather than discarding source-language context.
- Make editorial changes reviewable and reversible through record versions, field differences, restoration, and audited bulk operations.
- Keep operational complexity low by sharing one request handler between hosted and local deployments.

The Atlas organizes reported evidence; inclusion does not itself establish clinical effectiveness or suitability for deployment. Outcome definitions, study populations and validation settings should be checked in the linked reports.

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
node tests/transfers.mjs
node tests/analytics.mjs
node tests/palettes.mjs
```

JSDOM checks do not replace visual testing in desktop and mobile browsers. For schema changes, edit `db/schema.ts`, run `npm run db:generate`, review the generated SQL and rebuild. Back up persistent data before applying changes to a production environment.

## Authentication and deployment notes

Admin passwords are stored as salted PBKDF2-SHA-256 hashes. `ADMIN_PASSWORD_HASH` bootstraps the persistent credential record; later authentication reads that database record. Replacing the environment value alone is therefore not a password-reset procedure for an initialized database.

Hosted releases use the existing Sites project identified in `.openai/hosting.json`. A GitHub push updates source control; it does not by itself publish the hosted site or synchronize its database.

Docker-related files are provided in `Dockerfile`, `compose.yaml` and [README-Docker.md](README-Docker.md). The Compose mapping is `127.0.0.1:8081:8080`, with a named data volume. **The current Dockerfile needs a dependency-install step before its build command**, because the build copies ExcelJS from `node_modules`; treat the recipe as needing maintenance rather than a verified one-command setup. The older Docker guide also predates the separate admin page and current version-history UI.

The local server is intended for development. Before exposing it beyond a trusted local environment, configure appropriate HTTPS, access controls, proxy handling and database backups.
