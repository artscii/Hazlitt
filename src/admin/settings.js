// v3.8.0: configuration is separate from the project draft and saves independently.
const configuration = document.createElement("section");
configuration.className = "atlas-configuration";
configuration.id = "atlas-configuration";
configuration.innerHTML = `<h2>Configuration</h2><p>Site-wide appearance and page transitions.</p><form id="config-form"><fieldset id="palette-fieldset"><legend>Site colour palette</legend><p class="palette-note">Choose a palette to preview it here. Save configuration to apply it across the site.</p><div class="palette-options" id="palette-options"></div><div class="palette-actions"><button type="button" id="palette-reset">Restore saved palette</button><span class="palette-note">Red delete controls and yellow version differences keep their meaning.</span></div></fieldset><fieldset class="configuration-group" id="transitions-fieldset"><legend>Page transitions</legend><label class="check-label"><input id="config-flip-enabled" type="checkbox"> Flip the screen between the Atlas and editor</label><div class="config-duration-row"><label for="config-flip-duration">Flip duration <output id="config-duration-value" for="config-flip-duration">0.40 seconds</output></label><input id="config-flip-duration" type="range" min="300" max="1600" step="10" value="400" aria-describedby="config-motion-note"><div class="config-range-labels"><span>Quicker · 0.3s</span><span>Slower · 1.6s</span></div></div><p id="config-motion-note">Includes both halves of the card flip. Visitors who prefer reduced motion will always see an instant transition.</p></fieldset><button type="submit">Save configuration</button><p id="config-status" role="status" aria-live="polite"></p></form>`;
$("#admin-editor").append(configuration);
// v4.11.0: full SQL backup, separate from catalogue-only Excel exports.
const backupSection = document.createElement("section");
backupSection.id = "db-backup";
backupSection.className = "atlas-configuration";
backupSection.innerHTML = `<h2>DB backup</h2><p>Download all application tables, records, versions, edit logs, settings, imports and analytics as a SQLite-compatible SQL file.</p><p class="transfer-help">Includes password hashes, sessions and audit IP addresses. Store this file privately. Unsaved form edits are not included. This is a full backup, unlike the Excel catalogue export.</p><button type="button" id="download-db-backup">Download complete DB backup</button><p id="db-backup-status" role="status" aria-live="polite"></p><details><summary>Restore to another SQLite database</summary><p>Use an empty database and run:</p><pre><code>sqlite3 restored.sqlite &lt; Hazlitt-DB-backup.sql</code></pre><p>Replace the filename with your download. Check that the final integrity result is “ok”. To run it with this app, stop the target server, back up its existing data, place the restored file at DATA_DIR/atlas.sqlite, then restart. The saved admin password transfers with the database. You can invalidate transferred sessions by running <code>DELETE FROM sessions;</code> on the restored database. Platform-owned D1 metadata is not included.</p></details>`;
configuration.before(backupSection);
$("#download-db-backup").onclick = async () => {
  const button = $("#download-db-backup"),
    status = $("#db-backup-status");
  button.disabled = true;
  status.textContent = "Preparing complete database backup…";
  try {
    const response = await fetch("/api/db-backup", { cache: "no-store" });
    if (!response.ok) {
      let error;
      try {
        error = await response.json();
      } catch {}
      throw new Error(
        error?.error ||
          "The backup service returned an error (" +
            response.status +
            "). Please retry.",
      );
    }
    if (!response.headers.get("Content-Type")?.includes("application/sql"))
      throw new Error(
        "The server did not return a database backup. Refresh the page and sign in again.",
      );
    const blob = await response.blob(),
      url = URL.createObjectURL(blob),
      link = document.createElement("a");
    link.href = url;
    link.download =
      response.headers
        .get("Content-Disposition")
        ?.match(/filename="([^"]+)"/)?.[1] || "Hazlitt-DB-backup.sql";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    status.textContent =
      "Backup downloaded. Keep it in a private, durable location.";
  } catch (error) {
    status.textContent = error.message + " No database changes were made.";
  } finally {
    button.disabled = false;
  }
};

const transferUI = window.AtlasTransfers.mount({
  before: configuration,
  api,
  getCatalog: () => catalog,
  hasDraft: hasProjectDraft,
  isBusy: () => busy,
  setBusy: (value) => {
    busy = value;
    for (const control of form.elements) control.disabled = value;
    for (const selector of [
      "#admin-record",
      "#admin-new",
      "#admin-logout",
      "#admin-project-search",
      "#admin-project-number",
      "#project-number-form button",
      "#config-form button",
      "#config-form input",
    ])
      section.querySelectorAll(selector).forEach((el) => (el.disabled = value));
    updateProjectNavigation();
    if (!value) {
      updateConfigDuration();
      updateDraftStatus();
    }
  },
  reloadRecords: async () => {
    const id = current?.id;
    await refresh();
    searchAdminProjects();
    load(catalog.programs.find((p) => p.id === id) || null, true);
  },
});

const analyticsUI = AtlasAnalytics.mount({
  before: configuration,
  api,
  getCatalog: () => catalog,
  onReset: () => transferUI.refreshHistory(),
});
const paletteOptions = $("#palette-options");
for (const palette of AtlasTheme.palettes) {
  const label = document.createElement("label");
  label.className = "palette-option";
  label.innerHTML = `<input type="radio" name="palette" value="${palette.id}"><strong>${palette.name}</strong><span class="palette-swatches" aria-hidden="true">${["accent", "highlight", "soft", "text"].map((key) => `<i style="background:${palette[key]}"></i>`).join("")}</span><small>${palette.description}</small>`;
  paletteOptions.append(label);
}
paletteOptions.onchange = (event) => {
  document.documentElement.dataset.palettePreview = "true";
  AtlasTheme.apply(event.target.value);
  $("#config-status").textContent =
    "Preview only. Save configuration to apply this palette for visitors.";
};
$("#palette-reset").onclick = () => {
  const palette = AtlasTheme.apply(catalog.config?.palette);
  delete document.documentElement.dataset.palettePreview;
  paletteOptions.querySelector(`input[value="${palette.id}"]`).checked = true;
  $("#config-status").textContent = "Saved palette restored.";
};
const configForm = $("#config-form"),
  flipEnabled = $("#config-flip-enabled"),
  flipDuration = $("#config-flip-duration");
const searchSetting = document.createElement("fieldset");
searchSetting.className = "configuration-group";
searchSetting.id = "search-fieldset";
searchSetting.innerHTML =
  '<legend>Search</legend><label class="check-label"><input type="checkbox" id="config-qmd-enabled" aria-describedby="config-search-note"> Enable QMD semantic search</label><p id="config-search-note">Turn off to use keyword search only and hide the cloud indicator. Applies when visitors reload the Atlas.</p>';
configForm.insertBefore(searchSetting, configForm.firstChild);
const qmdEnabled = $("#config-qmd-enabled");
configForm.insertBefore($("#transitions-fieldset"), $("#palette-fieldset"));
$("#palette-fieldset").classList.add("configuration-group");
function updateConfigDuration() {
  flipDuration.disabled = !flipEnabled.checked;
  const value = (Number(flipDuration.value) / 1000).toFixed(2) + " seconds";
  $("#config-duration-value").textContent = value;
  flipDuration.setAttribute("aria-valuetext", value);
}
function loadConfiguration() {
  const config = catalog.config || {
    editFlipEnabled: true,
    editFlipDuration: 400,
  };
  const palette = AtlasTheme.apply(config.palette);
  delete document.documentElement.dataset.palettePreview;
  paletteOptions.querySelector(`input[value="${palette.id}"]`).checked = true;
  qmdEnabled.checked = config.qmdEnabled !== false;
  flipEnabled.checked = config.editFlipEnabled;
  flipDuration.value = config.editFlipDuration;
  updateConfigDuration();
}
flipEnabled.onchange = updateConfigDuration;
flipDuration.oninput = updateConfigDuration;
configForm.onsubmit = async (event) => {
  event.preventDefault();
  const button = configForm.querySelector("button[type=submit]");
  for (const control of configForm.elements) control.disabled = true;
  $("#config-status").textContent = "Saving configuration…";
  try {
    catalog.config = await api("/api/config", {
      method: "PATCH",
      body: JSON.stringify({
        revision: catalog.config.revision || 0,
        editFlipEnabled: flipEnabled.checked,
        editFlipDuration: Number(flipDuration.value),
        palette: configForm.querySelector("input[name=palette]:checked").value,
      }),
    });
    delete document.documentElement.dataset.palettePreview;
    AtlasTheme.apply(catalog.config.palette);
    $("#config-status").textContent =
      "Configuration saved. Applies the next time visitors load the Atlas.";
  } catch (error) {
    $("#config-status").textContent = error.message;
  } finally {
    for (const control of configForm.elements) control.disabled = false;
    updateConfigDuration();
  }
};
