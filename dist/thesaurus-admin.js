// Editable, versioned vocabulary. Restoring a version creates a new saved revision.
window.mountAtlasThesaurus = async function (parent, api) {
  const section = document.createElement("div");
  section.className = "thesaurus-editor";
  section.innerHTML =
    '<h3>Local search thesaurus</h3><p>Equivalent terms broaden BM25 matches. Related terms are suggestions considered only by QMD. All other query concepts must still match.</p><label>Find a term<input type="search" data-filter placeholder="Filter vocabulary…"></label><div class="thesaurus-rows"></div><div class="thesaurus-actions"><button type="button" data-add>Add term</button><button type="button" data-save disabled>Save thesaurus</button></div><label>Saved vocabulary versions<select data-history aria-label="Saved vocabulary version"></select></label><button type="button" data-more hidden>Load earlier versions</button><button type="button" data-restore>Review selected version</button><p data-draft-status role="status"></p><label>Preview search with current vocabulary<input data-test type="search" placeholder="Try umami, Pap smear or colposcopy"></label><p data-test-results aria-live="polite"></p><p data-status role="status"></p>';
  parent.append(section);
  // Keep persistence feedback beside the save action, not below the preview.
  section
    .querySelector(".thesaurus-actions")
    .after(
      section.querySelector("[data-status]"),
      section.querySelector("[data-draft-status]"),
    );
  const $ = (q) => section.querySelector(q),
    rows = $(".thesaurus-rows"),
    status = $("[data-status]");
  let saved = null,
    history = [],
    busy = false;
  const split = (v) =>
    v
      .split(";")
      .map((t) => t.trim())
      .filter(Boolean);
  function values() {
    return [...rows.children].map((row) => ({
      term: row.querySelector("[data-term]").value.trim(),
      equivalents: split(row.querySelector("[data-equivalents]").value),
      related: split(row.querySelector("[data-related]").value),
      enabled: row.querySelector("[data-enabled]").checked,
    }));
  }
  function dirty() {
    return saved && JSON.stringify(values()) !== JSON.stringify(saved.entries);
  }
  function update() {
    const changed = dirty();
    $("[data-save]").disabled = busy || !changed;
    $("[data-draft-status]").textContent = busy
      ? "Saving thesaurus to the database…"
      : changed
        ? "Unsaved vocabulary changes. Click Save thesaurus to keep them; Save search settings applies only to the QMD switch."
        : "";
    section
      .querySelectorAll(
        "[data-term], [data-equivalents], [data-related], [data-enabled], [data-add], [data-remove], [data-restore], [data-history]",
      )
      .forEach((control) => {
        control.disabled = busy;
      });
  }
  function updateSummary(row) {
    const summary = row.querySelector("summary");
    const term = document.createElement("span");
    term.dataset.summaryTerm = "";
    term.textContent = row.querySelector("[data-term]").value || "New term";
    const aliases = document.createElement("span");
    aliases.className = "thesaurus-aliases";
    const equivalents = split(row.querySelector("[data-equivalents]").value);
    aliases.textContent = equivalents.length
      ? " — Equivalents: " + equivalents.join("; ")
      : "";
    summary.replaceChildren(term, aliases);
  }
  function filterRows() {
    const q = $("[data-filter]").value.trim().toLowerCase();
    for (const row of rows.children) {
      const matches = [
        "[data-term]",
        "[data-equivalents]",
        "[data-related]",
      ].some((selector) =>
        row.querySelector(selector).value.toLowerCase().includes(q),
      );
      row.hidden = !matches;
      if (q) {
        if (!row.hasAttribute("data-before-filter"))
          row.dataset.beforeFilter = String(row.open);
        if (matches) row.open = true;
      } else if (row.hasAttribute("data-before-filter")) {
        row.open = row.dataset.beforeFilter === "true";
        delete row.dataset.beforeFilter;
      }
    }
  }
  function draw(entries) {
    rows.replaceChildren();
    for (const e of entries) {
      const row = document.createElement("details");
      row.className = "thesaurus-row";
      row.innerHTML =
        "<summary></summary>" +
        '<label>Term<input data-term maxlength="100"></label><label>Equivalents (semicolon separated)<input data-equivalents></label><label>Related terms (semicolon separated)<input data-related></label><label class="thesaurus-enabled"><input type="checkbox" data-enabled> Enabled</label><button type="button" data-remove>Remove</button>';
      row.querySelector("[data-term]").value = e.term;
      row.querySelector("[data-equivalents]").value = e.equivalents.join("; ");
      row.querySelector("[data-related]").value = e.related.join("; ");
      row.querySelector("[data-enabled]").checked = e.enabled !== false;
      row.querySelector("[data-remove]").onclick = () => {
        row.remove();
        update();
      };
      updateSummary(row);
      row.open = !e.term;
      row.addEventListener("input", () => updateSummary(row));
      rows.append(row);
    }
    filterRows();
    update();
  }
  function versions() {
    const select = $("[data-history]");
    select.replaceChildren();
    for (const h of history)
      select.add(
        new Option(
          "v" + h.revision + " · " + new Date(h.at).toLocaleString(),
          String(h.revision),
        ),
      );
    select.add(new Option("v0 · Initial vocabulary", "0"));
  }
  async function load() {
    const data = await api("/api/search/thesaurus");
    saved = { revision: data.revision, entries: data.entries };
    history = data.history;
    $("[data-more]").hidden = !data.hasMore;
    draw(data.entries);
    versions();
    status.textContent =
      "Vocabulary v" +
      saved.revision +
      " · saved in the server database and included in database backups.";
  }
  section.addEventListener("input", update);
  $("[data-filter]").oninput = filterRows;
  section.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target.tagName === "INPUT")
      event.preventDefault();
  });
  $("[data-add]").onclick = () => {
    $("[data-filter]").value = "";
    draw([
      ...values(),
      { term: "", equivalents: [], related: [], enabled: true },
    ]);
    rows.lastElementChild.querySelector("input").focus();
  };
  $("[data-more]").onclick = async () => {
    const button = $("[data-more]");
    button.disabled = true;
    try {
      const selected = $("[data-history]").value;
      const data = await api(
        "/api/search/thesaurus?before=" + history.at(-1).revision,
      );
      history.push(...data.history);
      versions();
      $("[data-history]").value = selected;
      button.hidden = !data.hasMore;
    } catch (e) {
      status.textContent = e.message;
    } finally {
      button.disabled = false;
    }
  };
  $("[data-restore]").onclick = async () => {
    if (dirty() && !confirm("Replace unsaved thesaurus changes?")) return;
    const revision = Number($("[data-history]").value);
    try {
      const data =
        revision === 0
          ? { entries: AtlasSearch.defaultThesaurus }
          : await api("/api/search/thesaurus?revision=" + revision);
      draw(data.entries);
      status.textContent =
        "Reviewing v" + revision + ". Save to create a new version.";
    } catch (e) {
      status.textContent = e.message;
    }
  };
  $("[data-save]").onclick = async () => {
    if (busy || !dirty()) return;
    busy = true;
    update();
    try {
      const submitted = values();
      const result = await api("/api/search/thesaurus", {
        method: "PUT",
        body: JSON.stringify({ revision: saved.revision, entries: submitted }),
      });
      // The returned revision is authoritative even if the confirmation GET fails.
      saved = { revision: result.revision, entries: result.entries };
      draw(result.entries);
      try {
        await load();
      } catch {
        status.textContent =
          "Saved vocabulary v" +
          result.revision +
          ". Database confirmation could not be refreshed; reload to verify.";
        return;
      }
      if (
        saved.revision !== result.revision ||
        JSON.stringify(saved.entries) !== JSON.stringify(result.entries)
      ) {
        status.textContent =
          "Your save completed, but another editor has since changed the vocabulary. The latest saved version is displayed.";
        return;
      }
      status.textContent =
        "Saved vocabulary v" +
        result.revision +
        ". Public pages update on reload; QMD refreshes in the background.";
    } catch (e) {
      status.textContent = e.message;
    } finally {
      busy = false;
      update();
    }
  };
  $("[data-test]").oninput = () => {
    const catalog = window.atlasCatalog || { programs: [] };
    try {
      const r = AtlasSearch.createIndex(catalog.programs, values()).search(
        $("[data-test]").value,
      );
      $("[data-test-results]").textContent =
        r.results.length +
        " direct/equivalent matches; " +
        r.candidates.length +
        " grounded related candidates. " +
        r.results
          .slice(0, 3)
          .map((x) => catalog.programs.find((p) => p.id === x.id)?.name)
          .join(" · ");
    } catch {
      $("[data-test-results]").textContent =
        "Complete the vocabulary fields to test.";
    }
  };
  window.addEventListener("beforeunload", (event) => {
    if (dirty()) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
  try {
    await load();
  } catch (e) {
    status.textContent = e.message;
  }
};
