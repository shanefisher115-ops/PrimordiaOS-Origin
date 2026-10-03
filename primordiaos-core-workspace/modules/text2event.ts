export function textToEvent(input: string) {
  if (input.includes('pulse')) return { type: 'SpawnPulse', intensity: 1 };
  if (input.includes('nebula')) return { type: 'SpawnNebula', density: 0.8 };
  return { type: 'Unknown' };
}