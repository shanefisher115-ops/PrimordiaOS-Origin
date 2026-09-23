import { MemoryMCPServer } from './memory/mcp_server';
import { IngestionPipeline } from './memory/pipeline';

export class BusNode {
  public realmId: string;
  public memoryServer: MemoryMCPServer;
  public pipeline: IngestionPipeline;

  constructor(realmId: string, dbPath: string) {
    this.realmId = realmId;
    this.memoryServer = new MemoryMCPServer(dbPath);
    this.pipeline = new IngestionPipeline((this.memoryServer as any).db);
  }

  // Intercept RPC or agent events and route to local memory
  public async handleAgentEvent(agentId: string, eventType: string, payload: any) {
    if (eventType === 'EXECUTION_FAILURE') {
      await this.memoryServer.memory_log_failure({
        task_id: payload.taskId,
        realm_id: this.realmId,
        error_signature: payload.errorSignature,
        attempted_approach: payload.command,
        root_cause: payload.stackTrace
      });
    }
  }
}