"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Wifi, WifiOff, Circle, Activity } from "lucide-react";
import { useRealmBusStore } from "@/lib/realmBusStore";
import type { RealmHealth } from "@/lib/realmBusClient";

// ─── Layout Constants ───────────────────────────────────────

const CANVAS_WIDTH = 700;
const CANVAS_HEIGHT = 420;
const CENTER_X = CANVAS_WIDTH / 2;
const CENTER_Y = CANVAS_HEIGHT / 2;
const ORBIT_RADIUS = 140;

// ─── Realm Visual Config ────────────────────────────────────

interface RealmVisual {
  label: string;
  color: string;
  glowColor: string;
  icon: string;
  angle: number; // radians — position on orbit
}

const REALM_VISUALS: Record<string, RealmVisual> = {
  system: {
    label: "SYSTEM",
    color: "#27d8ff",
    glowColor: "rgba(39, 216, 255, 0.3)",
    icon: "⚙",
    angle: -Math.PI / 2, // top
  },
  cloud: {
    label: "CLOUD",
    color: "#a78bfa",
    glowColor: "rgba(167, 139, 250, 0.3)",
    icon: "☁",
    angle: 0, // right
  },
  simulation: {
    label: "SIMULATION",
    color: "#f97316",
    glowColor: "rgba(249, 115, 22, 0.3)",
    icon: "🌐",
    angle: Math.PI / 2, // bottom
  },
  agents: {
    label: "AGENTS",
    color: "#34d399",
    glowColor: "rgba(52, 211, 153, 0.3)",
    icon: "🤖",
    angle: Math.PI, // left
  },
  browser: {
    label: "BROWSER",
    color: "#fbbf24",
    glowColor: "rgba(251, 191, 36, 0.3)",
    icon: "👁",
    angle: 0, // center
  },
};

const STATE_COLORS: Record<string, string> = {
  online: "#34d399",
  degraded: "#fbbf24",
  offline: "#ef4444",
  unknown: "#6b7280",
};

// ─── Component ──────────────────────────────────────────────

export function RealmTopologyMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const { realmHealth, connectionState, events } = useRealmBusStore();

  const [selectedRealm, setSelectedRealm] = useState<string | null>(null);
  const [hoveredRealm, setHoveredRealm] = useState<string | null>(null);

  // ── Derive realm positions ──────────────────────────────

  const realmPositions = useMemo(() => {
    const positions: Record<string, { x: number; y: number }> = {};

    // Browser is always at center
    positions.browser = { x: CENTER_X, y: CENTER_Y };

    // Other realms orbit around browser
    const knownRealms = Object.keys(REALM_VISUALS).filter((r) => r !== "browser");
    const realmKeys = new Set([...knownRealms, ...Object.keys(realmHealth)]);

    let angleIndex = 0;
    for (const realm of realmKeys) {
      if (realm === "browser") continue;
      const visual = REALM_VISUALS[realm];
      const angle = visual?.angle ?? (Math.PI * 2 * angleIndex) / realmKeys.size;
      positions[realm] = {
        x: CENTER_X + Math.cos(angle) * ORBIT_RADIUS,
        y: CENTER_Y + Math.sin(angle) * ORBIT_RADIUS,
      };
      angleIndex++;
    }

    return positions;
  }, [realmHealth]);

  // ── Render Loop ─────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function render() {
      if (!ctx || !canvas) return;
      const time = performance.now() / 1000;

      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Background
      const bgGrad = ctx.createRadialGradient(CENTER_X, CENTER_Y, 30, CENTER_X, CENTER_Y, CANVAS_WIDTH * 0.6);
      bgGrad.addColorStop(0, "rgba(10, 12, 20, 0.95)");
      bgGrad.addColorStop(1, "rgba(5, 3, 13, 0.98)");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Orbit ring
      ctx.strokeStyle = "rgba(39, 216, 255, 0.06)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(CENTER_X, CENTER_Y, ORBIT_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Connection lines from browser to each realm
      const browserPos = realmPositions.browser;
      for (const [realm, pos] of Object.entries(realmPositions)) {
        if (realm === "browser") continue;

        const health = realmHealth[realm];
        const isOnline = health?.state === "online";
        const visual = REALM_VISUALS[realm];
        const color = visual?.color ?? "#6b7280";

        // Animated dash for online, static for offline
        if (isOnline) {
          const dashOffset = time * 30;
          ctx.strokeStyle = color.replace(")", ", 0.2)").replace("rgb", "rgba").replace("#", "");
          // Convert hex to rgba
          ctx.strokeStyle = hexToRgba(color, 0.15);
          ctx.lineWidth = 1.5;
          ctx.setLineDash([6, 6]);
          ctx.lineDashOffset = -dashOffset;
        } else {
          ctx.strokeStyle = "rgba(107, 114, 128, 0.1)";
          ctx.lineWidth = 0.5;
          ctx.setLineDash([2, 4]);
          ctx.lineDashOffset = 0;
        }

        ctx.beginPath();
        ctx.moveTo(browserPos.x, browserPos.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;

        // Message pulse animation along the line
        if (isOnline) {
          const pulseT = (time * 0.5) % 1;
          const px = browserPos.x + (pos.x - browserPos.x) * pulseT;
          const py = browserPos.y + (pos.y - browserPos.y) * pulseT;
          const pulseGrad = ctx.createRadialGradient(px, py, 0, px, py, 5);
          pulseGrad.addColorStop(0, hexToRgba(color, 0.6));
          pulseGrad.addColorStop(1, "transparent");
          ctx.fillStyle = pulseGrad;
          ctx.beginPath();
          ctx.arc(px, py, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw realm nodes
      for (const [realm, pos] of Object.entries(realmPositions)) {
        const visual = REALM_VISUALS[realm] ?? {
          label: realm.toUpperCase(),
          color: "#6b7280",
          glowColor: "rgba(107, 114, 128, 0.3)",
          icon: "●",
          angle: 0,
        };

        const health = realmHealth[realm];
        const isOnline = health?.state === "online" || realm === "browser";
        const isSelected = selectedRealm === realm;
        const isHovered = hoveredRealm === realm;
        const isBrowser = realm === "browser";

        const nodeRadius = isBrowser ? 28 : 18;
        const pulseScale = isOnline ? 1 + Math.sin(time * 2 + pos.x) * 0.05 : 1;
        const effectiveRadius = nodeRadius * pulseScale;

        // Outer glow
        if (isOnline || isBrowser) {
          const glowRadius = effectiveRadius * (isSelected ? 3.5 : isHovered ? 3 : 2.5);
          const glow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, glowRadius);
          glow.addColorStop(0, hexToRgba(visual.color, isSelected ? 0.25 : 0.12));
          glow.addColorStop(1, "transparent");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, glowRadius, 0, Math.PI * 2);
          ctx.fill();
        }

        // Node ring
        ctx.strokeStyle = isOnline || isBrowser
          ? hexToRgba(visual.color, isSelected ? 0.9 : 0.5)
          : "rgba(107, 114, 128, 0.2)";
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, effectiveRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Node fill
        ctx.fillStyle = isOnline || isBrowser
          ? hexToRgba(visual.color, 0.08)
          : "rgba(20, 20, 30, 0.5)";
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, effectiveRadius, 0, Math.PI * 2);
        ctx.fill();

        // Status dot
        const stateColor = isBrowser
          ? (connectionState === "connected" ? STATE_COLORS.online : STATE_COLORS.offline)
          : STATE_COLORS[health?.state ?? "unknown"];
        const dotX = pos.x + effectiveRadius * 0.6;
        const dotY = pos.y - effectiveRadius * 0.6;
        ctx.fillStyle = stateColor;
        ctx.beginPath();
        ctx.arc(dotX, dotY, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Icon
        ctx.fillStyle = isOnline || isBrowser ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.2)";
        ctx.font = isBrowser ? "16px sans-serif" : "12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(visual.icon, pos.x, pos.y);

        // Label
        ctx.fillStyle = isOnline || isBrowser ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.15)";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.fillText(visual.label, pos.x, pos.y + effectiveRadius + 14);

        // Latency label for non-browser realms
        if (!isBrowser && health) {
          ctx.fillStyle = "rgba(255,255,255,0.2)";
          ctx.font = "8px monospace";
          ctx.fillText(`${health.latencyMs}ms`, pos.x, pos.y + effectiveRadius + 24);
        }
      }

      // Title overlay
      ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "left";
      ctx.fillText("REALM TOPOLOGY", 12, 20);

      animRef.current = requestAnimationFrame(render);
    }

    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, [realmHealth, realmPositions, selectedRealm, hoveredRealm, connectionState]);

  // ── Click handler ───────────────────────────────────────

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      const cx = (e.clientX - rect.left) * scaleX;
      const cy = (e.clientY - rect.top) * scaleY;

      for (const [realm, pos] of Object.entries(realmPositions)) {
        const dist = Math.sqrt((cx - pos.x) ** 2 + (cy - pos.y) ** 2);
        if (dist < 30) {
          setSelectedRealm(selectedRealm === realm ? null : realm);
          return;
        }
      }
      setSelectedRealm(null);
    },
    [realmPositions, selectedRealm]
  );

  // ── Mouse move for hover ────────────────────────────────

  const handleCanvasMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      const cx = (e.clientX - rect.left) * scaleX;
      const cy = (e.clientY - rect.top) * scaleY;

      for (const [realm, pos] of Object.entries(realmPositions)) {
        const dist = Math.sqrt((cx - pos.x) ** 2 + (cy - pos.y) ** 2);
        if (dist < 30) {
          setHoveredRealm(realm);
          return;
        }
      }
      setHoveredRealm(null);
    },
    [realmPositions]
  );

  // ── Selected realm detail ───────────────────────────────

  const selectedHealth = selectedRealm ? realmHealth[selectedRealm] : null;
  const realmCount = Object.keys(realmHealth).length;
  const onlineCount = Object.values(realmHealth).filter((h) => h.state === "online").length;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0a0c14]/95 backdrop-blur-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-ion" />
          <span className="text-sm font-semibold tracking-wide text-white/90">
            Realm Topology
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-white/30 font-mono">
          <span className="flex items-center gap-1">
            {connectionState === "connected" ? (
              <Wifi className="h-3 w-3 text-emerald-400" />
            ) : (
              <WifiOff className="h-3 w-3 text-rose-400" />
            )}
            {connectionState}
          </span>
          <span>{onlineCount}/{realmCount + 1} realms</span>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full cursor-pointer"
          style={{ aspectRatio: `${CANVAS_WIDTH}/${CANVAS_HEIGHT}` }}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMove}
        />
      </div>

      {/* Selected Realm Detail */}
      <AnimatePresence>
        {selectedRealm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-white/6 px-4 py-3"
          >
            <div className="text-[10px] text-white/40 mb-2 font-mono">
              REALM DETAIL — {selectedRealm.toUpperCase()}
            </div>
            {selectedHealth ? (
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                {[
                  { label: "State", value: selectedHealth.state, color: STATE_COLORS[selectedHealth.state] },
                  { label: "Latency", value: `${selectedHealth.latencyMs}ms` },
                  { label: "Messages In", value: String(selectedHealth.messageCountIn) },
                  { label: "Messages Out", value: String(selectedHealth.messageCountOut) },
                  { label: "Errors", value: String(selectedHealth.errorCount), color: selectedHealth.errorCount > 0 ? "#ef4444" : undefined },
                  { label: "Last Heartbeat", value: selectedHealth.lastHeartbeat ? new Date(selectedHealth.lastHeartbeat).toLocaleTimeString() : "—" },
                  { label: "Uptime", value: `${Math.round(selectedHealth.uptimeMs / 1000)}s` },
                  { label: "Intents", value: String(selectedHealth.supportedIntents.length) },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between text-[10px]">
                    <span className="text-white/30">{row.label}</span>
                    <span className="font-mono" style={{ color: row.color ?? "rgba(255,255,255,0.6)" }}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[10px] text-white/20 italic">
                {selectedRealm === "browser"
                  ? "This is the God Console (you are here)"
                  : "No health data available — realm may not be connected"}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Utility ────────────────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(107, 114, 128, ${alpha})`;
  return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})`;
}
