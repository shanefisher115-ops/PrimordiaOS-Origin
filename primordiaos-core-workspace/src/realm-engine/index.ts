export interface Realm {
  id: string;
  name: string;
  active: boolean;
}

export class RealmEngine {
  private realms = new Map<string, Realm>();

  create(id: string, name: string) {
    if (this.realms.has(id)) {
      throw new Error("Realm exists: " + id);
    }
    this.realms.set(id, { id: id, name: name, active: false });
  }

  activate(id: string) {
    const realm = this.realms.get(id);
    if (!realm) {
      throw new Error("Realm not found: " + id);
    }
    realm.active = true;
  }

  deactivate(id: string) {
    const realm = this.realms.get(id);
    if (!realm) {
      throw new Error("Realm not found: " + id);
    }
    realm.active = false;
  }

  list() {
    return Array.from(this.realms.values());
  }
}

export const realmEngine = new RealmEngine();
