// ============================================================
//  PRIMORDIAOS // ARCHITECT DASHBOARD UI
//  Location: C:/Users/Shane/Documents/dev/PrimordiaOS/dashboard/src/App.jsx
//  Mode: Cinematic + Real
// ============================================================

import React, { useEffect, useState } from "react";

const API_BASE = "http://localhost:7004";

async function get(path) {
  const res = await fetch(`${API_BASE}${path}`);
  return res.json();
}

async function post(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export default function App() {
  const [sovereign, setSovereign] = useState(null);
  const [realms, setRealms] = useState({});
  const [daemons, setDaemons] = useState({});
  const [pulses, setPulses] = useState([]);
  const [origin, setOrigin] = useState(null);
  const [scenes, setScenes] = useState([]);
  const [ledger, setLedger] = useState(null);
  const [cinema, setCinema] = useState(null);
  const [telemetry, setTelemetry] = useState([]);
  const [cmdScope, setCmdScope] = useState("primordia");
  const [cmdTarget, setCmdTarget] = useState("core");
  const [cmdAction, setCmdAction] = useState("ping");
  const [cmdPayload, setCmdPayload] = useState("{}");
  const [cmdResult, setCmdResult] = useState(null);

  async function refreshAll() {
    const [
      sovereignRes,
      realmsRes,
      daemonsRes,
      pulsesRes,
      originRes,
      scenesRes,
      moneyRes,
      cinemaRes,
      telemetryRes,
    ] = await Promise.all([
      get("/sovereign"),
      get("/realms"),
      get("/daemons"),
      get("/pulse"),
      get("/origin"),
      get("/scenes"),
      get("/money"),
      get("/cinema"),
      get("/telemetry"),
    ]);

    setSovereign(sovereignRes.sovereign);
    setRealms(realmsRes.realms || {});
    setDaemons(daemonsRes.daemons || {});
    setPulses(pulsesRes.pulses || []);
    setOrigin(originRes.origin || null);
    setScenes(scenesRes.scenes || []);
    setLedger(moneyRes.ledger || null);
    setCinema(cinemaRes.cinema || null);
    setTelemetry(telemetryRes.telemetry || []);
  }

  useEffect(() => {
    refreshAll();
    const id = setInterval(refreshAll, 2000);
    return () => clearInterval(id);
  }, []);

  async function sendCommand() {
    let payload = {};
    try {
      payload = JSON.parse(cmdPayload || "{}");
    } catch {
      payload = {};
    }
    const result = await post("/command", {
      scope: cmdScope,
      target: cmdTarget,
      action: cmdAction,
      payload,
    });
    setCmdResult(result);
  }

  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        background: "radial-gradient(circle at top, #1b1b3a, #050510)",
        color: "#f5f5ff",
        minHeight: "100vh",
        padding: "16px",
      }}
    >
      <header style={{ marginBottom: "16px" }}>
        <h1 style={{ margin: 0 }}>
          ✦ PRIMORDIAOS // ARCHITECT DASHBOARD
        </h1>
        <p style={{ opacity: 0.8 }}>
          Architect, your multiverse is visible and listening.
        </p>
        <button onClick={refreshAll} style={{ padding: "6px 12px" }}>
          Refresh Now
        </button>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 2fr 2fr",
          gap: "12px",
        }}
      >
        {/* Sovereign State */}
        <section style={cardStyle}>
          <h2>✦ Sovereign State</h2>
          {sovereign ? (
            <pre style={preStyle}>
              {JSON.stringify(sovereign.health || sovereign, null, 2)}
            </pre>
          ) : (
            <p>Loading...</p>
          )}
        </section>

        {/* Realms */}
        <section style={cardStyle}>
          <h2>✦ Realms</h2>
          {Object.keys(realms).length === 0 ? (
            <p>No realms registered yet.</p>
          ) : (
            <ul style={listStyle}>
              {Object.values(realms).map((r) => (
                <li key={r.id}>
                  <strong>{r.name}</strong> [{r.id}] — {r.type} —{" "}
                  <span
                    style={{
                      color:
                        r.status === "online"
                          ? "#7CFC00"
                          : r.status === "blocked"
                          ? "#ff5555"
                          : "#ffd700",
                    }}
                  >
                    {r.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Daemons */}
        <section style={cardStyle}>
          <h2>✦ Daemons</h2>
          {Object.keys(daemons).length === 0 ? (
            <p>No daemons registered yet.</p>
          ) : (
            <ul style={listStyle}>
              {Object.values(daemons).map((d) => (
                <li key={d.name}>
                  <strong>{d.name}</strong> — realm {d.realm} —{" "}
                  <span
                    style={{
                      color:
                        d.status === "online"
                          ? "#7CFC00"
                          : d.status === "blocked"
                          ? "#ff5555"
                          : "#ffd700",
                    }}
                  >
                    {d.status}
                  </span>
                  <br />
                  <span style={{ opacity: 0.8 }}>{d.description}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Pulses */}
        <section style={cardStyle}>
          <h2>✦ Sovereign Pulses</h2>
          {pulses.length === 0 ? (
            <p>No pulses yet.</p>
          ) : (
            <ul style={listStyle}>
              {pulses.slice(-10).map((p, idx) => (
                <li key={idx}>
                  {new Date(p.ts).toLocaleTimeString()} — energy{" "}
                  {p.energy ?? "n/a"}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Origin Universe */}
        <section style={cardStyle}>
          <h2>✦ Origin Universe</h2>
          {origin ? (
            <pre style={preStyle}>
              {JSON.stringify(origin, null, 2)}
            </pre>
          ) : (
            <p>No origin universe data yet.</p>
          )}
        </section>

        {/* Scenes */}
        <section style={cardStyle}>
          <h2>✦ Scenes</h2>
          {scenes.length === 0 ? (
            <p>No scenes yet.</p>
          ) : (
            <ul style={listStyle}>
              {scenes.map((s) => (
                <li key={s.id}>
                  <strong>{s.title}</strong> — mood {s.mood}, intensity{" "}
                  {s.intensity}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Money Ledger */}
        <section style={cardStyle}>
          <h2>✦ MoneyPlugHub Ledger</h2>
          {ledger ? (
            <pre style={preStyle}>
              {JSON.stringify(ledger, null, 2)}
            </pre>
          ) : (
            <p>No ledger data yet.</p>
          )}
        </section>

        {/* Cinema Engine */}
        <section style={cardStyle}>
          <h2>✦ Cinema Engine State</h2>
          {cinema ? (
            <pre style={preStyle}>
              {JSON.stringify(cinema, null, 2)}
            </pre>
          ) : (
            <p>No cinema state yet.</p>
          )}
        </section>

        {/* Telemetry */}
        <section style={cardStyle}>
          <h2>✦ Telemetry</h2>
          {telemetry.length === 0 ? (
            <p>No telemetry yet.</p>
          ) : (
            <ul style={listStyle}>
              {telemetry.slice(-15).map((t, idx) => (
                <li key={idx}>
                  [{t.type}] {new Date(t.ts).toLocaleTimeString()}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Command Bus */}
      <section style={{ ...cardStyle, marginTop: "16px" }}>
        <h2>✦ Sovereign Command Bus</h2>
        <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
          <div>
            <label>Scope</label>
            <br />
            <input
              value={cmdScope}
              onChange={(e) => setCmdScope(e.target.value)}
            />
          </div>
          <div>
            <label>Target</label>
            <br />
            <input
              value={cmdTarget}
              onChange={(e) => setCmdTarget(e.target.value)}
            />
          </div>
          <div>
            <label>Action</label>
            <br />
            <input
              value={cmdAction}
              onChange={(e) => setCmdAction(e.target.value)}
            />
          </div>
        </div>
        <div style={{ marginBottom: "8px" }}>
          <label>Payload (JSON)</label>
          <br />
          <textarea
            value={cmdPayload}
            onChange={(e) => setCmdPayload(e.target.value)}
            rows={4}
            style={{ width: "100%" }}
          />
        </div>
        <button onClick={sendCommand} style={{ padding: "6px 12px" }}>
          Send Command
        </button>
        {cmdResult && (
          <div style={{ marginTop: "8px" }}>
            <h3>Result</h3>
            <pre style={preStyle}>
              {JSON.stringify(cmdResult, null, 2)}
            </pre>
          </div>
        )}
      </section>
    </div>
  );
}

const cardStyle = {
  background: "rgba(10, 10, 30, 0.9)",
  borderRadius: "8px",
  padding: "10px",
  border: "1px solid rgba(120, 120, 255, 0.4)",
  boxShadow: "0 0 12px rgba(0, 0, 0, 0.6)",
};

const preStyle = {
  background: "rgba(0, 0, 0, 0.4)",
  padding: "6px",
  borderRadius: "4px",
  fontSize: "11px",
  overflowX: "auto",
};

const listStyle = {
  listStyle: "none",
  paddingLeft: 0,
  margin: 0,
  fontSize: "12px",
};
