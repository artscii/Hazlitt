// v4.13.22: task-based workspace; moving nodes preserves existing form handlers and drafts.
const editor = $("#admin-editor"),
  nav = $(".admin-section-nav");
nav.replaceChildren();
nav.classList.add("workspace-nav");
const mobile = document.createElement("select");
mobile.className = "workspace-mobile";
mobile.setAttribute("aria-label", "Admin section");
editor.prepend(mobile);
const panels = {};
for (const [key, title] of [
  ["projects", "Projects"],
  ["data", "Data management"],
  ["search", "Search"],
  ["settings", "Configuration"],
  ["system", "System"],
]) {
  const panel = $("#workspace-" + key);
  panels[key] = panel;

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = title;
  button.dataset.workspace = key;
  button.setAttribute("aria-controls", panel.id);
  nav.append(button);
  mobile.add(new Option(title, key));
}
for (const selector of ["#file-transfers", "#db-backup"]) {
  const node = $(selector);
  if (node) panels.data.append(node);
}
panels.settings.append(configuration);
const analytics = $("#atlas-analytics");
analytics.hidden = true;
const analyticsLink = document.createElement("a");
analyticsLink.textContent = "Analytics ↗";
analyticsLink.target = "_blank";
analyticsLink.rel = "noopener noreferrer";
analyticsLink.href = analytics.querySelector("a").href;
nav.append(analyticsLink);
new MutationObserver(
  () => (analyticsLink.href = analytics.querySelector("a").href),
).observe(analytics.querySelector("a"), {
  attributes: true,
  attributeFilter: ["href"],
});
nav.append($("#admin-logout"));
let systemUI, systemLoading;
async function openSystem() {
  try {
    if (systemUI) {
      await systemUI.refresh();
      return;
    }
    if (!systemLoading)
      systemLoading = (async () => {
        if (!window.mountAtlasSystem)
          await new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "/admin-system.js";
            script.onload = resolve;
            script.onerror = () =>
              reject(Error("System interface unavailable"));
            document.head.append(script);
          });
        systemUI = await window.mountAtlasSystem(panels.system, api);
      })();
    await systemLoading;
  } catch (error) {
    panels.system.textContent = error.message;
    systemLoading = null;
  }
}
function showWorkspace(key) {
  for (const [name, panel] of Object.entries(panels))
    panel.hidden = name !== key;
  for (const button of nav.querySelectorAll("button[data-workspace]"))
    button.setAttribute(
      "aria-current",
      button.dataset.workspace === key ? "page" : "false",
    );
  mobile.value = key;
  if (key === "search") refreshSearchStatus();
  if (key === "system") void openSystem();
}
nav.addEventListener("click", (event) => {
  const key = event.target.dataset.workspace;
  if (key) showWorkspace(key);
});
mobile.onchange = () => showWorkspace(mobile.value);
showWorkspace("projects");
$("#project-number-form").hidden = true;
$("#admin-project-search").placeholder =
  "Project number, name, country or keyword…";
const projectHeader = document.createElement("div");
projectHeader.className = "workspace-project-header";
form.prepend(projectHeader);
projectHeader.append($(".admin-project-reference"), projectNavigation);
const selectedTitle = document.createElement("strong");
selectedTitle.className = "workspace-project-title";
projectHeader.append(selectedTitle);
const syncTitle = () =>
  (selectedTitle.textContent = form.elements.name.value || "New project");
form.addEventListener("input", syncTitle);
const danger = document.createElement("div");
danger.className = "workspace-danger";
form.append(danger);
danger.append($("#admin-delete"));
const historyDetails = document.createElement("details");
historyDetails.className = "workspace-history";
const historySummary = document.createElement("summary");
historySummary.textContent = "Version history · review changes and restore";
historyDetails.append(historySummary);
$("#record-history").before(historyDetails);
historyDetails.append($("#record-history"));
const historyNote = document.createElement("p");
historyNote.textContent =
  "The form contains your editable draft. Historical previews below are not saved until you explicitly restore or save changes.";
$("#record-history").prepend(historyNote);
// Keep the independent thesaurus save outside the site-settings form.
const vocabularyHost = document.createElement("div");
vocabularyHost.id = "vocabulary-host";
searchSetting.after(vocabularyHost);
// Host is outside the configuration form, directly below its search controls.
panels.search.append(searchSetting, vocabularyHost);
const searchSave = document.createElement("button");
searchSave.type = "button";
searchSave.textContent = "Save search settings";
searchSetting.append(searchSave);
const searchStatus = document.createElement("p");
searchStatus.setAttribute("role", "status");
searchSetting.append(searchStatus);
searchSave.onclick = async () => {
  searchSave.disabled = true;
  searchStatus.textContent = "Saving search settings…";
  try {
    catalog.config = await api("/api/config", {
      method: "PATCH",
      body: JSON.stringify({
        revision: catalog.config.revision || 0,
        qmdEnabled: qmdEnabled.checked,
      }),
    });
    refreshSearchStatus();
    searchStatus.textContent =
      "Search settings saved. Applies when visitors reload the Atlas.";
  } catch (error) {
    searchStatus.textContent = error.message;
  } finally {
    searchSave.disabled = false;
  }
};
const readyStatus = document.createElement("p");
readyStatus.setAttribute("role", "status");
readyStatus.textContent = "QMD readiness not yet checked.";
searchSetting.append(readyStatus);
let statusPending = false;
async function refreshSearchStatus() {
  if (statusPending || panels.search.hidden || document.hidden) return;
  statusPending = true;
  try {
    const state = await api("/api/search/status");
    readyStatus.textContent = state.disabled
      ? "QMD is disabled. BM25 search is active."
      : state.ready
        ? state.refreshing
          ? "QMD is ready; refreshing its index."
          : "QMD is ready."
        : "QMD is warming up or unavailable. BM25 search remains available.";
  } catch {
    readyStatus.textContent =
      "QMD status unavailable. BM25 search remains available.";
  } finally {
    statusPending = false;
  }
}
setInterval(refreshSearchStatus, 15000);
window.addEventListener("focus", refreshSearchStatus);

$("#admin-open").click();
