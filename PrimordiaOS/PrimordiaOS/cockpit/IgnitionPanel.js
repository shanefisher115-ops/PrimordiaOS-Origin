// primordiaos/cockpit/IgnitionPanel.tsx
import React, { useState } from "react";
import { AntiGravity } from "../core/AntiGravity";
export default function IgnitionPanel() {
    const [status, setStatus] = useState("idle");
    const [log, setLog] = useState([]);
    async function runIgnition() {
        setStatus("running");
        setLog((prev) => [...prev, "Ignition event started"]);
        try {
            await AntiGravity.run("IGNITION_EVENT");
            setStatus("complete");
            setLog((prev) => [...prev, "Ignition event completed"]);
        }
        catch (err) {
            setStatus("error");
            setLog((prev) => [...prev, `Error: ${err.message}`]);
        }
    }
    return (<div className="primordia-ignition-panel">
      <h2>PrimordiaOS Ignition Panel</h2>

      <button className={`ignite-btn ${status}`} onClick={runIgnition} disabled={status === "running"}>
        {status === "running" ? "Running..." : "Run Ignition Event"}
      </button>

      <div className="ignition-log">
        <h3>Event Log</h3>
        <ul>
          {log.map((entry, i) => (<li key={i}>{entry}</li>))}
        </ul>
      </div>
    </div>);
}
