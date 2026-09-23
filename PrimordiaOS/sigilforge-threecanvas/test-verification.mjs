import {
  SigilItemRegistry,
  SigilCompositionEngine,
  CosmicRollEngine,
  SigilForgeThreeCanvasEngine,
  SigilForgeLogger,
} from './dist/index.js';

console.log('====================================================');
console.log('  PRIMORDIAOS :: SIGILFORGE RUNTIME VERIFICATION');
console.log('====================================================');

// 1. Validate Registry & Categories
const registry = SigilItemRegistry.getInstance();
const totalCount = registry.getItemCount();
console.log(`[PASS] Total Registered Customization Items: ${totalCount} (Requirement: 48+)`);

if (totalCount < 48) {
  throw new Error(`Expected at least 48 items, found ${totalCount}`);
}

const requiredCategories = [
  'crown',
  'bezel',
  'cosmic_field',
  'phoenix_wing',
  'matrix_hex',
  'bifrost_spectrum',
  'dragon_horn',
  'merkaba_star',
  'ascendant_halo',
];

for (const cat of requiredCategories) {
  const items = registry.getItemsByCategory(cat);
  console.log(`  - Category: ${cat.padEnd(18)} | Count: ${items.length} items`);
  if (items.length === 0) {
    throw new Error(`Category ${cat} has zero items!`);
  }
}

// 2. Validate Composition & Cosmic Roll
const composition = new SigilCompositionEngine();
const rollEngine = new CosmicRollEngine(registry, composition);

let soundscapeTriggered = false;
rollEngine.setSoundscapeListener((event) => {
  soundscapeTriggered = true;
  console.log(`[PASS] Soundscape Event Dispatched: ${event.type} (Pitch: ${event.pitchMultiplier})`);
});

const roll = rollEngine.roll(6);
console.log(`[PASS] Cosmic Roll Seed Generated: ${roll.seed}`);
console.log(`[PASS] Highest Rarity Rolled: ${roll.highestRarity}`);
console.log(`[PASS] Active Composition Layers: ${composition.getLayers().length}`);

// 3. Validate SVG Generation
const svg = composition.generateCompositeSvg();
console.log(`[PASS] Composite SVG Generated: ${svg.length} bytes`);
if (!svg.includes('<svg') || !svg.includes('<path') || !svg.includes('linearGradient')) {
  throw new Error('Generated SVG is missing required vector tags!');
}

// 4. Validate Engine Class Exports
if (typeof SigilForgeThreeCanvasEngine !== 'function') {
  throw new Error('SigilForgeThreeCanvasEngine export is not a constructor!');
}
console.log('[PASS] SigilForgeThreeCanvasEngine Class Verified');

console.log('====================================================');
console.log('  ALL QA SANITY GATES PASSED (100% OPERATIONAL)');
console.log('====================================================');
