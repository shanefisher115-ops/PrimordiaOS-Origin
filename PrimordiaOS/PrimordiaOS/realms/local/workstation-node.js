import { localRuntime } from "./runtime.js";

/**
 * Workstation Node Controller for Local Realm.
 */
export class WorkstationNode {
  constructor() {
    this.name = "Workstation-Primary";
  }

  async executeLocalTask(taskName, taskFn) {
    const start = Date.now();
    try {
      const result = await taskFn();
      return { success: true, duration_ms: Date.now() - start, result };
    } catch (err) {
      return { success: false, duration_ms: Date.now() - start, error: err.message };
    }
  }
}

export const workstationNode = new WorkstationNode();
export * from "./runtime.js";
