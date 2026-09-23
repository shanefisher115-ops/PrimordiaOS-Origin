export interface CockpitSystemState {
  powerGrid: number;
  shieldHarmonics: number;
  quantumLock: boolean;
  activeRealmId: string;
}

export class CockpitState {
  private state: CockpitSystemState = {
    powerGrid: 100,
    shieldHarmonics: 98.4,
    quantumLock: true,
    activeRealmId: "realm-prime"
  };

  get(): CockpitSystemState {
    return { ...this.state };
  }

  update(patch: Partial<CockpitSystemState>): void {
    this.state = { ...this.state, ...patch };
  }
}