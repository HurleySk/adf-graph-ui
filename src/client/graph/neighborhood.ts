import { GraphExport } from "../api.js";

export interface Neighborhood {
  nodes: GraphExport["nodes"];
  edges: GraphExport["edges"];
  centerId: string;
}

export function extractNeighborhood(
  data: GraphExport,
  centerId: string,
  maxHops = 2,
): Neighborhood {
  const nodeMap = new Map(data.nodes.map((n) => [n.id, n]));
  const outgoing = new Map<string, typeof data.edges>();
  const incoming = new Map<string, typeof data.edges>();

  for (const e of data.edges) {
    if (!outgoing.has(e.from)) outgoing.set(e.from, []);
    outgoing.get(e.from)!.push(e);
    if (!incoming.has(e.to)) incoming.set(e.to, []);
    incoming.get(e.to)!.push(e);
  }

  const collected = new Set<string>();
  collected.add(centerId);

  const queue: Array<{ id: string; depth: number }> = [{ id: centerId, depth: 0 }];

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (depth >= maxHops) continue;

    for (const e of outgoing.get(id) ?? []) {
      if (!collected.has(e.to)) {
        collected.add(e.to);
        queue.push({ id: e.to, depth: depth + 1 });
      }
    }
    for (const e of incoming.get(id) ?? []) {
      if (!collected.has(e.from)) {
        collected.add(e.from);
        queue.push({ id: e.from, depth: depth + 1 });
      }
    }
  }

  const nodes = data.nodes.filter((n) => collected.has(n.id));
  const edges = data.edges.filter((e) => collected.has(e.from) && collected.has(e.to));

  return { nodes, edges, centerId };
}

export interface PipelineTree {
  roots: PipelineTreeNode[];
  orphans: PipelineTreeNode[];
}

export interface PipelineTreeNode {
  id: string;
  name: string;
  children: PipelineTreeNode[];
}

const KNOWN_ROOTS = [
  "onprem_NightlyOrganizationLoad_v2",
  "onprem_Orchestration_DeltaLoad",
  "onprem_Orchestration_Migration_Wave3",
];

export function buildPipelineTree(data: GraphExport): PipelineTree {
  const pipelines = data.nodes.filter((n) => n.type === "pipeline");
  const pipelineIds = new Set(pipelines.map((p) => p.id));

  const executesEdges = data.edges.filter(
    (e) => e.type === "executes" && pipelineIds.has(e.from) && pipelineIds.has(e.to),
  );

  const childrenOf = new Map<string, string[]>();
  const hasParent = new Set<string>();

  for (const e of executesEdges) {
    if (!childrenOf.has(e.from)) childrenOf.set(e.from, []);
    childrenOf.get(e.from)!.push(e.to);
    hasParent.add(e.to);
  }

  function buildNode(id: string, visited: Set<string>): PipelineTreeNode {
    const node = pipelines.find((p) => p.id === id);
    const name = node?.name ?? id.replace("pipeline:", "");
    const kids = (childrenOf.get(id) ?? [])
      .filter((cid) => !visited.has(cid))
      .map((cid) => {
        visited.add(cid);
        return buildNode(cid, visited);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    return { id, name, children: kids };
  }

  const visited = new Set<string>();
  const roots: PipelineTreeNode[] = [];
  const orphans: PipelineTreeNode[] = [];

  for (const rootName of KNOWN_ROOTS) {
    const id = `pipeline:${rootName}`;
    if (pipelineIds.has(id) && !visited.has(id)) {
      visited.add(id);
      roots.push(buildNode(id, visited));
    }
  }

  for (const p of pipelines) {
    if (visited.has(p.id)) continue;
    if (!hasParent.has(p.id)) {
      visited.add(p.id);
      const node = buildNode(p.id, visited);
      orphans.push(node);
    }
  }

  for (const p of pipelines) {
    if (!visited.has(p.id)) {
      visited.add(p.id);
      orphans.push(buildNode(p.id, visited));
    }
  }

  orphans.sort((a, b) => a.name.localeCompare(b.name));

  return { roots, orphans };
}
