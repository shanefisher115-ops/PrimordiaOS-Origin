import { useRouter } from "next/router";
import { bindClick } from "@/cockpit/bindings";

export default function CockpitMenu() {
  const router = useRouter();

  function openApplets() {
    bindClick("open_applets");
    router.push("/applets");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Existing cockpit buttons here */}

      <button
        onClick={openApplets}
        style={{
          padding: "10px 16px",
          borderRadius: 12,
          background: "rgba(27,255,184,0.12)",
          border: "1px solid rgba(27,255,184,0.45)",
          color: "#1bffb8",
          fontSize: 14,
          letterSpacing: "0.08em",
          cursor: "pointer"
        }}
      >
        APPLETS
      </button>
    </div>
  );
}
