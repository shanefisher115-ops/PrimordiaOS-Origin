import { Server } from "@modelcontextprotocol/sdk";
import { createFsServer } from "./servers/fs-server.js";
import { createLogsServer } from "./servers/logs-server.js";
import { createHttpServer } from "./servers/http-server.js";
import { createDbServer } from "./servers/db-server.js";
async function main() {
    const server = new Server({
        name: "antigravity-mcp-bundle",
        version: "1.0.0",
        description: "Unified MCP bundle for Antigravity IDE"
    });
    // Register tools from each sub-server
    createFsServer(server);
    createLogsServer(server);
    createHttpServer(server);
    createDbServer(server);
    // Start MCP server (stdio)
    await server.start();
}
main().catch(err => {
    console.error("MCP bundle failed to start:", err);
    process.exit(1);
});
