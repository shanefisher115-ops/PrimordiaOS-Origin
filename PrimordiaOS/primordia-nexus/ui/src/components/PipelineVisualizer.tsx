import React, { useEffect, useState } from "react";

interface PipelineMessage {
    type: string;
    payload: {
        pipelineId: string;
        input: any;
        result: any;
        ts: number;
    };
}

export default function PipelineVisualizer() {
    const [events, setEvents] = useState<PipelineMessage[]>([]);

    useEffect(() => {
        const ws = new WebSocket("ws://localhost:9090");

        ws.onmessage = (msg) => {
            const data = JSON.parse(msg.data);

            if (data.type === "pipelineCompleted") {
                setEvents((prev) => [data, ...prev].slice(0, 20));
            }
        };

        return () => ws.close();
    }, []);

    return (
        <div style={{ width: "33%" }}>
            <h2>Pipeline Visualizer</h2>
            <div style={{
                border: "1px solid #ccc",
                padding: "10px",
                height: "600px",
                overflowY: "scroll"
            }}>
                {events.map((e, i) => (
                    <div key={i} style={{ marginBottom: "10px" }}>
                        <strong>{e.payload.pipelineId}</strong>
                        <pre>{JSON.stringify(e.payload.result, null, 2)}</pre>
                        <small>{new Date(e.payload.ts).toLocaleTimeString()}</small>
                    </div>
                ))}
            </div>
        </div>
    );
}
