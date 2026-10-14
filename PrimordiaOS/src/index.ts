import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import express, { Request, Response } from "express";

const PORT = process.env.WEBHOOK_PORT || 3000;
const AFFILIATE_ID = process.env.MAXBOUNTY_AFFILIATE_ID || "12345";

interface ConversionRecord {
  id: string;
  offerId: string;
  payout: string;
  subId1: string;
  subId2?: string;
  ip: string;
  timestamp: string;
}

const conversionLogs: ConversionRecord[] = [];

// Express Server
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/maxbounty/postback", (req: Request, res: Response) => {
  const { offer_id, rate, subid1, subid2, ip } = req.query;

  const record: ConversionRecord = {
    id: Math.random().toString(36).substring(2, 9),
    offerId: (offer_id as string) || "unknown",
    payout: (rate as string) || "0.00",
    subId1: (subid1 as string) || "direct",
    subId2: (subid2 as string) || undefined,
    ip: (ip as string) || (req.ip as string),
    timestamp: new Date().toISOString(),
  };

  conversionLogs.unshift(record);
  if (conversionLogs.length > 100) conversionLogs.pop();

  console.error(`[S2S Postback Received] Offer: ${record.offerId} | Payout: $${record.payout} | Sub1: ${record.subId1}`);
  res.status(200).send("OK_POSTBACK_RECEIVED");
});

app.listen(PORT, () => {
  console.error(`[Express] MaxBounty webhook listener active on port ${PORT}`);
});

// MCP Server
const mcpServer = new Server(
  { name: "maxbounty-mcp-bridge", version: "1.0.0" },
  { capabilities: { tools: {}, resources: {} } }
);

mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "generate_tracking_link",
        description: "Generates an optimized MaxBounty tracking URL with embedded SubID campaign attribution.",
        inputSchema: {
          type: "object",
          properties: {
            offerId: { type: "string", description: "The MaxBounty Offer ID" },
            subId1: { type: "string", description: "Campaign tag, traffic source, or outreach channel identifier" },
            subId2: { type: "string", description: "Unique click UUID or session identifier for S2S reconciliation" },
          },
          required: ["offerId", "subId1"],
        },
      },
      {
        name: "get_conversion_stats",
        description: "Queries recent recorded conversions and revenue metrics from local memory.",
        inputSchema: {
          type: "object",
          properties: {
            limit: { type: "number", description: "Max records to return (default 10)" },
          },
        },
      },
    ],
  };
});

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "generate_tracking_link") {
    const { offerId, subId1, subId2 } = args as { offerId: string; subId1: string; subId2?: string };
    
    let trackingUrl = `https://www.maxbounty.com/c.aspx?a=${AFFILIATE_ID}&o=${offerId}&s1=${encodeURIComponent(subId1)}`;
    if (subId2) {
      trackingUrl += `&s2=${encodeURIComponent(subId2)}`;
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ status: "success", trackingUrl, affiliateId: AFFILIATE_ID }, null, 2),
        },
      ],
    };
  }

  if (name === "get_conversion_stats") {
    const { limit = 10 } = (args as { limit?: number }) || {};
    const results = conversionLogs.slice(0, limit);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ totalLogged: conversionLogs.length, conversions: results }, null, 2),
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

mcpServer.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "maxbounty://conversions/recent",
        name: "Recent Postback Conversions",
        mimeType: "application/json",
        description: "Live feed of captured S2S conversion events.",
      },
    ],
  };
});

mcpServer.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  if (request.params.uri === "maxbounty://conversions/recent") {
    return {
      contents: [
        {
          uri: request.params.uri,
          mimeType: "application/json",
          text: JSON.stringify(conversionLogs, null, 2),
        },
      ],
    };
  }
  throw new Error(`Resource not found: ${request.params.uri}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.error("[MCP] MaxBounty Stdio Server running successfully");
}

main().catch((error) => {
  console.error("Fatal error running MCP server:", error);
  process.exit(1);
});
