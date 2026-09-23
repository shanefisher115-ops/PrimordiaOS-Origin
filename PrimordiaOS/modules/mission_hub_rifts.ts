export const MissionHubRifts = {
  rifts: {},
  activeRifts: [],

  create(id, data = {}) {
    this.rifts[id] = {
      id,
      created: Date.now(),
      severity: data.severity || Math.random(),
      type: data.type || "temporal",
      universeA: data.universeA || null,
      universeB: data.universeB || null,
      unstable: false,
      collapsed: false
    };

    this.activeRifts.push(id);
    console.log(`[Rifts] Rift created: ${id}`);
  },

  destabilize(id) {
    const r = this.rifts[id];
    if (!r || r.collapsed) return;

    r.unstable = true;
    r.severity += 0.2;

    console.log(`[Rifts] Rift destabilized: ${id}`);
  },

  collapse(id) {
    const r = this.rifts[id];
    if (!r || r.collapsed) return;

    r.collapsed = true;
    r.unstable = false;

    console.log(`[Rifts] Rift collapsed: ${id}`);
  },

  tearUniverse(id) {
    const r = this.rifts[id];
    if (!r || r.collapsed) return;

    if (!r.universeA) return;

    console.log(`[Rifts] Universe torn by rift: ${r.universeA}`);
  },

  mergeUniverses(id) {
    const r = this.rifts[id];
    if (!r || r.collapsed) return;

    if (!r.universeA || !r.universeB) return;

    console.log(`[Rifts] Universes merged via rift: ${r.universeA} + ${r.universeB}`);
  }
};
