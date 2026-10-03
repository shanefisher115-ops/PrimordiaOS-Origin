export function niagaraForEvent(evt) {
  if (evt.type === 'SpawnPulse') return 'PulseWave';
  if (evt.type === 'SpawnNebula') return 'NebulaField';
  return 'None';
}