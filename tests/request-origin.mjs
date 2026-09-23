import assert from "node:assert/strict";
import { requestOrigin } from "../server/request-origin.mjs";
const origin = "https://vps-f8d31735.vps.ovh.ca";
assert.equal(requestOrigin("vps-f8d31735.vps.ovh.ca", origin), origin);
assert.equal(requestOrigin("127.0.0.1:8098", origin), "http://127.0.0.1:8098");
assert.equal(requestOrigin("localhost:8080"), "http://localhost:8080");
assert.throws(() => requestOrigin("attacker.test", origin));
assert.throws(() => requestOrigin("example.com", "http://example.com"));
console.log(
  "PASS public HTTPS origin, SSH tunnel origin, and unknown host rejection.",
);
