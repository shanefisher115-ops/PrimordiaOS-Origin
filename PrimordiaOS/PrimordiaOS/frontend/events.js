/* ============================================================
   PRIMORDIAOS COCKPIT EVENTS PAGE
   ============================================================ */

import { useEffect, useState } from "react";

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState({}); // realm → { state, lastSeen, heartbeats }
  const [dismissedAlerts, setDismissedAlerts] = useState([]); // track dismissed realms

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:3002");
    ws.onmessage = (msg) => {
      const event = JSON.parse(msg.data);

      // keep last 100 events
      setEvents(prev => [event, ...prev].slice(0, 100));

      // update realm status with lastSeen + heartbeat history
      setStatus(prev => {
        const realmInfo = prev[event.realm] || { state: "idle", lastSeen: Date.now(), heartbeats: [] };
        const now = Date.now();
        const newInfo = {
          ...realmInfo,
          state:
            event.type === "heartbeat" ? "online" :
            event.type === "register" ? "syncing" :
            event.type === "error" ? "error" :
            realmInfo.state,
          lastSeen: now,
          heartbeats: event.type === "heartbeat"
            ? [...realmInfo.heartbeats.filter(t => now - t < 60000), now] // keep only last 60s
            : realmInfo.heartbeats.filter(t => now - t < 60000)
        };
        return { ...prev, [event.realm]: newInfo };
      });
    };

    // timeout detector: flip to idle if >10s since lastSeen
    const interval = setInterval(() => {
      setStatus(prev => {
        const updated = {};
        for (const [realm, info] of Object.entries(prev)) {
          const age = Date.now() - info.lastSeen;
          updated[realm] = {
            ...info,
            state: age > 10000 && info.state === "online" ? "idle" : info.state
          };
        }
        return updated;
      });
    }, 5000);

    return () => {
      ws.close();
      clearInterval(interval);
    };
  }, []);

  // compute global summary
  const summary = { online: 0, syncing: 0, error: 0, idle: 0 };
  Object.values(status).forEach(info => {
    if (info.state === "online") summary.online++;
    else if (info.state === "syncing") summary.syncing++;
    else if (info.state === "error") summary.error++;
    else summary.idle++;
  });

  // detect unstable realms
  const now = Date.now();
  const unstableRealms = Object.entries(status)
    .filter(([realm, info]) =>
      info.state === "online" &&
      info.heartbeats.filter(t => now - t < 10000).length < 3 &&
      !dismissedAlerts.includes(realm)
    )
    .map(([realm]) => realm);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>PrimordiaOS Cockpit</h1>
      <p>Real‑time system event stream</p>

      {/* Global Alert Banner */}
      {unstableRealms.length > 0 && (
        <div style={{
          backgroundColor: "#ffcccc",
          color: "darkred",
          padding: "0.5rem",
          marginBottom: "1rem",
          fontWeight: "bold",
          animation: "warn 1s infinite",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <span>
            ⚠️ Alert: {unstableRealms.join(", ")} realm(s) unstable (low heartbeat frequency)
          </span>
          <button
            onClick={() => setDismissedAlerts(prev => [...prev, ...unstableRealms])}
            style={{
              background: "transparent",
              border: "none",
              color: "darkred",
              fontWeight: "bold",
              cursor: "pointer"
            }}
          >
            ✖ Dismiss
          </button>
        </div>
      )}

      {/* Global Health Summary */}
      <div style={{ marginBottom: "1rem", fontWeight: "bold" }}>
        🟢 Online: {summary.online} | 🟡 Syncing: {summary.syncing} | 🔴 Error: {summary.error} | ⚪ Idle: {summary.idle}
      </div>

      {/* Status HUD */}
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.6; }
          100% { opacity: 1; }
        }
        @keyframes warn {
          0% { opacity: 1; }
          50% { opacity: 0.3; }
          100% { opacity: 1; }
        }
      `}</style>
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        marginBottom: "1rem",
        fontWeight: "bold"
      }}>
        {Object.entries(status).map(([realm, info]) => {
          const points = info.heartbeats.map((t) => {
            const x = ((t - (now - 60000)) / 60000) * 120; // scale to 60s width
            const y = 30 - ((now - t) / 2000);
            return `${x},${Math.max(0, Math.min(30, y))}`;
          }).join(" ");

          const recentBeats = info.heartbeats.filter(t => now - t < 10000).length;
          const warn = info.state === "online" && recentBeats < 3;

          return (
            <div key={realm} style={{
              color:
                info.state === "online" ? "limegreen" :
                info.state === "syncing" ? "goldenrod" :
                info.state === "error" ? "red" : "gray",
              transition: "color 0.3s ease",
              animation: warn ? "warn 1s infinite" :
                         info.state === "online" ? "pulse 2s infinite" : "none"
            }}>
              {info.state === "online" && "🟢"}
              {info.state === "syncing" && "🟡"}
              {info.state === "error" && "🔴"}
              {info.state === "idle" && "⚪"} {realm} {info.state}
              <span style={{ marginLeft: "0.5rem", fontWeight: "normal" }}>
                (last seen {new Date(info.lastSeen).toLocaleTimeString()})
              </span>

              {/* Sparkline for heartbeat frequency over last 60s */}
              {info.heartbeats.length > 0 && (
                <svg width="120" height="30" style={{ marginLeft: "1rem" }}>
                  <polyline
                    fill="none"
                    stroke={warn ? "red" : "limegreen"}
                    strokeWidth="2"
                    points={points}
                  />
                </svg>
              )}
            </div>
          );
        })}
      </div>

      {/* Event Table */}
      <table border="1" cellPadding="6" style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>Realm</th>
            <th>Type</th>
            <th>Timestamp</th>
            <th>Payload</th>
          </tr>
        </thead>
        <tbody>
          {events.map((ev, idx) => (
            <tr key={idx}>
              <td>{ev.realm}</td>
              <td style={{
                color:
                  ev.type === "heartbeat" ? "green" :
                  ev.type === "register" ? "orange" :
                  ev.type === "task" ? "blue" :
                  ev.type === "result" ? "blue" :
                  ev.type === "error" ? "red" : "black",
                transition: "color 0.3s ease"
              }}>
                {ev.type}
              </td>
              <td>{new Date(ev.timestamp).toLocaleTimeString()}</td>
              <td>{JSON.stringify(ev)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
