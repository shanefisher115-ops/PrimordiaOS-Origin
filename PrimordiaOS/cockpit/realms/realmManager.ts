export interface RealmConfig {
  id: string;
  name: string;
  sovereigntyFactor: number;
}

export class RealmManager {
  private realms = new Map<string, RealmConfig>();
  private activeRealm: string = "origin-realm";

  constructor() {
    this.realms.set("origin-realm", {
      id: "origin-realm",
      name: "Primordia Origin Matrix",
      sovereigntyFactor: 1.0
    });
  }

  initializeActiveRealm(): void {
    console.log("[RealmManager] Active realm configured: " + this.activeRealm);
  }

  getActiveRealm(): RealmConfig | undefined {
    return this.realms.get(this.activeRealm);
  }
}