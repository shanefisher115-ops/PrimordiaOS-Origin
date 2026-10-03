export function autoLighting(evt) {
  if (evt.type === 'SpawnPulse') return { intensity: 8, color: 'blue' };
  if (evt.type === 'SpawnNebula') return { intensity: 3, color: 'violet' };
  return { intensity: 5, color: 'white' };
}