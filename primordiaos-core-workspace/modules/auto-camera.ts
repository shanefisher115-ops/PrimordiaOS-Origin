export function autoCamera(evt) {
  if (evt.type === 'SpawnPulse') return { cam: 'CloseUp', move: 'PushIn' };
  if (evt.type === 'SpawnNebula') return { cam: 'Wide', move: 'SlowOrbit' };
  return { cam: 'Default', move: 'None' };
}