export class VesselIdentity {
    name = "Primordia Sovereign Dreadnought";
    callsign = "ZENITH-01";
    captain = "Shane";
    registry = "ORIGIN-8890-KERNEL";
    getCrewManifest() {
        return {
            captain: this.captain,
            authorityTier: 0,
            sovereignty: "Absolute"
        };
    }
}
