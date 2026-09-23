import EventBusPanel from "../components/EventBusPanel";

export default function Home() {
  return (
    <div style={{
      fontFamily: "sans-serif",
      padding: "20px"
    }}>
      <h1>PrimordiaOS Cockpit</h1>
      <p>Real‑time system event stream</p>

      <EventBusPanel />
    </div>
  );
}
