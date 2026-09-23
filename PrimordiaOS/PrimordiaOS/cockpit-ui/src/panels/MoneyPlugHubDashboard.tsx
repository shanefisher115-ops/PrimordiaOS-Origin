import React, { useEffect, useState } from "react";

export default function MoneyPlugHubDashboard() {
  const [status, setStatus] = useState("idle");
  const [streams, setStreams] = useState([]);
  const [loopState, setLoopState] = useState(null);
  const [events, setEvents] = useState([]);

  async function fetchData() {
    setStatus("loading");

    try {
      const res = await fetch("http://localhost:3000/mph/status");
      const data = await res.json();

      setStreams(data.streams);
      setLoopState(data.loop);
      setEvents(data.events);

      setStatus("ready");
    } catch (err) {
      setStatus("error");
    }
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: "20px", background: "#0d0d0d", color: "#e0e0e0" }}>
      <h2>MoneyPlugHub Dashboard</h2>

      <div style={{ marginBottom: "20px" }}>
        <strong>Status:</strong> {status}
      </div>

      <h3>Income Streams</h3>
      <div style={{ background: "#1a1a1a", padding: "10px", borderRadius: "6px" }}>
        {streams.map((s, i) => (
          <div key={i} style={{ marginBottom: "8px" }}>
            <strong>{s.name}</strong> — ${s.monthly}/mo  
            <span style={{ color: s.active ? "#4caf50" : "#f44336" }}>
              {s.active ? " active" : " inactive"}
            </span>
          </div>
        ))}
      </div>

      <h3 style={{ marginTop: "20px" }}>Autonomous Loop Manager</h3>
      <div style={{ background: "#1a1a1a", padding: "10px", borderRadius: "6px" }}>
        {loopState ? (
          <>
            <div><strong>Loop Depth:</strong> {loopState.depth}</div>
            <div><strong>Mode:</strong> {loopState.mode}</div>
            <div><strong>Last Cycle:</strong> {loopState.lastCycle}</div>
            <div><strong>Health:</strong> {loopState.health}</div>
          </>
        ) : (
          <div>No loop data.</div>
        )}
      </div>

      <h3 style={{ marginTop: "20px" }}>Events</h3>
      <div style={{
        background: "#1a1a1a",
        padding: "10px",
        borderRadius: "6px",
        height: "200px",
        overflowY: "auto",
        fontFamily: "monospace"
      }}>
        {events.map((e, i) => (
          <div key={i}>{e.timestamp} — {e.message}</div>
        ))}
      </div>
    </div>
  );
}
