import express, { Request, Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SigilItemRegistry } from './items/SigilItemRegistry.js';
import { HueWheel } from './composition/HueWheel.js';
import { SigilCompositionEngine } from './composition/SigilCompositionEngine.js';
import { CosmicRollEngine } from './cosmicroll/CosmicRollEngine.js';
import { SigilForgeLogger } from './logging/SigilForgeLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const logger = new SigilForgeLogger('CloudRunServer');
const port = parseInt(process.env.PORT || '8080', 10);

const assetPath = process.env.SIGILFORGE_ASSET_PATH || path.join(__dirname, '../assets');
const exportPath = process.env.SIGILFORGE_EXPORT_PATH || path.join(__dirname, '../exports');

app.use(express.json());

// 1. Healthcheck for Cloud Run
app.get('/healthz', (_req: Request, res: Response) => {
  const registry = SigilItemRegistry.getInstance();
  res.json({
    status: 'HEALTHY',
    service: 'sigilforge-threecanvas',
    version: '1.0.0',
    itemCount: registry.getItemCount(),
    assetPath,
    exportPath,
    uptimeSeconds: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// 2. Items API
app.get('/api/items', (req: Request, res: Response) => {
  const registry = SigilItemRegistry.getInstance();
  const category = req.query.category as string | undefined;
  if (category) {
    res.json(registry.getItemsByCategory(category as any));
  } else {
    res.json(registry.getAllItems());
  }
});

// 3. Procedural Cosmic Roll API
app.get('/api/roll', (_req: Request, res: Response) => {
  const registry = SigilItemRegistry.getInstance();
  const composition = new SigilCompositionEngine();
  const rollEngine = new CosmicRollEngine(registry, composition);

  const rollResult = rollEngine.roll(5);
  const compositeSvg = composition.generateCompositeSvg();

  res.json({
    ...rollResult,
    compositeSvg,
  });
});

// 4. Interactive Web Preview Cockpit
app.get('/', (_req: Request, res: Response) => {
  const registry = SigilItemRegistry.getInstance();
  const totalItems = registry.getItemCount();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PrimordiaOS :: SigilForge ThreeCanvas</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body, html { width: 100%; height: 100%; overflow: hidden; background: #070311; font-family: 'Segoe UI', system-ui, sans-serif; color: #f0f0f5; }
    #canvas-container { width: 100vw; height: 100vh; position: absolute; top: 0; left: 0; z-index: 1; }
    .hud-overlay { position: absolute; z-index: 10; pointer-events: none; }
    .hud-header { top: 24px; left: 32px; }
    .hud-header h1 { font-size: 24px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; background: linear-gradient(90deg, #9d4edd, #00f0ff, #ffd166); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .hud-header p { font-size: 13px; color: #8a88a5; margin-top: 4px; }
    .hud-controls { bottom: 32px; left: 50%; transform: translateX(-50%); display: flex; gap: 16px; pointer-events: auto; }
    .btn { padding: 12px 24px; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(18, 12, 36, 0.75); color: #fff; cursor: pointer; backdrop-filter: blur(12px); transition: all 0.2s ease; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
    .btn:hover { background: rgba(157, 78, 221, 0.4); border-color: #00f0ff; transform: translateY(-2px); box-shadow: 0 6px 25px rgba(0, 240, 255, 0.4); }
    .btn-primary { background: linear-gradient(135deg, #7b2cbf, #3a0ca3); border-color: #9d4edd; }
    .hud-status { top: 24px; right: 32px; text-align: right; font-family: monospace; font-size: 12px; color: #72efdd; }
    .status-badge { display: inline-block; padding: 4px 10px; border-radius: 4px; background: rgba(0, 240, 255, 0.15); border: 1px solid rgba(0, 240, 255, 0.4); }
    #svg-preview-container { position: absolute; top: 100px; right: 32px; width: 240px; height: 240px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.15); background: rgba(10,5,25,0.85); backdrop-filter: blur(10px); padding: 12px; pointer-events: auto; display: flex; flex-direction: column; }
    #svg-preview-container h4 { font-size: 11px; text-transform: uppercase; color: #a5a2cc; margin-bottom: 8px; letter-spacing: 1px; }
    #svg-preview-inner { flex: 1; display: flex; align-items: center; justify-content: center; overflow: hidden; }
  </style>
</head>
<body>
  <div id="canvas-container"></div>

  <div class="hud-overlay hud-header">
    <h1>SigilForge ThreeCanvas</h1>
    <p>PrimordiaOS Sovereign Procedural Shader Synthesis Subsystem</p>
  </div>

  <div class="hud-overlay hud-status">
    <span class="status-badge">ONLINE &bull; ${totalItems} CUSTOM ITEMS</span>
  </div>

  <div class="hud-overlay" id="svg-preview-container">
    <h4>Vector Vectorization</h4>
    <div id="svg-preview-inner"></div>
  </div>

  <div class="hud-overlay hud-controls">
    <button class="btn btn-primary" id="btn-roll">&#x2684; Cosmic Roll</button>
    <button class="btn" id="btn-mic">&#x1F3A4; Audio Reactive</button>
    <button class="btn" id="btn-svg">&#x2913; Export SVG</button>
    <button class="btn" id="btn-png">&#x2913; Export PNG</button>
  </div>

  <script type="module">
    // Direct browser preview loading from /api/roll
    async function refreshRoll() {
      try {
        const res = await fetch('/api/roll');
        const data = await res.json();
        const previewEl = document.getElementById('svg-preview-inner');
        if (previewEl && data.compositeSvg) {
          previewEl.innerHTML = data.compositeSvg;
        }
      } catch (err) {
        console.error('Error fetching roll:', err);
      }
    }

    document.getElementById('btn-roll')?.addEventListener('click', refreshRoll);
    document.getElementById('btn-svg')?.addEventListener('click', async () => {
      const res = await fetch('/api/roll');
      const data = await res.json();
      const blob = new Blob([data.compositeSvg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sigil-' + Date.now() + '.svg';
      a.click();
    });

    refreshRoll();
  </script>
</body>
</html>`;

  res.send(html);
});

app.listen(port, '0.0.0.0', () => {
  logger.sovereign(`SigilForgeThreeCanvas Server listening on http://0.0.0.0:${port}`);
  logger.info(`Asset Path: ${assetPath} | Export Path: ${exportPath}`);
});
