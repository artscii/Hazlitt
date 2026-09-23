# Hazlitt / Bombo development — session checkpoint

Date: September 23, 2026
Application release: **4.13.34**
Source baseline: **a706ca2 — Hide shared URLs and dismiss copy confirmation on pointer exit**
Status: reviewed session checkpoint, approved for repository storage.

## 1. Purpose and authority

Preserve the context of the long ChatGPT/Astra Light development session so another session can continue work without reviving rejected designs or losing operational knowledge. This is a curated handover, not a verbatim transcript or database backup.

Use the current source, Git history, [live changelog](../../CHANGELOG.md), [VPS deployment guide](../VPS-DEPLOYMENT.md) and [search documentation](../search.md) as the operational authority. The [complete changelog snapshot](2026-09-23-changelog-snapshot.md) preserves all release detail available at this checkpoint. The historical audit in the changelog specifically covers 4.12.1–4.13.7; older entries have not received a fresh audit. Release 4.13.1 groups multiple commits without individual version increments.

A committed release is not proof of deployment. Production 4.13.34 has not been independently verified at this checkpoint.

## 2. Repository and environments

| Item | Value |
| --- | --- |
| Repository | https://github.com/artscii/Hazlitt |
| Owner | artscii (earlier arstcii spelling was corrected) |
| Branch / remote | main / github |
| Local checkout | /Users/danielnevin/Documents/Codex/2026-09-16/sho/work/cervical-atlas |
| VPS checkout | ~/apps/Hazlitt |
| VPS | vps-f8d31735.vps.ovh.ca; 148.113.251.72 |
| Public Atlas | https://vps-f8d31735.vps.ovh.ca/ |
| Public Umami login | https://vps-f8d31735.vps.ovh.ca:8443/ |
| Atlas host binding | 127.0.0.1:8081 → container 8080 |
| Umami host binding | 127.0.0.1:8082 → container 3000 |

The old rubric.chatgpt.site deployment and localhost previews are separate environments. Do not confuse their databases, versions, readiness or credentials with production.

## 3. Standing user preferences

- Preview visual changes before publishing when requested; obtain approval for the preview, then finish approved repository work.
- Keep application changelogs current with each release. Synchronize package/lock version, Compose image, generated footer and Admin heading.
- Distinguish local changes, commit, push, CI success and production deployment explicitly.
- The user generally runs VPS commands. Give concise, copyable instructions with health checks.
- Preserve persistent databases, vocabulary, settings, history and volumes. Do not use `docker compose down -v` as routine deployment.
- Economize model usage and avoid unnecessary repeated checks.
- Never put credentials, tokens, cookies or visitor data in checkpoints or Git.
- Documentation-only changes do not need a version bump or container rebuild.

## 4. Architecture and maintained code

| Area | Responsibility |
| --- | --- |
| dist/index.html, dist/app.js | Atlas layout, map, records, selection, search integration and sharing; app.js is maintained source despite its directory |
| src/search.js | Local lexical/BM25 search, curated vocabulary and structured filters |
| dist/semantic-search.js | QMD readiness, semantic requests and lexical fallback |
| src/admin/ | Project editing, version history, settings, workspace navigation and transitions |
| src/styles/ | Shared site and Admin styles |
| server/local.mjs | Node HTTP runtime, SQLite access/migrations and native preview rendering |
| server/worker.js | Routes, authentication, catalogue, settings and QMD gateway |
| server/response-cache.js | Short-lived record/catalogue/readiness caching and mutation invalidation |
| server/search-sharing.js | Persisted shared-search descriptors and metadata helpers |
| server/search-preview.mjs | Native PNG rendering with bundled licensed font |
| pilot/ | QMD service; directory name retained for deployment compatibility, not an A/B feature |
| scripts/build.mjs | Source assembly, generated version labels/assets and pre-rendered diagrams |
| drizzle/ | Database migrations, including shared-search storage |
| tests/ and tests/browser/ | Service/logic and desktop/mobile browser regressions |

SQLite records combine seed data with saved overrides/deletions. Preserve the live database: source updates do not replace editorial records. Complete SQL backups and Excel exports have different purposes. Umami uses a separate PostgreSQL database and needs its own backup.

System diagrams are generated during builds, not a complete runtime trace of every function. The optional Docker monitor exposes authenticated, sanitized, read-only project status; it has no public management API.

## 5. Evidence and editorial rules

The Atlas covers AI-assisted cervical precancer screening and relevant early-intervention initiatives worldwide. Keep evidence limitations explicit; a related initiative is not proof of AI effectiveness. Distinguish patient examinations from slides/images and retain appropriate denominators, publication years, outcomes, citations and dated follow-up notes.

Default to English while retaining original-language material and identifying editorial paraphrases. Avoid duplicate studies/projects during research and imports. Keep published outcomes distinct from unverified continued operation.

The previously supplied 8newAtlasRecordsGemini.xlsx import was explicitly cancelled as unreliable. Do not resume it. Historical deployment checks reported 53 projects; query the current catalogue rather than treating 53 as permanent.

## 6. Bombo context

The Bombo initiative remains a project, with stable ID `bombo`, associated with Tanzania. It is a related early-intervention initiative; do not imply documented AI effectiveness where it is unverified. Database overrides take precedence over seed text.

Direct project link: https://vps-f8d31735.vps.ovh.ca/?project=bombo#bombo

Version 1.0.3 originally selected Bombo by default. Version 4.8.7 changed ordinary first-open behavior to Africa. Do not restore Bombo as the default merely because it appears in older session instructions. Explicit shared-project links should continue to select their destination.

## 7. Earlier release foundations

| Releases | Significant decisions retained in history |
| --- | --- |
| 1.0–1.3 | Footer versions, responsive gutters, full-text filtering, blue match highlights, pinned previews, offshore markers and country animations |
| 2.0–2.4 | Authenticated CRUD, duplicate/conflict protection, audited restoration, project links/numbers, dynamic sources including NIH, blue selection palette and site symbol |
| 2.5–2.7 | Number-based editor lookup, expanding outcomes, full-text Admin subsets; Boolean AND/OR introduced then removed in 2.7.4 |
| 3.0–3.2 | Separate Admin; separate log page superseded by per-record history, version previews/diffs, restoration as a new revision, edit notes |
| 3.3–3.9 | Form usability, changed-field editing, ordered subset navigation, configurable Admin page transitions and bounded version timeline |
| 4.0–4.1 | Excel preview, duplicate reconciliation, explicit update decisions, atomic imports, diff workbooks, dry runs and protected undo |
| 4.2–4.5 | Compact scroll lists, five palettes, mobile layout, legacy analytics subsequently replaced by Umami |
| 4.6–4.7 | Original-language representation, evidence basis, publication year and sample denominators |
| 4.8 | WebLLM introduced then removed; continent-derived search, follow-up fields, references, Africa default and persistent continent selection |
| 4.9–4.10 | Card flips superseded by compact readable rows, persistent Admin authentication, footer actions, hidden-field match excerpts and marker/result synchronization |
| 4.11–4.12.1 | Portable SQLite backup and QMD comparison pilot, subsequently replaced by a single search flow |

See the snapshot for every patch entry rather than interpreting this grouping as a new historical audit.

## 8. QMD deployment and search evolution: 4.13.0–4.13.7

- **4.13.0:** QMD primary search with lexical fallback and bounded browser wait (`c169d12`).
- **4.13.1:** VPS/Caddy guidance, native build dependencies, file permissions, filter handling and footer synchronization. The first results counter was added and then removed in this grouped release.
- **4.13.2:** Cloud indicator and release synchronization (`e235fdd`).
- **4.13.3:** Profiling introduced; a model-selection/readiness problem was subsequently corrected (`af9e306`).
- **4.13.4:** Correct readiness and model profiling (`eb70ee8`).
- **4.13.5:** Startup warming, resident model reuse, bounded work and diagnostic support (`0ff5f37`).
- **4.13.6:** Comparison banner removed (`1ffe26a`).
- **4.13.7:** Remaining A/B code removed; one results list, `/api/search/query` and `/api/search/status` replace the old search-pilot endpoints (`624e169`). Rebuild both services when crossing that boundary.

Historical VPS problems included missing Python/build tools for better-sqlite3, unreadable copied source files, and hostname resolution to container loopback. Preserve the current Docker fixes and VPS-local DNS overlay.

Recorded profiling demonstrated cold model/context initialization around 10 seconds, warm queries around 0.25–1.23 seconds and a cached request around 5 ms. These are historical observations, not service guarantees or current benchmarks.

## 9. Interface and analytics: 4.13.8–4.13.20

- **.8–.11:** Counts evolved to `All X Projects`, `X Projects`, `1 Project`; removed redundant headings/explanation/divider. Later scrolling logic counts partially visible projects until fully shown.
- **.9:** Persistent QMD disable switch hides the cloud and stops Atlas semantic use/readiness calls. It does not stop the QMD container.
- **.12:** Search, transitions and palettes separated; later Admin workspaces further reorganized them.
- **.13:** VPS country attribution added for legacy analytics, with documented proxy trust.
- **.14:** Umami 3.4.0 and PostgreSQL integration replaced legacy analytics; no history migration requested.
- **.15:** Hide the empty duplicate list component while retaining populated scrolling lists.
- **.16:** Completed-search events and replay/heatmap routes; retain input masking, Admin exclusions and privacy preferences.
- **.17:** End-of-list message is `No more projects to scroll`.
- **.18:** Admin dashboard link respects deployment override and public fallback.
- **.19:** Public interaction events and profile-reading thresholds; user configured replay/heatmap sampling to 100%. Actual collection still needs live verification.
- **.20:** Darker palette-aware footer, responsive columns, normal document flow.

## 10. Relevance, Admin and performance: 4.13.21–4.13.30

- **.21:** BM25/direct matches and approved equivalents take priority. Semantic additions require grounded related concepts. Reject unrelated noise and exclude private notes/URLs from public relevance. Add editable, versioned thesaurus and bounded/cached QMD work.
- **.22:** Task-based Admin workspace, selected-project header, sticky Save/Cancel, separate Delete and initially collapsed history.
- **.23:** Dedicated Search workspace with independent QMD settings and vocabulary saves.
- **.24:** Actual queue deadlines, revision-checked settings, readiness through background refresh, paginated history and modular source. [Linux checks](https://github.com/artscii/Hazlitt/actions/runs/35904134995).
- **.25:** System diagrams and isolated socket monitor, five-overlay deployment helper. [Linux checks](https://github.com/artscii/Hazlitt/actions/runs/35907484984).
- **.26:** Configuration renamed **Visual**.
- **.27:** Viewport-aware highlighting, batched layout, inference-only rate budget, watchdog, cache invalidation and build-time SVG diagrams; System browser bundle reduced from roughly 2.6 MB to 3.4 KB. [Linux checks](https://github.com/artscii/Hazlitt/actions/runs/35917404587).
- **.28:** Explicit thesaurus save/draft state, revision preservation and SQLite restart tests. VIA/acetic is saved configuration, not a hardcoded default. [Linux checks](https://github.com/artscii/Hazlitt/actions/runs/35920121099).
- **.29:** `Admin ( current version )` heading derives from package version without typography changes.
- **.30:** Equivalent terms appear in collapsed summaries; filtering expands matching vocabulary rows so acetic is visible under VIA.

## 11. Latest sharing releases: 4.13.31–4.13.34

| Version / commit | Change and verification |
| --- | --- |
| 4.13.31 / 28c66b8 | Durable shared searches, crawler metadata and branded PNG. Full regression/browser/Docker/socket checks passed in [CI](https://github.com/artscii/Hazlitt/actions/runs/35926538390). |
| 4.13.32 / abf3879 | Cloud/divider/paperclip stay on one line, 15px icon with tighter spacing. Local visual preview checked. |
| 4.13.33 / 449eab9 | Mouse hover area constrained to 24px square; mobile touch target remains 44px. Local visual preview checked. |
| 4.13.34 / a706ca2 | Hide shared URL, show `(Link copied)`, dismiss on pointer/focus exit and prevent delayed completion from restoring dismissed feedback. Syntax/diff checks performed; browser checks updated, but a fresh full CI result was not verified at checkpoint. |

Shared-search implementation:

- Same-origin POST `/api/search/share` saves a deduplicated descriptor; GET `/api/search/share/<id>` retrieves it.
- URLs use `/?q=...&search=<hash>`; explicit location subsets retain filter IDs.
- Ordinary shared queries run against current records. Saved preview counts exclude deleted records but can differ from a later live query and cached social preview.
- GET `/og/search/<id>.png` renders metadata imagery without QMD inference.
- SQLite migration `drizzle/0008_shared_searches.sql`; descriptors are included in complete database backups.
- Renderer uses `@resvg/resvg-js` and bundled Noto Sans with its license; bounded image cache and descriptor limit.
- Clipboard denial produces an actionable message; the manual URL fallback from .31 was deliberately removed in .34.

## 12. Approved Open Graph design

1200×630 image. Large site logo on the pale-green left half, with Hazlitt Creek and Evidence Atlas in matching weight and coordinated colour. Right half includes a subtle shared-collection label, profile count, singular/plural project-profile wording and **Explore the outcomes** below the count. The search phrase is omitted from the image but retained in link metadata. Keep the restrained teal palette and dividers.

Historical local preview assets: `/tmp/hazlitt-og-logo-preview-v6.png` and `/tmp/hazlitt-og-release.png`. Temporary files may disappear; regenerate from source rather than relying on them.

## 13. Superseded decisions: do not reintroduce

| Historical feature | Current direction |
| --- | --- |
| Bombo initial default | Africa for ordinary opening; explicit project links preserved |
| Yellow map selection | Coordinated blue; version diffs remain yellow |
| WebLLM expansion | Removed |
| QMD A/B comparison and banners | Removed; single search result flow |
| Always return semantic neighbours | Ground relevance; reject noise |
| Boolean AND/OR instructions | Removed |
| All-continent map button | Removed to reduce clutter |
| Project evidence card flip | Removed; readable combined layout |
| Separate edit-log page | Per-record version history in Admin |
| Built-in visitor analytics | Umami |
| Results/Result labels | Projects/Project |
| Full-width paperclip hover | Compact pointer area and mobile touch target |
| Visible shared-search URL fallback | Suppressed; clipboard status only |

Admin page transitions are distinct from the removed project-card flip and remain configurable.

## 14. Search and thesaurus expectations

Curated synonyms must persist in SQLite after saves, reloads, process restarts and deployments. Saving QMD configuration is distinct from saving thesaurus edits. Preserve conflict checks and saved vocabulary revisions.

The live VIA entry was explicitly approved to include `acetic` alongside `via` and `visual inspection with acetic acid`. Do not embed production vocabulary into seed defaults merely to make one instance appear correct.

Regression examples: case-insensitive VIA/acetic equivalence; unrelated `umami`/`unami` and random noise should not produce unsupported evidence matches; exact project names and country/year constraints should remain useful; map markers must match the returned subset. The cloud is green only when QMD is ready; fallback remains available. A configuration switch can suppress QMD and its icon entirely.

OKF/knowledge-graph ideas were discussed, but are not grounds to claim an implemented graph or automatic relevance improvement. Inspect actual source before describing such a feature.

## 15. VPS deployment and verification

Use all current overlays: compose.yaml, compose.qmd.yaml, the VPS-local compose.qmd-dns.yaml, compose.umami.yaml and compose.system.yaml. Inspect the deployment guide/scripts before modifying their behavior.

Standard update:

```bash
cd ~/apps/Hazlitt
git pull --ff-only
bash scripts/deploy-system.sh
```

When QMD code/dependencies change:

```bash
bash scripts/deploy-system.sh --with-qmd
```

Read-only performance verification:

```bash
bash scripts/verify-performance.sh https://vps-f8d31735.vps.ovh.ca
```

Standard deployment preserves QMD and Umami while rebuilding Atlas/monitor. Wait for startup health rather than interpreting an immediate connection reset as a definitive failed deployment. Check Git commit, service health, rendered version and the relevant user workflow separately. Never erase volumes to resolve a routine upgrade.

This checkpoint-only documentation commit needs no VPS rebuild.

## 16. Verification limits and follow-up

- Full CI evidence exists for .31. Do not describe that as a fresh complete test of .34.
- Verify latest CI and deployed version before claiming production parity.
- Native QMD and complete container/browser verification have environment limits on the local Mac; Linux CI and VPS checks supply different evidence.
- Validate real clipboard behavior over HTTPS, keyboard dismissal and mobile interaction after deployment.
- Confirm shared-search restoration, map subset and social preview endpoints on the actual production origin.
- Umami collection/settings and live vocabulary are database state, not established solely by a source commit.
- No new literature-import task is implied by this handover.

## 17. Local preview and unrelated files

The last UI preview was http://127.0.0.1:8122/, served from `/tmp/hazlitt-inline-preview`. It is an isolated interface mock, not a complete Atlas server or proof that clipboard/API/database functions work.

Untracked duplicate files present at checkpoint were intentionally left untouched:

- scripts/render-system-diagrams 2.mjs
- scripts/verify-performance 2.sh
- server/response-cache 2.js
- tests/browser/search-performance.spec 2.mjs
- tests/response-cache 2.mjs

Inspect them only if relevant; do not silently commit or delete unrelated work.

## 18. Resuming this work

Suggested prompt for a new session:

> Read docs/chatgpt-checkpoints/2026-09-23-session-checkpoint.md and its changelog snapshot, then inspect the current changelog, Git status/history and VPS guide. Preserve the established design, persistent databases and thesaurus. Tell me the verified current state and outstanding checks before changing anything. Do not treat historical decisions as current requirements when later releases supersede them.

The checkpoint captures the approved context, not an obligation to resume every historical request. Follow the newest user request and verify current state first.
