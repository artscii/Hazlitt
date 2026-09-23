// v4.13.31: durable search links; social crawlers never invoke model inference.
function shareEscape(value) {
  return String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
async function searchShare(env, id) {
  if (!/^[a-f0-9]{64}$/.test(id || "")) return null;
  const row = await database(env)
    .prepare("SELECT payload FROM shared_searches WHERE id=?")
    .bind(id)
    .first();
  if (!row) return null;
  const data = JSON.parse(row.payload);
  const current = new Set((await records(env)).map((p) => p.id));
  return { ...data, ids: data.ids.filter((id) => current.has(id)) };
}
async function createSearchShare(request, env) {
  const url = new URL(request.url);
  if (request.headers.get("Origin") !== url.origin)
    return json({ error: "Invalid origin" }, 403);
  const data = await body(request, 32768);
  if (
    !data ||
    typeof data.query !== "string" ||
    data.query.length > 500 ||
    !Array.isArray(data.ids) ||
    data.ids.length > 2000
  )
    return json({ error: "Invalid shared search" }, 400);
  const current = new Set((await records(env)).map((p) => p.id));
  const validIds = (ids) =>
    Array.isArray(ids) &&
    ids.length <= 2000 &&
    ids.every((id) => typeof id === "string" && current.has(id));
  if (
    !validIds(data.ids) ||
    (data.filterIds !== null &&
      data.filterIds !== undefined &&
      !validIds(data.filterIds))
  )
    return json(
      { error: "Search contains unavailable projects. Refresh and try again." },
      400,
    );
  const payload = {
    query: data.query.trim(),
    ids: [...new Set(data.ids)].sort(),
    filterIds:
      data.filterIds == null ? null : [...new Set(data.filterIds)].sort(),
  };
  const serialized = JSON.stringify(payload),
    id = await hash(serialized);
  const existing = await database(env)
    .prepare("SELECT id FROM shared_searches WHERE id=?")
    .bind(id)
    .first();
  if (!existing) {
    const total = await database(env)
      .prepare("SELECT COUNT(*) AS n FROM shared_searches")
      .first();
    if (total.n >= 10000)
      return json({ error: "Shared search capacity reached" }, 503);
  }
  await database(env)
    .prepare(
      "INSERT OR IGNORE INTO shared_searches(id,payload,created_at) VALUES(?,?,?)",
    )
    .bind(id, serialized, Date.now())
    .run();
  const link = new URL("/", url.origin);
  link.searchParams.set("q", payload.query);
  link.searchParams.set("search", id);
  return json({ url: link.href, id, count: payload.ids.length });
}
async function sharedSearchResponse(request, env) {
  const url = new URL(request.url),
    path = url.pathname;
  if (path === "/api/search/share")
    return request.method === "POST"
      ? createSearchShare(request, env)
      : json({ error: "Use POST" }, 405);
  const api = path.match(/^\/api\/search\/share\/([a-f0-9]{64})$/);
  const image = path.match(/^\/og\/search\/([a-f0-9]{64})\.png$/);
  const page =
    (path === "/" || path === "/index.html") && url.searchParams.has("search");
  if (!api && !image && !page) return null;
  if (!["GET", "HEAD"].includes(request.method))
    return new Response("Method not allowed", { status: 405 });
  const id = (api || image)?.[1] || url.searchParams.get("search"),
    data = await searchShare(env, id);
  if (!data)
    return page
      ? new Response(ASSETS["/index.html"].body, {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
          },
        })
      : json({ error: "Shared search not found" }, 404);
  if (api) return request.method === "HEAD" ? new Response(null) : json(data);
  const count = data.ids.length,
    label = `${count} ${count === 1 ? "Project" : "Projects"}`;
  if (image) {
    if (!env.RENDER_SEARCH_PREVIEW)
      return new Response("Preview unavailable", { status: 503 });
    const png =
      request.method === "HEAD"
        ? null
        : await env.RENDER_SEARCH_PREVIEW({ query: data.query, count });
    return new Response(png, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  const title = `${data.query || "All projects"} · ${label} | Hazlitt Creek Evidence Atlas`;
  const canonical = new URL("/", url.origin);
  canonical.searchParams.set("q", data.query);
  canonical.searchParams.set("search", id);
  const imageUrl = new URL(`/og/search/${id}.png`, url.origin).href;
  const description = `${label} in this shared search. Explore cervical screening evidence, outcomes and contacts. Results refresh against the current atlas.`;
  const metadata = `<link rel="canonical" href="${shareEscape(canonical.href)}"><meta property="og:type" content="website"><meta property="og:title" content="${shareEscape(title)}"><meta property="og:description" content="${shareEscape(description)}"><meta property="og:url" content="${shareEscape(canonical.href)}"><meta property="og:image" content="${shareEscape(imageUrl)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${shareEscape(title)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${shareEscape(title)}"><meta name="twitter:image" content="${shareEscape(imageUrl)}">`;
  const html = ASSETS["/index.html"].body
    .replace(
      /<title>.*?<\/title>/,
      () => `<title>${shareEscape(title)}</title>`,
    )
    .replace(
      /<meta name="description" content="[^"]*">/,
      () => `<meta name="description" content="${shareEscape(description)}">`,
    )
    .replace("</head>", () => metadata + "</head>");
  return new Response(request.method === "HEAD" ? null : html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
