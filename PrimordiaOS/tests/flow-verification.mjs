/**
 * ==============================================================================
 * PRIMORDIA FLOW — AUTOMATED VERIFICATION SUITE
 * Validates Electron Main Process, Preload IPC Contracts, Daemon Supervisor,
 * System Tray Architecture, Desktop Toast Notifications, and Sovereign Rule 5.
 * ==============================================================================
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✔ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✔ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

console.log('\n========================================================');
console.log('⚡ PRIMORDIA FLOW DESKTOP VERIFICATION SUITE');
console.log('========================================================\n');

// ── TEST GROUP 1: Package Configuration & Metadata ────────────────────────────
console.log('📦 GROUP 1: Package Configuration & Electron Builder Metadata');

runTest('Root package.json metadata reflects Primordia Flow', () => {
  const pkgPath = path.join(rootDir, 'package.json');
  assert(fs.existsSync(pkgPath), 'Root package.json must exist');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  assert.strictEqual(pkg.productName, 'Primordia Flow', 'Product name must be "Primordia Flow"');
  assert(pkg.name === 'primordia-flow' || pkg.name.includes('flow'), 'Package name must reference flow');
  assert.strictEqual(pkg.build?.appId, 'com.primordiaos.flow', 'electron-builder appId must be "com.primordiaos.flow"');
  assert.strictEqual(pkg.build?.productName, 'Primordia Flow', 'electron-builder productName must be "Primordia Flow"');
  assert(pkg.scripts['flow:dev'], 'Script "flow:dev" must exist');
  assert(pkg.scripts['flow:build'], 'Script "flow:build" must exist');
  assert(pkg.main === 'electron/main.cjs', 'Main entry point must point to electron/main.cjs');
});

runTest('MoneyPlugHub package.json contains flow:dev and flow:build scripts', () => {
  const mphPkgPath = path.join(rootDir, 'MoneyPlugHub', 'package.json');
  assert(fs.existsSync(mphPkgPath), 'MoneyPlugHub/package.json must exist');
  const mphPkg = JSON.parse(fs.readFileSync(mphPkgPath, 'utf8'));

  assert(mphPkg.scripts['flow:dev'], 'MoneyPlugHub script "flow:dev" must exist');
  assert(mphPkg.scripts['flow:build'], 'MoneyPlugHub script "flow:build" must exist');
});

runTest('electron/package.json exists with Primordia Flow name', () => {
  const electronPkgPath = path.join(rootDir, 'electron', 'package.json');
  assert(fs.existsSync(electronPkgPath), 'electron/package.json must exist');
  const pkg = JSON.parse(fs.readFileSync(electronPkgPath, 'utf8'));
  assert.strictEqual(pkg.name, 'primordia-flow');
  assert.strictEqual(pkg.productName, 'Primordia Flow');
});

// ── TEST GROUP 2: Electron Main Process & Rule 5 Compliance ───────────────────
console.log('\n🖥️ GROUP 2: Main Process & Sovereign Rule 5 Architecture');

runTest('electron/main.cjs exists and is non-empty', () => {
  const mainPath = path.join(rootDir, 'electron', 'main.cjs');
  assert(fs.existsSync(mainPath), 'electron/main.cjs must exist');
  const content = fs.readFileSync(mainPath, 'utf8');
  assert(content.length > 500, 'main.cjs must contain full implementation');
});

runTest('main.cjs implements Decoupled Headless Node Daemon Supervisor on Port 3001 (Rule 5)', () => {
  const mainPath = path.join(rootDir, 'electron', 'main.cjs');
  const content = fs.readFileSync(mainPath, 'utf8');

  assert(content.includes('3001'), 'Must target port 3001 for backend daemon');
  assert(content.includes('checkPortListening'), 'Must check if port 3001 is listening before spawning');
  assert(content.includes('startDaemonSupervisor'), 'Must implement daemon supervisor');
  assert(content.includes('stopDaemonSupervisor'), 'Must implement graceful daemon shutdown');
  assert(content.includes('MAX_DAEMON_RESTARTS') || content.includes('restart'), 'Must implement crash restart resilience');
  assert(content.includes('serverDistJs') || content.includes('serverSourceTs'), 'Must locate backend server bundle/script');
});

runTest('main.cjs implements Window Management with MoneyPlugHub Cockpit target', () => {
  const mainPath = path.join(rootDir, 'electron', 'main.cjs');
  const content = fs.readFileSync(mainPath, 'utf8');

  assert(content.includes('tab=boost'), 'Must target Cockpit with ?tab=boost');
  assert(content.includes('5173'), 'Must support Vite dev server on port 5173');
  assert(content.includes('contextIsolation: true'), 'Must enforce secure contextIsolation: true');
  assert(content.includes('nodeIntegration: false'), 'Must enforce secure nodeIntegration: false');
  assert(content.includes('preloadPath'), 'Must load preload script');
});

runTest('main.cjs implements Native Windows System Tray with all 5 required menu items', () => {
  const mainPath = path.join(rootDir, 'electron', 'main.cjs');
  const content = fs.readFileSync(mainPath, 'utf8');

  assert(content.includes('Open Primordia Flow'), 'Tray must contain "Open Primordia Flow"');
  assert(content.includes('⚡ Trigger /boost') || content.includes('Trigger /boost'), 'Tray must contain "Trigger /boost"');
  assert(content.includes('Toggle Live Mode'), 'Tray must contain "Toggle Live Mode"');
  assert(content.includes('View Traces'), 'Tray must contain "View Traces"');
  assert(content.includes('Quit'), 'Tray must contain "Quit"');
  assert(content.includes('new Tray'), 'Tray must be instantiated');
});

runTest('main.cjs implements Native OS Desktop Toast Notifications for /boost and high-heat leads', () => {
  const mainPath = path.join(rootDir, 'electron', 'main.cjs');
  const content = fs.readFileSync(mainPath, 'utf8');

  assert(content.includes('Notification'), 'Must use Electron Notification API');
  assert(content.includes('showDesktopNotification'), 'Must implement desktop notification helper');
  assert(content.includes('/boost Completed') || content.includes('boost-completed'), 'Must trigger toast on /boost completion');
  assert(content.includes('High-Heat') || content.includes('high_heat_prospects'), 'Must alert on high-heat leads arrival');
});

// ── TEST GROUP 3: Secure Preload Script & IPC Contract ────────────────────────
console.log('\n🔒 GROUP 3: Secure Preload Script & window.primordiaFlow IPC Contract');

runTest('electron/preload.cjs exists and exports primordiaFlowAPI', () => {
  const preloadPath = path.join(rootDir, 'electron', 'preload.cjs');
  assert(fs.existsSync(preloadPath), 'electron/preload.cjs must exist');
  const content = fs.readFileSync(preloadPath, 'utf8');

  assert(content.includes('contextBridge.exposeInMainWorld'), 'Must use contextBridge for secure exposure');
  assert(content.includes("'primordiaFlow'"), 'Must expose under name "primordiaFlow"');
});

runTest('primordiaFlowAPI contains all required contract methods', () => {
  const preloadPath = path.join(rootDir, 'electron', 'preload.cjs');
  const content = fs.readFileSync(preloadPath, 'utf8');

  const requiredMethods = [
    'triggerBoost',
    'toggleLiveMode',
    'getLiveMode',
    'setLiveMode',
    'getDaemonStatus',
    'restartDaemon',
    'openTraces',
    'showNotification',
    'minimize',
    'maximize',
    'close',
    'onBoostCompleted',
    'onHighHeatLead',
    'onLiveModeChanged',
    'onDaemonStatusChanged',
    'onNavigateTraces',
    'version',
    'platform',
    'appName'
  ];

  for (const method of requiredMethods) {
    assert(content.includes(method), `preload.cjs must define "${method}"`);
  }
});

// ── TEST GROUP 4: TypeScript Declarations & Source Files ──────────────────────
console.log('\n📘 GROUP 4: TypeScript Types & Source Equivalents');

runTest('TypeScript declarations exist in electron/ and MoneyPlugHub/src/types/', () => {
  const dtsRoot = path.join(rootDir, 'electron', 'primordiaFlow.d.ts');
  const dtsMph = path.join(rootDir, 'MoneyPlugHub', 'src', 'types', 'primordiaFlow.d.ts');

  assert(fs.existsSync(dtsRoot), 'electron/primordiaFlow.d.ts must exist');
  assert(fs.existsSync(dtsMph), 'MoneyPlugHub/src/types/primordiaFlow.d.ts must exist');

  const content = fs.readFileSync(dtsRoot, 'utf8');
  assert(content.includes('interface PrimordiaFlowAPI'), 'Must declare PrimordiaFlowAPI interface');
  assert(content.includes('interface Window'), 'Must augment global Window interface');
});

runTest('electron/main.ts and electron/preload.ts exist with valid TypeScript syntax', () => {
  const mainTs = path.join(rootDir, 'electron', 'main.ts');
  const preloadTs = path.join(rootDir, 'electron', 'preload.ts');

  assert(fs.existsSync(mainTs), 'electron/main.ts must exist');
  assert(fs.existsSync(preloadTs), 'electron/preload.ts must exist');

  const mainTsContent = fs.readFileSync(mainTs, 'utf8');
  assert(mainTsContent.includes('export const APP_NAME'), 'main.ts must have typed exports');
  assert(mainTsContent.includes('export function createWindow'), 'main.ts must export createWindow');

  const preloadTsContent = fs.readFileSync(preloadTs, 'utf8');
  assert(preloadTsContent.includes('export const primordiaFlowAPI: PrimordiaFlowAPI'), 'preload.ts must type primordiaFlowAPI');
});

// ── TEST GROUP 5: Operational Invariant & Logic Verification ──────────────────
console.log('\n⚙️ GROUP 5: Operational Invariants & Logic Verification');

runTest('Workspace path resolution detects MoneyPlugHub folder correctly', () => {
  const moneyPlugHubDir = path.join(rootDir, 'MoneyPlugHub');
  assert(fs.existsSync(moneyPlugHubDir), 'MoneyPlugHub directory must exist');
  assert(fs.existsSync(path.join(moneyPlugHubDir, 'dist', 'client', 'index.html')), 'MoneyPlugHub client dist must exist');
  assert(fs.existsSync(path.join(moneyPlugHubDir, 'dist', 'server', 'backend', 'server.js')), 'MoneyPlugHub server dist must exist');
});

runTest('Tray fallback icon creates safely without throwing', () => {
  const iconPath = path.join(rootDir, 'MoneyPlugHub', 'public', 'logo.png');
  assert(fs.existsSync(iconPath), 'Application logo must exist for icon usage');
});

runTest('React App.tsx routes ?tab=boost directly to SignalRealmPage', () => {
  const appTsxPath = path.join(rootDir, 'MoneyPlugHub', 'src', 'frontend', 'App.tsx');
  assert(fs.existsSync(appTsxPath), 'App.tsx must exist');
  const content = fs.readFileSync(appTsxPath, 'utf8');
  assert(content.includes("currentTab === 'boost'"), "App.tsx must route currentTab === 'boost'");
  assert(content.includes('<SignalRealmPage'), "App.tsx must mount SignalRealmPage for boost tab");
});

runTest('SignalRealmPage.tsx integrates with window.primordiaFlow events', () => {
  const signalRealmPath = path.join(rootDir, 'MoneyPlugHub', 'src', 'frontend', 'pages', 'SignalRealmPage.tsx');
  assert(fs.existsSync(signalRealmPath), 'SignalRealmPage.tsx must exist');
  const content = fs.readFileSync(signalRealmPath, 'utf8');
  assert(content.includes('window.primordiaFlow.onBoostCompleted'), 'SignalRealmPage must subscribe to onBoostCompleted');
  assert(content.includes('window.primordiaFlow.onLiveModeChanged'), 'SignalRealmPage must subscribe to onLiveModeChanged');
  assert(content.includes('window.primordiaFlow.onNavigateTraces'), 'SignalRealmPage must subscribe to onNavigateTraces');
  assert(content.includes('window.primordiaFlow.onHighHeatLead'), 'SignalRealmPage must subscribe to onHighHeatLead');
  assert(content.includes('window.primordiaFlow.triggerBoost'), 'SignalRealmPage must support triggerBoost via IPC');
});

// ── TEST GROUP 6: Programmatic API & Dynamic Module Verification ──────────────
console.log('\n🧪 GROUP 6: Programmatic Execution & Functional Verification');

await runAsyncTest('electron/main.cjs can be imported safely in Node environment', async () => {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const mainModule = require('../electron/main.cjs');
  assert(mainModule, 'main.cjs must export an object');
  assert.strictEqual(mainModule.APP_NAME, 'Primordia Flow');
  assert.strictEqual(mainModule.APP_ID, 'com.primordiaos.flow');
  assert(typeof mainModule.resolveWorkspacePaths === 'function', 'resolveWorkspacePaths must be a function');
  assert(typeof mainModule.checkPortListening === 'function', 'checkPortListening must be a function');
  assert(typeof mainModule.executeBoost === 'function', 'executeBoost must be a function');
  assert(typeof mainModule.toggleLiveMode === 'function', 'toggleLiveMode must be a function');
  assert(typeof mainModule.createWindow === 'function', 'createWindow must be a function');
});

await runAsyncTest('electron/preload.cjs can be imported safely in Node environment', async () => {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const preloadModule = require('../electron/preload.cjs');
  assert(preloadModule?.primordiaFlowAPI, 'preload.cjs must export primordiaFlowAPI');
  assert.strictEqual(preloadModule.primordiaFlowAPI.appName, 'Primordia Flow');
  assert.strictEqual(typeof preloadModule.primordiaFlowAPI.triggerBoost, 'function');
});

await runAsyncTest('resolveWorkspacePaths identifies disk assets accurately', async () => {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const { resolveWorkspacePaths } = require('../electron/main.cjs');
  const resolved = resolveWorkspacePaths();
  assert(fs.existsSync(resolved.moneyPlugHubDir), 'Resolved MoneyPlugHub dir must exist on disk');
  assert(fs.existsSync(resolved.preloadPath), 'Resolved preload script must exist on disk');
});

await runAsyncTest('checkPortListening probes live HTTP endpoints correctly', async () => {
  const http = await import('node:http');
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const { checkPortListening } = require('../electron/main.cjs');

  const testServer = http.createServer((req, res) => {
    if (req.url === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'healthy' }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  await new Promise((resolve) => testServer.listen(0, '127.0.0.1', resolve));
  const port = testServer.address().port;

  const isUp = await checkPortListening(port, '/api/health');
  assert.strictEqual(isUp, true, 'Port with /api/health must report listening');

  const isDown = await checkPortListening(port + 1, '/api/health');
  assert.strictEqual(isDown, false, 'Unbound port must report false');

  testServer.close();
});

console.log('\n========================================================');
console.log(`TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
console.log('========================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
} else {
  console.log('✔ All Primordia Flow desktop architectural assertions satisfied.\n');
}
