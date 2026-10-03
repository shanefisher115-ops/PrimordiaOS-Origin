import { AgentTask, AgentResult } from "../agents";

export interface ToolContext {
  realm: string;
}

export interface Tool {
  name: string;
  run(task: AgentTask, ctx: ToolContext): Promise<AgentResult>;
}

export class Toolchain {
  private tools = new Map<string, Tool>();

  register(tool: Tool) {
    if (this.tools.has(tool.name)) {
      throw new Error(\Tool exists: \\);
    }
    this.tools.set(tool.name, tool);
  }

  async execute(name: string, task: AgentTask, ctx: ToolContext): Promise<AgentResult> {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(\Tool not found: \\);
    return tool.run(task, ctx);
  }
}

export const toolchain = new Toolchain();
