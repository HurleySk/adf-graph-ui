import cytoscape, { Core, Stylesheet, LayoutOptions } from "cytoscape";
import dagre from "cytoscape-dagre";
import { Neighborhood } from "./neighborhood.js";

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
      color: "#c0c8d4",
      "text-valign": "bottom",
      "text-margin-y": 12,
      "font-size": 13,
      "font-family": "'Outfit', sans-serif",
      "font-weight": 500,
      width: 50,
      height: 50,
      "border-width": 2.5,
      "border-color": "data(color)",
      "border-opacity": 0.7,
      "background-opacity": 0.22,
      "text-max-width": "160px",
      "text-wrap": "ellipsis",
      "text-outline-width": 4,
      "text-outline-color": "#06080c",
      "text-outline-opacity": 1,
      "text-background-color": "#06080c",
      "text-background-opacity": 0.6,
      "text-background-padding": 3 as any,
      "text-background-shape": "roundrectangle",
      "overlay-padding": 8,
    } as any,
  },
  {
    selector: "node.center",
    style: {
      "border-width": 3.5,
      "border-opacity": 1,
      "background-opacity": 0.4,
      width: 62,
      height: 62,
      "font-weight": 600 as any,
      "font-size": 14,
      color: "#e8ecf2",
    },
  },
  {
    selector: "node:selected",
    style: {
      "border-width": 3.5,
      "border-opacity": 1,
      "background-opacity": 0.45,
      width: 56,
      height: 56,
      color: "#e0e4ec",
    },
  },
  {
    selector: "node.faded",
    style: { opacity: 0.08 },
  },
  {
    selector: "node.highlighted-upstream",
    style: { "border-color": "#f97316", "border-width": 3, "border-opacity": 1, "background-opacity": 0.35, "background-color": "#f97316" },
  },
  {
    selector: "node.highlighted-downstream",
    style: { "border-color": "#4da6ff", "border-width": 3, "border-opacity": 1, "background-opacity": 0.35, "background-color": "#4da6ff" },
  },
  {
    selector: "node.lineage-path",
    style: { "border-color": "#a78bfa", "border-width": 3, "border-opacity": 1, "background-opacity": 0.35, "background-color": "#a78bfa" },
  },
  {
    selector: "node.error",
    style: { "border-color": "#f04848", "border-width": 3, "border-opacity": 1, "background-opacity": 0.4, "background-color": "#f04848" },
  },
  {
    selector: "node.warning",
    style: { "border-color": "#f5b731", "border-width": 3, "border-opacity": 1, "background-opacity": 0.35, "background-color": "#f5b731" },
  },
  {
    selector: "node.search-match",
    style: { "border-color": "#e8ecf2", "border-width": 3, "border-opacity": 1, "background-opacity": 0.5, width: 40, height: 40 },
  },
  {
    selector: "edge",
    style: {
      label: "data(edgeType)",
      width: 1.5,
      "line-color": "#252a35",
      "target-arrow-color": "#252a35",
      "target-arrow-shape": "triangle",
      "curve-style": "bezier",
      "arrow-scale": 0.8,
      opacity: 0.7,
      "font-size": 0,
      "font-family": "'Overpass Mono', monospace",
      color: "#6a7080",
      "text-rotation": "autorotate",
      "text-margin-y": -8,
      "text-outline-width": 2,
      "text-outline-color": "#08090c",
      "text-outline-opacity": 0.9,
    },
  },
  {
    selector: "edge:active, edge:selected",
    style: { "font-size": 8 },
  },
  {
    selector: "edge[edgeType='executes']",
    style: { "line-color": "#3a6a9f", "target-arrow-color": "#3a6a9f", width: 2, opacity: 0.8 },
  },
  {
    selector: "edge[edgeType='contains']",
    style: { "line-color": "#2a5080", "target-arrow-color": "#2a5080", "line-style": "dashed" },
  },
  {
    selector: "edge[edgeType='calls_sp']",
    style: { "line-color": "#6a50a0", "target-arrow-color": "#6a50a0" },
  },
  {
    selector: "edge[edgeType='reads_from'], edge[edgeType='writes_to']",
    style: { "line-color": "#2d6a45", "target-arrow-color": "#2d6a45", "line-style": "dotted" },
  },
  {
    selector: "edge[edgeType='uses_dataset']",
    style: { "line-color": "#8a4050", "target-arrow-color": "#8a4050", "line-style": "dashed" },
  },
  {
    selector: "edge.highlighted",
    style: { width: 2.5, "line-color": "#5a6a7e", "target-arrow-color": "#5a6a7e", opacity: 1, "font-size": 8 },
  },
  {
    selector: "edge.faded",
    style: { opacity: 0.04 },
  },
];

const DAGRE_TB: LayoutOptions = { name: "dagre", rankDir: "TB", nodeSep: 70, rankSep: 100, animate: false } as LayoutOptions;
const DAGRE_LR: LayoutOptions = { name: "dagre", rankDir: "LR", nodeSep: 70, rankSep: 100, animate: false } as LayoutOptions;

export function renderNeighborhood(container: HTMLElement, hood: Neighborhood, direction: "TB" | "LR" = "TB"): Core {
  const elements = [
    ...hood.nodes.map((n) => ({
      data: {
        id: n.id,
        name: n.name,
        nodeType: n.type,
        color: NODE_COLORS[n.type] ?? "#4e5663",
        shape: NODE_SHAPES[n.type] ?? "ellipse",
        metadata: n.metadata,
      },
      classes: n.id === hood.centerId ? "center" : "",
    })),
    ...hood.edges.map((e, i) => ({
      data: {
        id: `edge-${i}`,
        source: e.from,
        target: e.to,
        edgeType: e.type,
      },
    })),
  ];

  const layout = direction === "LR" ? DAGRE_LR : DAGRE_TB;

  const cy = cytoscape({
    container,
    elements,
    style: STYLE,
    layout,
    minZoom: 0.1,
    maxZoom: 5,
    wheelSensitivity: 0.8,
    boxSelectionEnabled: false,
    pixelRatio: "auto",
  });

  cy.fit(undefined, 50);
  return cy;
}

