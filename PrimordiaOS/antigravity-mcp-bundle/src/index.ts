import { Server } from "@modelcontextprotocol/sdk/dist/server/index.js";
import dbTools from "./servers/db-server.js";
import fsTools from "./servers/fs-server.js";
import httpTools from "./servers/http-server.js";
import logsTools from "./servers/logs-server.js";
import storeForgeTools from "./servers/store-forge-server.js";

const server = new Server({
  tools: [
    ...dbTools,
    ...fsTools,
    ...httpTools,
    ...logsTools,
    ...storeForgeTools
  ]
});

server.start();
