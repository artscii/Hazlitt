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
let saveGate = null,
  failConfirmation = false;
const api = async (path, options) => {
  if (!options && failConfirmation) {
    failConfirmation = false;
    throw Error("Confirmation unavailable");
  }
  if (options) {
    if (saveGate) await saveGate;
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
  assert.match(
    w.document.querySelector("[data-draft-status]").textContent,
    /Unsaved vocabulary/,
  );
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
  let release;
  saveGate = new Promise((resolve) => (release = resolve));
  const via = [...w.document.querySelectorAll(".thesaurus-row")].find(
    (row) => row.querySelector("[data-term]").value === "via",
  );
  const equivalents = via.querySelector("[data-equivalents]");
  equivalents.value += "; acetic";
  equivalents.dispatchEvent(new w.Event("input", { bubbles: true }));
  save.click();
  assert(equivalents.disabled, "editing is locked while save is in flight");
  failConfirmation = true;
  release();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(state.revision, 3);
  assert(
    save.disabled,
    "successful PUT remains saved even if confirmation GET fails",
  );
  assert.match(
    w.document.querySelector("[data-status]").textContent,
    /Saved vocabulary v3/,
  );
  assert(
    state.entries.find((e) => e.term === "via").equivalents.includes("acetic"),
  );
  saveGate = null;
  const reopened = w.document.createElement("div");
  w.document.body.append(reopened);
  await w.mountAtlasThesaurus(reopened, api);
  assert(
    [...reopened.querySelectorAll("[data-equivalents]")].some((input) =>
      input.value.includes("acetic"),
    ),
  );
  const aliasRow = [...reopened.querySelectorAll(".thesaurus-row")].find(
    (row) => row.querySelector("[data-term]").value === "via",
  );
  assert.match(
    aliasRow.querySelector("summary").textContent,
    /Equivalents: .*acetic/,
  );
  assert.equal(aliasRow.open, false);
  const filter = reopened.querySelector("[data-filter]");
  filter.value = "ACETIC";
  filter.dispatchEvent(new w.Event("input"));
  assert.equal(aliasRow.hidden, false);
  assert.equal(aliasRow.open, true);
  assert.equal(
    [...reopened.querySelectorAll(".thesaurus-row")].filter(
      (row) => !row.hidden,
    ).length,
    1,
  );
  filter.value = "";
  filter.dispatchEvent(new w.Event("input"));
  assert.equal(
    aliasRow.open,
    false,
    "clearing filter restores collapsed state",
  );
  console.log(
    "PASS thesaurus form editing, disabled save, local query test and restore-as-new-version flow",
  );
} finally {
  dom.window.close();
}
