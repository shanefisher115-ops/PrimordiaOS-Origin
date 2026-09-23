/* ============================================================
   PRIMORDIAOS COCKPIT EVENTS PAGE
   ============================================================ */

import { useEffect, useState } from "react";

export default function EventsPage() {
  const [events, setEvents] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch("/api/events");
        const data = await res.json();
        setEvents(data);
      } catch (err) {
        console.error("Failed to fetch events:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
    const interval = setInterval(fetchEvents, 2000); // refresh every 2s
    return () => clearInterval(interval);
  }, []);

  if (loading) return <p>Loading events...</p>;
  if (!events) return <p>No events available.</p>;

  return (
    <div style={{ padding: "2rem" }}>
      <h1>PrimordiaOS Event Stream</h1>
      {Object.keys(events).map((type) => (
        <div key={type} style={{ marginBottom: "2rem" }}>
          <h2>{type.toUpperCase()}</h2>
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
              {events[type].map((ev, idx) => (
                <tr key={idx}>
                  <td>{ev.realm}</td>
                  <td>{ev.type}</td>
                  <td>{new Date(ev.timestamp).toLocaleTimeString()}</td>
                  <td>{JSON.stringify(ev)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
