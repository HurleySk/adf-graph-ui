#!/usr/bin/env node
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import express from "express";
import { AdfGraphClient } from "./mcp-client.js";
import { createRouter } from "./api.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const port = parseInt(process.env.PORT ?? "3000", 10);
const useNpx = process.argv.includes("--npx");
const adfGraphPathIdx = process.argv.indexOf("--adf-graph-path");
const adfGraphPath = useNpx
  ? undefined
  : adfGraphPathIdx >= 0 ? process.argv[adfGraphPathIdx + 1] : "adf-graph";

async function main() {
  console.log("Connecting to adf-graph...");
  const client = new AdfGraphClient({
    command: adfGraphPath,
    npx: useNpx,
  });
  await client.connect();

  console.log("Fetching initial graph...");
  const graph = await client.callTool("graph_export");

  const app = express();
  app.use(express.json());
  app.use(createRouter(client, graph));

  const clientDir = resolve(__dirname, "../client");
  app.use(express.static(clientDir));
  app.use((_req, res) => {
    res.sendFile(resolve(clientDir, "index.html"));
  });

  const server = app.listen(port, () => {
    console.log(`adf-graph-ui running at http://localhost:${port}`);
  });

  const shutdown = async () => {
    server.close();
    await client.disconnect();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  console.error("Failed to start:", err.message);
  process.exit(1);
});
