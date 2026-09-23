import { Realm } from "./meta.js";

export class RealmCulture {
  constructor(private engine: any) {}

  seedCultures() {
    this.engine.state.realms.forEach((realm: Realm) => {
      (realm as any).culture = ["aggressive_expansion", "resource_focus", "signal_coordination"];
    });
  }

  influenceBehavior() {
    const realms = this.engine.state.realms;
    realms.forEach((realm: any) => {
      const culture: string[] = realm.culture || [];
      culture.forEach(trait => this.applyTrait(realm, trait));
    });
  }

  private applyTrait(realm: any, trait: string) {
    switch (trait) {
      case "aggressive_expansion":
        this.engine.realmExpansion.expand();
        break;
      case "resource_focus":
        this.engine.economy.generateRandomResource();
        break;
      case "signal_coordination":
        this.engine.signals.emitRandomSignal();
        break;
    }
  }
}
