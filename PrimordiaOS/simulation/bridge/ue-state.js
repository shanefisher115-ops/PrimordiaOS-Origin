export const UEState = {
  particles: [
    { x: "20%", y: "30%", opacity: 0.8, color: "#06b6d4" },
    { x: "45%", y: "60%", opacity: 0.6, color: "#38bdf8" },
    { x: "70%", y: "25%", opacity: 0.9, color: "#a855f7" },
    { x: "80%", y: "75%", opacity: 0.7, color: "#10b981" }
  ],
  nodes: [
    { id: "node-1", name: "Chaos Physics Kernel", active: true, load: "12%" },
    { id: "node-2", name: "Niagara Particle Emitter Alpha", active: true, particles: 2400 },
    { id: "node-3", name: "MetaSounds Acoustic Harmonizer", active: true, frequency: "432Hz" },
    { id: "node-4", name: "Spatial Matrix Grid", active: true, dimensions: "3D Euclidean" }
  ],
  physics: {
    gravity: -9.81,
    timeDilation: 1.0,
    collisionSubsteps: 8,
    dampingTensor: [0.02, 0.02, 0.02],
    activeRigidBodies: 142
  },
  status: {
    connected: true,
    fps: 120,
    ping: "4ms",
    nodeCount: 4,
    unrealVersion: "5.4.3-Release"
  }
};
