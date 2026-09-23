import React, { useState } from "react";

export default function IgnitionPanel() {
  const [status, setStatus] = useState("idle");
  const [log, setLog] = useState([]);

  async function ignite() {
    setStatus("booting");
    setLog((prev) => [...prev, "Boot sequence initiated..."]);

    try {
      const res = await fetch("http://localhost:3000/ignite");
      const text = await res.text();

      setLog((prev) => [...prev, text]);
      setStatus("complete");
    } catch (err) {
      setLog((prev) => [...prev, "Ignition failed: " + err.message]);
      setStatus("error");
    }
  }

  return (
    <div style={{ padding: "20px", background: "#0d0d0d", color: "#e0e0e0" }}>
      <h2>PrimordiaOS Ignition Panel</h2>

      <button
        onClick={ignite}
        style={{
          padding: "12px 20px",
          background: status === "booting" ? "#444" : "#4caf50",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          marginBottom: "20px",
        }}
      >
        {status === "booting" ? "Booting..." : "Ignite PrimordiaOS"}
      </button>

      <div
        style={{
          background: "#1a1a1a",
          padding: "15px",
          borderRadius: "6px",
          height: "300px",
          overflowY: "auto",
          fontFamily: "monospace",
          fontSize: "14px",
        }}
      >
        {log.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    </div>
  );
}
