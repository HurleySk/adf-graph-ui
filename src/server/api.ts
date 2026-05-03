import { Router, Request, Response } from "express";
import { AdfGraphClient } from "./mcp-client.js";

export function createRouter(client: AdfGraphClient, initialGraph: unknown): Router {
  const router = Router();
  let cachedGraph = initialGraph;

  router.get("/api/graph", async (_req: Request, res: Response) => {
    try {
      const refresh = _req.query.refresh === "true";
      if (refresh || !cachedGraph) {
        cachedGraph = await client.callTool("graph_export");
      }
      res.json(cachedGraph);
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
