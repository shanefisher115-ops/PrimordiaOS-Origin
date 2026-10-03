export function buildSequence(evt) {
  return {
    cameraRig: evt.type === 'SpawnPulse' ? 'PushIn' : 'SlowOrbit',
    lightingRig: evt.type === 'SpawnPulse' ? 'PulseLight' : 'NebulaLight'
  };
}