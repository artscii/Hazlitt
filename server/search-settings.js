// Versioned local search vocabulary. Backups include every revision automatically.
async function searchVocabulary(env) {
  const row = await database(env)
    .prepare(
      "SELECT revision,payload FROM search_thesaurus ORDER BY revision DESC LIMIT 1",
    )
    .first();
  return row
    ? { revision: row.revision, entries: JSON.parse(row.payload) }
    : { revision: 0, entries: AtlasSearch.defaultThesaurus };
}
function validateVocabulary(entries) {
  if (!Array.isArray(entries) || entries.length > 200)
    throw Error("Use at most 200 thesaurus entries.");
  const seen = new Set();
  const clean = (value) => {
    if (typeof value !== "string" || !value.trim() || value.length > 100)
      throw Error("Terms must contain 1–100 characters.");
    return value.trim();
  };
  return entries.map((e) => {
    if (
      !e ||
      !Array.isArray(e.equivalents) ||
      !Array.isArray(e.related) ||
      e.equivalents.length > 15 ||
      e.related.length > 15 ||
      typeof e.enabled !== "boolean"
    )
      throw Error("Invalid thesaurus entry.");
    const term = clean(e.term),
      equivalents = e.equivalents.map(clean),
      related = e.related.map(clean),
      local = new Set();
    for (const t of [term, ...equivalents, ...related]) {
      const k = AtlasSearch.normalize(t)
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim();
      if (local.has(k)) throw Error("Duplicate term in " + term);
      local.add(k);
    }
    for (const t of [term, ...equivalents]) {
      const k = AtlasSearch.normalize(t)
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim();
      if (seen.has(k)) throw Error("Duplicate term or equivalent: " + t);
      seen.add(k);
    }
    return { term, equivalents, related, enabled: e.enabled };
  });
}
async function vocabularyRoute(request, env) {
  if (request.method === "GET") {
    const params = new URL(request.url).searchParams;
    if (params.has("revision")) {
      const revision = Number(params.get("revision"));
      if (!Number.isInteger(revision) || revision < 0)
        return json({ error: "Invalid vocabulary revision" }, 400);
      if (revision === 0)
        return json({ revision: 0, entries: AtlasSearch.defaultThesaurus });
      const row = await database(env)
        .prepare(
          "SELECT revision,payload FROM search_thesaurus WHERE revision=?",
        )
        .bind(revision)
        .first();
      return row
        ? json({ revision: row.revision, entries: JSON.parse(row.payload) })
        : json({ error: "Vocabulary version not found" }, 404);
    }
    const current = await searchVocabulary(env),
      before = Number(params.get("before")) || Number.MAX_SAFE_INTEGER;
    const rows = (
      await database(env)
        .prepare(
          "SELECT revision,at FROM search_thesaurus WHERE revision < ? ORDER BY revision DESC LIMIT 51",
        )
        .bind(before)
        .all()
    ).results;
    return json({
      ...current,
      history: rows.slice(0, 50),
      hasMore: rows.length > 50,
    });
  }
  if (request.method !== "PUT") return json({ error: "Use GET or PUT" }, 405);
  const input = await body(request),
    entries = validateVocabulary(input.entries);
  if (!Number.isInteger(input.revision))
    throw Error("A vocabulary revision is required.");
  const current = await searchVocabulary(env);
  if (current.revision !== input.revision)
    return json(
      { error: "Vocabulary changed in another editor. Reload before saving." },
      409,
    );
  if (JSON.stringify(current.entries) === JSON.stringify(entries))
    return json(current);
  const result = await database(env)
    .prepare(
      "INSERT INTO search_thesaurus (revision,at,payload) SELECT ?,?,? WHERE COALESCE((SELECT MAX(revision) FROM search_thesaurus),0)=?",
    )
    .bind(
      input.revision + 1,
      Date.now(),
      JSON.stringify(entries),
      input.revision,
    )
    .run();
  if (!result.meta?.changes)
    return json(
      { error: "Vocabulary changed in another editor. Reload before saving." },
      409,
    );
  return json({ revision: input.revision + 1, entries });
}
