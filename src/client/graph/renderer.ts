import cytoscape, { Core, Stylesheet, LayoutOptions } from "cytoscape";
import dagre from "cytoscape-dagre";
import { GraphExport } from "../api.js";

cytoscape.use(dagre);

export const NODE_COLORS: Record<string, string> = {
  pipeline: "#4da6ff",
  activity: "#38d9c4",
  stored_procedure: "#a78bfa",
  table: "#52d980",
  dataverse_entity: "#f5b731",
  dataverse_attribute: "#c89428",
  dataset: "#f47087",
  linked_service: "#636d7c",
  key_vault_secret: "#4e5663",
};

const NODE_SHAPES: Record<string, string> = {
  pipeline: "round-rectangle",
  activity: "ellipse",
  stored_procedure: "diamond",
  table: "rectangle",
  dataverse_entity: "hexagon",
  dataset: "round-triangle",
  linked_service: "ellipse",
  key_vault_secret: "ellipse",
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
      shape: "data(shape)",
      "background-color": "data(color)",
      color: "#9ba3b0",
      "text-valign": "bottom",
      "text-margin-y": 10,
      "font-size": 10,
      "font-family": "'Outfit', sans-serif",
      "font-weight": 400,
      width: 32,
      height: 32,
      "border-width": 2,
      "border-color": "data(color)",
      "border-opacity": 0.6,
      "background-opacity": 0.15,
      "text-max-width": "110px",
      "text-wrap": "ellipsis",
      "text-outline-width": 3,
      "text-outline-color": "#08090c",
      "text-outline-opacity": 0.95,
      "overlay-padding": 6,
      "transition-property": "border-width, background-opacity, width, height",
      "transition-duration": 150,
    } as any,
  },
  {
    selector: "node:selected",
    style: {
      "border-width": 3,
      "border-opacity": 1,
      "background-opacity": 0.4,
      "font-weight": 500 as any,
      width: 38,
      height: 38,
      color: "#d0d6e0",
    },
  },
  {
    selector: "node.faded",
    style: { opacity: 0.08 },
  },
  {
    selector: "node.highlighted-upstream",
    style: {
      "border-color": "#f97316",
      "border-width": 3,
      "border-opacity": 1,
      "background-opacity": 0.35,
      "background-color": "#f97316",
    },
  },
  {
    selector: "node.highlighted-downstream",
    style: {
      "border-color": "#4da6ff",
      "border-width": 3,
      "border-opacity": 1,
      "background-opacity": 0.35,
      "background-color": "#4da6ff",
    },
  },
  {
    selector: "node.lineage-path",
    style: {
      "border-color": "#a78bfa",
      "border-width": 3,
      "border-opacity": 1,
      "background-opacity": 0.35,
      "background-color": "#a78bfa",
    },
  },
  {
    selector: "node.error",
    style: {
      "border-color": "#f04848",
      "border-width": 3,
      "border-opacity": 1,
      "background-opacity": 0.4,
      "background-color": "#f04848",
    },
  },
  {
    selector: "node.warning",
    style: {
      "border-color": "#f5b731",
      "border-width": 3,
      "border-opacity": 1,
      "background-opacity": 0.35,
      "background-color": "#f5b731",
    },
  },
  {
    selector: "node.search-match",
    style: {
      "border-color": "#e8ecf2",
      "border-width": 3,
      "border-opacity": 1,
      "background-opacity": 0.5,
      width: 36,
      height: 36,
    },
  },
  {
    selector: "edge",
    style: {
      width: 1,
      "line-color": "#1e2530",
      "target-arrow-color": "#1e2530",
      "target-arrow-shape": "triangle",
      "curve-style": "bezier",
      "arrow-scale": 0.6,
      opacity: 0.5,
      "line-style": "solid",
    },
  },
  {
    selector: "edge.highlighted",
    style: {
      width: 2,
      "line-color": "#5a6a7e",
      "target-arrow-color": "#5a6a7e",
      opacity: 1,
    },
  },
  {
    selector: "edge.faded",
    style: { opacity: 0.03 },
  },
];

const DAGRE_LAYOUT: LayoutOptions = {
  name: "dagre",
  rankDir: "TB",
  nodeSep: 30,
  rankSep: 60,
  animate: false,
} as LayoutOptions;

const COSE_LAYOUT: LayoutOptions = {
  name: "cose",
  animate: false,
  nodeRepulsion: () => 50000,
  idealEdgeLength: () => 120,
  gravity: 0.1,
  numIter: 300,
  fit: true,
  padding: 30,
} as LayoutOptions;

export function createGraph(container: HTMLElement, data: GraphExport): Core {
  const elements = [
    ...data.nodes.map((n) => ({
      data: {
        id: n.id,
        name: n.name,
        nodeType: n.type,
        color: NODE_COLORS[n.type] ?? "#4e5663",
        shape: NODE_SHAPES[n.type] ?? "ellipse",
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
    layout: { name: "preset" } as LayoutOptions,
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
  const visible = cy.nodes().filter((n) => n.style("display") !== "none");
  visible.layout(opts).run();
}

export function filterByType(cy: Core, visibleTypes: Set<string>): void {
  cy.batch(() => {
    cy.nodes().forEach((node) => {
      const type = node.data("nodeType");
      node.style("display", visibleTypes.has(type) ? "element" : "none");
    });
  });
}
