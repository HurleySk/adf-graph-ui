import cytoscape, { Core, Stylesheet, LayoutOptions } from "cytoscape";
import dagre from "cytoscape-dagre";
import { GraphExport } from "../api.js";

cytoscape.use(dagre);

export const NODE_COLORS: Record<string, string> = {
  pipeline: "#3b9dff",
  activity: "#6db8ff",
  stored_procedure: "#b27aff",
  table: "#4ae089",
  dataverse_entity: "#f0b432",
  dataverse_attribute: "#c89428",
  dataset: "#f27a8e",
  linked_service: "#7a8899",
  key_vault_secret: "#5e6b7a",
};

export const NODE_LABELS: Record<string, string> = {
  pipeline: "Pipeline",
  activity: "Activity",
  stored_procedure: "SP",
  table: "Table",
  dataverse_entity: "Entity",
  dataverse_attribute: "Attribute",
  dataset: "Dataset",
  linked_service: "Linked Svc",
  key_vault_secret: "Secret",
};

const STYLE: Stylesheet[] = [
  {
    selector: "node",
    style: {
      label: "data(name)",
      "background-color": "data(color)",
      color: "#c8cdd5",
      "text-valign": "bottom",
      "text-margin-y": 8,
      "font-size": 9,
      "font-family": "'DM Sans', sans-serif",
      width: 24,
      height: 24,
      "border-width": 2,
      "border-color": "data(color)",
      "background-opacity": 0.25,
      "text-max-width": "90px",
      "text-wrap": "ellipsis",
      "text-outline-width": 2,
      "text-outline-color": "#0b0f18",
      "text-outline-opacity": 0.9,
      "overlay-padding": 4,
    },
  },
  {
    selector: "node:selected",
    style: {
      "border-width": 3,
      "background-opacity": 0.6,
      "font-weight": "bold" as any,
      width: 30,
      height: 30,
      "text-outline-width": 3,
    },
  },
  {
    selector: "node.faded",
    style: { opacity: 0.12 },
  },
  {
    selector: "node.highlighted-upstream",
    style: {
      "border-color": "#f97316",
      "border-width": 3,
      "background-opacity": 0.5,
      "background-color": "#f97316",
    },
  },
  {
    selector: "node.highlighted-downstream",
    style: {
      "border-color": "#3b82f6",
      "border-width": 3,
      "background-opacity": 0.5,
      "background-color": "#3b82f6",
    },
  },
  {
    selector: "node.lineage-path",
    style: {
      "border-color": "#a78bfa",
      "border-width": 3,
      "background-opacity": 0.5,
      "background-color": "#a78bfa",
    },
  },
  {
    selector: "node.error",
    style: {
      "border-color": "#ef4444",
      "border-width": 3,
      "background-opacity": 0.5,
      "background-color": "#ef4444",
    },
  },
  {
    selector: "node.warning",
    style: {
      "border-color": "#eab308",
      "border-width": 3,
      "background-opacity": 0.5,
      "background-color": "#eab308",
    },
  },
  {
    selector: "node.search-match",
    style: {
      "border-color": "#fff",
      "border-width": 3,
      "background-opacity": 0.7,
      width: 30,
      height: 30,
    },
  },
  {
    selector: "edge",
    style: {
      width: 1.2,
      "line-color": "#2a3040",
      "target-arrow-color": "#2a3040",
      "target-arrow-shape": "triangle",
      "curve-style": "bezier",
      "arrow-scale": 0.7,
      opacity: 0.7,
    },
  },
  {
    selector: "edge.highlighted",
    style: {
      width: 2.5,
      "line-color": "#8899aa",
      "target-arrow-color": "#8899aa",
      opacity: 1,
    },
  },
  {
    selector: "edge.faded",
    style: { opacity: 0.06 },
  },
];

const DAGRE_LAYOUT: LayoutOptions = {
  name: "dagre",
  rankDir: "LR",
  nodeSep: 50,
  rankSep: 100,
  animate: false,
} as LayoutOptions;

const COSE_LAYOUT: LayoutOptions = {
  name: "cose",
  animate: false,
  nodeRepulsion: () => 10000,
  idealEdgeLength: () => 100,
  gravity: 0.25,
} as LayoutOptions;

export function createGraph(container: HTMLElement, data: GraphExport): Core {
  const elements = [
    ...data.nodes.map((n) => ({
      data: {
        id: n.id,
        name: n.name,
        nodeType: n.type,
        color: NODE_COLORS[n.type] ?? "#5e6b7a",
        metadata: n.metadata,
      },
    })),
    ...data.edges.map((e, i) => ({
      data: {
        id: `edge-${i}`,
        source: e.from,
        target: e.to,
        edgeType: e.type,
        metadata: e.metadata,
      },
    })),
  ];

  const cy = cytoscape({
    container,
    elements,
    style: STYLE,
    layout: DAGRE_LAYOUT,
    minZoom: 0.05,
    maxZoom: 6,
    wheelSensitivity: 0.25,
    boxSelectionEnabled: false,
    pixelRatio: "auto",
  });

  return cy;
}

export function runLayout(cy: Core, layout: "dagre" | "cose"): void {
  const opts = layout === "dagre" ? DAGRE_LAYOUT : COSE_LAYOUT;
  cy.layout(opts).run();
}

export function filterByType(cy: Core, visibleTypes: Set<string>): void {
  cy.batch(() => {
    cy.nodes().forEach((node) => {
      const type = node.data("nodeType");
      node.style("display", visibleTypes.has(type) ? "element" : "none");
    });
  });
}
