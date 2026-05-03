import { fetchGraph, GraphExport } from "./api.js";
import { createGraph, NODE_COLORS, NODE_LABELS, filterByType, runLayout } from "./graph/renderer.js";
import { bindInteractions } from "./graph/interactions.js";
import { initToolbar, ToolbarHandle } from "./panels/toolbar.js";
import { initInspector } from "./panels/inspector.js";
import { Core } from "cytoscape";
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

let activeCy: Core | null = null;

function renderGraph(data: GraphExport): Core {
  const container = document.getElementById("graph-container")!;
  container.innerHTML = `<div id="graph-legend"></div>`;

  if (activeCy) {
    activeCy.destroy();
    activeCy = null;
  }

  updateStatus(data);
  buildLegend(document.getElementById("graph-legend")!);

  activeCy = createGraph(container, data);
  (window as any).__cy = activeCy;

  filterByType(activeCy, new Set(["pipeline"]));
  runLayout(activeCy, "cose");

  const inspectorEl = document.getElementById("inspector")!;
  const inspector = initInspector(inspectorEl, activeCy);
  bindInteractions(activeCy, inspector);

  return activeCy;
}

async function init() {
  const container = document.getElementById("graph-container")!;
  const statsEl = document.getElementById("stats")!;
  const statusEl = document.getElementById("connection-status")!;

  container.innerHTML = `<div id="graph-legend"></div><div class="loading-state"><div class="loading-spinner"></div><span>Loading graph...</span></div>`;

  try {
    const data = await fetchGraph();
    const cy = renderGraph(data);

    const toolbarEl = document.getElementById("toolbar")!;
    const toolbar = initToolbar(toolbarEl, cy, (newData: unknown) => {
      const newCy = renderGraph(newData as GraphExport);
      toolbar.setCy(newCy);
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
