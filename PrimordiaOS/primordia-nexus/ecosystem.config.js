module.exports = {
  apps: [
    {
      name: 'primordia-nexus',
      script: 'nexus.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: { NODE_ENV: 'production', PORT: 3000 }
    },
    {
      name: 'mcp-server',
      script: 'browser-realm/mcp-server.js',
      instances: 1,
      env: { NODE_ENV: 'production', MCP_PORT: 3456 }
    }
  ]
};
