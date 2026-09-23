"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, ShieldAlert, ShieldOff, AlertTriangle,
  XOctagon, Power, Zap, Check,
} from "lucide-react";
import { useRealmBusStore } from "@/lib/realmBusStore";

// ─── Kill Switch Level Definitions ──────────────────────────

const KILL_LEVELS = [
  {
    level: 0,
    label: "Normal",
    description: "No restrictions active",
    icon: Shield,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    destructive: false,
  },
  {
    level: 1,
    label: "Kill Agent",
    description: "Terminate a single agent",
    icon: Zap,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    destructive: false,
  },
  {
    level: 2,
    label: "Kill Swarm",
    description: "Terminate all agents in a swarm",
    icon: AlertTriangle,
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
    destructive: false,
  },
  {
    level: 3,
    label: "Disconnect Realm",
    description: "Sever connection to a realm, queue messages",
    icon: ShieldAlert,
    color: "text-rose-400",
    bgColor: "bg-rose-500/10",
    borderColor: "border-rose-500/30",
    destructive: true,
  },
  {
    level: 4,
    label: "Safe Mode",
    description: "Block ALL destructive intents globally",
    icon: ShieldOff,
    color: "text-rose-500",
    bgColor: "bg-rose-500/15",
    borderColor: "border-rose-500/40",
    destructive: true,
  },
  {
    level: 5,
    label: "Emergency Halt",
    description: "Stop all agents, disconnect all realms, freeze bus",
    icon: XOctagon,
    color: "text-red-500",
    bgColor: "bg-red-500/20",
    borderColor: "border-red-500/50",
    destructive: true,
  },
] as const;

// ─── Component ──────────────────────────────────────────────

export function KillSwitchPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmLevel, setConfirmLevel] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [isActivating, setIsActivating] = useState(false);

  const {
    killSwitchLevel,
    killSwitchReason,
    activateKillSwitch,
    deactivateKillSwitch,
    connectionState,
  } = useRealmBusStore();

  const currentLevel = KILL_LEVELS[killSwitchLevel] ?? KILL_LEVELS[0];
  const CurrentIcon = currentLevel.icon;

  // ── Activate Kill Switch ────────────────────────────────

  const handleActivate = useCallback(
    async (level: number) => {
      if (level >= 3 && confirmLevel !== level) {
        // Require confirmation for destructive levels
        setConfirmLevel(level);
        return;
      }

      setIsActivating(true);
      try {
        await activateKillSwitch(level, reason || KILL_LEVELS[level].description);
        setConfirmLevel(null);
        setReason("");
        if (level <= 2) setIsOpen(false); // Close for non-destructive
      } catch (err) {
        console.error("Kill switch activation failed:", err);
      }
      setIsActivating(false);
    },
    [confirmLevel, reason, activateKillSwitch]
  );

  // ── Deactivate Kill Switch ──────────────────────────────

  const handleDeactivate = useCallback(async () => {
    setIsActivating(true);
    try {
      await deactivateKillSwitch();
      setConfirmLevel(null);
      setReason("");
    } catch (err) {
      console.error("Kill switch deactivation failed:", err);
    }
    setIsActivating(false);
  }, [deactivateKillSwitch]);

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-bold tracking-wider transition-all border ${
          killSwitchLevel > 0
            ? `${currentLevel.bgColor} ${currentLevel.color} ${currentLevel.borderColor} animate-pulse`
            : "border-white/10 bg-white/5 text-white/40 hover:text-white/60 hover:bg-white/10"
        }`}
        title="Kill Switch"
      >
        <CurrentIcon className="h-3.5 w-3.5" />
        {killSwitchLevel > 0 ? currentLevel.label.toUpperCase() : "SAFE"}
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-white/12 bg-[#0c0e18]/98 backdrop-blur-2xl shadow-[0_16px_48px_rgba(0,0,0,0.7)] z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-ion" />
                <span className="text-xs font-semibold text-white/90">Kill Switch</span>
              </div>
              {killSwitchLevel > 0 && (
                <span className={`text-[9px] font-bold ${currentLevel.color}`}>
                  LEVEL {killSwitchLevel} ACTIVE
                </span>
              )}
            </div>

            {/* Current Status */}
            {killSwitchLevel > 0 && (
              <div className={`mx-3 mt-3 rounded-lg border px-3 py-2 ${currentLevel.bgColor} ${currentLevel.borderColor}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`text-[10px] font-bold ${currentLevel.color}`}>
                      {currentLevel.label}
                    </div>
                    <div className="text-[9px] text-white/30 mt-0.5">
                      {killSwitchReason ?? currentLevel.description}
                    </div>
                  </div>
                  <button
                    onClick={handleDeactivate}
                    disabled={isActivating}
                    className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-bold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                  >
                    {isActivating ? "..." : "DEACTIVATE"}
                  </button>
                </div>
              </div>
            )}

            {/* Level Buttons */}
            <div className="p-3 space-y-1.5">
              {KILL_LEVELS.slice(1).map((level) => {
                const Icon = level.icon;
                const isActive = killSwitchLevel === level.level;
                const isConfirming = confirmLevel === level.level;

                return (
                  <div key={level.level}>
                    <button
                      onClick={() => handleActivate(level.level)}
                      disabled={isActivating || connectionState !== "connected"}
                      className={`w-full flex items-center gap-3 rounded-lg border px-3 py-2 transition-all ${
                        isActive
                          ? `${level.bgColor} ${level.borderColor}`
                          : isConfirming
                          ? `${level.bgColor} ${level.borderColor} ring-1 ring-offset-1 ring-offset-[#0c0e18]`
                          : "border-white/6 bg-white/[0.02] hover:bg-white/[0.04]"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 flex-shrink-0 ${
                          isActive || isConfirming ? level.color : "text-white/25"
                        }`}
                      />
                      <div className="flex-1 text-left">
                        <div className={`text-[10px] font-bold ${
                          isActive || isConfirming ? level.color : "text-white/50"
                        }`}>
                          L{level.level}: {level.label}
                        </div>
                        <div className="text-[9px] text-white/25">
                          {level.description}
                        </div>
                      </div>
                      {isActive && (
                        <Check className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                      )}
                      {level.destructive && !isActive && (
                        <span className="text-[8px] text-rose-400/50 font-bold flex-shrink-0">
                          ⚠
                        </span>
                      )}
                    </button>

                    {/* Confirmation Dialog */}
                    <AnimatePresence>
                      {isConfirming && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-1.5 rounded-lg border border-rose-500/20 bg-rose-500/5 p-3"
                        >
                          <div className="text-[10px] text-rose-400/80 font-bold mb-2">
                            ⚠ Confirm {level.label}
                          </div>
                          <input
                            type="text"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Reason (optional)"
                            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] text-white/80 placeholder:text-white/20 outline-none mb-2 font-mono"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleActivate(level.level)}
                              disabled={isActivating}
                              className="flex-1 rounded-lg border border-rose-500/30 bg-rose-500/15 px-3 py-1.5 text-[10px] font-bold text-rose-400 hover:bg-rose-500/25 transition-colors"
                            >
                              {isActivating ? "ACTIVATING..." : "CONFIRM"}
                            </button>
                            <button
                              onClick={() => {
                                setConfirmLevel(null);
                                setReason("");
                              }}
                              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] text-white/40 hover:text-white/60 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="border-t border-white/6 px-4 py-2">
              <div className="text-[8px] text-white/15 text-center">
                Kill switches take effect immediately across all connected realms
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
