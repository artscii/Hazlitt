# Atlas search, version 4.8.1

Search uses a cached, normalized full-text index built once after catalog loading. All typed words must occur in a project record. Accents and case are ignored; original-language text and reported outcomes are included. Four-digit years and year ranges filter the publicationYear field rather than incidental review dates or source URLs. Ascending project-number order is preserved.

WebLLM, model downloads, AI query expansion and inferred concept matches have been removed at the user's request. Search input events are still coalesced into a single animation frame, project cards are reused, and repeated query results are cached. Searching does not reposition the map.

Matched words always use a light-blue background (#cfe8ff) and dark-blue text (#123b62), independent of the selected palette. A zero-result message uses its own prominent palette-aware box and returns to the normal count style when matches reappear.

Validation: node tests/search.mjs and node tests/search-ui.mjs. A full catalog snapshot can be tested with ATLAS_TEST_CATALOG=/path/to/catalog.json node tests/search-ui.mjs.
