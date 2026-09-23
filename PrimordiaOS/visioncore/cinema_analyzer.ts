// primordia/visioncore/cinema_analyzer.ts
export interface CinematicSignal {
  jobId: string;
  shotCount: number;
  engines: string[];
  qualityHints: string[];
}

export function analyzeDirectorOutput(result: any): CinematicSignal {
  const jobId = result.data.jobId;
  const shots = result.data.shots ?? [];
  const engines = ["unreal", "runway", "blender"];

  const qualityHints: string[] = [];

  if (shots.length === 0) {
    qualityHints.push("No shots generated");
  } else {
    qualityHints.push(`Shots generated: ${shots.length}`);
  }

  return {
    jobId,
    shotCount: shots.length,
    engines,
    qualityHints
  };
}
