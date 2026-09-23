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
const react_native_1 = require("react-native");
const EventFeed_1 = __importDefault(require("./components/EventFeed"));
const SnapshotViewer_1 = __importDefault(require("./components/SnapshotViewer"));
const PipelineViewer_1 = __importDefault(require("./components/PipelineViewer"));
function App() {
    const [connected, setConnected] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        const ws = new WebSocket("ws://localhost:9090");
        ws.onopen = () => setConnected(true);
        ws.onclose = () => setConnected(false);
        return () => ws.close();
    }, []);
    return (<react_native_1.View style={styles.container}>
            <react_native_1.Text style={styles.title}>PrimordiaOS Mobile</react_native_1.Text>
            <react_native_1.Text>Status: {connected ? "Connected" : "Disconnected"}</react_native_1.Text>

            <react_native_1.ScrollView style={{ width: "100%" }}>
                <EventFeed_1.default />
                <SnapshotViewer_1.default />
                <PipelineViewer_1.default />
            </react_native_1.ScrollView>
        </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 50,
        paddingHorizontal: 20,
        backgroundColor: "#f5f5f5"
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        marginBottom: 10
    }
});
