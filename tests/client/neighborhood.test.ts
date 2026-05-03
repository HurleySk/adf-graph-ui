import { describe, it, expect } from "vitest";
import { extractNeighborhood, buildPipelineTree } from "../../src/client/graph/neighborhood.js";
import { GraphExport } from "../../src/client/api.js";

function makeGraph(
  nodes: Array<{ id: string; type: string; name: string }>,
  edges: Array<{ from: string; to: string; type: string }>,
): GraphExport {
  return {
    environment: "test",
    exportedAt: new Date().toISOString(),
    stats: { nodeCount: nodes.length, edgeCount: edges.length, nodesByType: {}, edgesByType: {} },
    nodes: nodes.map((n) => ({ ...n, metadata: {} })),
    edges: edges.map((e) => ({ ...e, metadata: {} })),
  };
}

describe("extractNeighborhood", () => {
  it("returns the center node with no edges", () => {
    const g = makeGraph(
      [{ id: "pipeline:A", type: "pipeline", name: "A" }],
      [],
    );
    const hood = extractNeighborhood(g, "pipeline:A", 2);
    expect(hood.nodes).toHaveLength(1);
    expect(hood.edges).toHaveLength(0);
    expect(hood.centerId).toBe("pipeline:A");
  });

  it("collects nodes within maxHops", () => {
    const g = makeGraph(
      [
        { id: "pipeline:A", type: "pipeline", name: "A" },
        { id: "pipeline:B", type: "pipeline", name: "B" },
        { id: "pipeline:C", type: "pipeline", name: "C" },
        { id: "pipeline:D", type: "pipeline", name: "D" },
      ],
      [
        { from: "pipeline:A", to: "pipeline:B", type: "executes" },
        { from: "pipeline:B", to: "pipeline:C", type: "executes" },
        { from: "pipeline:C", to: "pipeline:D", type: "executes" },
      ],
    );

    const hood1 = extractNeighborhood(g, "pipeline:A", 1);
    expect(hood1.nodes.map((n) => n.id).sort()).toEqual(["pipeline:A", "pipeline:B"]);

    const hood2 = extractNeighborhood(g, "pipeline:A", 2);
    expect(hood2.nodes.map((n) => n.id).sort()).toEqual(["pipeline:A", "pipeline:B", "pipeline:C"]);
  });

  it("walks both directions (incoming + outgoing)", () => {
    const g = makeGraph(
      [
        { id: "pipeline:Parent", type: "pipeline", name: "Parent" },
        { id: "pipeline:Center", type: "pipeline", name: "Center" },
        { id: "pipeline:Child", type: "pipeline", name: "Child" },
      ],
      [
        { from: "pipeline:Parent", to: "pipeline:Center", type: "executes" },
        { from: "pipeline:Center", to: "pipeline:Child", type: "executes" },
      ],
    );

    const hood = extractNeighborhood(g, "pipeline:Center", 1);
    expect(hood.nodes).toHaveLength(3);
  });

  it("only includes edges between collected nodes", () => {
    const g = makeGraph(
      [
        { id: "pipeline:A", type: "pipeline", name: "A" },
        { id: "pipeline:B", type: "pipeline", name: "B" },
        { id: "pipeline:C", type: "pipeline", name: "C" },
      ],
      [
        { from: "pipeline:A", to: "pipeline:B", type: "executes" },
        { from: "pipeline:B", to: "pipeline:C", type: "executes" },
      ],
    );

    const hood = extractNeighborhood(g, "pipeline:A", 1);
    expect(hood.edges).toHaveLength(1);
    expect(hood.edges[0].from).toBe("pipeline:A");
  });

  it("handles cycles without infinite loop", () => {
    const g = makeGraph(
      [
        { id: "pipeline:A", type: "pipeline", name: "A" },
        { id: "pipeline:B", type: "pipeline", name: "B" },
      ],
      [
        { from: "pipeline:A", to: "pipeline:B", type: "executes" },
        { from: "pipeline:B", to: "pipeline:A", type: "executes" },
      ],
    );

    const hood = extractNeighborhood(g, "pipeline:A", 5);
    expect(hood.nodes).toHaveLength(2);
    expect(hood.edges).toHaveLength(2);
  });
});

describe("buildPipelineTree", () => {
  it("groups known roots separately from orphans", () => {
    const g = makeGraph(
      [
        { id: "pipeline:onprem_NightlyOrganizationLoad_v2", type: "pipeline", name: "onprem_NightlyOrganizationLoad_v2" },
        { id: "pipeline:child1", type: "pipeline", name: "child1" },
        { id: "pipeline:orphan1", type: "pipeline", name: "orphan1" },
      ],
      [
        { from: "pipeline:onprem_NightlyOrganizationLoad_v2", to: "pipeline:child1", type: "executes" },
      ],
    );

    const tree = buildPipelineTree(g);
    expect(tree.roots).toHaveLength(1);
    expect(tree.roots[0].name).toBe("onprem_NightlyOrganizationLoad_v2");
    expect(tree.roots[0].children).toHaveLength(1);
    expect(tree.orphans).toHaveLength(1);
    expect(tree.orphans[0].name).toBe("orphan1");
  });

  it("handles empty graph", () => {
    const g = makeGraph([], []);
    const tree = buildPipelineTree(g);
    expect(tree.roots).toHaveLength(0);
    expect(tree.orphans).toHaveLength(0);
  });

  it("ignores non-pipeline nodes", () => {
    const g = makeGraph(
      [
        { id: "pipeline:P1", type: "pipeline", name: "P1" },
        { id: "table:T1", type: "table", name: "T1" },
      ],
      [
        { from: "pipeline:P1", to: "table:T1", type: "reads_from" },
      ],
    );

    const tree = buildPipelineTree(g);
    expect(tree.orphans).toHaveLength(1);
    expect(tree.orphans[0].name).toBe("P1");
  });

  it("handles cycles in executes edges", () => {
    const g = makeGraph(
      [
        { id: "pipeline:A", type: "pipeline", name: "A" },
        { id: "pipeline:B", type: "pipeline", name: "B" },
      ],
      [
        { from: "pipeline:A", to: "pipeline:B", type: "executes" },
        { from: "pipeline:B", to: "pipeline:A", type: "executes" },
      ],
    );

    const tree = buildPipelineTree(g);
    const total = tree.roots.length + tree.orphans.length;
    expect(total).toBeGreaterThanOrEqual(1);
  });

  it("sorts orphans alphabetically", () => {
    const g = makeGraph(
      [
        { id: "pipeline:Zebra", type: "pipeline", name: "Zebra" },
        { id: "pipeline:Alpha", type: "pipeline", name: "Alpha" },
        { id: "pipeline:Mid", type: "pipeline", name: "Mid" },
      ],
      [],
    );

    const tree = buildPipelineTree(g);
    expect(tree.orphans.map((o) => o.name)).toEqual(["Alpha", "Mid", "Zebra"]);
  });
});
