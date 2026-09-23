import { VisionCoreEngine, defaultEngine } from './dist/index.js';

async function main() {
  console.log('Testing VisionCoreEngine instance...');
  const engine = new VisionCoreEngine();
  
  const directive = 'Construct an orbital sovereign foundry overlooking the Primordia computational ocean';
  const output = await engine.processDirective(directive, {
    targetStyle: 'Imperial Gold',
    enableRender: true,
    enableForecasting: true,
    enableInnovation: true
  });

  console.log('=== VERIFYING VISIONCORE_OUTPUT CONTRACT ===');
  if (!output.VISIONCORE_OUTPUT) {
    throw new Error('Missing VISIONCORE_OUTPUT root key');
  }

  const v = output.VISIONCORE_OUTPUT;
  if (!v.Interpretation) throw new Error('Missing Interpretation');
  if (!v['Creative Direction']) throw new Error('Missing Creative Direction');
  if (!v['Module Routing']) throw new Error('Missing Module Routing');
  if (!v['Next Actions']) throw new Error('Missing Next Actions');

  console.log('Interpretation:', v.Interpretation.thematicAltitude);
  console.log('Creative Direction Logline:', v['Creative Direction'].logline);
  console.log('Dispatched Modules:', v['Module Routing'].dispatchedModules);
  console.log('Next Actions Count:', v['Next Actions'].length);

  const health = engine.getHealthStatus();
  console.log('Health Status:', health.status, 'Version:', health.engineVersion);

  console.log('=== ALL QA VALIDATIONS PASSED SUCCESSFULLY ===');
}

main().catch(err => {
  console.error('QA Test Failed:', err);
  process.exit(1);
});
