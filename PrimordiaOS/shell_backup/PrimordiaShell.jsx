import React, { useState } from "react";
import { RealmManager } from "./RealmManager.js";
import { GlobalPulse } from "./GlobalPulse.js";
import { transitionToRealm } from "../hud/transitions/orchestrator.js";
import "./styles/shell.css";

export function PrimordiaShell() {
  const [currentRealm, setCurrentRealm] = useState(
    (typeof window !== "undefined" && window.PrimordiaOS?.currentRealm) || "schema"
  );
  const [pulseActive, setPulseActive] = useState(true);

  const realms = [
    { id: "schema", label: "SCHEMA REALM", icon: "??" },
    { id: "financial", label: "FINANCIAL REALM", icon: "??" },
    { id: "agents", label: "AGENT REALM", icon: "??" },
    { id: "memory", label: "MEMORY REALM", icon: "?" },
    { id: "simulation", label: "SIMULATION REALM", icon: "??" }
  ];

  const handleRealmSwitch = (targetRealm) => {
    if (targetRealm === currentRealm) return;
    transitionToRealm(targetRealm, "void");
    setCurrentRealm(targetRealm);
    if (typeof window !== "undefined" && window.PrimordiaOS) {
      window.PrimordiaOS.currentRealm = targetRealm;
    }
  };

  return (
    <div id="primordia-shell" className="primordia-os-shell-root">
      <nav className="os-global-dock">
        <div className="os-brand-cluster">
          <span className="os-core-symbol">??</span>
          <span className="os-name">PRIMORDIA<span className="os-subname">OS</span></span>
          <span className="os-version-tag">v2026.08.31</span>
        </div>

        <div className="realm-nav-tabs">
          {realms.map(r => (
            <button
              key={r.id}
              className={`realm-tab-btn ${currentRealm === r.id ? "active" : ""}`}
              onClick={() => handleRealmSwitch(r.id)}
            >
              <span className="tab-icon">{r.icon}</span>
              <span className="tab-label">{r.label}</span>
            </button>
          ))}
        </div>

        <div className="os-system-controls">
          <div className="global-pulse-badge" onClick={() => GlobalPulse.emit("manual")}>
            <span className={`pulse-indicator ${pulseActive ? "pulsing" : ""}`}></span>
            <span>PULSE KERNEL</span>
          </div>
        </div>
      </nav>

      <div className="primordiaos-hud" data-realm={currentRealm}>
        <RealmManager currentRealm={currentRealm} />
      </div>
    </div>
  );
}

export default PrimordiaShell;

