# Reactor Blueprint Events

## Event: Primordia_ReactorPulse(Intensity, Energy, State)
- Set scalar parameter "PulseIntensity" on reactor material
- Set scalar parameter "EnergyLevel"
- Timeline:
  - Scale reactor mesh up slightly
  - Glow emissive
  - Fade back

## Event: Primordia_AscensionBegin()
- Activate Niagara system "NS_AscensionStorm"
- Increase directional light intensity
- Add camera shake
- Trigger glyph scatter

## Event: Primordia_AscensionEnd()
- Deactivate storm
- Ease lighting back
- Reform glyphs
