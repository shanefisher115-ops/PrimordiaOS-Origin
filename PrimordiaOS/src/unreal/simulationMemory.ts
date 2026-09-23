import { Logger } from '../core/logger';

interface SimulationMemoryRecord {
  id: string;
  scene: string | null;
  variables: Record<string, any>;
  timestamp: string;
}

const records: SimulationMemoryRecord[] = [];

export const SimulationMemory = {
  snapshot(currentScene: string | null, variables: Record<string, any>) {
    const record: SimulationMemoryRecord = {
      id: `sim_${Date.now()}`,
      scene: currentScene,
      variables: { ...variables },
      timestamp: new Date().toISOString(),
    };

    records.push(record);
    Logger.info('SimulationMemory snapshot stored', { id: record.id, scene: record.scene });
  },

  all() {
    return records;
  },
};
