"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye, Zap, Grid3X3, Play, Pause, SkipForward, RotateCcw,
  Activity, Cpu, Box, Layers, MonitorDot,
} from "lucide-react";
import {
  getAgentPositions,
  getAgentCount,
  getWorldState,
  getFrameCount,
  getLatestFrame,
  getSceneHistory,
  getSnapshotCount,
  getSnapshots,
  updateAgentPosition,
  setWorldVector,
  captureSnapshot,
  clearSpatialMemory,
} from "@/lib/spatialMemoryEngine";
import type { AgentPosition, WorldVector, GeneratedScene } from "@/lib/spatialMemoryEngine";
import { executePURLCommand } from "@/lib/purlRuntime";
import "./AntigravityRealm.css";

// ─── Types ──────────────────────────────────────────────────

interface DiagMetrics {
  fps: number;
  renderTimeMs: number;
  gpuLoadEstimate: number;
  agentCount: number;
  frameCount: number;
  sceneCount: number;
  snapshotCount: number;
  lastEngine: string | null;
  lastLatencyMs: number | null;
}

// ─── Constants ──────────────────────────────────────────────

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const GRID_CELL_SIZE = 40;
const NODE_RADIUS = 6;

const STATE_COLORS: Record<AgentPosition["state"], string> = {
  active: "#27d8ff",
  idle: "#ff9f43",
  spawning: "#ff385c",
  terminated: "#ffffff33",
};

// ─── Component ──────────────────────────────────────────────

export function AntigravityRealm() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const fpsRef = useRef({ frames: 0, lastTime: performance.now(), fps: 60 });

  const [metrics, setMetrics] = useState<DiagMetrics>({
    fps: 60, renderTimeMs: 0, gpuLoadEstimate: 0, agentCount: 0,
    frameCount: 0, sceneCount: 0, snapshotCount: 0,
    lastEngine: null, lastLatencyMs: null,
  });
  const [agents, setAgents] = useState<AgentPosition[]>([]);
  const [worldVectors, setWorldVectors] = useState<Record<string, WorldVector>>({});
  const [scenes, setScenes] = useState<GeneratedScene[]>([]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [selectedAgent, setSelectedAgent] = useState<AgentPosition | null>(null);
  const [initialized, setInitialized] = useState(false);

  // ── Initialize Demo Data ────────────────────────────────
  useEffect(() => {
    if (initialized) return;

    // Seed agents
    for (let i = 0; i < 15; i++) {
      updateAgentPosition(`agent-${i}`, {
        x: Math.random() * 90 + 5,
        y: Math.random() * 90 + 5,
        z: Math.random() * 50,
        velocity: Math.random() * 5,
        state: (["active", "idle", "spawning", "active", "active"] as const)[
          Math.floor(Math.random() * 5)
        ],
      });
    }

    // Seed world vectors
    setWorldVector("energy", [0.8, 0.3, 0.6, 0.9]);
    setWorldVector("entropy", [0.2, 0.7, 0.4]);
    setWorldVector("coherence", [0.95, 0.88, 0.92, 0.87, 0.91]);
    setWorldVector("density", [0.5, 0.6]);
    setWorldVector("flux", [0.3, 0.4, 0.5, 0.6, 0.7, 0.8]);

    captureSnapshot();
    setInitialized(true);
  }, [initialized]);

  // ── Refresh State ──────────────────────────────────────
  const refreshState = useCallback(() => {
    setAgents(getAgentPositions());
    setWorldVectors(getWorldState());
    setScenes(getSceneHistory());
    setMetrics((prev) => ({
      ...prev,
      agentCount: getAgentCount(),
      frameCount: getFrameCount(),
      sceneCount: getSceneHistory().length,
      snapshotCount: getSnapshotCount(),
    }));
  }, []);

  // ── Canvas Render Loop ────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function render() {
      if (!ctx || !canvas) return;
      const renderStart = performance.now();

      // Clear
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Background
      const bgGrad = ctx.createRadialGradient(
        CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 50,
        CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH * 0.7
      );
      bgGrad.addColorStop(0, "rgba(10, 12, 20, 0.95)");
      bgGrad.addColorStop(1, "rgba(5, 3, 13, 0.98)");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Grid
      ctx.strokeStyle = "rgba(39, 216, 255, 0.05)";
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= CANVAS_WIDTH; x += GRID_CELL_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_CELL_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
      }

      // Agent positions from spatial memory
      const currentAgents = getAgentPositions();

      // Connection lines between nearby agents
      ctx.lineWidth = 0.5;
      for (let i = 0; i < currentAgents.length; i++) {
        for (let j = i + 1; j < currentAgents.length; j++) {
          const a = currentAgents[i];
          const b = currentAgents[j];
          const ax = (a.x / 100) * CANVAS_WIDTH;
          const ay = (a.y / 100) * CANVAS_HEIGHT;
          const bx = (b.x / 100) * CANVAS_WIDTH;
          const by = (b.y / 100) * CANVAS_HEIGHT;
          const dist = Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);

          if (dist < 150) {
            const alpha = (1 - dist / 150) * 0.2;
            ctx.strokeStyle = `rgba(39, 216, 255, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(bx, by);
            ctx.stroke();
          }
        }
      }

      // Agent nodes
      const time = performance.now() / 1000;
      for (const agent of currentAgents) {
        const x = (agent.x / 100) * CANVAS_WIDTH;
        const y = (agent.y / 100) * CANVAS_HEIGHT;
        const color = STATE_COLORS[agent.state];
        const pulseScale = agent.state === "active" ? 1 + Math.sin(time * 3 + x) * 0.15 : 1;

        // Glow
        const glowGrad = ctx.createRadialGradient(x, y, 0, x, y, NODE_RADIUS * 4 * pulseScale);
        glowGrad.addColorStop(0, color.replace(")", ", 0.3)").replace("rgb", "rgba"));
        glowGrad.addColorStop(1, "transparent");
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(x, y, NODE_RADIUS * 4 * pulseScale, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, NODE_RADIUS * pulseScale, 0, Math.PI * 2);
        ctx.fill();

        // Label
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.font = "8px monospace";
        ctx.textAlign = "center";
        ctx.fillText(agent.id.replace("agent-", "A"), x, y + NODE_RADIUS + 10);
      }

      // FPS tracking
      fpsRef.current.frames++;
      const now = performance.now();
      if (now - fpsRef.current.lastTime >= 1000) {
        fpsRef.current.fps = fpsRef.current.frames;
        fpsRef.current.frames = 0;
        fpsRef.current.lastTime = now;
      }

      const renderTime = performance.now() - renderStart;

      // Update metrics periodically (not every frame to avoid React churn)
      if (Math.random() < 0.05) {
        setMetrics((prev) => ({
          ...prev,
          fps: fpsRef.current.fps,
          renderTimeMs: Math.round(renderTime * 100) / 100,
          gpuLoadEstimate: Math.min(100, Math.round((renderTime / 16.67) * 100)),
          agentCount: currentAgents.length,
          frameCount: getFrameCount(),
        }));
      }

      if (isPlaying) {
        // Drift agents slightly for visual motion
        for (const agent of currentAgents) {
          if (agent.state === "active") {
            updateAgentPosition(agent.id, {
              x: Math.max(2, Math.min(98, agent.x + (Math.random() - 0.5) * 0.3)),
              y: Math.max(2, Math.min(98, agent.y + (Math.random() - 0.5) * 0.3)),
            });
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    }

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying]);

  // ── Periodic State Refresh ─────────────────────────────
  useEffect(() => {
    const interval = setInterval(refreshState, 500);
    return () => clearInterval(interval);
  }, [refreshState]);

  // ── PURL Command Handlers ──────────────────────────────
  const handleRender = useCallback(async () => {
    const result = await executePURLCommand("simulation.render", {
      multimodalEngine: "OvermindViz",
    });
    setMetrics((prev) => ({
      ...prev,
      lastEngine: result.engineRoute,
      lastLatencyMs: result.executionTimeMs,
    }));
    refreshState();
  }, [refreshState]);

  const handleProject = useCallback(async () => {
    const result = await executePURLCommand("world.project", { steps: 10 });
    setMetrics((prev) => ({
      ...prev,
      lastEngine: result.engineRoute,
      lastLatencyMs: result.executionTimeMs,
    }));
    refreshState();
  }, [refreshState]);

  const handleGenerateScene = useCallback(async () => {
    const engines = ["Flow", "Vids", "Genie3", "CloudVision", "OvermindViz"];
    const engine = engines[Math.floor(Math.random() * engines.length)];
    const result = await executePURLCommand("scene.generate", {
      prompt: "cosmic swarm visualization",
      engine,
    });
    setMetrics((prev) => ({
      ...prev,
      lastEngine: result.engineRoute,
      lastLatencyMs: result.executionTimeMs,
      sceneCount: getSceneHistory().length,
    }));
    refreshState();
  }, [refreshState]);

  // ── Playback Controls ──────────────────────────────────
  const snapCount = getSnapshotCount();

  return (
    <div className="antigravity-realm rounded-2xl border border-white/10 bg-[#080a12]/95 backdrop-blur-xl overflow-hidden">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-ion" />
          <span className="text-sm font-semibold tracking-wide text-white/90">
            Antigravity Realm
          </span>
          <span className="text-[10px] text-white/30 font-mono ml-2">
            Visual Cognition Engine
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="fps-counter text-[10px] font-mono text-emerald-400/70">
            {metrics.fps} FPS
          </span>
          <span className="text-[10px] font-mono text-white/30">
            {metrics.agentCount} agents
          </span>
        </div>
      </div>

      {/* ── Main Layout ─────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-0">

        {/* ── GPU Canvas Area ───────────────────────────────── */}
        <div className="flex-1 p-4">
          <div className="relative rounded-xl border border-white/6 overflow-hidden" style={{ background: "#050310" }}>
            {/* Scanline overlay */}
            <div className="antigravity-scanlines rounded-xl" />

            {/* WebGL Canvas */}
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="antigravity-canvas w-full"
              style={{ aspectRatio: `${CANVAS_WIDTH}/${CANVAS_HEIGHT}` }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const scaleX = CANVAS_WIDTH / rect.width;
                const scaleY = CANVAS_HEIGHT / rect.height;
                const cx = (e.clientX - rect.left) * scaleX;
                const cy = (e.clientY - rect.top) * scaleY;

                // Find clicked agent
                const currentAgents = getAgentPositions();
                for (const agent of currentAgents) {
                  const ax = (agent.x / 100) * CANVAS_WIDTH;
                  const ay = (agent.y / 100) * CANVAS_HEIGHT;
                  if (Math.sqrt((cx - ax) ** 2 + (cy - ay) ** 2) < 15) {
                    setSelectedAgent(agent);
                    return;
                  }
                }
                setSelectedAgent(null);
              }}
            />

            {/* Canvas label */}
            <div className="absolute bottom-2 left-3 text-[9px] font-mono text-white/20">
              SPATIAL GRID ◆ {CANVAS_WIDTH}×{CANVAS_HEIGHT}
            </div>
          </div>

          {/* ── Playback Controls ──────────────────────────── */}
          <div className="flex items-center gap-3 mt-3 px-1">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-ion hover:border-ion/30 transition-all"
            >
              {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            </button>
            <button
              onClick={() => captureSnapshot()}
              className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-ion hover:border-ion/30 transition-all"
              title="Capture Snapshot"
            >
              <SkipForward className="h-3 w-3" />
            </button>
            <button
              onClick={() => { clearSpatialMemory(); setInitialized(false); }}
              className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-plasma hover:border-plasma/30 transition-all"
              title="Reset"
            >
              <RotateCcw className="h-3 w-3" />
            </button>

            <div className="flex-1 mx-2">
              <input
                type="range"
                min={0}
                max={Math.max(0, snapCount - 1)}
                value={playbackIndex}
                onChange={(e) => setPlaybackIndex(Number(e.target.value))}
                className="playback-timeline"
              />
            </div>
            <span className="text-[9px] font-mono text-white/30">
              {snapCount} snaps
            </span>
          </div>

          {/* ── Action Buttons ─────────────────────────────── */}
          <div className="flex items-center gap-2 mt-3 px-1">
            <button
              onClick={handleRender}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-medium bg-ion/10 text-ion/80 border border-ion/20 hover:bg-ion/20 hover:text-ion transition-all"
            >
              <MonitorDot className="h-3 w-3" /> Render
            </button>
            <button
              onClick={handleProject}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-medium bg-purple-500/10 text-purple-400/80 border border-purple-500/20 hover:bg-purple-500/20 hover:text-purple-400 transition-all"
            >
              <Box className="h-3 w-3" /> Project
            </button>
            <button
              onClick={handleGenerateScene}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-medium bg-plasma/10 text-plasma/80 border border-plasma/20 hover:bg-plasma/20 hover:text-plasma transition-all"
            >
              <Zap className="h-3 w-3" /> Generate Scene
            </button>
          </div>
        </div>

        {/* ── Sidebar Panels ───────────────────────────────── */}
        <div className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-white/6 flex flex-col">

          {/* ── Selected Agent Detail ──────────────────────── */}
          <AnimatePresence>
            {selectedAgent && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="border-b border-white/6 p-3"
              >
                <div className="text-[10px] text-white/40 mb-1.5">SELECTED AGENT</div>
                <div className="space-y-1">
                  {[
                    { label: "ID", value: selectedAgent.id },
                    { label: "Position", value: `(${selectedAgent.x.toFixed(1)}, ${selectedAgent.y.toFixed(1)}, ${selectedAgent.z.toFixed(1)})` },
                    { label: "State", value: selectedAgent.state, color: STATE_COLORS[selectedAgent.state] },
                    { label: "Velocity", value: selectedAgent.velocity.toFixed(2) },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between text-[10px]">
                      <span className="text-white/35">{row.label}</span>
                      <span className="font-mono" style={{ color: row.color ?? "rgba(255,255,255,0.6)" }}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── World-Model Projection ─────────────────────── */}
          <div className="border-b border-white/6 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Layers className="h-3 w-3 text-purple-400/70" />
              <span className="text-[10px] text-white/40">WORLD PROJECTION</span>
            </div>
            <div className="space-y-1.5">
              {Object.entries(worldVectors).slice(0, 6).map(([key, vec]) => (
                <div key={key}>
                  <div className="flex justify-between mb-0.5">
                    <span className="text-[9px] text-white/35">{key}</span>
                    <span className="text-[9px] font-mono text-white/50">
                      {vec.magnitude.toFixed(3)}
                    </span>
                  </div>
                  <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="projection-bar h-full"
                      style={{ width: `${Math.min(100, vec.magnitude * 40)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Multimodal Output Viewer ───────────────────── */}
          <div className="border-b border-white/6 p-3 flex-1 overflow-y-auto" style={{ maxHeight: "200px" }}>
            <div className="flex items-center gap-1.5 mb-2">
              <Grid3X3 className="h-3 w-3 text-ember/70" />
              <span className="text-[10px] text-white/40">MULTIMODAL OUTPUT</span>
              <span className="text-[9px] font-mono text-white/25 ml-auto">{scenes.length}</span>
            </div>
            <div className="space-y-1.5">
              {scenes.length === 0 ? (
                <div className="text-[9px] text-white/20 italic">
                  No scenes generated yet. Click &quot;Generate Scene&quot;.
                </div>
              ) : (
                scenes.slice(-5).reverse().map((scene) => (
                  <div
                    key={scene.sceneId}
                    className="multimodal-card rounded-lg border border-white/6 bg-white/[0.02] px-2.5 py-1.5"
                  >
                    <div className="flex justify-between text-[9px]">
                      <span className="text-white/50">{scene.sceneId}</span>
                      <span className="font-mono text-ion/60">{scene.sourceEngine}</span>
                    </div>
                    <div className="text-[8px] text-white/25 mt-0.5">
                      {scene.resolution.width}×{scene.resolution.height} · {scene.layers} layers
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── Diagnostics ────────────────────────────────── */}
          <div className="p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Activity className="h-3 w-3 text-emerald-400/70" />
              <span className="text-[10px] text-white/40">DIAGNOSTICS</span>
            </div>
            <div className="space-y-1">
              {[
                { label: "Render FPS", value: `${metrics.fps}`, bar: metrics.fps / 60, status: metrics.fps >= 50 ? "good" : metrics.fps >= 30 ? "warn" : "critical" },
                { label: "GPU Load", value: `${metrics.gpuLoadEstimate}%`, bar: metrics.gpuLoadEstimate / 100, status: metrics.gpuLoadEstimate < 60 ? "good" : metrics.gpuLoadEstimate < 85 ? "warn" : "critical" },
                { label: "Render Time", value: `${metrics.renderTimeMs}ms`, bar: Math.min(1, metrics.renderTimeMs / 16.67), status: metrics.renderTimeMs < 8 ? "good" : metrics.renderTimeMs < 14 ? "warn" : "critical" },
                { label: "Agents", value: `${metrics.agentCount}`, bar: Math.min(1, metrics.agentCount / 50), status: "good" },
                { label: "Frames", value: `${metrics.frameCount}`, bar: Math.min(1, metrics.frameCount / 500), status: "good" },
                { label: "Scenes", value: `${metrics.sceneCount}`, bar: Math.min(1, metrics.sceneCount / 20), status: "good" },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-2">
                  <span className="text-[9px] text-white/30 w-16 shrink-0">{row.label}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className={`diag-bar diag-bar--${row.status}`}
                      style={{ width: `${Math.max(4, row.bar * 100)}%`, height: "100%" }}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-white/50 w-10 text-right shrink-0">
                    {row.value}
                  </span>
                </div>
              ))}
              {metrics.lastEngine && (
                <div className="flex justify-between text-[9px] mt-1.5 pt-1.5 border-t border-white/5">
                  <span className="text-white/30">Last Engine</span>
                  <span className="font-mono text-ion/60">
                    {metrics.lastEngine} ({metrics.lastLatencyMs}ms)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
