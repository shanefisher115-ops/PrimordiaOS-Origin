import { collectSignals } from './phom/layer0_inputs';
import { RealPhomBoostEngine } from './phom/real_boost_engine';
import { db } from './db';

async function main() {
  console.log('====================================================');
  console.log('⚡ TESTING 100% REAL LIVE DATA INGESTION & MX LOOKUP');
  console.log('====================================================');

  const signals = await collectSignals();
  console.log(`\n[Live Layer 0] Collected ${signals.length} real live signals from Hacker News, Reddit RSS, and GitHub:`);
  for (const s of signals.slice(0, 5)) {
    console.log(` - [${s.source.toUpperCase()}] ${s.author} | URL: ${s.url}`);
    console.log(`   Content: ${s.content.slice(0, 90)}...`);
  }

  console.log('\n[Boost Engine] Executing live 11-Layer pipeline with real signals...');
  const result = await RealPhomBoostEngine.execute({
    directive: 'Verify 100% real live data pipeline',
    autoDistribute: false
  });

  console.log('\n=== BOOST RESULT SUMMARY ===');
  console.log('Success:', result.success);
  console.log('Signals Processed:', result.signalsProcessed);
  console.log('Prospects Discovered:', result.prospectsDiscovered);
  console.log('Hot Prospects:', result.hotProspects);

  console.log('\n=== REAL DISCOVERED PROSPECTS WITH LIVE DNS MX RECORDS ===');
  const rows = db.prepare('SELECT id, name, email, domain, heat, band, mx_verified, mx_records FROM prospects ORDER BY created_at DESC LIMIT 10').all() as any[];
  for (const r of rows) {
    console.log(`-> Prospect: ${r.name}`);
    console.log(`   Email: ${r.email}`);
    console.log(`   Domain: ${r.domain}`);
    console.log(`   Heat: ${r.heat} (${r.band})`);
    console.log(`   MX Verified: ${r.mx_verified === 1 ? 'YES' : 'NO'}`);
    console.log(`   Live MX Records: ${r.mx_records || 'None'}`);
    console.log('----------------------------------------------------');
  }
}

main().catch(console.error);
