import { Core } from "cytoscape";

export function clearOverlays(cy: Core): void {
  cy.batch(() => {
    cy.elements().removeClass(
      "faded highlighted highlighted-upstream highlighted-downstream lineage-path error warning search-match"
    );
  });
}

export function applyImpactAnalysis(cy: Core, result: any): void {
  clearOverlays(cy);

  const affectedIds = new Set<string>();
  const targetId = result.nodeId;
  affectedIds.add(targetId);

  cy.batch(() => {
    if (result.affected) {
      for (const item of result.affected) {
        affectedIds.add(item.nodeId);
        const node = cy.getElementById(item.nodeId);
        if (node.length > 0) {
          if (item.path && item.path.length > 0) {
            const firstEdge = item.path[0];
            const isUpstream = firstEdge.to === targetId || affectedIds.has(firstEdge.to);
            node.addClass(isUpstream ? "highlighted-upstream" : "highlighted-downstream");
          } else {
            node.addClass("highlighted-downstream");
          }
        }

        if (item.path) {
          for (const edge of item.path) {
            cy.edges()
              .filter((e) => e.data("source") === edge.from && e.data("target") === edge.to)
              .addClass("highlighted");
          }
        }
      }
    }

    cy.nodes().filter((n) => !affectedIds.has(n.id())).addClass("faded");
    cy.edges().filter((e) => !e.hasClass("highlighted")).addClass("faded");
  });
}

export function applyLineage(cy: Core, result: any): void {
  clearOverlays(cy);

  const pathNodeIds = new Set<string>();
  if (result.paths) {
    for (const path of result.paths) {
      if (path.steps) {
        for (const step of path.steps) {
          if (step.nodeId) pathNodeIds.add(step.nodeId);
        }
      }
    }
  }

  if (pathNodeIds.size > 0) {
    cy.batch(() => {
      cy.nodes().filter((n) => !pathNodeIds.has(n.id())).addClass("faded");
      cy.nodes().filter((n) => pathNodeIds.has(n.id())).addClass("lineage-path");
      cy.edges()
        .filter((e) => !pathNodeIds.has(e.data("source")) || !pathNodeIds.has(e.data("target")))
        .addClass("faded");
      cy.edges()
        .filter((e) => pathNodeIds.has(e.data("source")) && pathNodeIds.has(e.data("target")))
        .addClass("highlighted");
    });
  }
}

export function applyValidation(cy: Core, result: any): void {
  clearOverlays(cy);

  if (result.issues) {
    cy.batch(() => {
      for (const issue of result.issues) {
        if (issue.nodeId) {
          const node = cy.getElementById(issue.nodeId);
          if (node.length > 0) {
            node.addClass(issue.severity === "error" ? "error" : "warning");
          }
        }
      }
    });
  }
}

export function applySearch(cy: Core, matchIds: string[]): void {
  clearOverlays(cy);
  const matchSet = new Set(matchIds);

  cy.batch(() => {
    cy.nodes().filter((n) => !matchSet.has(n.id())).addClass("faded");
    cy.nodes().filter((n) => matchSet.has(n.id())).addClass("search-match");
    cy.edges().addClass("faded");
  });

  if (matchIds.length > 0) {
    const matchNodes = cy.nodes().filter((n) => matchSet.has(n.id()));
    cy.animate({ fit: { eles: matchNodes, padding: 80 } } as any);
  }
}
