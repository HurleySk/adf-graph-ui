# adf-graph-ui

Interactive web visualization for adf-graph dependency graphs.

## Build & Test

- Build: `npm run build`
- Test: `npm test`
- Dev: `npm run dev` (Vite + tsc watch)
- Start: `npm start` (production server)

## Architecture

- `src/server/index.ts` — Express entry point, spawns adf-graph MCP child process
- `src/server/mcp-client.ts` — MCP stdio client, tool call wrapper
- `src/server/api.ts` — REST API routes proxying MCP tools
- `src/client/main.ts` — App bootstrap, fetches graph, initializes Cytoscape
- `src/client/graph/renderer.ts` — Cytoscape setup, styling, layout algorithms
- `src/client/graph/interactions.ts` — Node click/select/focus handlers
- `src/client/graph/overlays.ts` — Impact/validation/search visual overlays
- `src/client/panels/toolbar.ts` — Search bar, type filter toggles, refresh
- `src/client/panels/inspector.ts` — Right panel: node detail, connections, action buttons
- `src/client/api.ts` — Fetch wrapper for backend API

## Configuration

Requires adf-graph to be installed. Start with:

```bash
adf-graph-ui --adf-graph-path /path/to/adf-graph
# or
adf-graph-ui --npx
```

The adf-graph child process inherits environment variables (`ADF_CONFIG`, `ADF_ROOT`).
