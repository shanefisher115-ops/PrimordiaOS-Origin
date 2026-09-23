import { db } from './db';
import { synthesizeBoardroom } from './phom/boardroom_engine';
import { sendPersonalizedBoardroomEmail, getEmailHistory } from './phom/email_sender';
async function test() {
    console.log('====================================================');
    console.log('⚡ TESTING INTERACTIVE BOARDROOMS & AI VOICE BRIEFING');
    console.log('====================================================');
    // Find a real prospect from database
    const prospect = db.prepare(`SELECT * FROM prospects WHERE domain IS NOT NULL ORDER BY created_at DESC LIMIT 1`).get();
    if (!prospect) {
        console.error('No prospects found in database!');
        return;
    }
    console.log(`\n[Boardroom] Synthesizing bespoke interactive boardroom for: ${prospect.name} (${prospect.domain})...`);
    const boardroom = synthesizeBoardroom({
        id: prospect.id,
        email: prospect.email,
        name: prospect.name,
        domain: prospect.domain,
        mxVerified: Boolean(prospect.mx_verified),
        mxRecords: prospect.mx_records,
        enrichment: { industry: 'Enterprise AI & Compute', companySize: '100-500 employees', techStack: ['PyTorch', 'CUDA', 'Ray', 'Kubernetes'] }
    });
    console.log('✔ Boardroom ID:', boardroom.id);
    console.log('✔ Company Name:', boardroom.companyName);
    console.log('✔ Boardroom Portal URL:', boardroom.boardroomUrl);
    console.log('\n--- CUSTOMIZED AI VOICE SCRIPT ---');
    console.log(boardroom.voiceScript);
    console.log('\n--- FINANCIAL ROI MODEL ---');
    console.log('Current Monthly Cost: $' + boardroom.roiMetrics.currentMonthlyCostUsd.toLocaleString());
    console.log('Projected Monthly Cost: $' + boardroom.roiMetrics.projectedMonthlyCostUsd.toLocaleString());
    console.log('Monthly Savings: $' + boardroom.roiMetrics.monthlySavingsUsd.toLocaleString());
    console.log('\n--- Ω-BOND UPFRONT VALUE STAKE ---');
    console.log('✔ Bond Amount: $' + boardroom.omegaBond.bondAmountUsd.toLocaleString() + ' USD');
    console.log('✔ Serial: ' + boardroom.omegaBond.bondSerial);
    console.log('✔ Escrow Reference: ' + boardroom.omegaBond.escrowRef);
    console.log('✔ Failure Clause: ' + boardroom.omegaBond.failureCondition);
    console.log('✔ Status: ' + boardroom.omegaBond.status);
    console.log('\n[Email Dispatcher] Sending personalized executive email with Boardroom link & Ω-Bond...');
    const dispatchRes = await sendPersonalizedBoardroomEmail({
        prospectId: prospect.id,
        customCopy: `We evaluated ${boardroom.companyName}'s high-concurrency runtime models against our sovereign SQLite WAL agent architecture.`
    });
    console.log('✔ Email Dispatch Result:');
    console.log('  Recipient:', dispatchRes.recipientEmail);
    console.log('  Subject:', dispatchRes.subject);
    console.log('  Transport:', dispatchRes.transportUsed);
    console.log('  Boardroom Link:', dispatchRes.boardroomUrl);
    console.log('\n--- DISPATCH HISTORY IN SQLITE ---');
    const history = getEmailHistory(5);
    for (const h of history) {
        console.log(`- [${new Date(h.sent_at * 1000).toLocaleTimeString()}] To: ${h.recipient_email} | Status: ${h.status} | Transport: ${h.transport}`);
    }
}
test().catch(console.error);
