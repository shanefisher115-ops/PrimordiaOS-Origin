export function pulseVoice(state = "") {
  switch (state.toLowerCase()) {
    case "start": return ["Antigravity awakens. The pulse begins."];
    case "diff": return ["A ripple forms. Schema differences detected across realms."];
    case "staging": return ["Staging realm brightens. Migration applied to gateway cluster."];
    case "approval": return ["The portal stands open. Awaiting PrimordiaOS HUD verification."];
    case "production": return ["Production ascends. Promotion complete. Cosmic ledger sealed."];
    case "rollback": return ["Time reverses. Reverting to prior schema milestone."];
    case "insync": return ["All realms in harmonic parity. The database is still."];
    case "void": return ["The realm folds inward. A singularity forms."];
    default: return [];
  }
}
