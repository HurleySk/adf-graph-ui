import { describe, it, expect } from "vitest";
import { AdfGraphClient } from "../../src/server/mcp-client.js";

describe("AdfGraphClient", () => {
  it("constructs with a command path", () => {
    const client = new AdfGraphClient({ command: "adf-graph" });
    expect(client).toBeDefined();
  });

  it("constructs with npx mode", () => {
    const client = new AdfGraphClient({ npx: true });
    expect(client).toBeDefined();
  });

  it("callTool validates tool name is a string", async () => {
    const client = new AdfGraphClient({ command: "adf-graph" });
    await expect(client.callTool("", {})).rejects.toThrow();
  });
});
