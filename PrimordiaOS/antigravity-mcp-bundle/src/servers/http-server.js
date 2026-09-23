import fetch from "node-fetch";
const httpGetTool = {
    name: "http.get",
    description: "Perform an HTTP GET request",
    inputSchema: {
        type: "object",
        properties: {
            url: { type: "string" }
        },
        required: ["url"]
    },
    outputSchema: { type: "string" },
    execute: async (input) => {
        const res = await fetch(input.url);
        return await res.text();
    }
};
export default [httpGetTool];
