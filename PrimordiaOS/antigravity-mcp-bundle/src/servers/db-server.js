import initSqlJs from "sql.js";
let dbPromise = initSqlJs().then((SQL) => new SQL.Database());
const dbQueryTool = {
    name: "db.query",
    description: "Execute a SQL query against the in-memory database",
    inputSchema: {
        type: "object",
        properties: {
            query: { type: "string" }
        },
        required: ["query"]
    },
    outputSchema: {
        type: "object",
        properties: {
            rows: { type: "array" }
        }
    },
    execute: async (input) => {
        const db = await dbPromise;
        const result = db.exec(input.query);
        return { rows: result };
    }
};
export default [dbQueryTool];
