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
