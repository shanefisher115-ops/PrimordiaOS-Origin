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
exports.default = IgnitionPanel;
const react_1 = __importStar(require("react"));
function IgnitionPanel() {
    const [status, setStatus] = (0, react_1.useState)("idle");
    const [log, setLog] = (0, react_1.useState)([]);
    async function ignite() {
        setStatus("booting");
        setLog((prev) => [...prev, "Boot sequence initiated..."]);
        try {
            const res = await fetch("http://localhost:3000/ignite");
            const text = await res.text();
            setLog((prev) => [...prev, text]);
            setStatus("complete");
        }
        catch (err) {
            setLog((prev) => [...prev, "Ignition failed: " + err.message]);
            setStatus("error");
        }
    }
    return (<div style={{ padding: "20px", background: "#0d0d0d", color: "#e0e0e0" }}>
      <h2>PrimordiaOS Ignition Panel</h2>

      <button onClick={ignite} style={{
            padding: "12px 20px",
            background: status === "booting" ? "#444" : "#4caf50",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            marginBottom: "20px",
        }}>
        {status === "booting" ? "Booting..." : "Ignite PrimordiaOS"}
      </button>

      <div style={{
            background: "#1a1a1a",
            padding: "15px",
            borderRadius: "6px",
            height: "300px",
            overflowY: "auto",
            fontFamily: "monospace",
            fontSize: "14px",
        }}>
        {log.map((line, i) => (<div key={i}>{line}</div>))}
      </div>
    </div>);
}
