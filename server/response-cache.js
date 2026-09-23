// Short-lived per-database cache. Generation guards prevent stale in-flight fills.
const responseCaches = new WeakMap();
function responseCache(env) {
  const db = database(env);
  if (!responseCaches.has(db))
    responseCaches.set(db, { generation: 0, values: new Map() });
  return responseCaches.get(db);
}
function invalidateResponses(env) {
  const cache = responseCache(env);
  cache.generation++;
  cache.values.clear();
}
async function cachedRead(env, key, load, ttl = 5000) {
  const cache = responseCache(env),
    now = Date.now();
  const existing = cache.values.get(key);
  if (existing && existing.expires > now) return existing.value;
  const generation = cache.generation;
  const entry = { expires: now + ttl, value: Promise.resolve().then(load) };
  cache.values.set(key, entry);
  try {
    const value = await entry.value;
    if (cache.generation !== generation && cache.values.get(key) === entry)
      cache.values.delete(key);
    return value;
  } catch (error) {
    if (cache.values.get(key) === entry) cache.values.delete(key);
    throw error;
  }
}
