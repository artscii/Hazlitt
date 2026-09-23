import { JSDOM } from "jsdom";
import fs from "node:fs";
import assert from "node:assert/strict";
const dom = new JSDOM('<fieldset id="search"></fieldset>', {
  runScripts: "outside-only",
  url: "http://preview.test/admin",
});
const w = dom.window;
w.eval(fs.readFileSync("dist/search.js", "utf8"));
w.eval(fs.readFileSync("dist/thesaurus-admin.js", "utf8"));
w.atlasCatalog = { programs: [{ id: "a", name: "Pap test" }] };
let state = {
  revision: 0,
  entries: w.AtlasSearch.defaultThesaurus,
  history: [],
};
const api = async (path, options) => {
  if (options) {
    const data = JSON.parse(options.body);
    state = {
      revision: state.revision + 1,
      entries: data.entries,
      history: [
        ...state.history,
        { revision: state.revision + 1, at: Date.now(), entries: data.entries },
      ],
    };
  }
  return state;
};
try {
  await w.mountAtlasThesaurus(w.document.querySelector("#search"), api);
  const save = w.document.querySelector("[data-save]");
  assert(save.disabled);
  const term = w.document.querySelector("[data-term]");
  term.value = "pap examination";
  term.dispatchEvent(new w.Event("input", { bubbles: true }));
  assert(!save.disabled);
  save.click();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(state.revision, 1);
  assert(save.disabled);
  const query = w.document.querySelector("[data-test]");
  query.value = "umami";
  query.dispatchEvent(new w.Event("input"));
  assert.match(
    w.document.querySelector("[data-test-results]").textContent,
    /0 direct/,
  );
  const history = w.document.querySelector("[data-history]");
  history.value = "0";
  w.document.querySelector("[data-restore]").click();
  assert(!save.disabled);
  save.click();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(state.revision, 2);
  console.log(
    "PASS thesaurus form editing, disabled save, local query test and restore-as-new-version flow",
  );
} finally {
  dom.window.close();
}
