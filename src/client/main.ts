import { fetchGraph, GraphExport } from "./api.js";
import { createGraph, NODE_COLORS, NODE_LABELS } from "./graph/renderer.js";
import { bindInteractions } from "./graph/interactions.js";
import { initToolbar } from "./panels/toolbar.js";
import { initInspector } from "./panels/inspector.js";
import "./styles.css";

function buildLegend(container: HTMLElement): void {
  const types = ["pipeline", "stored_procedure", "table", "dataverse_entity", "dataset"];
  container.innerHTML = types
    .map(
      (t) =>
        `<span class="legend-item"><span class="legend-dot" style="background:${NODE_COLORS[t]}"></span>${NODE_LABELS[t]}</span>`
    )
    .join("");
}

function updateStatus(data: GraphExport): void {
  const statsEl = document.getElementById("stats")!;
  const envEl = document.getElementById("environment")!;
  const statusEl = document.getElementById("connection-status")!;

  statsEl.textContent = `${data.stats.nodeCount} nodes · ${data.stats.edgeCount} edges`;
  envEl.textContent = data.environment;
  statusEl.textContent = "● Connected";
  statusEl.className = "connected";
}

async function init() {
  const container = document.getElementById("graph-container")!;
  const legendEl = document.getElementById("graph-legend")!;
  const statsEl = document.getElementById("stats")!;
  const statusEl = document.getElementById("connection-status")!;

  container.innerHTML = `<div id="graph-legend"></div><div class="loading-state"><div class="loading-spinner"></div><span>Loading graph...</span></div>`;

  try {
    const data = await fetchGraph();
    container.innerHTML = `<div id="graph-legend"></div>`;

    updateStatus(data);
    buildLegend(document.getElementById("graph-legend")!);

    const cy = createGraph(container, data);

    const inspectorEl = document.getElementById("inspector")!;
    const inspector = initInspector(inspectorEl, cy);

    bindInteractions(cy, inspector);

    const toolbarEl = document.getElementById("toolbar")!;
    initToolbar(toolbarEl, cy, (newData: unknown) => {
      updateStatus(newData as GraphExport);
    });
  } catch (err: any) {
    container.innerHTML = `
      <div class="loading-state">
        <span style="color: var(--accent-red)">Failed to load graph</span>
        <span>${err.message}</span>
      </div>
    `;
    statsEl.textContent = "Error";
    statusEl.textContent = "● Disconnected";
    statusEl.className = "disconnected";
  }
}

init();
