import { AntigravityEngine } from './AntigravityEngine';

const ANTIGRAVITY_MAP = {
  'simulation.render': 'renderSimulation',
  'world.project': 'projectWorldModel',
  'agent.visualize': 'visualizeAgent',
  'memory.spatial.map': 'renderSpatialMemory',
  'scene.generate': 'generateScene'
} as const;

type AntigravityIntent = keyof typeof ANTIGRAVITY_MAP;

export async function routeToAntigravity(intent: string, payload: any) {
  if (!(intent in ANTIGRAVITY_MAP)) {
    return { status: 'ERROR', message: 'Unknown render intent' };
  }
  const action = ANTIGRAVITY_MAP[intent as AntigravityIntent];
  return AntigravityEngine[action](payload);
}