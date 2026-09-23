import React, { useEffect, useState } from "react";
import EventFeed from "./components/EventFeed";
import SnapshotExplorer from "./components/SnapshotExplorer";
import PipelineVisualizer from "./components/PipelineVisualizer";

export default function App() {
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        const ws = new WebSocket("ws://localhost:9090");

        ws.onopen = () => setConnected(true);
        ws.onclose = () => setConnected(false);

        return () => ws.close();
    }, []);

    return (
        <div style={{ fontFamily: "Arial", padding: "20px" }}>
            <h1>PrimordiaOS Dashboard</h1>
            <p>Status: {connected ? "Connected" : "Disconnected"}</p>

            <div style={{ display: "flex", gap: "20px" }}>
                <EventFeed />
                <SnapshotExplorer />
                <PipelineVisualizer />
            </div>
        </div>
    );
}
