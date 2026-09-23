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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = App;
const react_1 = __importStar(require("react"));
const EventFeed_1 = __importDefault(require("./components/EventFeed"));
const SnapshotExplorer_1 = __importDefault(require("./components/SnapshotExplorer"));
const PipelineVisualizer_1 = __importDefault(require("./components/PipelineVisualizer"));
function App() {
    const [connected, setConnected] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        const ws = new WebSocket("ws://localhost:9090");
        ws.onopen = () => setConnected(true);
        ws.onclose = () => setConnected(false);
        return () => ws.close();
    }, []);
    return (<div style={{ fontFamily: "Arial", padding: "20px" }}>
            <h1>PrimordiaOS Dashboard</h1>
            <p>Status: {connected ? "Connected" : "Disconnected"}</p>

            <div style={{ display: "flex", gap: "20px" }}>
                <EventFeed_1.default />
                <SnapshotExplorer_1.default />
                <PipelineVisualizer_1.default />
            </div>
        </div>);
}
