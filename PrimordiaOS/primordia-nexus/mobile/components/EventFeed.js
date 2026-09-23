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
exports.default = EventFeed;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
function EventFeed() {
    const [events, setEvents] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        const ws = new WebSocket("ws://localhost:9090");
        ws.onmessage = (msg) => {
            const data = JSON.parse(msg.data);
            if (data.type === "event") {
                setEvents((prev) => [data, ...prev].slice(0, 30));
            }
        };
        return () => ws.close();
    }, []);
    return (<react_native_1.View style={styles.box}>
            <react_native_1.Text style={styles.header}>Event Feed</react_native_1.Text>
            {events.map((e, i) => (<react_native_1.View key={i} style={styles.item}>
                    <react_native_1.Text style={styles.topic}>{e.topic}</react_native_1.Text>
                    <react_native_1.Text style={styles.payload}>{JSON.stringify(e.payload)}</react_native_1.Text>
                    <react_native_1.Text style={styles.time}>{new Date(e.ts).toLocaleTimeString()}</react_native_1.Text>
                </react_native_1.View>))}
        </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
    box: {
        backgroundColor: "#fff",
        padding: 10,
        marginVertical: 10,
        borderRadius: 8
    },
    header: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 10
    },
    item: {
        marginBottom: 10
    },
    topic: {
        fontWeight: "bold"
    },
    payload: {
        fontSize: 12
    },
    time: {
        fontSize: 10,
        color: "#666"
    }
});
