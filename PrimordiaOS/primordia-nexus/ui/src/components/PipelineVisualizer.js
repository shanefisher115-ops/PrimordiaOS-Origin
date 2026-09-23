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
exports.default = PipelineVisualizer;
const react_1 = __importStar(require("react"));
function PipelineVisualizer() {
    const [events, setEvents] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        const ws = new WebSocket("ws://localhost:9090");
        ws.onmessage = (msg) => {
            const data = JSON.parse(msg.data);
            if (data.type === "pipelineCompleted") {
                setEvents((prev) => [data, ...prev].slice(0, 20));
            }
        };
        return () => ws.close();
    }, []);
    return (<div style={{ width: "33%" }}>
            <h2>Pipeline Visualizer</h2>
            <div style={{
            border: "1px solid #ccc",
            padding: "10px",
            height: "600px",
            overflowY: "scroll"
        }}>
                {events.map((e, i) => (<div key={i} style={{ marginBottom: "10px" }}>
                        <strong>{e.payload.pipelineId}</strong>
                        <pre>{JSON.stringify(e.payload.result, null, 2)}</pre>
                        <small>{new Date(e.payload.ts).toLocaleTimeString()}</small>
                    </div>))}
            </div>
        </div>);
}
