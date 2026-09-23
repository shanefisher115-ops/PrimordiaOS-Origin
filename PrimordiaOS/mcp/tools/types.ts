export interface MCPToolContext {
  jobId: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface MCPToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface MCPTool {
  name: string;
  description: string;
  run: (payload: unknown, ctx: MCPToolContext) => Promise<MCPToolResult>;
}
