export interface Vessel {
  id: string;
  realm: string;
  pulse(): void;
}

class BasicVessel implements Vessel {
  id: string;
  realm: string;

  constructor(id: string, realm: string) {
    this.id = id;
    this.realm = realm;
  }

  pulse(): void {
    console.log("[Vessel] Pulse:", this.id, "Realm:", this.realm);
  }
}

export class VesselManager {
  vessels: Vessel[] = [];

  start(): Promise<void> {
    console.log("[Vessels] started");
    return Promise.resolve();
  }

  health(): Promise<{ status: string }> {
    return Promise.resolve({ status: "healthy" });
  }

  create(id: string, realm: string): Vessel {
    const v = new BasicVessel(id, realm);
    this.vessels.push(v);
    console.log("[VesselManager] Created vessel:", id);
    return v;
  }

  pulseAll(): Promise<void> {
    for (const v of this.vessels) {
      v.pulse();
    }
    return Promise.resolve();
  }

  // REQUIRED BY OMNISCIENCE
  list(): Vessel[] {
    return this.vessels;
  }
}

export const vessels = new VesselManager();
