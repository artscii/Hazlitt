# Atlas search, version 4.8.0

Public search builds one normalized in-memory index after catalog loading. Queries are cached (80 entries), input/search/change events are coalesced into one animation frame, and existing project cards are moved instead of destroyed and rebuilt. Text highlights are reused when their terms have not changed. Search does not reposition the map. All result subsets retain ascending project numbers.

Exact substring matches are retained. A small domain vocabulary adds labelled **Concept match** results; related terminology does not imply equivalent tests, study designs, or clinical outcomes. Years always refer to `publicationYear`. Semantic additions preserve explicit country constraints and must match every remaining query concept in the stored record. The full original-language record text is indexed as well.

## Local WebLLM enhancement

The visitor chooses **Enable deeper AI search**. `@mlc-ai/web-llm` 0.2.85 runs Qwen2.5-0.5B-Instruct (q4f16, or q4f32 without shader-f16) in a dedicated module worker. The first use downloads several hundred MB of model assets from the official MLC model repositories; WebLLM caches these in the browser, subject to browser storage eviction. Approximate model GPU memory requirements in the WebLLM catalog are 945–1,060 MB. WebGPU and sufficient device memory are required. There is no API key, server inference, or per-query model service charge.

The model returns constrained JSON synonyms for existing query concepts. It never writes project records, outcomes, IDs, scores or clinical advice. Expansions must occur in the actual catalog; unexpected fields, unmatched query terms, numeric expansions, and overlong strings are rejected. Every original meaningful concept is still required. AI wording can still be imperfect: these are discovery suggestions, not a validated clinical classification. Accepted terms and concept matches are labelled in the interface.

Generation starts after 650 ms without typing. New input cancels prior work; generation IDs prevent stale responses from replacing a newer search. A 12-second generation deadline, 3-minute loading deadline, 40-query session cache, cancel button and unavailable-WebGPU fallback keep the indexed search available. Disabling AI terminates the worker and removes AI expansions. No search queries or record content are sent to the model download hosts.

## Verification

- `node tests/search.mjs`: years, ranges, unknown years, exact retention, accents, concept combinations, country restrictions, invalid expansions, order and cache.
- `node tests/search-ui.mjs`: live DOM event integration, existing card identity, rapid typing, clear, fallback, and every marker selected twice.
- `ATLAS_TEST_CATALOG=/path/to/catalog.json node tests/search-ui.mjs`: same tests against a catalog snapshot. Verified with 47 projects and 40 markers.
- `node tests/semantic-controller.mjs`: stale responses, cancellation, cache, disable, load failure.
- Browser verification: model download and initialization, structured `cytological` → `cytology` expansion, regular search during loading, desktop marker dimming, and 390 × 844 responsive search/results without page overflow. This is an iPhone-sized viewport test, not a claim of model compatibility on every iPhone.
- Cached retrieval benchmark: 1,000 queries over 1,000 synthetic records took 5 ms on the development machine. This measures cached retrieval, not initial indexing, full-page rendering or AI generation; it is not an end-to-end latency guarantee.

References: https://webllm.mlc.ai/docs/user/basic_usage.html and https://github.com/mlc-ai/web-llm
