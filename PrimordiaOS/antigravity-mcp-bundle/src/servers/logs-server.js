const logTool = {
    name: "logs.write",
    description: "Write a log message to console",
    inputSchema: {
        type: "object",
        properties: {
            message: { type: "string" }
        },
        required: ["message"]
    },
    outputSchema: { type: "string" },
    execute: async (input) => {
        console.log("[LOG]", input.message);
        return "logged";
    }
};
export default [logTool];
