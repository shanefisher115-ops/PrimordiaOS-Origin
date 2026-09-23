export class LeftConsole {
  renderPowerGrid() {
    return {
      subsystems: {
        propulsion: "42% (Normal)",
        deflectorShields: "35% (Optimal)",
        tacticalSensors: "15% (Nominal)",
        auxiliaryMatrix: "8% (Standby)"
      },
      thermalThreshold: "312 Kelvin"
    };
  }
}