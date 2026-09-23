import React, { useEffect, useState } from "react";
import { bindClick, bindSignal } from "@/cockpit/bindings";

type Applet = {
  name: string;
  description: string;
  runtimeType: number;
  runtime?: "desktop" | "core" | "mobile" | "unknown";
  lastAccessTime?: string;
  firstAccessTime?: string;
};

export default function AppletManager() {
  const [applets, setApplets] = useState<Applet[]>([]);

  useEffect(() => {
    async function fetchApplets() {
      try {
        const res = await fetch("/api/applets");
        const data = await res.json();
        setApplets(data.applets || []);
      } catch (e) {
        console.error("Failed to load applets:", e);
      }
    }
    fetchApplets();
  }, []);

  const runtimeLabel = (rt: number) => {
    switch (rt) {
      case 1:
        return "Desktop";
      case 2:
        return "Core";
      case 3:
        return "Mobile";
      default:
        return "Unknown";
    }
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        padding: 24,
        display: "flex",
        flexDirection: "column",
        background:
          "radial-gradient(circle at top, #1bffb8 0%, #120020 40%, #05030a 100%)",
        color: "#e6e6ff",
        fontFamily: "system-ui, sans-serif"
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16
        }}
      >
        <div style={{ fontWeight: 600, letterSpacing: "0.14em" }}>
          APPLET MANAGER
        </div>
        <button
          style={{
            padding: "8px 14px",
            borderRadius: 999,
            border: "1px solid rgba(27,255,184,0.6)",
            background: "rgba(0,10,12,0.9)",
            color: "#e6fff9",
            fontSize: 11,
            cursor: "pointer"
          }}
          onClick={() => bindSignal("applets.refresh")}
        >
          Refresh
        </button>
      </header>

      <main
        style={{
          flex: 1,
          borderRadius: 18,
          border: "1px solid rgba(180,0,255,0.35)",
          background: "rgba(5,3,10,0.95)",
          padding: 16,
          overflow: "auto"
        }}
      >
        {applets.length === 0 ? (
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            No applets registered yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {applets.map((applet) => (
              <div
                key={applet.name}
                style={{
                  borderRadius: 12,
                  border: "1px solid rgba(27,255,184,0.35)",
                  background: "rgba(0,10,12,0.9)",
                  padding: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>
                    {applet.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      opacity: 0.75,
                      marginTop: 2,
                      maxWidth: 420
                    }}
                  >
                    {applet.description}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      opacity: 0.6,
                      marginTop: 4
                    }}
                  >
                    Runtime: {runtimeLabel(applet.runtimeType)}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      border: "1px solid rgba(180,0,255,0.7)",
                      background: "rgba(18,0,32,0.9)",
                      color: "#fdfdff",
                      fontSize: 11,
                      cursor: "pointer"
                    }}
                    onClick={() =>
                      bindClick("applet.open", { name: applet.name })
                    }
                  >
                    Open
                  </button>
                  <button
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      border: "1px solid rgba(255,216,107,0.7)",
                      background: "rgba(32,24,0,0.9)",
                      color: "#fff6d0",
                      fontSize: 11,
                      cursor: "pointer"
                    }}
                    onClick={() =>
                      bindSignal("applet.activate", { name: applet.name })
                    }
                  >
                    Activate
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
