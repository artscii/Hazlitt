# QMD semantic search service

This directory contains the production QMD service (the directory name is retained for deployment compatibility).
The browser uses POST `/api/search/query` and GET `/api/search/status` through the authenticated Atlas gateway.
Search returns a single `results` list. There is no A/B comparison mode or feedback UI.
BM25 runs immediately in the browser. Direct and approved-equivalent matches precede QMD-ranked related candidates. Unknown noise terms do not trigger vector retrieval. Background indexing keeps refresh work off the query path; duplicate inference requests are coalesced and queued work is bounded. Native inference already running may finish after a browser cancellation.

See [VPS deployment](../docs/VPS-DEPLOYMENT.md) for configuration, startup warm-up and profiling.
