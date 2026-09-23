// primordia/core/agents.ts
export interface RealmAgent {
  id: string;
  realm: string;
  run(payload: any): Promise<any>;
}
