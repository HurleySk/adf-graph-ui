export interface GraphExport {
  environment: string;
  exportedAt: string;
  stats: {
    nodeCount: number;
    edgeCount: number;
    nodesByType: Record<string, number>;
    edgesByType: Record<string, number>;
  };
  nodes: Array<{
    id: string;
    type: string;
    name: string;
    metadata: Record<string, unknown>;
  }>;
  edges: Array<{
    from: string;
    to: string;
    type: string;
    metadata: Record<string, unknown>;
  }>;
}

export async function fetchGraph(refresh = false): Promise<GraphExport> {
  const url = refresh ? "/api/graph?refresh=true" : "/api/graph";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch graph: ${res.statusText}`);
  return res.json();
}

export async function callTool(tool: string, args: Record<string, unknown> = {}): Promise<unknown> {
  const res = await fetch("/api/tool", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tool, args }),
  });
  if (!res.ok) throw new Error(`Tool call failed: ${res.statusText}`);
  return res.json();
}

export async function fetchEnvironments(): Promise<unknown> {
  const res = await fetch("/api/environments");
  if (!res.ok) throw new Error(`Failed to fetch environments: ${res.statusText}`);
  return res.json();
}
