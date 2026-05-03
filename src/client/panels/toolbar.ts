import { Core } from "cytoscape";
import { NODE_COLORS, filterByType, runLayout } from "../graph/renderer.js";
import { applySearch, clearOverlays } from "../graph/overlays.js";
import { callTool, fetchGraph } from "../api.js";

const ALL_TYPES = [
  "pipeline", "activity", "stored_procedure", "table",
  "dataverse_entity", "dataset", "linked_service",
];

const TYPE_LABELS: Record<string, string> = {
  pipeline: "Pipelines",
  activity: "Activities",
  stored_procedure: "SPs",
  table: "Tables",
  dataverse_entity: "Entities",
  dataset: "Datasets",
  linked_service: "Linked Svcs",
  key_vault_secret: "Secrets",
};

export interface ToolbarHandle {
  setCy: (cy: Core) => void;
}

export function initToolbar(
  container: HTMLElement,
  initialCy: Core,
  onRefresh: (data: unknown) => void,
): ToolbarHandle {
  const DEFAULT_VISIBLE = new Set(["pipeline"]);
  const visibleTypes = new Set(DEFAULT_VISIBLE);
  let cy = initialCy;

  const searchInput = container.querySelector<HTMLInputElement>("#search-input")!;
  const filtersContainer = container.querySelector<HTMLElement>("#type-filters")!;
  const refreshBtn = container.querySelector<HTMLButtonElement>("#refresh-btn")!;
  const layoutToggle = container.querySelector<HTMLButtonElement>("#layout-toggle")!;
  let currentLayout: "dagre" | "cose" = "dagre";

  for (const type of ALL_TYPES) {
    const btn = document.createElement("button");
    btn.className = DEFAULT_VISIBLE.has(type) ? "filter-btn active" : "filter-btn";
    btn.dataset.type = type;
    btn.innerHTML = `<span class="filter-dot" style="background:${NODE_COLORS[type] ?? "#888"}"></span>${TYPE_LABELS[type] ?? type}`;

    btn.addEventListener("click", () => {
      if (visibleTypes.has(type)) {
        visibleTypes.delete(type);
        btn.classList.remove("active");
      } else {
        visibleTypes.add(type);
        btn.classList.add("active");
      }
      filterByType(cy, visibleTypes);
    });

    filtersContainer.appendChild(btn);
  }

  let searchTimeout: ReturnType<typeof setTimeout>;
  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    const query = searchInput.value.trim();
    if (!query) {
      clearOverlays(cy);
      return;
    }
    searchTimeout = setTimeout(async () => {
      try {
        const result = (await callTool("graph_search", { query, detail: "summary" })) as any;
        const matchIds: string[] = [];
        if (result.nodes) {
          for (const n of result.nodes) matchIds.push(n.id ?? n.nodeId);
        }
        if (result.activities) {
          for (const a of result.activities) matchIds.push(a.nodeId);
        }
        applySearch(cy, matchIds);
      } catch {
        // search failed silently
      }
    }, 300);
  });

  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      searchInput.value = "";
      clearOverlays(cy);
    }
  });

  refreshBtn.addEventListener("click", async () => {
    refreshBtn.classList.add("spinning");
    try {
      const data = await fetchGraph(true);
      onRefresh(data);
    } finally {
      refreshBtn.classList.remove("spinning");
    }
  });

  layoutToggle.addEventListener("click", () => {
    currentLayout = currentLayout === "dagre" ? "cose" : "dagre";
    layoutToggle.textContent = currentLayout === "dagre" ? "Hierarchical" : "Force";
    runLayout(cy, currentLayout);
  });

  return {
    setCy(newCy: Core) {
      cy = newCy;
    },
  };
}
