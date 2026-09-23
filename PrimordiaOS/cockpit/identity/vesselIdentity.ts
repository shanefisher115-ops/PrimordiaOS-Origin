export class VesselIdentity {
  public readonly name = "Primordia Sovereign Dreadnought";
  public readonly callsign = "ZENITH-01";
  public readonly captain = "Shane";
  public readonly registry = "ORIGIN-8890-KERNEL";

  getCrewManifest() {
    return {
      captain: this.captain,
      authorityTier: 0,
      sovereignty: "Absolute"
    };
  }
}