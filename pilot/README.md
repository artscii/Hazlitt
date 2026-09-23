# QMD semantic search service

This directory contains the production QMD service (the directory name is retained for deployment compatibility).
The browser uses POST `/api/search/query` and GET `/api/search/status` through the authenticated Atlas gateway.
Search returns a single `results` list. There is no A/B comparison mode or feedback UI.
Keyword fallback runs in the browser if semantic search is unavailable.

See [VPS deployment](../docs/VPS-DEPLOYMENT.md) for configuration, startup warm-up and profiling.
