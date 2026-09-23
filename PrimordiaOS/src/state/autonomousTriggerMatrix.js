// Autonomous Trigger Matrix (ATM)
// Maps signals → actions across realms.
export class AutonomousTriggerMatrix {
    rules = [];
    registerRule(rule) {
        this.rules.push(rule);
    }
    async dispatch(signal, payload) {
        const matching = this.rules.filter((r) => r.pattern.test(signal));
        for (const rule of matching) {
            await rule.action(signal, payload);
        }
    }
}
