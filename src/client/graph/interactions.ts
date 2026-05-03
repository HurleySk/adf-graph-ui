import { Core, NodeSingular } from "cytoscape";
import { NODE_COLORS } from "./renderer.js";

export interface SelectionHandler {
  onNodeSelect: (nodeId: string, data: Record<string, unknown>) => void;
  onNodeDeselect: () => void;
}

export function bindInteractions(cy: Core, handler: SelectionHandler): void {
  cy.on("tap", "node", (evt) => {
    const node = evt.target as NodeSingular;
    const data = node.data();

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

    handler.onNodeSelect(node.id(), {
      ...data,
      incoming,
      outgoing,
    });
  });

  cy.on("tap", (evt) => {
    if (evt.target === cy) {
      cy.elements().unselect();
      handler.onNodeDeselect();
    }
  });

  cy.on("mouseover", "node", (evt) => {
    const node = evt.target as NodeSingular;
    node.style("border-width", 3);
    (evt.target as any).cy().container()!.style.cursor = "pointer";
  });

  cy.on("mouseout", "node", (evt) => {
    const node = evt.target as NodeSingular;
    if (!node.selected()) {
      node.style("border-width", 2);
    }
    (evt.target as any).cy().container()!.style.cursor = "default";
  });
}

export function focusNode(cy: Core, nodeId: string): void {
  const node = cy.getElementById(nodeId);
  if (node.length > 0) {
    cy.animate({
      center: { eles: node },
      zoom: 2.5,
    } as any);
    cy.elements().unselect();
    node.select();
  }
}
