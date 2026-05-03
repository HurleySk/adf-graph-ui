import { Router, Request, Response } from "express";
import { AdfGraphClient } from "./mcp-client.js";

interface RawGraph {
  environment: string;
  exportedAt: string;
  stats: Record<string, unknown>;
  nodes: Array<{ id: string; type: string; name: string; metadata: Record<string, unknown> }>;
  edges: Array<{ from: string; to: string; type: string; metadata: Record<string, unknown> }>;
}

function slimGraph(raw: RawGraph) {
  const nodes = raw.nodes.filter((n) => n.type !== "dataverse_attribute");
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = raw.edges.filter((e) => nodeIds.has(e.from) && nodeIds.has(e.to));

  return {
    environment: raw.environment,
    exportedAt: raw.exportedAt,
    stats: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      nodesByType: countBy(nodes, (n) => n.type),
      edgesByType: countBy(edges, (e) => e.type),
    },
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type,
      name: n.name,
      metadata: pickSmallMeta(n.metadata),
    })),
    edges: edges.map((e) => ({
      from: e.from,
      to: e.to,
      type: e.type,
    })),
  };
}

function pickSmallMeta(meta: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (k === "filePath" || k === "stub") continue;
    if (typeof v === "string" && v.length > 200) continue;
    if (typeof v === "object" && v !== null) continue;
    out[k] = v;
  }
  return out;
}

function countBy<T>(arr: T[], key: (item: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of arr) {
    const k = key(item);
    counts[k] = (counts[k] ?? 0) + 1;
  }
  return counts;
}

export function createRouter(client: AdfGraphClient, initialGraph: unknown): Router {
  const router = Router();
  let cachedSlim: unknown = slimGraph(initialGraph as RawGraph);

  router.get("/api/graph", async (_req: Request, res: Response) => {
    try {
      const refresh = _req.query.refresh === "true";
      if (refresh) {
        const raw = await client.callTool("graph_export");
        cachedSlim = slimGraph(raw as RawGraph);
      }
      res.json(cachedSlim);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/api/tool", async (req: Request, res: Response) => {
    try {
      const { tool, args } = req.body;
      if (!tool || typeof tool !== "string") {
        res.status(400).json({ error: "Missing or invalid 'tool' field" });
        return;
      }
      const result = await client.callTool(tool, args ?? {});
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/api/environments", async (_req: Request, res: Response) => {
    try {
      const result = await client.callTool("graph_list_environments");
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
