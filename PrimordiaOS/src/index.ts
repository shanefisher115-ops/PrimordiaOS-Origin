import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { BusNode } from '../core/bus/bus_node.js';

const DB_PATH = path.resolve(process.cwd(), 'primordia_memory.sqlite');
const SCHEMA_PATH = path.resolve(process.cwd(), 'core/bus/memory/schema.sql');

async function bootstrap() {
  console.log('⚡ Bootstrapping PrimordiaOS Memory Layer...');

  if (!fs.existsSync(SCHEMA_PATH)) {
    throw new Error(`Schema file not found at: ${SCHEMA_PATH}`);
  }

  const db = new sqlite3.Database(DB_PATH);
  const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf-8');

  await new Promise<void>((resolve, reject) => {
    db.exec(schemaSql, (err) => {
      if (err) {
        console.error('Failed to execute schema.sql', err);
        reject(err);
      } else {
        console.log('✅ SQLite Schema applied successfully.');
        resolve();
      }
    });
  });

  const realmId = process.env.REALM_ID || 'local_realm';
  const busNode = new BusNode(realmId, DB_PATH);

  const mcpServer = new McpServer({
    name: 'primordiaos-memory',
    version: '1.0.0'
  });

  mcpServer.tool(
    'memory_query',
    {
      query: z.string().describe('Search phrase or keyword'),
      min_trust_level: z.number().optional(),
      limit: z.number().optional()
    },
    async (args) => {
      const results = await busNode.memoryServer.memory_query({
        query: args.query,
        min_trust_level: args.min_trust_level,
        limit: args.limit
      });
      return {
        content: [{ type: 'text', text: JSON.stringify(results, null, 2) }]
      };
    }
  );

  mcpServer.tool(
    'memory_propose',
    {
      agent_id: z.string(),
      type: z.enum(['FACT', 'DECISION', 'FAILURE', 'DEPRECATION']),
      content: z.string(),
      subject_chunk_id: z.string().optional()
    },
    async (args) => {
      const res = await busNode.memoryServer.memory_propose(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(res) }]
      };
    }
  );

  mcpServer.tool(
    'memory_log_failure',
    {
      task_id: z.string(),
      realm_id: z.string(),
      error_signature: z.string(),
      attempted_approach: z.string(),
      root_cause: z.string().optional(),
      suggested_bypass: z.string().optional()
    },
    async (args) => {
      const res = await busNode.memoryServer.memory_log_failure(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(res) }]
      };
    }
  );

  mcpServer.tool(
    'memory_check_warnings',
    {
      error_signature: z.string(),
      realm_id: z.string()
    },
    async (args) => {
      const res = await busNode.memoryServer.memory_check_warnings(args.error_signature, args.realm_id);
      return {
        content: [{ type: 'text', text: JSON.stringify(res) }]
      };
    }
  );

  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.log('🚀 PrimordiaOS Memory MCP Server listening via STDIO.');
}

bootstrap().catch((err) => {
  console.error('Fatal error during boot:', err);
  process.exit(1);
});