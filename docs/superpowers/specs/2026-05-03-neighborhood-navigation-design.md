# adf-graph-ui: Neighborhood Navigation Redesign

**Date:** 2026-05-03
**Status:** Approved
**Scope:** Replace full-graph rendering with focused neighborhood navigation

## Problem

The current UI dumps all pipeline nodes onto the canvas and lets users zoom around. With 285 pipelines (5,500+ nodes with other types), no layout algorithm produces a readable graph. Labels overlap, contrast is poor, and the force-directed layout produces dense blobs.

## Solution

Replace "show everything" with "show nothing, let users pick what to see." A sidebar lists pipelines grouped by orchestrator; clicking one renders only that pipeline's 1-2 hop neighborhood on the canvas (~15-30 nodes). The right inspector panel stays collapsed until a node is clicked.

## Layout

```
┌──────────┬─────────────────────────────────────────┐
│ Pipeline │                                         │
│ Navigator│          Graph Canvas                   │
│          │    (neighborhood of selected pipeline)  │
│ [search] │                                         │
│          │                                         │
│ ▼ ORC_v2 │                                    ┌────┤
│   child1 │                                    │Ins.│
│   child2 │                                    │    │
│ ▼ ORC_Dl │                                    │(on │
│   child3 │                                    │tap)│
│ ▶ ORC_Mg │                                    │    │
│          │                                    └────┤
│ ▶ Other  │                                         │
│          │                                         │
├──────────┼─────────────────────────────────────────┤
│ status bar                                         │
└────────────────────────────────────────────────────┘
```

## Components

### Left Sidebar — Pipeline Navigator (~260px, always visible)

- **Search bar** at top — filters the pipeline list in real-time (client-side, no MCP call needed since all pipeline names are in the graph data)
- **Grouped tree:**
  - Top-level groups are orchestrator roots (pipelines with no parent `executes` edge). The 3 main orchestrators (`onprem_NightlyOrganizationLoad_v2`, `onprem_Orchestration_DeltaLoad`, `onprem_Orchestration_Migration_Wave3`) appear first
  - Each root is collapsible; children are the pipelines it calls via `executes` edges (recursive)
  - "Other" section at bottom for orphan root pipelines
- **Click a pipeline** → canvas renders its neighborhood, pipeline highlighted in the list
- **Active state** — selected pipeline has a visual indicator (colored left border or background highlight)

### Center Canvas — Neighborhood Graph

- **Empty on load** — shows a centered prompt: "Select a pipeline to explore"
- **On pipeline selection:**
  - Queries the cached graph data (client-side) to extract the neighborhood: the selected pipeline node + all nodes within 2 hops + edges between them
  - Filters to relevant types only: pipelines, activities, stored_procedures, tables, dataverse_entities, datasets (no linked_services or secrets unless directly connected)
  - Runs dagre layout (TB direction) — works well at 15-30 nodes
  - Fits to viewport with padding
- **Click a pipeline node in the graph** → re-centers the neighborhood on that pipeline, updates the sidebar selection
- **Click a non-pipeline node** → opens the inspector (does NOT change the neighborhood)

### Right Inspector — Node Detail (~320px, collapsed by default)

- **Collapsed by default** — canvas uses full width minus the left sidebar
- **Slides open** when a node in the graph is clicked
- **Slides closed** on Esc, clicking empty canvas, or clicking a close button
- **Content:** same as current inspector — node name, type, connections, metadata, action buttons (Impact Analysis, Data Lineage, Validate)
- **CSS transition** — smooth slide animation, canvas resizes fluidly

### Toolbar (simplified)

- **Logo** (left)
- **Layout toggle** — dagre vs cose for the current neighborhood
- **Refresh** — re-fetches graph from adf-graph
- Remove search (moved to sidebar), remove type filters (neighborhood shows the right mix automatically)

### Status Bar

- Node/edge counts for the **current neighborhood** (not full graph)
- Environment name
- Connection status

## Data Flow

1. Page loads → fetches full slimmed graph from `/api/graph` (already filtered server-side, ~3MB)
2. Client builds a pipeline tree from the graph data (group by orchestrator roots using `executes` edges)
3. User clicks a pipeline → client extracts 2-hop neighborhood from the cached graph data
4. Cytoscape renders only the neighborhood nodes/edges with dagre layout
5. User clicks a node → inspector slides open with details
6. User clicks a different pipeline (in sidebar or graph) → neighborhood re-renders

## Neighborhood Extraction (client-side)

```
function extractNeighborhood(graphData, pipelineId, maxHops = 2):
  - Start with the pipeline node
  - BFS outward along all edge types up to maxHops
  - Collect all reached nodes and edges between them
  - Return { nodes, edges }
```

This runs on the already-cached graph data — no additional API calls needed.

## Files to Modify

| File | Change |
|------|--------|
| `src/client/index.html` | Replace toolbar with sidebar layout, restructure HTML |
| `src/client/styles.css` | New sidebar styles, collapsible inspector, canvas layout |
| `src/client/main.ts` | New bootstrap: build pipeline tree, wire sidebar, neighborhood rendering |
| `src/client/graph/renderer.ts` | Always use dagre for neighborhoods, remove large-graph logic |
| `src/client/panels/toolbar.ts` | Simplify: remove search and type filters |
| `src/client/panels/inspector.ts` | Add slide-in/out behavior, close button |
| `src/client/panels/navigator.ts` | **New file** — pipeline tree, search, click-to-navigate |
| `src/client/graph/neighborhood.ts` | **New file** — extract N-hop neighborhood from cached graph |
| `src/client/graph/interactions.ts` | Update: pipeline clicks re-center neighborhood, non-pipeline clicks open inspector |
