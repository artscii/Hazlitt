const section = document.createElement("section");
section.id = "admin";
section.className = "admin-section";
section.innerHTML = `<div class="admin-content"><p>Manage project records and their map locations.</p><button id="admin-open" type="button">Edit atlas</button><form id="admin-login" hidden=""><label>Password<input name="password" type="password" autocomplete="current-password" required=""></label><button type="submit">Unlock editor</button></form><p id="admin-message" role="status" aria-live="polite"></p><div id="admin-editor" hidden=""><nav class="admin-section-nav workspace-nav" aria-label="Admin sections"></nav><div id="workspace-projects" class="workspace-panel"><div class="admin-lookup-row" id="project-editor-top"><form id="project-number-form" class="admin-number-lookup"><label for="admin-project-number">Atlas project number</label><div><input id="admin-project-number" type="number" min="1" step="1" inputmode="numeric" placeholder="e.g. 12" required="" aria-describedby="project-number-help"><button type="submit">Open project</button></div><p id="project-number-help">Enter the number shown beside a project in this Atlas.</p><p id="project-number-status" role="status" aria-live="polite"></p></form><div class="admin-name-lookup"><label for="admin-project-search">Search projects</label><input id="admin-project-search" type="search" placeholder="Project, country, continent, year or keyword…" aria-controls="admin-record" autocomplete="off"><p id="admin-search-status" role="status" aria-live="polite"></p><div id="admin-search-results" class="admin-search-results" hidden=""></div></div></div><div class="admin-toolbar"><label>Project<select id="admin-record"><option value="">New project</option></select></label><button type="button" id="admin-new">New entry</button><button type="button" id="admin-logout">Lock editor</button></div><form id="record-form" aria-describedby="required-fields-note"><p id="required-fields-note">Fields marked with an asterisk (*) are required.</p><label class="admin-project-reference" for="edit-record-reference">Project · Version<input id="edit-record-reference" type="text" readonly="" aria-readonly="true" value="New project · Not saved"></label><div id="admin-fields" class="admin-fields"></div><fieldset><legend>Country or countries *</legend><input type="search" id="country-filter" placeholder="Search to add a country…" aria-label="Search countries" autocomplete="off" aria-controls="country-results"><div id="country-results" hidden=""></div><div id="selected-countries" aria-label="Selected countries"></div><div id="admin-countries" hidden=""></div></fieldset><label class="check-label"><input type="checkbox" name="related"> Related initiative (AI not documented)</label><div class="admin-actions"><span id="draft-status" role="status" aria-live="polite">Project · No unsaved changes</span><button type="submit">Save entry</button><button type="button" id="admin-cancel" disabled="">Cancel</button><button type="button" id="admin-delete" hidden="">Delete entry</button></div></form><section id="record-history" class="record-history"><h2>Version history</h2><p id="history-status" role="status">Choose a project to review its versions.</p><div id="history-controls" hidden=""><label for="version-slider">Review saved version</label><div class="version-scroll"><div class="version-timeline"><input id="version-slider" type="range" min="0" max="0" step="1" value="0" aria-describedby="version-description"><div id="version-nodes" role="group" aria-label="Saved versions"></div></div></div><p id="version-description"></p><div id="version-diff"></div><button id="restore-version" type="button">Restore this version</button></div></section></div><div id="workspace-data" class="workspace-panel" hidden=""></div><div id="workspace-search" class="workspace-panel" hidden=""></div><div id="workspace-settings" class="workspace-panel" hidden=""></div></div></div>`;
document.querySelector("#admin-page").append(section);
const $ = (selector) => section.querySelector(selector),
  form = $("#record-form"),
  message = $("#admin-message");
let catalog = null,
  current = null,
  busy = false,
  numberedIds = [],
  loadedDraft = null;
const fields = AtlasSchema.editorFields;
const long = new Set([
  "followUp",
  "short",
  "outcome",
  "partners",
  "contact",
  "editNotes",
  "originalSummary",
  "originalOutcome",
]);
for (const [name, title, required] of fields) {
  const label = document.createElement("label");
  label.textContent = title + (required ? " *" : "");
  let input;
  if (name === "evidenceBasis") {
    input = document.createElement("select");
    for (const value of [
      "",
      "Patient examinations",
      "Slide scans",
      "Cell or image datasets",
      "Patient examinations and slide scans",
      "Patient records / risk modelling",
      "Implementation / service report",
      "Protocol / planned study",
    ]) {
      input.add(new Option(value || "Not yet classified", value));
    }
  } else if (name === "kind") {
    input = document.createElement("select");
    for (const [value, text] of [
      ["", "Implementation / published study"],
      ["deployed", "Implementation"],
      ["related", "Related initiative"],
      ["pilot", "Pilot / preliminary study"],
      ["historical", "Historical / related initiative"],
    ]) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = text;
      input.append(option);
    }
  } else {
    input = document.createElement(long.has(name) ? "textarea" : "input");
    if (input.tagName === "TEXTAREA") input.rows = 4;
    else
      input.type = [
        "source",
        "source2",
        "contactSource",
        "originalSource",
      ].includes(name)
        ? "url"
        : name === "email"
          ? "email"
          : "text";
    input.maxLength = 12000;
  }
  if (name === "followUpDate") input.type = "date";
  if (name === "publicationYear") {
    input.type = "number";
    input.min = "1900";
    input.max = String(new Date().getFullYear() + 1);
    input.step = "1";
    input.placeholder = "e.g. 2025";
  }
  input.name = name;
  input.required = !!required;
  label.append(input);
  $("#admin-fields").append(label);
}
// v4.10.7: test the current draft URL without submitting or changing the record.
for (const input of form.querySelectorAll("input[type=url]")) {
  const row = document.createElement("div");
  row.className = "url-test-row";
  input.before(row);
  row.append(input);
  const button = document.createElement("button");
  button.type = "button";
  button.className = "test-url";
  button.textContent = "Test link ↗";
  button.setAttribute(
    "aria-label",
    "Test " + fields.find(([key]) => key === input.name)[1] + " in a new tab",
  );
  row.append(button);
  const message = document.createElement("span");
  message.className = "url-test-message";
  message.setAttribute("role", "status");
  row.after(message);
  button.addEventListener("click", () => {
    const value = input.value.trim();
    let url;
    try {
      url = new URL(value);
      if (
        !["https:", "http:"].includes(url.protocol) ||
        url.username ||
        url.password
      )
        throw new Error();
    } catch {
      message.textContent = "Enter a valid https:// or http:// address first.";
      input.focus();
      return;
    }
    message.textContent =
      "Opening in a new tab. Review the destination to verify this link.";
    window.open(url.href, "_blank", "noopener,noreferrer");
  });
  input.addEventListener("input", () => {
    message.textContent = "";
  });
}
// v3.3.0: group related fields in reading order without changing control heights.
const editorGroups = [
  ["Project details", ["name", "status", "kind", "geo", "short"]],
  [
    "Evidence and outcomes",
    [
      "metric",
      "metricLabel",
      "outcome",
      "followUp",
      "followUpDate",
      "partners",
    ],
  ],
  [
    "Evidence & sources",
    [
      "publicationYear",
      "evidenceBasis",
      "sampleDetails",
      "source",
      "sourceLabel",
      "source2",
      "source2Label",
      "date",
    ],
  ],
  ["Contact details", ["phone", "tel", "email", "contactSource", "contact"]],
  [
    "Original-language material",
    [
      "originalLanguage",
      "originalTitle",
      "originalSummary",
      "originalOutcome",
      "originalSource",
    ],
  ],
  ["Editorial notes", ["editNotes"]],
];
for (const [title, keys] of editorGroups) {
  const group = document.createElement("section");
  group.className = "editor-field-group";
  const heading = document.createElement("h3");
  heading.textContent = title;
  const grid = document.createElement("div");
  grid.className = "field-group-grid";
  for (const key of keys) grid.append(form.elements[key].closest("label"));
  // v4.8.10: place dated follow-up beside outcomes; preserve the existing control heights.
  if (title === "Evidence and outcomes") {
    const follow = document.createElement("div");
    follow.className = "outcome-follow-up-fields";
    const notes = grid.querySelector("[name=followUp]").closest("label");
    notes.before(follow);
    follow.append(
      notes,
      grid.querySelector("[name=followUpDate]").closest("label"),
    );
    grid
      .querySelector("[name=partners]")
      .closest("label")
      .classList.add("outcome-partners-field");
  }
  if (title === "Original-language material") {
    const note = document.createElement("p");
    note.textContent =
      "Optional. Keep the main fields in English. Preserve the published title and link here; summaries in the source language are editorial paraphrases, not quotations. These fields are versioned and included in Excel transfers.";
    group.append(note);
  }
  if (title === "Evidence & sources") {
    const note = document.createElement("p");
    note.textContent =
      "Publication year refers to the primary report, not the date it was reviewed. Evidence basis describes what was evaluated: patient examinations, slides, individual images, or records. Slides can come from real patients; a slide count is not automatically a patient count. Use the sample field to state each denominator and the reference test. Leave the year blank if unverified.";
    group.append(note);
  }
  group.append(heading, grid);
  $("#admin-fields").append(group);
}
const actionMessage = document.createElement("p");
actionMessage.id = "edit-action-message";
$(".admin-actions").prepend(actionMessage);
form.querySelector('button[type="submit"]').textContent = "Save changes";
// v3.7.0: navigate only the current ordered search subset, without discarding drafts.
const projectNavigation = document.createElement("div");
projectNavigation.className = "project-navigation";
projectNavigation.innerHTML =
  '<button type="button" id="project-prev" aria-label="Previous matching project">← Previous</button><span id="project-position" role="status" aria-live="polite"></span><button type="button" id="project-next" aria-label="Next matching project">Next →</button>';
$(".admin-toolbar").after(projectNavigation);
function draftSignature() {
  return JSON.stringify({
    values: fields.map(([key]) => form.elements[key].value),
    related: form.elements.related.checked,
    countries: [...form.querySelectorAll("[name=countries]:checked")]
      .map((el) => el.value)
      .sort(),
  });
}
function hasProjectDraft() {
  return loadedDraft !== null && draftSignature() !== loadedDraft;
}
function updateDraftStatus() {
  const dirty = hasProjectDraft();
  $("#draft-status").textContent =
    (current
      ? "Project " +
        String(numberedIds.indexOf(current.id) + 1).padStart(2, "0")
      : "New project") +
    " · " +
    (dirty ? "Unsaved changes" : "No unsaved changes");
  $("#admin-cancel").disabled = busy;
  for (const button of section.querySelectorAll(
    "#record-form button[type=submit],.review-save",
  ))
    button.disabled = busy || !dirty;
}
form.addEventListener("input", updateDraftStatus);
form.addEventListener("change", updateDraftStatus);
const discardDialog = document.createElement("dialog");
discardDialog.className = "transfer-confirm";
discardDialog.setAttribute("aria-labelledby", "discard-draft-title");
discardDialog.innerHTML =
  '<form method="dialog"><h3 id="discard-draft-title">Discard unsaved changes?</h3><p>Your saved project will remain unchanged.</p><div class="transfer-confirm-actions"><button value="keep">Keep editing</button><button value="discard">Discard changes</button></div></form>';
section.append(discardDialog);
// v4.10.9: cancel returns to an empty search without changing the saved record.
function returnToProjectSearch() {
  load(null, true);
  form.hidden = true;
  $("#record-history").hidden = true;
  $("#admin-project-search").value = "";
  $("#admin-search-status").textContent = "";
  $("#admin-search-results").replaceChildren();
  $("#admin-search-results").hidden = true;
  $("#admin-record").replaceChildren(
    new Option("Search or open a project", ""),
  );
  $("#admin-record").disabled = false;
  projectNavigation.hidden = true;
  const url = new URL(location.href);
  url.searchParams.delete("project");
  history.replaceState(null, "", url);
  tell("Selection cleared. Search for a project to edit.");
  const search = $("#admin-project-search");
  search.focus({ preventScroll: true });
  $("#project-editor-top").scrollIntoView({
    block: "start",
    behavior: "instant",
  });
}
$("#admin-cancel").onclick = () => {
  if (busy) return;
  if (!hasProjectDraft()) {
    returnToProjectSearch();
    return;
  }
  discardDialog.returnValue = "keep";
  discardDialog.showModal();
  discardDialog.querySelector("[value=keep]").focus();
};
discardDialog.addEventListener("close", () => {
  if (discardDialog.returnValue === "discard") {
    returnToProjectSearch();
  } else $("#admin-cancel").focus();
});
window.addEventListener("beforeunload", (event) => {
  if (hasProjectDraft()) {
    event.preventDefault();
    event.returnValue = "";
  }
});
function projectSubset() {
  return [...$("#admin-record").options]
    .filter((option) => option.value)
    .map((option) => option.value);
}
function updateProjectNavigation() {
  const ids = projectSubset(),
    index = ids.indexOf(current?.id);
  $("#project-position").textContent =
    index >= 0
      ? index + 1 + " of " + ids.length + " matches"
      : ids.length
        ? ids.length + " matches · choose a project"
        : "No matching projects";
  $("#project-prev").disabled = busy || index <= 0;
  $("#project-next").disabled = busy || !ids.length || index === ids.length - 1;
  projectNavigation.hidden = !catalog;
}
function stepProject(direction) {
  if (busy) return;
  const ids = projectSubset(),
    index = ids.indexOf(current?.id),
    next = index < 0 ? 0 : index + direction;
  if (next >= 0 && next < ids.length)
    load(catalog.programs.find((project) => project.id === ids[next]));
}
$("#project-prev").onclick = () => stepProject(-1);
$("#project-next").onclick = () => stepProject(1);
for (const target of [
  projectNavigation,
  $("#admin-record"),
  $("#admin-project-search"),
])
  target.addEventListener("keydown", (event) => {
    if (event.altKey && ["ArrowLeft", "ArrowRight"].includes(event.key)) {
      event.preventDefault();
      stepProject(event.key === "ArrowLeft" ? -1 : 1);
    }
  });
async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}
function tell(text) {
  message.textContent = text;
  if (actionMessage) actionMessage.textContent = text;
}
async function refresh() {
  catalog = await api("/api/catalog");
  window.atlasCatalog = catalog;
  numberedIds = (window.atlasCatalog?.programs || catalog.programs).map(
    (p) => p.id,
  );
  const select = $("#admin-record");
  select.replaceChildren(new Option("New project", ""));
  for (const p of catalog.programs)
    select.add(
      new Option(
        "Project " +
          String(numberedIds.indexOf(p.id) + 1).padStart(2, "0") +
          " · " +
          p.name,
        p.id,
      ),
    );
  const countries = $("#admin-countries");
  countries.replaceChildren();
  for (const country of catalog.countries) {
    const label = document.createElement("label");
    label.className = "check-label";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = "countries";
    input.value = country.name;
    label.append(input, document.createTextNode(country.name));
    countries.append(label);
  }
}
function fitOutcomes() {
  const input = form.elements.outcome;
  input.style.height = "auto";
  input.style.height = Math.max(100, input.scrollHeight + 2) + "px";
}
form.elements.outcome.addEventListener("input", fitOutcomes);
let outcomeWidth = 0;
new ResizeObserver((entries) => {
  const width = entries[0].contentRect.width;
  if (width !== outcomeWidth) {
    outcomeWidth = width;
    if (!$("#admin-editor").hidden) requestAnimationFrame(fitOutcomes);
  }
}).observe(form.elements.outcome.parentElement);
// v3.2.1: one consistent project/version reference throughout version review.
function projectVersion(record, revision) {
  return (
    "Project " +
    String(numberedIds.indexOf(record.id) + 1).padStart(2, "0") +
    " · " +
    (revision > 0 ? "v" + revision : "Original import")
  );
}
function load(record, force = false) {
  if (
    !force &&
    record?.id !== current?.id &&
    hasProjectDraft() &&
    !confirm("Discard unsaved changes and open another project?")
  ) {
    $("#admin-record").value = current?.id || "";
    updateProjectNavigation();
    return false;
  }
  form.hidden = false;
  $("#record-history").hidden = false;
  versionDraft = null;
  form.querySelectorAll(".field-version-diff").forEach((el) => el.remove());
  form
    .querySelectorAll(".version-changed")
    .forEach((el) => el.classList.remove("version-changed"));
  for (const control of form.elements) control.disabled = false;
  const number = record ? numberedIds.indexOf(record.id) + 1 : 0;
  $("#admin-project-number").value = number || "";
  $("#project-number-status").textContent = record
    ? "Editing Project " + String(number).padStart(2, "0") + " · " + record.name
    : "";
  current = record;
  form.reset();
  $("#edit-record-reference").value = record
    ? projectVersion(record, record.revision)
    : "New project · Not saved";
  $("#country-filter").value = "";
  $("#admin-countries")
    .querySelectorAll("label")
    .forEach((l) => (l.hidden = false));
  for (const [name] of fields)
    form.elements[name].value = record?.[name] ?? (name === "kind" ? "" : "");
  form.elements.related.checked = !!record?.related;
  form
    .querySelectorAll("[name=countries]")
    .forEach((c) => (c.checked = !!record?.countries.includes(c.value)));
  $("#admin-delete").hidden = !record;
  $("#admin-record").value = record?.id || "";
  renderCountryPicker();
  requestAnimationFrame(fitOutcomes);
  loadRecordHistory(record);
  loadedDraft = draftSignature();
  updateDraftStatus();
  updateProjectNavigation();
  syncTitle();
  return true;
}
function canonical(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
let vocabularyMounted = false;
async function unlock() {
  await refresh();
  loadConfiguration();
  if (!vocabularyMounted) {
    await window.mountAtlasThesaurus($("#vocabulary-host"), api);
    vocabularyMounted = true;
  }
  transferUI.refreshHistory();
  analyticsUI.refresh();
  $("#admin-editor").hidden = false;
  $("#admin-login").hidden = true;
  $("#admin-open").hidden = true;
  const requested = new URLSearchParams(location.search).get("project");
  const target = catalog.programs.find((p) => p.id === requested);
  load(target || null);
  tell(
    requested && !target
      ? "This project is no longer available. Choose another project."
      : "Editor unlocked. Changes are saved for all visitors.",
  );
}
$("#admin-open").onclick = async () => {
  try {
    const state = await api("/api/session");
    if (state.authenticated) await unlock();
    else {
      $("#admin-login").hidden = false;
      $("#admin-login input").focus();
    }
  } catch (e) {
    tell(e.message);
  } finally {
    revealEditorBack();
  }
};
$("#admin-login").onsubmit = async (event) => {
  event.preventDefault();
  if (busy) return;
  busy = true;
  try {
    await api("/api/login", {
      method: "POST",
      body: JSON.stringify({ password: event.target.elements.password.value }),
    });
    event.target.reset();
    await unlock();
  } catch (e) {
    tell(e.message);
  } finally {
    busy = false;
  }
};
// v2.5.0: resolve the displayed catalog number to a stable record ID before editing.
$("#project-number-form").onsubmit = (event) => {
  event.preventDefault();
  if (busy || !catalog) return;
  const number = Number($("#admin-project-number").value);
  const id =
    Number.isInteger(number) && number > 0 ? numberedIds[number - 1] : null;
  const record = catalog.programs.find((p) => p.id === id);
  if (!record) {
    $("#project-number-status").textContent =
      "No project found with that number. Check the number in the Atlas and try again.";
    return;
  }
  load(record);
  form.elements.name.focus();
};
// v2.7.0: editor-only live search; choosing a result opens its record without saving.
// v2.7.7: search populates the project menu directly, without a second results list.
function searchAdminProjects() {
  if (!catalog) return;
  const query = $("#admin-project-search").value.trim(),
    select = $("#admin-record");
  $("#admin-search-results").replaceChildren();
  $("#admin-search-results").hidden = true;
  const matches = catalog.programs
    .filter((project) => {
      const number = numberedIds.indexOf(project.id) + 1;
      return /^#?\d+$/.test(query)
        ? number === Number(query.replace("#", ""))
        : AtlasSearch.matches(
            project,
            query,
            "Project " + number + " " + String(number).padStart(2, "0"),
          );
    })
    .sort((a, b) => numberedIds.indexOf(a.id) - numberedIds.indexOf(b.id));
  select.replaceChildren(
    new Option(
      query
        ? matches.length
          ? "Choose a matching project"
          : "No matching projects"
        : "Choose a project",
      "",
    ),
  );
  for (const project of matches)
    select.add(
      new Option(
        "Project " +
          String(numberedIds.indexOf(project.id) + 1).padStart(2, "0") +
          " · " +
          project.name,
        project.id,
      ),
    );
  select.disabled = !matches.length;
  select.value = matches.some((p) => p.id === current?.id) ? current.id : "";
  $("#admin-search-status").textContent = query
    ? matches.length + " matching projects in the Project menu."
    : "";
  // v2.7.8: load the first match without moving focus out of the search field.
  if (
    query &&
    matches.length &&
    !busy &&
    !hasProjectDraft() &&
    current?.id !== matches[0].id
  )
    load(matches[0]);
  updateProjectNavigation();
}
for (const event of ["input", "search"])
  $("#admin-project-search").addEventListener(event, searchAdminProjects);
$("#admin-project-search").addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    $("#admin-project-search").value = "";
    searchAdminProjects();
  }
  if (event.key === "Enter") {
    event.preventDefault();
    const select = $("#admin-record");
    if (select.options.length === 2 && select.options[1].value) {
      load(catalog.programs.find((p) => p.id === select.options[1].value));
      form.elements.name.focus();
    } else select.focus();
  }
});
$("#admin-record").onchange = () => {
  const record = catalog.programs.find(
    (p) => p.id === $("#admin-record").value,
  );
  if (record) load(record);
};
$("#admin-new").onclick = () => {
  $("#admin-project-search").value = "";
  searchAdminProjects();
  load(null);
  form.elements.name.focus();
};
// v3.2.4: compact country search with removable selections; no visible checkbox grid.
function renderCountryPicker() {
  requestAnimationFrame(updateDraftStatus);
  const search = $("#country-filter"),
    results = $("#country-results"),
    selected = $("#selected-countries");
  results.replaceChildren();
  selected.replaceChildren();
  const inputs = [...form.querySelectorAll("[name=countries]")],
    query = canonical(search.value);
  for (const input of inputs.filter((input) => input.checked)) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "country-chip";
    chip.textContent = input.value + (search.disabled ? "" : " ×");
    chip.disabled = search.disabled;
    chip.setAttribute("aria-label", "Remove " + input.value);
    chip.onclick = () => {
      input.checked = false;
      renderCountryPicker();
      search.focus();
    };
    selected.append(chip);
  }
  syncReviewEditors();
  results.hidden = !query || search.disabled;
  if (results.hidden) return;
  const matches = inputs.filter(
    (input) => !input.checked && canonical(input.value).includes(query),
  );
  for (const input of matches) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = input.value;
    button.onclick = () => {
      input.checked = true;
      search.value = "";
      renderCountryPicker();
      search.focus();
    };
    results.append(button);
  }
  if (!matches.length) results.textContent = "No matching countries to add.";
}
$("#country-filter").oninput = renderCountryPicker;
$("#country-filter").onkeydown = (event) => {
  const buttons = $("#country-results").querySelectorAll("button");
  if (event.key === "Escape") {
    event.preventDefault();
    event.target.value = "";
    renderCountryPicker();
  } else if (event.key === "ArrowDown" && buttons.length) {
    event.preventDefault();
    buttons[0].focus();
  } else if (event.key === "Enter") {
    event.preventDefault();
    const exact = [...buttons].find(
      (button) =>
        canonical(button.textContent) === canonical(event.target.value),
    );
    if (exact) exact.click();
    else if (buttons.length === 1) buttons[0].click();
  }
};

$("#admin-logout").onclick = async () => {
  if (
    hasProjectDraft() &&
    !confirm("Discard unsaved project changes and lock the editor?")
  )
    return;
  try {
    await api("/api/logout", { method: "POST" });
    $("#admin-editor").hidden = true;
    $("#admin-open").hidden = false;
    form.reset();
    loadedDraft = null;
    tell("Editor locked.");
  } catch (e) {
    tell(e.message);
  }
};
form.onsubmit = async (event) => {
  event.preventDefault();
  if (busy || !hasProjectDraft()) return;
  const record = Object.fromEntries(
    fields.map(([name]) => [name, form.elements[name].value.trim()]),
  );
  record.related = form.elements.related.checked;
  record.countries = [...form.querySelectorAll("[name=countries]:checked")].map(
    (c) => c.value,
  );
  record.revision = current?.revision ?? 0;
  if (!record.countries.length) {
    tell("Choose at least one country.");
    return;
  }
  const duplicate = catalog.programs.find(
    (p) => p.id !== current?.id && canonical(p.name) === canonical(record.name),
  );
  if (duplicate) {
    tell(
      "A project with this name already exists. Choose it from the Project list to edit.",
    );
    return;
  }
  const sourceKey = (value) => {
    try {
      const u = new URL(value);
      return u.origin + u.pathname.replace(/\/$/, "");
    } catch {
      return value;
    }
  };
  const possible = catalog.programs.filter(
    (p) =>
      p.id !== current?.id &&
      p.countries.some((c) => record.countries.includes(c)) &&
      [p.source, p.source2]
        .filter(Boolean)
        .some((url) =>
          [record.source, record.source2]
            .filter(Boolean)
            .some((candidate) => sourceKey(url) === sourceKey(candidate)),
        ),
  );
  if (
    possible.length &&
    !confirm(
      "Possible duplicate: " +
        possible.map((p) => p.name).join(", ") +
        ". These records share an evidence link and country. Save as a distinct project?",
    )
  )
    return;
  busy = true;
  form.querySelector("button[type=submit]").disabled = true;
  tell("Saving…");
  try {
    await api(current ? "/api/records/" + current.id : "/api/records", {
      method: current ? "PUT" : "POST",
      body: JSON.stringify(record),
    });
    loadedDraft = draftSignature();
    tell("Saved. Refreshing the atlas…");
    location.reload();
  } catch (e) {
    tell(e.message + " Your draft is still here.");
  } finally {
    busy = false;
    updateDraftStatus();
  }
};
$("#admin-delete").onclick = async () => {
  if (!current || busy || !confirm("Are you sure?")) return;
  busy = true;
  try {
    await api("/api/records/" + current.id, {
      method: "DELETE",
      body: JSON.stringify({ revision: current.revision }),
    });
    loadedDraft = null;
    location.reload();
  } catch (e) {
    tell(e.message);
  } finally {
    busy = false;
  }
};
