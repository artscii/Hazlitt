import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const ctx = vm.createContext({
  database: (env) => env.DB,
  Date,
  Map,
  WeakMap,
  Promise,
});
vm.runInContext(fs.readFileSync("server/response-cache.js", "utf8"), ctx);
const env = { DB: {} };
let loads = 0;
const load = async () => {
  loads++;
  return { value: loads };
};
const [a, b] = await Promise.all([
  ctx.cachedRead(env, "records", load),
  ctx.cachedRead(env, "records", load),
]);
assert.equal(loads, 1);
assert.equal(a, b);
ctx.invalidateResponses(env);
assert.equal((await ctx.cachedRead(env, "records", load)).value, 2);
let resolve;
const old = ctx.cachedRead(
  env,
  "slow",
  () => new Promise((r) => (resolve = r)),
);
await Promise.resolve();
ctx.invalidateResponses(env);
assert.equal(await ctx.cachedRead(env, "slow", () => "fresh"), "fresh");
resolve("old");
await old;
assert.equal(await ctx.cachedRead(env, "slow", () => "wrong"), "fresh");
await assert.rejects(
  ctx.cachedRead(env, "failure", () => {
    throw Error("failed");
  }),
);
assert.equal(
  await ctx.cachedRead(env, "failure", () => "recovered"),
  "recovered",
);
await ctx.cachedRead(env, "ttl", load, 1);
await new Promise((r) => setTimeout(r, 5));
assert.equal((await ctx.cachedRead(env, "ttl", load)).value, 4);
console.log(
  "PASS cache coalescing, expiry, mutation invalidation, stale fill protection and failure recovery",
);
