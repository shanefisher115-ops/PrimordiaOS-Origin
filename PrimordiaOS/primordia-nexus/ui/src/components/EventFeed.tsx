import React, { useEffect, useState } from "react";

interface EventMessage {
    type: string;
    topic: string;
    payload: any;
    ts: number;
}

export default function EventFeed() {
    const [events, setEvents] = useState<EventMessage[]>([]);

    useEffect(() => {
        const ws = new WebSocket("ws://localhost:9090");

        ws.onmessage = (msg) => {
            const data = JSON.parse(msg.data);

            if (data.type === "event") {
                setEvents((prev) => [data, ...prev].slice(0, 50));
            }
        };

        return () => ws.close();
    }, []);

    return (
        <div style={{ width: "33%" }}>
            <h2>Event Feed</h2>
            <div style={{
                border: "1px solid #ccc",
                padding: "10px",
                height: "600px",
                overflowY: "scroll"
            }}>
                {events.map((e, i) => (
                    <div key={i} style={{ marginBottom: "10px" }}>
                        <strong>{e.topic}</strong>
                        <pre>{JSON.stringify(e.payload, null, 2)}</pre>
                        <small>{new Date(e.ts).toLocaleTimeString()}</small>
                    </div>
                ))}
            </div>
        </div>
    );
}
