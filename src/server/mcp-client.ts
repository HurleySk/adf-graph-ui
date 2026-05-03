import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export interface AdfGraphClientOptions {
  command?: string;
  npx?: boolean;
  env?: Record<string, string>;
}

export class AdfGraphClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private options: AdfGraphClientOptions;

  constructor(options: AdfGraphClientOptions) {
    if (!options.command && !options.npx) {
      throw new Error("Provide either command or npx option");
    }
    this.options = options;
  }

  async connect(): Promise<void> {
    const command = this.options.npx ? "npx" : this.options.command!;
    const args = this.options.npx ? ["adf-graph"] : [];

    this.transport = new StdioClientTransport({
      command,
      args,
      env: { ...process.env, ...this.options.env } as Record<string, string>,
    });

    this.client = new Client({ name: "adf-graph-ui", version: "0.1.0" });
    await this.client.connect(this.transport);
  }

  async callTool(name: string, args: Record<string, unknown> = {}): Promise<unknown> {
    if (!name) throw new Error("Tool name is required");
    if (!this.client) throw new Error("Not connected — call connect() first");

    const result = await this.client.callTool({ name, arguments: args });
    const textContent = result.content as Array<{ type: string; text: string }>;
    const text = textContent.find((c) => c.type === "text")?.text;
    if (!text) throw new Error(`Tool ${name} returned no text content`);
    return JSON.parse(text);
  }

  async disconnect(): Promise<void> {
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
      this.client = null;
    }
  }
}
