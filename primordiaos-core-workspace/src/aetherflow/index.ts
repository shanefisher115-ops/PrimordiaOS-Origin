import { phom, RouteMessage } from "../phom";

export interface AetherTask {
  id: string;
  source: string;
  target: string;
  kind: string;
  payload: unknown;
}

export class AetherflowRouter {
  private tasks: AetherTask[] = [];

  async start(): Promise<void> {
    console.log("[Aetherflow] started");
    phom.subscribe("money.event", async (msg) => {
      console.log("[Aetherflow] Received money event from PHOM");
      const event = msg.payload as any;
      const task: AetherTask = {
        id: "task-" + Date.now(),
        source: "MoneyPlugHub",
        target: "PrimordiaFlow",
        kind: "money-automation",
        payload: event
      };
      this.tasks.push(task);
      console.log("[Aetherflow] Task created:", task.id);
      const routeMsg: RouteMessage = {
        from: "Aetherflow",
        to: "PrimordiaFlow",
        topic: "aetherflow.route",
        payload: task
      };
      await phom.publish(routeMsg);
    });
  }

  async health(): Promise<{ status: string }> {
    return { status: "healthy" };
  }

  listTasks(): AetherTask[] {
    return this.tasks;
  }
}

export const aetherflow = new AetherflowRouter();
