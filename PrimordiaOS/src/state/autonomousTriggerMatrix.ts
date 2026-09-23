// Autonomous Trigger Matrix (ATM)
// Maps signals → actions across realms.

export type TriggerAction = (signal: string, payload: unknown) => Promise<void> | void;

export interface TriggerRule {
  id: string;
  realm: string;
  pattern: RegExp;
  action: TriggerAction;
}

export class AutonomousTriggerMatrix {
  private rules: TriggerRule[] = [];

  registerRule(rule: TriggerRule) {
    this.rules.push(rule);
  }

  async dispatch(signal: string, payload: unknown) {
    const matching = this.rules.filter((r) => r.pattern.test(signal));
    for (const rule of matching) {
      await rule.action(signal, payload);
    }
  }
}
