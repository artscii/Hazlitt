import assert from "node:assert/strict";
import { createWorkQueue } from "../pilot/work-queue.mjs";
const queue = createWorkQueue();
let calls = 0,
  release;
const one = queue.run(
  "one",
  () =>
    new Promise((r) => {
      calls++;
      release = r;
    }),
);
const two = queue.run("one", () => {
  throw Error("duplicate executed");
});
await new Promise((r) => setTimeout(r, 0));
const abort = new AbortController();
const cancelled = queue
  .run(
    "cancelled",
    () => {
      throw Error("cancelled task ran");
    },
    abort.signal,
  )
  .catch((e) => e.message);
abort.abort();
release(42);
assert.equal(await one, 42);
assert.equal(await two, 42);
assert.equal(calls, 1);
assert.match(await cancelled, /cancelled/);
await new Promise((r) => setTimeout(r, 0));
assert.equal(queue.size, 0);
console.log("PASS duplicate coalescing and cancellation of queued work");
const timed = createWorkQueue({ waitMs: 20 });
let unblock;
const running = timed.run("active", () => new Promise((r) => (unblock = r)));
await new Promise((r) => setTimeout(r, 0));
const expired = timed
  .run("waiting", () => assert.fail("expired job executed"))
  .catch((e) => e.message);
assert.match(
  await Promise.race([
    expired,
    new Promise((_, reject) =>
      setTimeout(() => reject(Error("deadline failed")), 200),
    ),
  ]),
  /expired/,
);
unblock();
await running;
console.log(
  "PASS queued deadline expires while active inference remains stalled",
);
// Active native work must not overlap even after a caller leaves or watchdog fires.
let stalled = 0,
  finishNative,
  secondRan = false;
const guarded = createWorkQueue({
  activeMs: 20,
  waitMs: 1000,
  onStall: () => stalled++,
});
const activeJob = guarded
  .run("native", () => new Promise((resolve) => (finishNative = resolve)))
  .catch((e) => e.message);
await new Promise((resolve) => setTimeout(resolve, 35));
assert.match(await activeJob, /stalled/);
assert.equal(stalled, 1);
assert.equal(guarded.busy, true);
const next = guarded.run("next", () => {
  secondRan = true;
  return 7;
});
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(secondRan, false);
finishNative();
assert.equal(await next, 7);
console.log(
  "PASS stalled inference recovery callback without overlapping native operations",
);
