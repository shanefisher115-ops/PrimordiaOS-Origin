async function igniteEconomicConduit() {
    console.log("Igniting economic conduit...");
    broadcastToSwarm(payload);
}

// Auto-ignite if run directly
if (require.main === module) {
    igniteEconomicConduit().catch(console.error);
}
module.exports = { igniteEconomicConduit };
