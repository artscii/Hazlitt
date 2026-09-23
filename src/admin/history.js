// v3.1.0: record-specific, read-only version review; restores create a new audit version.
let historyToken = 0,
  historyEntries = [],
  historyRevision = 0,
  versionDraft = null;
form.after($("#record-history"));
// v3.2.0: explicit version review, filtering, and reversible restore controls.
$("#history-controls").insertAdjacentHTML(
  "afterbegin",
  `<div class="version-navigation"><button type="button" id="version-prev">← Previous</button><label for="version-search">Find a version<input id="version-search" type="search" placeholder="Version, date or changed field…" autocomplete="off" aria-controls="version-picker"><select id="version-picker" aria-label="Matching saved versions"></select><span id="version-search-status" role="status"></span></label><button type="button" id="version-next">Next →</button><button type="button" id="version-first">First</button><button type="button" id="version-current">Latest</button></div><p id="version-badges" aria-live="polite"></p><label class="check-label" hidden><input type="checkbox" id="version-changes-only" checked> Show changed fields only</label><p id="version-filter-status" role="status"></p>`,
);
// v3.2.2: keep the selected version's context together above the timeline.
const versionContext = document.createElement("div");
versionContext.className = "version-context";
versionContext.append($("#version-badges"), $("#version-description"));
const sliderLabel = $('label[for="version-slider"]');
sliderLabel.before(versionContext);
sliderLabel.classList.add("version-slider-label");
const versionActions = document.createElement("div");
versionActions.className = "version-review-actions";
versionActions.append(
  $("#version-changes-only").closest("label"),
  $("#restore-version"),
);
$(".version-scroll").after(versionActions);
const selectedSummary = document.createElement("p");
selectedSummary.id = "selected-version-summary";
selectedSummary.setAttribute("aria-live", "polite");
$(".version-scroll").after(selectedSummary);
versionActions.after($("#version-filter-status"), $("#version-diff"));
const formHeading = document.createElement("div");
formHeading.className = "record-form-heading";
formHeading.append(
  $("#edit-record-reference").closest("label"),
  $("#required-fields-note"),
);
form.prepend(formHeading);
// v3.5.0: review copies share the main form's draft; history never replaces it.
function filterVersionFields() {
  const cards = [...$("#version-diff").querySelectorAll(".version-edit-card")],
    only = true;
  for (const card of cards)
    card.hidden = only && !card.classList.contains("version-changed");
  const count = cards.filter((card) => !card.hidden).length;
  $("#version-filter-status").textContent = only
    ? count + " changed fields shown. The full form above remains available."
    : "All fields shown below. Edits update the same draft as the full form.";
}
function draftValue(key) {
  return key === "countries"
    ? [...form.querySelectorAll("[name=countries]:checked")].map(
        (el) => el.value,
      )
    : key === "related"
      ? form.elements.related.checked
      : form.elements[key].value;
}
function syncReviewEditors() {
  updateDraftStatus();
  for (const control of section.querySelectorAll("[data-review-field]")) {
    const key = control.dataset.reviewField,
      value = draftValue(key);
    if (key === "countries")
      for (const option of control.options)
        option.selected = value.includes(option.value);
    else if (key === "related") control.checked = value;
    else if (control.value !== value) control.value = value;
  }
}
form.addEventListener("input", syncReviewEditors);
form.addEventListener("change", syncReviewEditors);
function reviewEditor(key, title) {
  const label = document.createElement("label");
  label.className = "version-draft-editor";
  label.append(document.createTextNode("Edit current " + title.toLowerCase()));
  let control;
  if (key === "countries") {
    control = document.createElement("select");
    control.multiple = true;
    control.size = 5;
    for (const country of catalog.countries)
      control.add(new Option(country.name, country.name));
  } else {
    control = form.elements[key].cloneNode(true);
    control.removeAttribute("id");
    control.removeAttribute("name");
    control.removeAttribute("style");
    control.disabled = false;
  }
  control.dataset.reviewField = key;
  control.addEventListener(
    key === "countries" || key === "related" ? "change" : "input",
    () => {
      if (key === "countries") {
        const selected = [...control.selectedOptions].map(
          (option) => option.value,
        );
        form
          .querySelectorAll("[name=countries]")
          .forEach((input) => (input.checked = selected.includes(input.value)));
        renderCountryPicker();
      } else {
        const original = form.elements[key];
        if (key === "related") original.checked = control.checked;
        else original.value = control.value;
        original.dispatchEvent(new Event("input", { bubbles: true }));
      }
      $("#review-draft-status").textContent =
        "Unsaved changes · shared with the full form above.";
    },
  );
  label.append(control);
  return label;
}
function selectVersion(index) {
  if (busy || !historyEntries.length) return;
  slider.min = "0";
  slider.max = String(historyEntries.length - 1);
  slider.value = String(
    Math.max(0, Math.min(historyEntries.length - 1, index)),
  );
  renderVersion();
}
$("#version-search").oninput = filterVersionPicker;
$("#version-first").onclick = () => selectVersion(0);
$("#version-prev").onclick = () => selectVersion(Number(slider.value) - 1);
$("#version-next").onclick = () => selectVersion(Number(slider.value) + 1);
$("#version-picker").onchange = (event) => {
  if (event.target.value !== "") selectVersion(Number(event.target.value));
};
$("#version-current").onclick = () => {
  $("#version-changes-only").checked = true;
  selectVersion(historyEntries.length - 1);
};
$("#version-changes-only").onchange = filterVersionFields;
const historyStatus = $("#history-status"),
  historyControls = $("#history-controls"),
  slider = $("#version-slider"),
  restoreButton = $("#restore-version");
async function loadRecordHistory(record) {
  const token = ++historyToken;
  historyEntries = [];
  $("#version-search").value = "";
  historyControls.hidden = true;
  $("#version-changes-only").checked = true;
  filterVersionFields();
  if (!record) {
    historyStatus.textContent =
      "Save this project before reviewing its version history.";
    return;
  }
  historyStatus.textContent = "Loading versions…";
  try {
    const data = await api("/api/records/" + record.id + "/history?limit=50");
    if (token !== historyToken) return;
    historyRevision = data.currentRevision;
    historyEntries = data.entries.filter((entry) => entry.revision >= 1);
    let older = $("#load-older-versions");
    if (!older) {
      older = document.createElement("button");
      older.id = "load-older-versions";
      older.type = "button";
      historyControls.append(older);
    }
    older.textContent = "Load earlier versions";
    older.hidden = !data.hasMore;
    older.onclick = async () => {
      older.disabled = true;
      const selected = historyEntries[Number(slider.value)]?.revision;
      try {
        const page = await api(
          "/api/records/" +
            record.id +
            "/history?limit=50&before=" +
            historyEntries[0].revision,
        );
        if (token !== historyToken) return;
        historyEntries = [
          ...page.entries.filter((e) => e.revision >= 1),
          ...historyEntries,
        ];
        pickerSignature = "";
        slider.max = String(historyEntries.length - 1);
        slider.value = String(
          historyEntries.findIndex((e) => e.revision === selected),
        );
        older.hidden = !page.hasMore;
        renderVersion();
      } catch (e) {
        historyStatus.textContent = e.message;
      } finally {
        older.disabled = false;
      }
    };
    if (!historyEntries.length) {
      historyStatus.textContent =
        "No saved versions yet. The first edit will create v1.";
      return;
    }
    slider.min = "0";
    slider.max = String(historyEntries.length - 1);
    slider.value = slider.max;
    slider.disabled = historyEntries.length === 1;
    historyControls.hidden = false;
    buildVersionNodes();
    historyStatus.textContent =
      "Compare saved versions and edit your current draft below.";
    renderVersion();
  } catch (error) {
    if (token === historyToken) historyStatus.textContent = error.message;
  }
}
// v3.9.0: keep a bounded window of nodes; every saved version remains searchable.
// v4.5.0: fit readable, touch-sized version nodes to the available width.
const timelineObserver = new ResizeObserver(() => {
  if (historyEntries.length && scrubPointer === null) buildVersionNodes();
});
timelineObserver.observe($(".version-timeline"));
let pickerSignature = "";
function filterVersionPicker() {
  const picker = $("#version-picker"),
    query = canonical($("#version-search").value),
    terms = query.split(" ").filter(Boolean);
  const signature = historyToken + "|" + query;
  if (signature === pickerSignature) {
    picker.value = slider.value;
    $("#version-search-status").textContent = query
      ? picker.options.length + " matching versions"
      : "Version " +
        (Number(slider.value) + 1) +
        " of " +
        historyEntries.length;
    return;
  }
  pickerSignature = signature;
  picker.replaceChildren();
  let count = 0;
  historyEntries.forEach((entry, index) => {
    const changedFields = [
      ...fields,
      ["countries", "Country or countries"],
      ["related", "Related initiative"],
    ]
      .filter(
        ([key]) =>
          JSON.stringify(entry.before?.[key] ?? "") !==
          JSON.stringify(entry.after?.[key] ?? ""),
      )
      .map(([, label]) => label)
      .join(" ");
    const date = new Date(entry.at),
      text = (entry.searchText ??= canonical(
        "v" +
          entry.revision +
          " version " +
          entry.revision +
          " " +
          date.toLocaleString() +
          " " +
          date.toISOString().slice(0, 10) +
          " " +
          (entry.summary || "") +
          " " +
          changedFields,
      ));
    if (!terms.every((term) => text.includes(term))) return;
    const option = new Option(
      "v" +
        entry.revision +
        (entry.revision === historyRevision ? " · Current" : "") +
        " · " +
        date.toLocaleDateString(),
      String(index),
    );
    picker.add(option);
    count++;
  });
  if (!count) picker.add(new Option("No matching versions", ""));
  picker.value = [...picker.options].some(
    (option) => option.value === slider.value,
  )
    ? slider.value
    : "";
  picker.disabled = !count;
  $("#version-search-status").textContent = query
    ? count + " matching versions"
    : "Version " + (Number(slider.value) + 1) + " of " + historyEntries.length;
}
function buildVersionNodes() {
  const nodes = $("#version-nodes"),
    selected = Number(slider.value);
  const width = $(".version-timeline").getBoundingClientRect().width;
  const digits = Math.max(
    ...historyEntries.map((entry) => String(entry.revision).length),
  );
  const spacing = Math.max(48, 24 + digits * 9);
  const size = Math.min(
    historyEntries.length,
    Math.max(2, Math.floor(Math.max(0, width - 18) / spacing) + 1),
  );
  const start = Math.max(
      0,
      Math.min(historyEntries.length - size, selected - Math.floor(size / 2)),
    ),
    end = start + size - 1;
  slider.min = String(start);
  slider.max = String(end);
  slider.value = String(selected);
  nodes.replaceChildren();
  $(".version-timeline").style.minWidth = "0";
  for (let index = start; index <= end; index++) {
    const entry = historyEntries[index],
      button = document.createElement("button");
    button.type = "button";
    button.className = "version-node";
    button.textContent = "v" + entry.revision;
    button.dataset.index = String(index);
    button.style.left =
      (size === 1 ? 50 : ((index - start) / (size - 1)) * 100) + "%";
    button.setAttribute("aria-pressed", String(index === selected));
    button.setAttribute("aria-label", "Preview version " + entry.revision);
    button.onclick = () => selectVersion(index);
    nodes.append(button);
  }
  filterVersionPicker();
}
function renderVersion() {
  const entry = historyEntries[Number(slider.value)];
  if (!entry || !current) return;
  const snapshot = entry.after,
    historical = entry.revision !== historyRevision;
  if (scrubPointer === null) buildVersionNodes();
  $("#version-nodes")
    .querySelectorAll("button")
    .forEach((button) =>
      button.setAttribute(
        "aria-pressed",
        String(Number(button.dataset.index) === Number(slider.value)),
      ),
    );
  selectedSummary.replaceChildren();
  for (const part of (entry.summary || "No summary available.").split(
    /(“[^”]+”)/g,
  )) {
    if (part.startsWith("“") && part.endsWith("”")) {
      const strong = document.createElement("strong");
      strong.textContent = part.slice(1, -1);
      selectedSummary.append(strong);
    } else selectedSummary.append(document.createTextNode(part));
  }
  $("#version-first").disabled = Number(slider.value) === 0 || busy;
  $("#version-search-status").textContent = $("#version-search").value
    ? $("#version-search-status").textContent
    : "Version " + (Number(slider.value) + 1) + " of " + historyEntries.length;
  slider.setAttribute("aria-valuetext", "Version " + entry.revision);
  $("#version-picker").value = slider.value;
  $("#version-description").textContent =
    "v" +
    entry.revision +
    " · " +
    new Date(entry.at).toLocaleString() +
    " · " +
    entry.action;
  $("#version-prev").disabled = Number(slider.value) === 0 || busy;
  $("#version-next").disabled =
    Number(slider.value) === historyEntries.length - 1 || busy;
  $("#version-current").disabled = !historical || busy;
  $("#version-badges").textContent =
    projectVersion(current, entry.revision) +
    (historical
      ? " · Comparing with current v" + historyRevision
      : " · Current");
  const container = $("#version-diff");
  container.replaceChildren();
  const heading = document.createElement("h3");
  heading.textContent = "Review & edit fields";
  container.append(heading);
  const explanation = document.createElement("p");
  explanation.textContent =
    "Yellow highlights compare saved versions. Editable values below belong to your current draft; browsing history does not replace them.";
  container.append(explanation);
  const format = (value) =>
    Array.isArray(value)
      ? value.join(", ")
      : typeof value === "boolean"
        ? value
          ? "Yes"
          : "No"
        : String(value ?? "");
  function diffLine(title, text, other) {
    const line = document.createElement("p"),
      heading = document.createElement("strong");
    heading.textContent = title;
    line.append(heading);
    if (text === other) {
      line.append(document.createTextNode(text || "Not set"));
      return line;
    }
    let start = 0;
    while (
      start < text.length &&
      start < other.length &&
      text[start] === other[start]
    )
      start++;
    let end = text.length,
      otherEnd = other.length;
    while (
      end > start &&
      otherEnd > start &&
      text[end - 1] === other[otherEnd - 1]
    ) {
      end--;
      otherEnd--;
    }
    line.append(document.createTextNode(text.slice(0, start)));
    const mark = document.createElement("mark");
    mark.textContent = text.slice(start, end) || "∅";
    line.append(mark, document.createTextNode(text.slice(end)));
    return line;
  }
  const changedNames = [];
  for (const [key, title] of [
    ...fields,
    ["countries", "Country or countries"],
    ["related", "Related initiative"],
  ]) {
    const saved = format(current[key]),
      reviewed = format(snapshot?.[key]),
      changed = saved !== reviewed;
    if (!changed) continue;
    changedNames.push(title);
    const card = document.createElement("section");
    card.className = "version-edit-card" + (changed ? " version-changed" : "");
    const titleElement = document.createElement("h4");
    titleElement.textContent = title;
    card.append(titleElement);
    if (changed) {
      const diff = document.createElement("div");
      diff.className = "field-version-diff";
      diff.append(
        diffLine("Current saved v" + historyRevision, saved, reviewed),
        diffLine("Selected v" + entry.revision, reviewed, saved),
      );
      card.append(diff);
    }
    card.append(reviewEditor(key, title));
    container.append(card);
  }
  const status = document.createElement("p");
  status.id = "review-draft-status";
  status.setAttribute("role", "status");
  const save = document.createElement("button");
  save.type = "button";
  save.className = "review-save";
  save.textContent = "Save current draft";
  save.disabled = busy || !hasProjectDraft();
  save.onclick = () => {
    if (!form.checkValidity()) {
      const invalid = form.querySelector(":invalid");
      invalid?.scrollIntoView({ block: "center" });
      form.reportValidity();
      return;
    }
    form.requestSubmit();
  };
  save.hidden = !changedNames.length;
  container.append(status, save);
  syncReviewEditors();
  filterVersionFields();
  if (!changedNames.length)
    $("#version-filter-status").textContent =
      "No fields differ from the current saved version. Choose an earlier version to review edits. The full form above remains editable.";
  restoreButton.dataset.summary = changedNames.join(", ");
  restoreButton.disabled =
    !historical || (!changedNames.length && !!snapshot) || busy;
  restoreButton.textContent = snapshot
    ? "Restore v" + entry.revision + " as a new version"
    : "Restore deleted state as a new version";
}
slider.addEventListener("input", renderVersion);
// v3.1.2: capture the pointer so dragging keeps scrubbing beyond the thumb.
let scrubPointer = null;
function scrubAt(clientX) {
  const bounds = slider.getBoundingClientRect(),
    inset = 9;
  const fraction = Math.max(
    0,
    Math.min(
      1,
      (clientX - bounds.left - inset) / Math.max(1, bounds.width - inset * 2),
    ),
  );
  const next = String(
    Math.round(
      Number(slider.min) + fraction * (Number(slider.max) - Number(slider.min)),
    ),
  );
  if (slider.value !== next) {
    slider.value = next;
    renderVersion();
  }
}
slider.addEventListener("pointerdown", (event) => {
  if (slider.disabled || busy || event.button !== 0) return;
  event.preventDefault();
  scrubPointer = event.pointerId;
  slider.setPointerCapture(scrubPointer);
  slider.focus({ preventScroll: true });
  scrubAt(event.clientX);
});
slider.addEventListener("pointermove", (event) => {
  if (event.pointerId === scrubPointer) scrubAt(event.clientX);
});
slider.addEventListener("pointerup", (event) => {
  if (event.pointerId === scrubPointer) {
    scrubAt(event.clientX);
    slider.releasePointerCapture(scrubPointer);
    scrubPointer = null;
  }
});
slider.addEventListener("lostpointercapture", () => {
  scrubPointer = null;
  if (historyEntries.length) buildVersionNodes();
});
slider.addEventListener("keydown", (event) => {
  if (
    ["ArrowLeft", "ArrowDown", "ArrowRight", "ArrowUp", "Home", "End"].includes(
      event.key,
    )
  ) {
    event.preventDefault();
    selectVersion(
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? historyEntries.length - 1
          : Number(slider.value) +
            (["ArrowLeft", "ArrowDown"].includes(event.key) ? -1 : 1),
    );
  }
});
restoreButton.onclick = async () => {
  const entry = historyEntries[Number(slider.value)];
  if (!current || !entry || busy || restoreButton.disabled) return;
  const target = current,
    id = target.id;
  if (
    !confirm(
      "Restore " +
        target.name +
        " to " +
        (entry.after ? "v" + entry.revision : "the deleted state") +
        "?\n\nFields affected: " +
        restoreButton.dataset.summary +
        ".\n\nUnsaved form edits will be replaced. This creates a new version and preserves all existing history.",
    )
  )
    return;
  busy = true;
  restoreButton.disabled = true;
  try {
    await api("/api/rollback/" + entry.id, {
      method: "POST",
      body: JSON.stringify({ side: "after", revision: historyRevision }),
    });
    await refresh();
    load(catalog.programs.find((project) => project.id === id) || null, true);
    tell("Version restored. A new version was recorded.");
  } catch (error) {
    historyStatus.textContent = error.message;
  } finally {
    busy = false;
    renderVersion();
  }
};
