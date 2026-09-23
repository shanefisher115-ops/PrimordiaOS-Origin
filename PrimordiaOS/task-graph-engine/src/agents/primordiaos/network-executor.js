import fetch from "node-fetch";
export const runNetworkAction = async (context) => {
    const { agent, task, config } = context;
    const url = task.metadata?.["url"] ||
        (config.defaultBaseUrl ?? "https://example.com");
    const body = task.metadata?.["body"];
    try {
        if (task.name === "http_get") {
            const res = await fetch(url);
            const data = await res.text();
            return {
                taskId: task.id,
                agentId: agent.id,
                status: "success",
                output: { url, status: res.status, body: data },
                completedAt: new Date().toISOString(),
            };
        }
        if (task.name === "http_post") {
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body ?? {}),
            });
            const data = await res.text();
            return {
                taskId: task.id,
                agentId: agent.id,
                status: "success",
                output: { url, status: res.status, body: data },
                completedAt: new Date().toISOString(),
            };
        }
        return {
            taskId: task.id,
            agentId: agent.id,
            status: "failed",
            errorMessage: `Unsupported network task: ${task.name}`,
            completedAt: new Date().toISOString(),
        };
    }
    catch (err) {
        return {
            taskId: task.id,
            agentId: agent.id,
            status: "failed",
            errorMessage: err.message,
            completedAt: new Date().toISOString(),
        };
    }
};
