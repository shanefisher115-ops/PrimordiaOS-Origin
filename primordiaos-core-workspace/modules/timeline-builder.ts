export function buildTimeline(evt) {
  return {
    duration: evt.type === 'SpawnPulse' ? 4 : 6,
    shots: [
      { camera: 'Main', start: 0, end: 2 },
      { camera: 'Secondary', start: 2, end: 4 }
    ]
  };
}