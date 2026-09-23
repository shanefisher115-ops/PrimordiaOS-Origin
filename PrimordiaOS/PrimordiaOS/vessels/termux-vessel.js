/**
 * Termux Mobile Vessel container definition for Android / mobile nodes.
 */
export const TermuxVessel = {
  id: "vessel-termux-android",
  type: "mobile_node",
  os: "Android/Linux",
  capabilities: ["lightweight_node", "edge_telemetry", "remote_cli"],
  status: "active",

  createTelemetryPacket(sensors = {}) {
    return {
      vesselId: this.id,
      os: this.os,
      timestamp: Date.now(),
      battery: sensors.battery ?? 85,
      accelerometer: sensors.accelerometer ?? { x: 0.12, y: 9.78, z: 0.45 },
      network: sensors.network ?? "WIFI",
      gps: sensors.gps ?? { latitude: 37.7749, longitude: -122.4194, accuracy: 4.2 },
      cpu: sensors.cpu ?? { load: [1.2, 0.9, 0.7], memory_free_mb: 2450 },
      thermal: sensors.thermal ?? "optimal"
    };
  }
};

export default TermuxVessel;

