import React, { useEffect, useState } from "react";

interface SnapshotMessage {
    type: string;
    payload: {
        id: string;
        ts: number;
        nodes: any[];
    };
}

export default function SnapshotExplorer() {
    const [snapshots, setSnapshots] = useState<SnapshotMessage[]>([]);

    useEffect(() => {
        const ws = new WebSocket("ws://localhost:9090");

        ws.onmessage = (msg) => {
            const data = JSON.parse(msg.data);

            if (data.type === "visionSnapshot") {
                setSnapshots((prev) => [data, ...prev].slice(0, 20));
            }
        };

        return () => ws.close();
    }, []);

    return (
        <div style={{ width: "33%" }}>
            <h2>Snapshot Explorer</h2>
            <div style={{
                border: "1px solid #ccc",
                padding: "10px",
                height: "600px",
                overflowY: "scroll"
            }}>
                {snapshots.map((s, i) => (
                    <div key={i} style={{ marginBottom: "10px" }}>
                        <strong>{s.payload.id}</strong>
                        <pre>{JSON.stringify(s.payload.nodes, null, 2)}</pre>
                        <small>{new Date(s.payload.ts).toLocaleTimeString()}</small>
                    </div>
                ))}
            </div>
        </div>
    );
}
