export const PIPELINE_CONFIG = {
    unreal: {
        wsUrl: "ws://localhost:17800",
        expects: ["scene_plan", "render_complete"],
    },
    blender: {
        exe: "C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe",
        script: "C:\\Users\\Shane\\Documents\\dev\\PrimordiaOS\\modules\\media\\blender-composite.py",
    },
};
