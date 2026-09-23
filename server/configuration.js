// Field-specific edits use compare-and-swap to reject stale settings drafts.
const paletteIds = ["coastal", "ocean", "forest", "plum", "slate"];
const defaultConfig = {
  editFlipEnabled: true,
  editFlipDuration: 400,
  palette: "coastal",
  qmdEnabled: true,
  revision: 0,
};
async function siteConfig(env) {
  const row = await database(env)
    .prepare("SELECT payload FROM site_settings WHERE key=?")
    .bind("presentation")
    .first();
  return { ...defaultConfig, ...(row ? JSON.parse(row.payload) : {}) };
}
async function updateSiteConfig(request, env) {
  const input = await body(request);
  const db = database(env);
  const row = await db
    .prepare("SELECT payload FROM site_settings WHERE key=?")
    .bind("presentation")
    .first();
  const current = { ...defaultConfig, ...(row ? JSON.parse(row.payload) : {}) };
  if (
    request.method === "PATCH" &&
    (!Number.isInteger(input.revision) || input.revision !== current.revision)
  )
    return json(
      { error: "Settings changed in another editor. Reload before saving." },
      409,
    );
  const config = { ...current };
  for (const key of [
    "editFlipEnabled",
    "editFlipDuration",
    "palette",
    "qmdEnabled",
  ])
    if (Object.hasOwn(input, key)) config[key] = input[key];
  if (
    typeof config.editFlipEnabled !== "boolean" ||
    !Number.isInteger(config.editFlipDuration) ||
    config.editFlipDuration < 300 ||
    config.editFlipDuration > 1600
  )
    return json(
      { error: "Choose a duration between 300 and 1600 milliseconds." },
      400,
    );
  if (!paletteIds.includes(config.palette))
    return json({ error: "Choose one of the five colour palettes." }, 400);
  if (typeof config.qmdEnabled !== "boolean")
    return json({ error: "Choose a valid search setting." }, 400);
  config.revision = current.revision + 1;
  const result = row
    ? await db
        .prepare("UPDATE site_settings SET payload=? WHERE key=? AND payload=?")
        .bind(JSON.stringify(config), "presentation", row.payload)
        .run()
    : await db
        .prepare(
          "INSERT OR IGNORE INTO site_settings(key,payload) VALUES (?,?)",
        )
        .bind("presentation", JSON.stringify(config))
        .run();
  if (!result.meta?.changes)
    return json(
      { error: "Settings changed in another editor. Reload before saving." },
      409,
    );
  return json(config);
}
