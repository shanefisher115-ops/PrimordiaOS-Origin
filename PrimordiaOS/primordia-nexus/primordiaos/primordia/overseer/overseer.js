// overseer.ts
import { TaskRouter } from "./task-router";
import agents from "./agent-registry.json";
import fs from "fs";
import path from "path";
export class Overseer {
    constructor() {
        this.router = new TaskRouter(agents);
        this.logPath = path.join(__dirname, "logs");
    }
    log(message) {
        const entry = `[${new Date().toISOString()}] ${message}\n`;
        fs.appendFileSync(path.join(this.logPath, "overseer.log"), entry);
    }
    async start() {
        this.log("Overseer booting...");
        await this.router.loadTasks();
        this.log("Tasks loaded.");
        while (true) {
            const task = this.router.nextTask();
            if (!task) {
                this.log("No tasks remaining.");
                break;
            }
            this.log(`Dispatching task: ${task.id} → ${task.agent}`);
            await this.router.dispatch(task);
        }
        this.log("Overseer run complete.");
    }
}
new Overseer().start();
