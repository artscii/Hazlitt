# QMD search comparison pilot

A local, opt-in paired comparison of the existing full-text search (A) and QMD 2.8.3 hybrid lexical/vector retrieval (B). Deep mode additionally runs query expansion and reranking. This is not a randomized user experiment and is not evidence of improved clinical accuracy.

## Start

From the repository root:

```sh
npm ci
npm ci --prefix pilot
npm run build
QMD_PILOT=1 PORT=8094 npm start
```

Open the Atlas on localhost and expand **Search comparison pilot · A / B** below Search. The first comparison downloads model files and embeds the current local catalogue. The local database may contain a different catalogue from production; the panel shows its project count. Use the existing reviewed import workflow to populate the desired catalogue. Do not import a production backup just to enable this pilot.

Models, generated public documents and the disposable search index are kept under `pilot/.data/` (ignored by Git). Set `QMD_DATA_DIR` to change this. No edit notes, credentials, sessions or analytics are included in the semantic index. This service reads the application catalogue but never changes its records.

The server compares the current public document/revision hashes before each trial. Changed, added and deleted records trigger a reindex and embedding refresh. A failure leaves the keyword search usable and reports the semantic error; it never silently substitutes keyword results as QMD results.

## Evaluate

1. Use the same query and explicit country, year and examination-type scope for both engines.
2. Run a comparison. A retains existing project-number order; B shows at most ten relevance-ranked candidates. The comparison identifies overlap and displays timings, index preparation time and cache status.
3. Rate individual matches, choose the more useful set, and add notes about missing or irrelevant projects. Feedback is kept in this browser only (latest 100 rated trials).
4. Download evaluations as JSON. Record a set of expected relevant project IDs independently before comparing systems; calculate precision/recall against that set rather than treating QMD scores as probabilities.
5. Use **Show A/B on map and results** to apply either result set. Normal typing or geographic selection returns to normal filtering.

Suggested benchmark queries: “screening without specialist doctors”, “phone photographs for early cervical detection”, “slide scans” versus “patient examinations”, French and Spanish paraphrases, exact project numbers, geographic constraints, and deliberately unrelated terms. Test warm and cold latency separately. Deep mode may be substantially slower on CPU.

## Runtime and deployment boundaries

QMD uses native llama.cpp model execution. If Metal is unavailable, try `QMD_FORCE_CPU=1`; a CPU-only native build may be needed on Apple Silicon (`npm run build:cpu --prefix pilot`, with Xcode command-line tools available). This machine needed that build; start its pilot with `QMD_FORCE_CPU=1 QMD_PILOT=1 PORT=8094 npm start`. Follow the pinned package's runtime instructions and keep model/runtime downloads outside source control.

Only the local Node adapter mounts `/api/search-pilot/*` when `QMD_PILOT=1`. It serializes comparisons and validates same-origin POST requests. Pilot mode binds the local server to 127.0.0.1. Do not expose this experimental local server publicly. Hosted Workers do not run QMD: a hosted pilot needs a separately provisioned authenticated model service, rate limits and an explicit deployment configuration. No external service has been provisioned by this pilot.

The first build uses the QMD SDK with pre-expanded lexical/vector queries and no reranking by default. Deep mode is optional. Results are always resolved back to current project IDs, and hard scope filters apply to both engines. Because hard filters are also enforced after QMD candidate retrieval, deep mode's finite candidate pool can reduce recall for very narrow scopes; evaluate that before production adoption.
