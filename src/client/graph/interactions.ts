import { Core, NodeSingular } from "cytoscape";
import { NODE_LABELS } from "./renderer.js";

export interface InteractionHandler {
  onPipelineNavigate: (pipelineId: string) => void;
  onNodeInspect: (nodeId: string, data: Record<string, unknown>) => void;
  onDeselect: () => void;
}

export function bindInteractions(cy: Core, handler: InteractionHandler): void {
  let tooltip: HTMLElement | null = null;

  function showTooltip(name: string, type: string, x: number, y: number) {
    if (!tooltip) {
      tooltip = document.createElement("div");
      tooltip.className = "graph-tooltip";
      cy.container()!.appendChild(tooltip);
    }
    tooltip.textContent = `${name} (${NODE_LABELS[type] ?? type})`;
    tooltip.style.left = `${x + 12}px`;
    tooltip.style.top = `${y - 8}px`;
    tooltip.style.display = "block";
  }

  function hideTooltip() {
    if (tooltip) tooltip.style.display = "none";
  }
  cy.on("tap", "node", (evt) => {
    const node = evt.target as NodeSingular;
    const data = node.data();

    if (data.nodeType === "pipeline" && !node.hasClass("center")) {
      handler.onPipelineNavigate(node.id());
      return;
    }

    const connectedEdges = node.connectedEdges();
    const incoming = connectedEdges
      .filter((e) => e.target().id() === node.id())
      .map((e) => ({
        from: e.source().data("name"),
        fromId: e.source().id(),
        fromType: e.source().data("nodeType"),
        type: e.data("edgeType"),
      }));
    const outgoing = connectedEdges
      .filter((e) => e.source().id() === node.id())
      .map((e) => ({
        to: e.target().data("name"),
        toId: e.target().id(),
        toType: e.target().data("nodeType"),
        type: e.data("edgeType"),
      }));

    handler.onNodeInspect(node.id(), { ...data, incoming, outgoing });
  });

  cy.on("tap", (evt) => {
    if (evt.target === cy) {
      cy.elements().unselect();
      handler.onDeselect();
    }
  });

  cy.on("mouseover", "node", (evt) => {
    const node = evt.target as NodeSingular;
    node.style("border-width", 3);
    node.connectedEdges().style("font-size", 8);
    const pos = node.renderedPosition();
    showTooltip(node.data("name"), node.data("nodeType"), pos.x, pos.y);
    cy.container()!.style.cursor = "pointer";
  });

  cy.on("mouseout", "node", (evt) => {
    const node = evt.target as NodeSingular;
    if (!node.selected() && !node.hasClass("center")) {
      node.style("border-width", 2);
    }
    node.connectedEdges().style("font-size", 0);
    hideTooltip();
    cy.container()!.style.cursor = "default";
  });

  cy.on("mouseover", "edge", (evt) => {
    evt.target.style("font-size", 8);
    evt.target.style("opacity", 1);
    evt.target.style("width", 2.5);
  });

  cy.on("mouseout", "edge", (evt) => {
    evt.target.style("font-size", 0);
    evt.target.removeStyle("opacity");
    evt.target.removeStyle("width");
  });
}
