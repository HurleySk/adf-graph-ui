#!/usr/bin/env node
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import express from "express";
import { AdfGraphClient } from "./mcp-client.js";
import { createRouter } from "./api.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const port = parseInt(process.env.PORT ?? "3000", 10);
const adfGraphPath = process.argv.includes("--npx")
  ? undefined
  : process.argv[process.argv.indexOf("--adf-graph-path") + 1] ?? "adf-graph";
const useNpx = process.argv.includes("--npx");

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

  app.listen(port, () => {
    console.log(`adf-graph-ui running at http://localhost:${port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start:", err.message);
  process.exit(1);
});
