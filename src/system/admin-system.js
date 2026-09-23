window.mountAtlasSystem = async function (panel, api) {
  panel.innerHTML =
    '<h2>System</h2><p data-stamp></p><label>Release architecture<select data-diagram></select></label><p data-kind></p><div class="system-actions"><button type="button" data-zoom="-" aria-label="Zoom out">−</button><button type="button" data-zoom="+" aria-label="Zoom in">+</button><button type="button" data-fit>Reset zoom</button><button type="button" data-download>Download SVG</button></div><div class="system-canvas" tabindex="0" aria-label="Architecture diagram"><div data-graph></div></div><details><summary>Source references</summary><ul data-files></ul></details><h3>Live services</h3><p>Docker status is sampled separately from the release diagrams.</p><button type="button" data-refresh>Refresh status</button><p data-status role="status"></p><div class="system-table"></div>';
  const $ = (s) => panel.querySelector(s);
  let data,
    svg = "",
    scale = 1,
    renderToken = 0,
    busy = false;
  async function draw() {
    const token = ++renderToken,
      diagram = data.diagrams.find((d) => d.id === $("[data-diagram]").value);
    $("[data-kind]").textContent = diagram.kind;
    try {
      if (!diagram.svg?.startsWith("<svg"))
        throw Error("Missing release diagram");
      if (token !== renderToken) return;
      svg = diagram.svg;
      $("[data-graph]").innerHTML = svg;
      $("[data-graph]").dataset.rendered = diagram.id;
      scale = 1;
      zoom();
      $("[data-files]").replaceChildren();
      for (const file of [...new Set(diagram.files)]) {
        const li = document.createElement("li"),
          a = document.createElement("a");
        a.textContent = file;
        a.href =
          "https://github.com/artscii/Hazlitt/blob/" +
          (data.commit || "main") +
          "/" +
          file;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        li.append(a);
        $("[data-files]").append(li);
      }
    } catch {
      $("[data-graph]").textContent = "Diagram could not be rendered.";
    }
  }
  function zoom() {
    const graph = $("[data-graph]");
    graph.style.zoom = scale;
  }
  for (const button of panel.querySelectorAll("[data-zoom]"))
    button.onclick = () => {
      scale = Math.max(
        0.25,
        Math.min(3, scale + (button.dataset.zoom === "+" ? 0.25 : -0.25)),
      );
      zoom();
    };
  $("[data-fit]").onclick = () => {
    scale = 1;
    zoom();
  };
  $("[data-download]").onclick = () => {
    if (!svg) return;
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })),
      a = document.createElement("a");
    a.href = url;
    a.download =
      "atlas-" + data.version + "-" + $("[data-diagram]").value + ".svg";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  async function refresh() {
    if (busy || panel.hidden || document.hidden) return;
    busy = true;
    $("[data-refresh]").disabled = true;
    try {
      const status = await api("/api/system/status");
      $("[data-status]").textContent =
        "Sampled " + new Date(status.collectedAt).toLocaleString();
      const table = document.createElement("table");
      const header = table.insertRow();
      for (const title of [
        "Service",
        "State / health",
        "Uptime",
        "CPU",
        "Memory",
      ]) {
        const th = document.createElement("th");
        th.textContent = title;
        header.append(th);
      }
      for (const service of status.services) {
        const row = table.insertRow();
        for (const value of [
          service.service,
          service.state + " / " + service.health,
          service.state === "running" && service.startedAt
            ? Math.max(
                0,
                Math.floor(
                  (Date.now() - Date.parse(service.startedAt)) / 60000,
                ),
              ) + " min"
            : "—",
          service.cpuPercent === null ? "—" : service.cpuPercent + "%",
          service.memoryBytes === null
            ? "—"
            : Math.round(service.memoryBytes / 1048576) + " MB",
        ])
          row.insertCell().textContent = value;
      }
      $(".system-table").replaceChildren(table);
    } catch (error) {
      $("[data-status]").textContent = error.message;
      $(".system-table").replaceChildren();
    } finally {
      busy = false;
      $("[data-refresh]").disabled = false;
    }
  }
  $("[data-refresh]").onclick = refresh;
  try {
    data = await api("/api/system/diagrams");
    $("[data-stamp]").textContent =
      "Version " +
      data.version +
      " · commit " +
      (data.commit?.slice(0, 7) || "not supplied") +
      " · diagram " +
      data.sourceHash;
    for (const d of data.diagrams)
      $("[data-diagram]").add(new Option(d.title, d.id));
    $("[data-diagram]").onchange = draw;
    await draw();
  } catch (error) {
    $("[data-stamp]").textContent = error.message;
  }
  await refresh();
  setInterval(refresh, 30000);
  return { refresh };
};
