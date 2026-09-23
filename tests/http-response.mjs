import assert from "node:assert/strict";
import { failResponse } from "../server/http-response.mjs";
const error = Error("client left");
let headers = 0,
  ended = 0,
  destroyed = 0;
const response = {
  headersSent: true,
  destroy(e) {
    assert.equal(e, error);
    destroyed++;
  },
  writeHead() {
    headers++;
  },
  end() {
    ended++;
  },
};
failResponse(response, error);
assert.equal(destroyed, 1);
assert.equal(headers, 0);
assert.equal(ended, 0);
response.destroyed = true;
failResponse(response, error);
assert.equal(destroyed, 1);
response.destroyed = false;
response.headersSent = false;
failResponse(response, error);
assert.equal(headers, 1);
assert.equal(ended, 1);
console.log(
  "PASS errors before headers, during streaming and after client disconnect",
);
