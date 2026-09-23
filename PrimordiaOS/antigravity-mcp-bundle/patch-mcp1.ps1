$root = "C:\Users\Shane\Documents\dev\PrimordiaOS\antigravity-mcp-bundle"
$src = "$root\src"
$servers = "$src\servers"

Write-Host "=== Removing old 0.7.0 server files ==="
$oldFiles = @(
    "$src\db-server.ts",
    "$src\fs-server.ts",
    "$src\http-server.ts",
    "$src\logs-server.ts"
)

foreach ($file in $oldFiles) {
    if (Test-Path $file) {
        Remove-Item -Force $file
        Write-Host "Removed $file"
    }
}

Write-Host "=== Writing MCP 1.x index.ts ==="
@'
import { Server } from "@modelcontextprotocol/sdk/dist/server/index.js";
import dbTools from "./servers/db-server.js";
import fsTools from "./servers/fs-server.js";
import httpTools from "./servers/http-server.js";
import logsTools from "./servers/logs-server.js";

const server = new Server({
  tools: [
    ...dbTools,
    ...fsTools,
    ...httpTools,
    ...logsTools
  ]
});

server.start();
'@ | Set-Content "$src\index.ts"

Write-Host "=== Writing MCP 1.x db-server.ts ==="
@'
import initSqlJs from "sql.js";

let dbPromise = initSqlJs().then(SQL => new SQL.Database());

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
'@ | Set-Content "$servers\db-server.ts"

Write-Host "=== Writing MCP 1.x fs-server.ts ==="
@'
import fs from "fs/promises";

const readFileTool = {
  name: "fs.readFile",
  description: "Read a file from disk",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string" }
    },
    required: ["path"]
  },
  outputSchema: { type: "string" },
  execute: async (input) => {
    return await fs.readFile(input.path, "utf8");
  }
};

const writeFileTool = {
  name: "fs.writeFile",
  description: "Write a file to disk",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string" },
      content: { type: "string" }
    },
    required: ["path", "content"]
  },
  outputSchema: { type: "string" },
  execute: async (input) => {
    await fs.writeFile(input.path, input.content, "utf8");
    return "ok";
  }
};

export default [readFileTool, writeFileTool];
'@ | Set-Content "$servers\fs-server.ts"

Write-Host "=== Writing MCP 1.x http-server.ts ==="
@'
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
'@ | Set-Content "$servers\http-server.ts"

Write-Host "=== Writing MCP 1.x logs-server.ts ==="
@'
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
'@ | Set-Content "$servers\logs-server.ts"

Write-Host "=== MCP 1.x patch complete ==="
