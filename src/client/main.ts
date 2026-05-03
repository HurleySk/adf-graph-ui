import { fetchGraph, GraphExport } from "./api.js";
import { extractNeighborhood, buildPipelineTree } from "./graph/neighborhood.js";
import { renderNeighborhood, NODE_COLORS, NODE_LABELS } from "./graph/renderer.js";
import { bindInteractions } from "./graph/interactions.js";
import { initNavigator } from "./panels/navigator.js";
import { initInspector, InspectorHandle } from "./panels/inspector.js";
import { Core } from "cytoscape";
import "./styles.css";

let graphData: GraphExport | null = null;
let activeCy: Core | null = null;
let inspector: InspectorHandle | null = null;
let currentDirection: "TB" | "LR" = "TB";

function buildLegend(): void {
  const el = document.getElementById("graph-legend")!;
  const types = ["pipeline", "activity", "stored_procedure", "table", "dataverse_entity", "dataset"];
  el.innerHTML = types
    .map((t) => `<span class="legend-item"><span class="legend-dot" style="background:${NODE_COLORS[t]}"></span>${NODE_LABELS[t]}</span>`)
    .join("");
}

function showNeighborhood(pipelineId: string): void {
  if (!graphData) return;

  let hood = extractNeighborhood(graphData, pipelineId, 2);
  if (hood.nodes.length > 60) {
    hood = extractNeighborhood(graphData, pipelineId, 1);
  }
  const container = document.getElementById("graph-container")!;

  document.getElementById("graph-empty")?.classList.add("hidden");

  if (activeCy) {
    activeCy.destroy();
    activeCy = null;
  }

  activeCy = renderNeighborhood(container, hood, currentDirection);
  (window as any).__cy = activeCy;

  const inspectorEl = document.getElementById("inspector")!;
  if (!inspector) {
    inspector = initInspector(inspectorEl, activeCy);
  } else {
    inspector.setCy(activeCy);
    inspector.hide();
  }

  bindInteractions(activeCy, {
    onPipelineNavigate(id: string) {
      showNeighborhood(id);
      nav?.setActive(id);
    },
    onNodeInspect(nodeId: string, data: Record<string, unknown>) {
      inspector?.show(nodeId, data);
    },
    onDeselect() {
      inspector?.hide();
    },
  });

  const statsEl = document.getElementById("stats")!;
  statsEl.textContent = `${hood.nodes.length} nodes · ${hood.edges.length} edges`;
}

let nav: ReturnType<typeof initNavigator> | null = null;

async function init() {
  const statsEl = document.getElementById("stats")!;
  const envEl = document.getElementById("environment")!;
  const statusEl = document.getElementById("connection-status")!;

  statsEl.textContent = "Loading...";

  try {
    graphData = await fetchGraph();

    envEl.textContent = graphData.environment;
    statusEl.textContent = "● Connected";
    statusEl.className = "connected";
    statsEl.textContent = `${graphData.stats.nodeCount} nodes total`;

    buildLegend();

    const inspectorEl = document.getElementById("inspector")!;

    const tree = buildPipelineTree(graphData);

    const navEl = document.getElementById("navigator")!;
    nav = initNavigator(navEl, tree, (pipelineId: string) => {
      showNeighborhood(pipelineId);
      nav?.setActive(pipelineId);
    });

    const layoutBtn = document.getElementById("layout-toggle")!;
    layoutBtn.addEventListener("click", () => {
      currentDirection = currentDirection === "TB" ? "LR" : "TB";
      layoutBtn.textContent = currentDirection;
      if (activeCy) {
        const center = activeCy.nodes(".center");
        if (center.length > 0) {
          showNeighborhood(center.first().id());
          nav?.setActive(center.first().id());
        }
      }
    });

    const refreshBtn = document.getElementById("refresh-btn")!;
    refreshBtn.addEventListener("click", async () => {
      refreshBtn.classList.add("spinning");
      try {
        graphData = await fetchGraph(true);
        envEl.textContent = graphData.environment;
        statsEl.textContent = `${graphData.stats.nodeCount} nodes total`;

        const newTree = buildPipelineTree(graphData);
        const navEl = document.getElementById("navigator")!;
        navEl.querySelector("#nav-list")!.innerHTML = "";
        nav = initNavigator(navEl, newTree, (pipelineId: string) => {
          showNeighborhood(pipelineId);
          nav?.setActive(pipelineId);
        });

        if (activeCy) {
          const center = activeCy.nodes(".center");
          if (center.length > 0) {
            showNeighborhood(center.first().id());
            nav?.setActive(center.first().id());
          }
        }
      } finally {
        refreshBtn.classList.remove("spinning");
      }
    });
  } catch (err: any) {
    const graphEmpty = document.getElementById("graph-empty");
    if (graphEmpty) {
      graphEmpty.innerHTML = `<div class="empty-hex" style="color:var(--signal-red)">✕</div><p>Failed to connect to adf-graph</p>`;
    }
    statsEl.textContent = "Error";
    statusEl.textContent = "● Disconnected";
    statusEl.className = "disconnected";
  }
}

init();
