// browser-realm/mcp-server.js
const express = require('express');
const app = express();
app.use(express.json());

app.post('/mcp/command', (req, res) => {
  console.log('MCP command', req.body);
  // Simulate async processing
  setTimeout(() => res.json({ status: 'ok', processedAt: Date.now(), received: req.body }), 120);
});

const port = process.env.MCP_PORT || 3456;
app.listen(port, () => console.log(`MCP server listening on http://localhost:${port}`));
