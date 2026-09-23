import path from "path";

const ROOT = "C:\\Users\\Shane\\Documents\\dev\\PrimordiaOS";

export const RENDERS_ROOT = path.join(ROOT, "renders");

export function sceneFramesDir(sceneId: string) {
  return path.join(RENDS_ROOT, sceneId);
}

export function sceneFinalVideo(sceneId: string) {
  return path.join(RENDS_ROOT, `${sceneId}_final.mp4`);
}
