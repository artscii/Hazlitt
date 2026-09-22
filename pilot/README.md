# Primary QMD search (v4.13.0)

The normal search field uses QMD hybrid retrieval. The former A/B controls have been removed. Results drive the existing map and project subset. Requests are debounced 300ms; errors and an eight-second timeout fall back to the original keyword search, with a visible status. A 30-second cooldown avoids repeated failed requests. Empty semantic results do not trigger fallback. New input and geographic navigation invalidate pending results.

Run locally with `QMD_FORCE_CPU=1 QMD_PILOT=1 PORT=8096 DATA_DIR=/private/tmp/atlas-ui-review npm start`. Native model dependencies are installed under `pilot/`. Hosted Workers still require a separate QMD backend; this change does not provision one.

Inline fixed filters are supported by the QMD endpoint: `country:Kenya`, `continent:Africa`, `year:2024`, and quoted multi-word `basis:` values. The original fallback uses its existing keyword syntax.

## Runtime details

QMD uses native llama.cpp model execution. If Metal is unavailable, try `QMD_FORCE_CPU=1`; a CPU-only native build may be needed on Apple Silicon (`npm run build:cpu --prefix pilot`, with Xcode command-line tools available). This machine needed that build; start its pilot with `QMD_FORCE_CPU=1 QMD_PILOT=1 PORT=8094 npm start`. Follow the pinned package's runtime instructions and keep model/runtime downloads outside source control.

Only the local Node adapter mounts `/api/search-pilot/*` when `QMD_PILOT=1`. It serializes comparisons and validates same-origin POST requests. Pilot mode binds the local server to 127.0.0.1. Do not expose this experimental local server publicly. Hosted Workers do not run QMD: a hosted pilot needs a separately provisioned authenticated model service, rate limits and an explicit deployment configuration. No external service has been provisioned by this pilot.

The first build uses the QMD SDK with pre-expanded lexical/vector queries and no reranking by default. Deep mode is optional. Results are always resolved back to current project IDs, and hard scope filters apply to both engines. Because hard filters are also enforced after QMD candidate retrieval, deep mode's finite candidate pool can reduce recall for very narrow scopes; evaluate that before production adoption.
