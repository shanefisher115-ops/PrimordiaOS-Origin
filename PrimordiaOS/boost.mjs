/**
 * ==============================================================================
 * PRIMORDIAOS /boost RUNNER
 * Invokes the 11-Layer PHOM Sovereign Stack.
 * ==============================================================================
 */

import http from 'http';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runBoost() {
  console.log('🜂 PRIMORDIA PHOM SOVEREIGN STACK — /boost IGNITION');
  console.log('🜁 Ingesting Real Verifiable Signals -> Discovery -> Heat-Orbit -> Persona -> Outbound -> Distributor -> Analytics -> Memory Graph -> Swarm -> Make Orchestrator -> Cloud Core\n');

  // Attempt local server call on port 3001 (primary) or 3000 (dual/legacy)
  const reqData = JSON.stringify({ directive: '/boost', distributeLive: true });

  const tryHttpOnPort = (port) => new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port,
      path: '/api/phom/boost',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(reqData)
      },
      timeout: 2500
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ ok: true, data: json });
        } catch {
          resolve({ ok: false });
        }
      });
    });

    req.on('error', () => resolve({ ok: false }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false }); });
    req.write(reqData);
    req.end();
  });

  let httpResult = await tryHttpOnPort(3001);
  if (!httpResult.ok) {
    httpResult = await tryHttpOnPort(3000);
  }

  if (httpResult.ok && httpResult.data?.data) {
    const res = httpResult.data.data;
    console.log(`✅ [BOOST EXECUTED VIA SERVER] ID: ${res.boost_id}`);
    console.log(`⏱️ Latency: ${res.total_latency_ms}ms | Verified Leads: ${res.leads_verified} (Deliverability: ${res.mx_deliverability_rate})`);
    console.log(`🔥 High-Heat Prospects: ${res.high_heat_prospects} | Personas: ${res.personas_synthesized} | Posts: ${res.posts_distributed}`);
    console.log(`🌐 Neural CRM Nodes: ${res.graph_nodes_updated} | Edges: ${res.graph_edges_updated}`);
    return;
  }

  // Fallback to direct tsx script execution
  console.log('📡 Dispatching direct worker execution via tsx...');
  const child = spawn(
    'npx',
    ['tsx', 'src/backend/scripts/boost_cli.ts'],
    { cwd: path.join(__dirname, 'MoneyPlugHub'), stdio: 'inherit', shell: true }
  );

  child.on('exit', (code) => {
    process.exit(code || 0);
  });
}

runBoost();
