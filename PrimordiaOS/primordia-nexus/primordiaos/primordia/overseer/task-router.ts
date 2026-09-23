// task-router.ts
import fs from "fs";
import path from "path";

export class TaskRouter {
    constructor(agentRegistry) {
        this.agents = agentRegistry;
        this.tasks = [];
    }

    async loadTasks() {
        const taskDir = path.join(__dirname, "../tasks");
        const files = fs.readdirSync(taskDir);

        this.tasks = files.map(f => {
            const raw = fs.readFileSync(path.join(taskDir, f));
            return JSON.parse(raw);
        });
    }

    nextTask() {
        return this.tasks.shift();
    }

    async dispatch(task) {
        const agentPath = this.agents[task.agent];
        const agent = require(agentPath);

        try {
            await agent.run(task);
        } catch (err) {
            console.error("Agent error:", err);
        }
    }
}
