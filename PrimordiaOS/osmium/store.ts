// primordia/osmium/store.ts
type CinematicRecord = {
  jobId: string;
  brief: string;
  result: any;
  signals: any;
  createdAt: number;
};

const MEMORY_DB: CinematicRecord[] = [];

export function saveCinematicJob(
  brief: string,
  result: any,
  signals: any
) {
  const record: CinematicRecord = {
    jobId: result.data.jobId,
    brief,
    result,
    signals,
    createdAt: Date.now()
  };

  MEMORY_DB.push(record);
  return record;
}

export function listCinematicJobs() {
  return MEMORY_DB;
}
