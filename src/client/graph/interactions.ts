import { Core, NodeSingular } from "cytoscape";

export interface InteractionHandler {
  onPipelineNavigate: (pipelineId: string) => void;
  onNodeInspect: (nodeId: string, data: Record<string, unknown>) => void;
  onDeselect: () => void;
}

export function bindInteractions(cy: Core, handler: InteractionHandler): void {
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
    (evt.target as any).cy().container()!.style.cursor = "pointer";
  });

  cy.on("mouseout", "node", (evt) => {
    const node = evt.target as NodeSingular;
    if (!node.selected() && !node.hasClass("center")) {
      node.style("border-width", 2);
    }
    (evt.target as any).cy().container()!.style.cursor = "default";
  });
}
