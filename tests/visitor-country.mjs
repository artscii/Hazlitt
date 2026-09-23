import assert from "node:assert/strict";
import { visitorCountry, visitorHeaders } from "../server/visitor-country.mjs";
const req = (ip, headers = {}) => ({ socket: { remoteAddress: ip }, headers });
const lookup = (ip) => ({ country: ip === "8.8.8.8" ? "US" : "CA" });
assert.equal(
  visitorCountry(
    req("172.18.0.1", { "x-forwarded-for": "1.1.1.1, 8.8.8.8" }),
    true,
    lookup,
  ),
  "US",
);
assert.equal(
  visitorCountry(
    req("9.9.9.9", { "x-forwarded-for": "8.8.8.8" }),
    true,
    lookup,
  ),
  "CA",
);
assert.equal(
  visitorCountry(
    req("172.18.0.1", { "x-forwarded-for": "8.8.8.8" }),
    false,
    lookup,
  ),
  "CA",
);
assert.equal(
  visitorCountry(req("127.0.0.1"), false, () => null),
  "Unknown",
);
assert.equal(
  visitorHeaders(req("127.0.0.1", { "cf-ipcountry": "US" }))["CF-IPCountry"],
  "Unknown",
);
assert.equal(visitorCountry(req("8.8.8.8")), "US");
assert.match(visitorCountry(req("2001:4860:4860::8888")), /^[A-Z]{2}$/);
console.log(
  "PASS local IPv4/IPv6 lookup, one-hop proxy trust, spoof rejection and unknown fallback",
);
