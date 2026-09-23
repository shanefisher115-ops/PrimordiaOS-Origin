import { useEffect, useState } from "react";

export default function EventBusPanel() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/state");
        const data = await res.json();
        setEvents(data.panels.eventBus || []);
      } catch (err) {
        console.error("Failed to fetch state");
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      marginTop: "20px",
      padding: "10px",
      border: "1px solid #ccc",
      borderRadius: "8px"
    }}>
      <h2>Event Bus</h2>

      <div style={{
        maxHeight: "400px",
        overflowY: "auto",
        fontFamily: "monospace",
        fontSize: "14px"
      }}>
        {events.map((ev, i) => (
          <div key={i} style={{ marginBottom: "6px" }}>
            [{new Date(ev.ts).toLocaleTimeString()}] {ev.realm}: {ev.type}
          </div>
        ))}
      </div>
    </div>
  );
}
