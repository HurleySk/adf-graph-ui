import { describe, it, expect, vi } from "vitest";
import { createRouter } from "../../src/server/api.js";

const mockClient = {
  callTool: vi.fn(),
};

describe("createRouter", () => {
  it("returns an Express router", () => {
    const router = createRouter(mockClient as any, null);
    expect(router).toBeDefined();
    expect(typeof router).toBe("function");
  });
});
