export class MemoryEngine {
  private store: Map<string, unknown> = new Map();

  private key(realm: string, id: string): string {
    return realm + "::" + id;
  }

  async set(realm: string, id: string, value: unknown): Promise<void> {
    const k = this.key(realm, id);
    this.store.set(k, value);
  }

  async get<T = unknown>(realm: string, id: string): Promise<T | undefined> {
    const k = this.key(realm, id);
    return this.store.get(k) as T | undefined;
  }
}

export const memoryEngine = new MemoryEngine();
