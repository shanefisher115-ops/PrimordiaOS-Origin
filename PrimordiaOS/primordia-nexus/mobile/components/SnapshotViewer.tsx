import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";

interface SnapshotMessage {
    type: string;
    payload: {
        id: string;
        ts: number;
        nodes: any[];
    };
}

export default function SnapshotViewer() {
    const [snapshots, setSnapshots] = useState<SnapshotMessage[]>([]);

    useEffect(() => {
        const ws = new WebSocket("ws://localhost:9090");

        ws.onmessage = (msg) => {
            const data = JSON.parse(msg.data);

            if (data.type === "visionSnapshot") {
                setSnapshots((prev) => [data, ...prev].slice(0, 10));
            }
        };

        return () => ws.close();
    }, []);

    return (
        <View style={styles.box}>
            <Text style={styles.header}>Snapshot Viewer</Text>
            {snapshots.map((s, i) => (
                <View key={i} style={styles.item}>
                    <Text style={styles.topic}>{s.payload.id}</Text>
                    <Text style={styles.payload}>{JSON.stringify(s.payload.nodes)}</Text>
                    <Text style={styles.time}>{new Date(s.payload.ts).toLocaleTimeString()}</Text>
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
