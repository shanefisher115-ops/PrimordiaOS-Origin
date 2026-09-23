"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MoneyPlugHubDashboard;
const react_1 = __importStar(require("react"));
function MoneyPlugHubDashboard() {
    const [status, setStatus] = (0, react_1.useState)("idle");
    const [streams, setStreams] = (0, react_1.useState)([]);
    const [loopState, setLoopState] = (0, react_1.useState)(null);
    const [events, setEvents] = (0, react_1.useState)([]);
    async function fetchData() {
        setStatus("loading");
        try {
            const res = await fetch("http://localhost:3000/mph/status");
            const data = await res.json();
            setStreams(data.streams);
            setLoopState(data.loop);
            setEvents(data.events);
            setStatus("ready");
        }
        catch (err) {
            setStatus("error");
        }
    }
    (0, react_1.useEffect)(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);
    return (<div style={{ padding: "20px", background: "#0d0d0d", color: "#e0e0e0" }}>
      <h2>MoneyPlugHub Dashboard</h2>

      <div style={{ marginBottom: "20px" }}>
        <strong>Status:</strong> {status}
      </div>

      <h3>Income Streams</h3>
      <div style={{ background: "#1a1a1a", padding: "10px", borderRadius: "6px" }}>
        {streams.map((s, i) => (<div key={i} style={{ marginBottom: "8px" }}>
            <strong>{s.name}</strong> — ${s.monthly}/mo  
            <span style={{ color: s.active ? "#4caf50" : "#f44336" }}>
              {s.active ? " active" : " inactive"}
            </span>
          </div>))}
      </div>

      <h3 style={{ marginTop: "20px" }}>Autonomous Loop Manager</h3>
      <div style={{ background: "#1a1a1a", padding: "10px", borderRadius: "6px" }}>
        {loopState ? (<>
            <div><strong>Loop Depth:</strong> {loopState.depth}</div>
            <div><strong>Mode:</strong> {loopState.mode}</div>
            <div><strong>Last Cycle:</strong> {loopState.lastCycle}</div>
            <div><strong>Health:</strong> {loopState.health}</div>
          </>) : (<div>No loop data.</div>)}
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
        {events.map((e, i) => (<div key={i}>{e.timestamp} — {e.message}</div>))}
      </div>
    </div>);
}
