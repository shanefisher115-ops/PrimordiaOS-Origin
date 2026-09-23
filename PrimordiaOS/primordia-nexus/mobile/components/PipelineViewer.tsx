import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";

interface PipelineMessage {
    type: string;
    payload: {
        pipelineId: string;
        input: any;
        result: any;
        ts: number;
    };
}

export default function PipelineViewer() {
    const [events, setEvents] = useState<PipelineMessage[]>([]);

    useEffect(() => {
        const ws = new WebSocket("ws://localhost:9090");

        ws.onmessage = (msg) => {
            const data = JSON.parse(msg.data);

            if (data.type === "pipelineCompleted") {
                setEvents((prev) => [data, ...prev].slice(0, 10));
            }
        };

        return () => ws.close();
    }, []);

    return (
        <View style={styles.box}>
            <Text style={styles.header}>Pipeline Viewer</Text>
            {events.map((e, i) => (
                <View key={i} style={styles.item}>
                    <Text style={styles.topic}>{e.payload.pipelineId}</Text>
                    <Text style={styles.payload}>{JSON.stringify(e.payload.result)}</Text>
                    <Text style={styles.time}>{new Date(e.payload.ts).toLocaleTimeString()}</Text>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
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
